"""OpenCode v2.4.2 compatible HTTP surface backed by Jarvis primitives.

The vendored TUI talks to an OpenCode server over ``/api/*``.  This module
provides a *shim*: it serves the endpoints the TUI needs from Jarvis's own
config, registries, event bus and inference engine, and answers every other
``/api/*`` request with a schema-safe empty value instead of a 404 that would
crash the client.

Design rules
------------
* **Never 500.**  Every data-producing helper degrades to an empty-but-valid
  OpenCode payload.
* **Do not weaken Jarvis auth.**  This module does not read or bypass
  ``Authorization``; ``AuthMiddleware`` remains the single gate for
  ``/api/*`` and ``/v1/*``.
* **Last route wins nothing.**  The catch-all is registered *after* every
  concrete route so real implementations always take precedence.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import socket
import tempfile
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

from fastapi import APIRouter, Request, Response
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["opencode-shim"])

KEEPALIVE_SECONDS = 15.0
_DEFAULT_MODEL = "jarvis/default"

# ---------------------------------------------------------------------------
# Small in-memory session store
# ---------------------------------------------------------------------------


@dataclass
class _SessionRecord:
    id: str
    project_id: str
    created: float
    updated: float
    title: str = ""
    agent: str = "jarvis"
    model: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    permissions: List[Dict[str, Any]] = field(default_factory=list)
    messages: List[Dict[str, Any]] = field(default_factory=list)


_SESSIONS: Dict[str, _SessionRecord] = {}
_SESSION_LOCK = threading.RLock()


def _ms(seconds: float) -> float:
    """OpenCode's wire format uses epoch milliseconds for timestamps."""
    return seconds * 1000.0


def _directory() -> str:
    """Directory reported as the OpenCode location / project canonical path."""
    return os.getcwd()


def _project_id() -> str:
    return "global"


def _new_session(*, session_id: str = "", title: str = "", metadata=None) -> _SessionRecord:
    now = time.time()
    record = _SessionRecord(
        id=session_id or f"ses_{uuid.uuid4().hex}",
        project_id=_project_id(),
        created=now,
        updated=now,
        title=title,
        metadata=dict(metadata or {}),
    )
    with _SESSION_LOCK:
        _SESSIONS[record.id] = record
    return record


def _get_session(session_id: str, *, create: bool = False) -> Optional[_SessionRecord]:
    with _SESSION_LOCK:
        record = _SESSIONS.get(session_id)
        if record is None and create:
            record = _new_session(session_id=session_id)
        return record


def _session_info(record: _SessionRecord) -> Dict[str, Any]:
    """Serialise a session into OpenCode's ``Session.Info`` shape."""
    return {
        "id": record.id,
        "projectID": record.project_id,
        "agent": record.agent or "jarvis",
        "model": {"providerID": "jarvis", "id": record.model or _DEFAULT_MODEL},
        "cost": 0.0,
        "tokens": {
            "input": 0,
            "output": 0,
            "reasoning": 0,
            "cache": {"read": 0, "write": 0},
        },
        "time": {
            "created": _ms(record.created),
            "updated": _ms(record.updated),
            "idle": _ms(record.updated),
        },
        "title": record.title or "New session",
        "metadata": dict(record.metadata),
        "permissions": list(record.permissions),
        "location": {"directory": _directory()},
    }


def _touch(record: _SessionRecord) -> None:
    record.updated = time.time()


def _publish_session_event(request: Request, session_id: str) -> None:
    """Tell connected TUI clients about a new session."""
    bus = getattr(request.app.state, "bus", None)
    if bus is None:
        return
    try:
        from jarvis.core.events import EventType

        bus.publish(EventType.SESSION_START, {"session_id": session_id})
    except Exception as exc:
        logger.debug("OpenCode session event publish failed: %s", exc)


# ---------------------------------------------------------------------------
# Jarvis config / registry → OpenCode payload helpers
# ---------------------------------------------------------------------------


def _config(request: Request) -> Any:
    """Return the app's JarvisConfig, a freshly loaded one, or ``None``."""
    try:
        config = getattr(request.app.state, "config", None)
        if config is not None:
            return config
        from jarvis.core.config import load_config

        return load_config()
    except Exception as exc:  # pragma: no cover - defensive
        logger.debug("OpenCode shim config unavailable: %s", exc)
        return None


def _model_names(request: Request) -> List[str]:
    """Collect plausible chat model names from Jarvis config and app state."""
    names: List[str] = []
    config = _config(request)
    if config is not None:
        intelligence = getattr(config, "intelligence", None)
        for attr in (
            "default_model",
            "model_chat",
            "model_short",
            "model_long",
            "model_code",
            "fallback_model",
        ):
            value = getattr(intelligence, attr, "")
            if isinstance(value, str) and value.strip():
                names.append(value.strip())
    app_model = getattr(request.app.state, "model", "")
    if isinstance(app_model, str) and app_model.strip():
        names.append(app_model.strip())
    if not names:
        names.append(_DEFAULT_MODEL)
    seen: set[str] = set()
    return [n for n in names if not (n in seen or seen.add(n))]


def _agent_infos(request: Request) -> List[Dict[str, Any]]:
    """Map ``AgentRegistry`` entries to ``Agent.Info`` objects."""
    agents: List[Dict[str, Any]] = []
    try:
        import jarvis.agents  # noqa: F401 - side-effect registration
        from jarvis.core.registry import AgentRegistry

        model = _model_names(request)[0]
        for key in sorted(AgentRegistry.keys()):
            cls = AgentRegistry.get(key)
            description = (getattr(cls, "__doc__", "") or "").strip().splitlines()
            agents.append(
                {
                    "id": key,
                    "name": getattr(cls, "__name__", key),
                    "description": description[0] if description else None,
                    "model": {"providerID": "jarvis", "id": model},
                    "request": {"settings": {}, "headers": {}, "body": {}},
                    "mode": "primary",
                    "hidden": False,
                    "permissions": [{"action": "*", "resource": "*", "effect": "allow"}],
                }
            )
    except Exception as exc:
        logger.debug("OpenCode agent registry unavailable: %s", exc)
    if not agents:
        agents.append(_builtin_agent(request))
    return agents


def _builtin_agent(request: Request) -> Dict[str, Any]:
    return {
        "id": "jarvis",
        "name": "Jarvis",
        "description": "Jarvis default agent",
        "model": {"providerID": "jarvis", "id": _model_names(request)[0]},
        "request": {"settings": {}, "headers": {}, "body": {}},
        "mode": "primary",
        "hidden": False,
        "permissions": [{"action": "*", "resource": "*", "effect": "allow"}],
    }


def _model_infos(request: Request) -> List[Dict[str, Any]]:
    """Map configured models to ``Model.Info`` objects."""
    models: List[Dict[str, Any]] = []
    for name in _model_names(request):
        provider_id, _, model_id = name.rpartition("/")
        if not provider_id:
            provider_id, model_id = "jarvis", name
        models.append(
            {
                "id": f"{provider_id}/{model_id}",
                "modelID": model_id,
                "providerID": provider_id,
                "name": model_id,
                "type": "chat",
                "capabilities": {
                    "tools": True,
                    "input": ["text", "image"],
                    "output": ["text"],
                },
                "variants": [],
                "time": {"released": 0},
                "cost": [],
                "status": "active",
                "enabled": True,
                "limit": {"context": 200_000, "output": 32_000},
            }
        )
    return models


def _provider_infos(request: Request) -> List[Dict[str, Any]]:
    """Map ``EngineRegistry``/config engines to ``Provider.Info`` objects."""
    ids: List[str] = ["jarvis"]
    try:
        from jarvis.core.registry import EngineRegistry

        ids.extend(str(key) for key in EngineRegistry.keys())
    except Exception as exc:
        logger.debug("OpenCode engine registry unavailable: %s", exc)
    config = _config(request)
    if config is not None:
        default = getattr(getattr(config, "engine", None), "default", "")
        if isinstance(default, str) and default.strip():
            ids.insert(0, default.strip())
    seen: set[str] = set()
    return [
        {
            "id": provider_id,
            "name": provider_id,
            "activation": "auto",
            "package": "",
        }
        for provider_id in ids
        if not (provider_id in seen or seen.add(provider_id))
    ]


def _config_entries(request: Request) -> List[Dict[str, Any]]:
    """Expose the active Jarvis config as an OpenCode ``Config.Entry``."""
    config = _config(request)
    info: Dict[str, Any] = {}
    path: Optional[str] = None
    if config is not None:
        try:
            path = str(config._config_path)
        except Exception:
            path = None
        intelligence = getattr(config, "intelligence", None)
        model = getattr(intelligence, "default_model", "") if intelligence else ""
        if isinstance(model, str) and model.strip():
            info["model"] = model.strip()
        agent_config = getattr(config, "agent", None)
        default_agent = getattr(agent_config, "default", "") if agent_config else ""
        if isinstance(default_agent, str) and default_agent.strip():
            info["default_agent"] = default_agent.strip()
        try:
            info["permissions"] = [{"action": "*", "resource": "*", "effect": "allow"}]
        except Exception:  # pragma: no cover - defensive
            pass
    entry: Dict[str, Any] = {"type": "document", "info": info}
    if path:
        entry["path"] = path
    return [entry]


def _project_infos(request: Request) -> List[Dict[str, Any]]:
    now = _ms(time.time())
    started = getattr(request.app.state, "session_start", time.time())
    return [
        {
            "id": _project_id(),
            "canonical": _directory(),
            "name": os.path.basename(_directory()) or "jarvis",
            "time": {
                "created": _ms(started),
                "updated": now,
                "active": now,
            },
            "sandboxes": [],
        }
    ]


def _mcp_infos(request: Request) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    tools = getattr(request.app.state, "mcp_tools", None) or []
    try:
        for tool in tools:
            name = getattr(tool, "name", None) or getattr(tool, "__name__", "")
            if not name:
                continue
            items.append({"name": str(name), "status": {"status": "connected"}})
    except Exception as exc:
        logger.debug("OpenCode MCP tool listing unavailable: %s", exc)
    clients = getattr(request.app.state, "_mcp_clients", None) or []
    try:
        for client in clients:
            name = getattr(client, "server_name", None) or getattr(client, "name", "")
            if not name:
                continue
            items.append({"name": str(name), "status": {"status": "connected"}})
    except Exception as exc:
        logger.debug("OpenCode MCP client listing unavailable: %s", exc)
    seen: set[str] = set()
    return [
        item
        for item in items
        if not (item["name"] in seen or seen.add(item["name"]))
    ]


def _command_infos(request: Request) -> List[Dict[str, Any]]:
    commands: List[Dict[str, Any]] = []
    try:
        from jarvis.core.registry import ToolRegistry

        for key in sorted(ToolRegistry.keys()):
            commands.append({"name": str(key), "description": str(key)})
    except Exception as exc:
        logger.debug("OpenCode tool registry unavailable: %s", exc)
    return commands


def _plugin_infos(request: Request) -> List[Dict[str, Any]]:
    """Jarvis has no OpenCode plugin manager; advertise the built-in shim."""
    return [
        {
            "id": "jarvis-shim",
            "source": {"type": "builtin"},
            "features": {"server": True, "tui": True},
            "state": {"status": "active"},
        }
    ]


def _approval_requests(request: Request) -> List[Dict[str, Any]]:
    """Map Jarvis pending approvals to OpenCode permission requests.

    Keyless mode auto-allows, so no pending requests are reported in that
    mode.  With an API key configured the proactive-approval queue is the
    closest Jarvis analogue to an OpenCode permission request.
    """
    if not getattr(request.app.state, "api_key", ""):
        return []
    try:
        from jarvis.tools.approval_store import ApprovalStore

        store = ApprovalStore()
        expire = getattr(store, "expire_stale", None)
        if callable(expire):
            expire()
        pending = store.list_pending()
        return [
            {
                "id": str(getattr(action, "id", uuid.uuid4().hex)),
                "sessionID": "ses_jarvis",
                "action": str(getattr(action, "action_type", "tool")),
                "resources": [str(getattr(action, "description", ""))],
                "metadata": {
                    "permission_key": getattr(action, "permission_key", ""),
                    "tier": getattr(action, "tier", ""),
                },
            }
            for action in pending
        ]
    except Exception as exc:
        logger.debug("OpenCode approval mapping unavailable: %s", exc)
        return []


def _location_payload(request: Request) -> Dict[str, Any]:
    return {"location": {"directory": _directory()}}


# ---------------------------------------------------------------------------
# Server metadata and simple inventory endpoints
# ---------------------------------------------------------------------------


@router.get("/api/info")
async def opencode_info(request: Request) -> Dict[str, Any]:
    """``Server.Info`` for the vendored TUI."""
    return {
        "version": "2.4.2",
        "pid": os.getpid(),
        "hostname": socket.gethostname(),
        "urls": [],
        "paths": {"tmp": tempfile.gettempdir()},
        "capabilities": {},
    }


@router.get("/api/config")
async def opencode_config(request: Request) -> List[Dict[str, Any]]:
    return _config_entries(request)


@router.get("/api/project")
async def opencode_project(request: Request) -> List[Dict[str, Any]]:
    return _project_infos(request)


@router.get("/api/agent")
async def opencode_agent(request: Request) -> Dict[str, Any]:
    return {**_location_payload(request), "data": _agent_infos(request)}


@router.get("/api/agent/{agent_id}")
async def opencode_agent_get(agent_id: str, request: Request) -> Dict[str, Any]:
    for agent in _agent_infos(request):
        if agent.get("id") == agent_id:
            return agent
    return {**_builtin_agent(request), "id": agent_id}


@router.get("/api/model")
async def opencode_model(request: Request) -> Dict[str, Any]:
    return {**_location_payload(request), "data": _model_infos(request)}


@router.get("/api/model/default")
async def opencode_model_default(request: Request) -> Dict[str, Any]:
    models = _model_infos(request)
    return {**_location_payload(request), "data": models[0] if models else None}


@router.get("/api/provider")
async def opencode_provider(request: Request) -> Dict[str, Any]:
    return {**_location_payload(request), "data": _provider_infos(request)}


@router.get("/api/plugin")
async def opencode_plugin(request: Request) -> Dict[str, Any]:
    return {**_location_payload(request), "data": _plugin_infos(request)}


@router.get("/api/mcp")
async def opencode_mcp(request: Request) -> Dict[str, Any]:
    return {**_location_payload(request), "data": _mcp_infos(request)}


@router.get("/api/command")
async def opencode_command(request: Request) -> Dict[str, Any]:
    return {**_location_payload(request), "data": _command_infos(request)}


@router.get("/api/path")
async def opencode_path(request: Request) -> List[Any]:
    """Not part of the v2.4.2 client, but harmless for older clients."""
    return []


@router.get("/api/location")
async def opencode_location(request: Request) -> Dict[str, Any]:
    """``{directory}`` — the first thing the vendored TUI asks for."""
    return {"directory": _directory()}


@router.post("/api/location/reload")
async def opencode_location_reload(request: Request) -> Dict[str, Any]:
    return {"directory": _directory()}


@router.get("/api/fs/list")
async def opencode_fs_list(request: Request, location: str | None = None) -> Dict[str, Any]:
    """``FileListOutput``: ``{location: {directory}, data: [{path, type}]}``."""
    directory = location or _directory()
    try:
        root = Path(directory).resolve()
        entries = [
            {
                "path": child.name,
                "type": "directory" if child.is_dir() else "file",
            }
            for child in sorted(root.iterdir(), key=lambda item: item.name)[:200]
        ]
    except Exception:
        directory = _directory()
        entries = []
    return {"location": {"directory": directory}, "data": entries}


@router.get("/api/fs/find")
async def opencode_fs_find(request: Request, query: str = "") -> Dict[str, Any]:
    return {"location": {"directory": _directory()}, "data": []}


# ---------------------------------------------------------------------------
# Session endpoints
# ---------------------------------------------------------------------------


@router.get("/api/session")
async def opencode_session_list(request: Request) -> Dict[str, Any]:
    with _SESSION_LOCK:
        records = sorted(_SESSIONS.values(), key=lambda r: r.updated, reverse=True)
        data = [_session_info(record) for record in records]
    return {"data": data, "cursor": {}}


@router.post("/api/session")
async def opencode_session_create(request: Request) -> Dict[str, Any]:
    body: Dict[str, Any] = {}
    try:
        raw = await request.body()
        if raw:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                body = parsed
    except Exception:
        body = {}
    session_id = str(body.get("id") or "") or None
    title = str(body.get("title") or "")
    record = _new_session(session_id=session_id, title=title, metadata=body.get("metadata"))
    requested_agent = body.get("agent")
    if isinstance(requested_agent, str) and requested_agent:
        record.agent = requested_agent
    _publish_session_event(request, record.id)
    return {"data": _session_info(record)}


@router.get("/api/session/active")
async def opencode_session_active(request: Request) -> Dict[str, Any]:
    return {"data": {}}


@router.get("/api/session/{session_id}")
async def opencode_session_get(session_id: str, request: Request) -> Dict[str, Any]:
    record = _get_session(session_id, create=True)
    assert record is not None
    return {"data": _session_info(record)}


@router.patch("/api/session/{session_id}")
async def opencode_session_update(session_id: str, request: Request) -> Response:
    body: Dict[str, Any] = {}
    try:
        raw = await request.body()
        if raw:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                body = parsed
    except Exception:
        body = {}
    record = _get_session(session_id, create=True)
    if record is not None:
        if isinstance(body.get("title"), str):
            record.title = body["title"]
        if isinstance(body.get("metadata"), dict):
            record.metadata.update(body["metadata"])
        _touch(record)
    return Response(status_code=204)


@router.delete("/api/session/{session_id}")
async def opencode_session_remove(session_id: str, request: Request) -> Response:
    with _SESSION_LOCK:
        _SESSIONS.pop(session_id, None)
    return Response(status_code=204)


@router.get("/api/session/{session_id}/message")
async def opencode_session_messages(session_id: str, request: Request) -> Dict[str, Any]:
    record = _get_session(session_id, create=True)
    assert record is not None
    with _SESSION_LOCK:
        data = list(record.messages)
    return {"data": data, "cursor": {}}


@router.get("/api/session/{session_id}/message/{message_id}")
async def opencode_session_message_get(
    session_id: str, message_id: str, request: Request
) -> Dict[str, Any]:
    record = _get_session(session_id, create=True)
    assert record is not None
    with _SESSION_LOCK:
        for message in record.messages:
            if message.get("id") == message_id:
                return {"data": message}
    return {
        "data": {
            "id": message_id,
            "sessionID": session_id,
            "time": {"created": _ms(time.time())},
            "type": "synthetic",
            "text": "",
        }
    }


@router.get("/api/session/{session_id}/context")
async def opencode_session_context(session_id: str, request: Request) -> Dict[str, Any]:
    record = _get_session(session_id, create=True)
    assert record is not None
    with _SESSION_LOCK:
        return {"data": list(record.messages)}


@router.get("/api/session/{session_id}/diff")
async def opencode_session_diff(session_id: str, request: Request) -> Dict[str, Any]:
    return {"data": []}


def _user_message(session_id: str, text: str, *, delivery: str = "steer") -> Dict[str, Any]:
    created = _ms(time.time())
    return {
        "id": f"msg_{uuid.uuid4().hex}",
        "sessionID": session_id,
        "time": {"created": created},
        "type": "user",
        "text": text,
        "files": [],
        "agents": [],
        "skills": [],
        # v2.4.2 inbox shape
        "payload": {"text": text, "files": [], "agents": [], "skills": []},
        "delivery": delivery if delivery in ("steer", "queue") else "steer",
    }


def _assistant_message(session_id: str, text: str, model: str) -> Dict[str, Any]:
    created = _ms(time.time())
    return {
        "id": f"msg_{uuid.uuid4().hex}",
        "sessionID": session_id,
        "time": {"created": created, "completed": created},
        "type": "assistant",
        "agent": "jarvis",
        "model": {"providerID": "jarvis", "id": model or _DEFAULT_MODEL},
        "content": [{"type": "text", "text": text}],
        "cost": 0.0,
        "tokens": {
            "input": 0,
            "output": 0,
            "reasoning": 0,
            "cache": {"read": 0, "write": 0},
        },
    }


def _model_id(model: Any, request: Request) -> str:
    """Normalize OpenCode's `{providerID, id}` model ref to a Jarvis model id."""
    if isinstance(model, dict):
        candidate = model.get("id") or model.get("model") or ""
        if isinstance(candidate, str) and candidate and candidate not in {"default", "jarvis/default"}:
            return candidate
    if isinstance(model, str) and model and model not in {"default", "jarvis/default"}:
        return model
    server_model = getattr(request.app.state, "model", "")
    if isinstance(server_model, str) and server_model:
        return server_model
    names = _model_names(request)
    return names[0] if names else ""


def _generate_reply(request: Request, text: str, model: Any, history: List[Dict[str, Any]]) -> str:
    """Best-effort call into the Jarvis engine; never raises."""
    engine = getattr(request.app.state, "engine", None)
    if engine is None or not text:
        return ""
    try:
        health = engine.health()
        if asyncio.iscoroutine(health):
            health.close()
            health = False
        if not bool(health):
            return "Jarvis is online, but no inference engine is available. Start Ollama or configure a cloud provider, then try again."
    except Exception:
        return "Jarvis is online, but the inference engine could not be reached. Start Ollama or configure a cloud provider."
    try:
        from jarvis.core.types import Message, Role

        messages: List[Message] = []
        for message in history:
            if message.get("type") == "user":
                messages.append(Message(role=Role.USER, content=str(message.get("text", ""))))
            elif message.get("type") == "assistant":
                content = message.get("content", [])
                reply = "".join(
                    part.get("text", "")
                    for part in content
                    if isinstance(part, dict) and part.get("type") == "text"
                )
                messages.append(Message(role=Role.ASSISTANT, content=reply))
        messages.append(Message(role=Role.USER, content=text))
        result = engine.generate(messages, model=_model_id(model, request))
        if asyncio.iscoroutine(result):
            # Engine.generate is synchronous by contract; a coroutine here is
            # an unexpected implementation. Close it rather than leaking.
            result.close()
            return ""
        if isinstance(result, dict):
            return str(result.get("content", "") or "")
        content = getattr(result, "content", None)
        if content is not None:
            return str(content)
        return str(result or "")
    except Exception as exc:
        logger.warning("OpenCode shim prompt fell back to empty reply: %s", exc)
        return ""


@router.post("/api/session/{session_id}/prompt")
async def opencode_session_prompt(session_id: str, request: Request) -> Dict[str, Any]:
    """Accept a prompt, store it, and reply with an inbox-shaped user item.

    The actual model reply is produced through the Jarvis engine when one is
    configured and is delivered to the TUI over ``/api/event``.  Any failure
    is swallowed so the TUI never sees a 500.
    """
    body: Dict[str, Any] = {}
    try:
        raw = await request.body()
        if raw:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                body = parsed
    except Exception:
        body = {}
    text = str(body.get("text") or "")
    delivery = str(body.get("delivery") or "steer")
    with _SESSION_LOCK:
        existed = session_id in _SESSIONS
    record = _get_session(session_id, create=True)
    if not existed and record is not None:
        _publish_session_event(request, record.id)
    assert record is not None

    message = _user_message(session_id, text, delivery=delivery)
    with _SESSION_LOCK:
        record.messages.append(message)
        history = list(record.messages[:-1])
        model = record.model or _model_names(request)[0]
        _touch(record)

    if text:
        try:
            reply = await asyncio.wait_for(
                asyncio.to_thread(_generate_reply, request, text, model, history),
                timeout=120.0,
            )
        except asyncio.TimeoutError:
            logger.warning("OpenCode shim engine call timed out")
            reply = "Jarvis is online, but the inference engine did not respond in time. Check that Ollama is running and the model is available, then try again."
        except Exception as exc:
            logger.debug("OpenCode shim engine call failed: %s", exc)
            reply = "Jarvis is online, but the inference engine could not be reached. Start Ollama or configure a cloud provider."
        if reply:
            assistant = _assistant_message(session_id, reply, model)
            with _SESSION_LOCK:
                record.messages.append(assistant)
                _touch(record)
            # Let the TUI see the reply without an explicit transcript refetch.
            bus = getattr(request.app.state, "bus", None)
            if bus is not None:
                try:
                    from jarvis.core.events import EventType

                    bus.publish(
                        EventType.CHAT_EXCHANGE_COMPLETED,
                        {
                            "session_id": session_id,
                            "response": reply,
                            "model": model,
                        },
                    )
                except Exception as exc:
                    logger.debug("OpenCode reply event publish failed: %s", exc)

    return {"data": message}


@router.get("/api/session/{session_id}/permission")
async def opencode_session_permission_list(session_id: str, request: Request) -> Dict[str, Any]:
    return {"data": []}


@router.post("/api/session/{session_id}/permission/{request_id}/reply")
async def opencode_session_permission_reply(
    session_id: str, request_id: str, request: Request
) -> Response:
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Permission endpoints (auto-allow in keyless mode)
# ---------------------------------------------------------------------------


@router.get("/api/permission/request")
async def opencode_permission_request(request: Request) -> Dict[str, Any]:
    return {**_location_payload(request), "data": _approval_requests(request)}


@router.get("/api/permission/saved")
async def opencode_permission_saved(request: Request) -> Dict[str, Any]:
    return {"data": []}


@router.post("/api/permission/create")
async def opencode_permission_create(request: Request) -> Dict[str, Any]:
    return {"data": {"id": f"perm_{uuid.uuid4().hex}", "effect": "allow"}}


@router.delete("/api/permission/saved/{permission_id}")
async def opencode_permission_saved_remove(permission_id: str, request: Request) -> Response:
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# SSE event stream
# ---------------------------------------------------------------------------

# Jarvis EventType values → (legacy OpenCode type, current OpenCode type)
_EVENT_MAP: Dict[str, Tuple[str, Optional[str]]] = {
    "session_start": ("session.created", "session.created"),
    "session_end": ("session.updated", "session.archived"),
    "chat_exchange_completed": ("message.updated", "session.execution.succeeded"),
    "inference_end": ("message.updated", "session.execution.succeeded"),
    "agent_turn_end": ("message.updated", "session.execution.succeeded"),
    "inference_start": ("message.part.updated", "session.text.started"),
    "tool_call_start": ("message.part.updated", "session.tool.called"),
    "tool_call_end": ("message.part.updated", "session.tool.success"),
    "tool_timeout": ("message.part.updated", "session.tool.failed"),
    "agent_turn_start": ("session.updated", "session.execution.started"),
    "capability_denied": ("permission.asked", None),
    "security_alert": ("permission.asked", None),
    "security_block": ("permission.asked", None),
}


def _frame(event_type: str, properties: Dict[str, Any]) -> str:
    """Serialise one SSE ``data`` frame.

    Both the legacy ``properties`` envelope (used by the shim contract) and
    the v2.4.2 ``id``/``created``/``data`` envelope are present so that older
    and current TUI builds both accept the frame.
    """
    payload = {
        "type": event_type,
        "properties": properties,
        "id": f"evt_{uuid.uuid4().hex}",
        "created": _ms(time.time()),
        "data": properties,
    }
    return f"data: {json.dumps(payload, default=str)}\n\n"


def _session_id_from(data: Dict[str, Any]) -> str:
    for key in ("session_id", "sessionID", "sessionId"):
        value = data.get(key)
        if isinstance(value, str) and value:
            return value
    return "ses_jarvis"


def _translate(event: Any) -> List[Tuple[str, Dict[str, Any]]]:
    """Turn a Jarvis ``Event`` into zero or more OpenCode frames."""
    event_type = getattr(getattr(event, "event_type", None), "value", "")
    if not isinstance(event_type, str):
        event_type = str(event_type)
    data = getattr(event, "data", None)
    if not isinstance(data, dict):
        data = {}
    session_id = _session_id_from(data)
    record = _get_session(session_id)
    session = _session_info(record) if record is not None else {"id": session_id}
    legacy_type, current_type = _EVENT_MAP.get(event_type, ("session.updated", None))

    properties: Dict[str, Any] = {
        "sessionID": session_id,
        "event": event_type,
        "data": data,
        "timestamp": _ms(getattr(event, "timestamp", time.time())),
    }
    if event_type in ("session_start", "session_end", "agent_turn_start", "agent_turn_end"):
        properties["session"] = session
    if legacy_type in ("message.updated", "message.part.updated"):
        properties["message"] = {
            "id": f"msg_{uuid.uuid4().hex}",
            "sessionID": session_id,
            "time": {"created": properties["timestamp"]},
            "type": "assistant",
            "agent": "jarvis",
            "model": {"providerID": "jarvis", "id": _DEFAULT_MODEL},
            "content": [{"type": "text", "text": str(data.get("response", "") or "")}],
        }
        if legacy_type == "message.part.updated":
            properties["part"] = {
                "type": "text",
                "text": str(data.get("response", "") or data.get("content", "") or ""),
            }

    frames: List[Tuple[str, Dict[str, Any]]] = [(legacy_type, properties)]
    if current_type:
        current_data = dict(properties)
        if current_type == "session.created":
            current_data = {"session": session}
        elif current_type.startswith("session.execution."):
            current_data = {"sessionID": session_id}
        frames.append((current_type, current_data))
    return frames


@router.get("/api/event")
async def opencode_event(request: Request) -> StreamingResponse:
    """SSE stream required by the OpenCode client.

    The first frame is exactly ``{"type":"server.connected","properties":{}}``;
    a v2.4.2-shaped ``server.connected`` frame follows it so the current TUI
    also sees a well-formed handshake.  Jarvis ``EventBus`` events are
    translated into OpenCode event names, and a ``: keepalive`` comment is
    emitted every 15 seconds.
    """
    bus = getattr(request.app.state, "bus", None)
    if bus is None:
        try:
            from jarvis.core.events import get_event_bus

            bus = get_event_bus()
        except Exception as exc:  # pragma: no cover - defensive
            logger.debug("OpenCode event bus unavailable: %s", exc)
            bus = None

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[Tuple[str, Dict[str, Any]]] = asyncio.Queue()
    subscriptions: List[Tuple[Any, Any]] = []

    def _on_event(event: Any) -> None:
        try:
            for frame in _translate(event):
                loop.call_soon_threadsafe(queue.put_nowait, frame)
        except Exception as exc:
            logger.debug("OpenCode event translation failed: %s", exc)

    if bus is not None:
        try:
            from jarvis.core.events import EventType

            for event_type in EventType:
                callback = _on_event

                def _subscriber(event: Any, _cb=callback) -> None:
                    _cb(event)

                bus.subscribe(event_type, _subscriber)
                subscriptions.append((event_type, _subscriber))
        except Exception as exc:
            logger.debug("OpenCode event subscription failed: %s", exc)

    async def stream() -> AsyncIterator[str]:
        # Contract frame: legacy shape, exactly as required by the shim spec.
        yield 'data: {"type":"server.connected","properties":{}}\n\n'
        # Current OpenCode clients look for id/created/data on the handshake.
        yield _frame("server.connected", {})
        # The client builds its session list from `session.created` events, not
        # from GET /api/session. Replay the sessions the shim already knows.
        with _SESSION_LOCK:
            known = [_session_info(record) for record in list(_SESSIONS.values())]
        for session in known:
            yield _frame(
                "session.created",
                {"sessionID": session["id"], "session": session},
            )
        try:
            while True:
                try:
                    event_type, properties = await asyncio.wait_for(
                        queue.get(), timeout=KEEPALIVE_SECONDS
                    )
                    yield _frame(event_type, properties)
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
                except (asyncio.CancelledError, GeneratorExit):
                    raise
                except Exception as exc:
                    logger.debug("OpenCode event stream error: %s", exc)
                    yield ": keepalive\n\n"
        finally:
            for event_type, subscriber in subscriptions:
                try:
                    bus.unsubscribe(event_type, subscriber)
                except Exception:
                    pass

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "X-Content-Type-Options": "nosniff",
        },
    )


# ---------------------------------------------------------------------------
# Catch-all: keep unimplemented TUI calls from crashing the client.
# MUST remain the last route in this module.
# ---------------------------------------------------------------------------

_LIST_HINTS = (
    "agent",
    "artifact",
    "automation",
    "command",
    "config",
    "credential",
    "experimental",
    "form",
    "integration",
    "job",
    "machine",
    "mcp",
    "message",
    "model",
    "path",
    "permission",
    "plugin",
    "project",
    "provider",
    "pty",
    "reference",
    "session",
    "shell",
    "skill",
    "vcs",
    "websearch",
    "worktree",
)


@router.api_route(
    "/api/{rest:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    include_in_schema=False,
)
async def opencode_catch_all(rest: str, request: Request) -> Any:
    """Return a schema-safe empty body for every unknown OpenCode endpoint.

    ``[]`` for collection-like paths and ``{}`` otherwise.  No Jarvis state
    is touched here, so this handler cannot fail.
    """
    tail = rest.rstrip("/").rsplit("/", 1)[-1]
    if tail in _LIST_HINTS or rest in ("permission/request", "permission/saved"):
        return []
    return {}


__all__ = ["router"]
