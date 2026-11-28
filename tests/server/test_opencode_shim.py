"""Tests for the OpenCode v2.4.2 TUI compatibility shim."""

from __future__ import annotations

import json

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from jarvis.core.config import JarvisConfig  # noqa: E402
from jarvis.server.app import create_app  # noqa: E402
from jarvis.server.opencode_shim import router as opencode_router  # noqa: E402


def _make_app():
    """Build the real server app so router registration is covered too."""
    return create_app(engine=None, model="test-model", config=JarvisConfig())


def test_router_is_mounted_by_create_app():
    # FastAPI >= 0.143 keeps included routers in ``_IncludedRouter`` wrappers,
    # so verify the mounted behaviour over HTTP instead of inspecting routes.
    response = TestClient(_make_app()).get("/api/info")
    assert response.status_code == 200
    info = response.json()
    assert {"version", "pid", "urls", "paths"} <= info.keys()


def test_location_and_file_list_shapes():
    """The vendored TUI reads `.directory` immediately on startup."""
    client = TestClient(_make_app())
    location = client.get("/api/location")
    assert location.status_code == 200
    assert "directory" in location.json()

    listing = client.get("/api/fs/list")
    assert listing.status_code == 200
    body = listing.json()
    assert "directory" in body["location"]
    assert isinstance(body["data"], list)
    assert all(set(entry) == {"path", "type"} for entry in body["data"])


def test_event_stream_first_frame_is_server_connected():
    client = TestClient(_make_app())
    with client.stream("GET", "/api/event") as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        for line in response.iter_lines():
            if not line.startswith("data:"):
                # keepalive comments are also valid frames on this stream
                continue
            frame = json.loads(line.removeprefix("data:").strip())
            assert frame["type"] == "server.connected"
            assert frame["properties"] == {}
            break
        else:
            pytest.fail("event stream ended before the first data frame")


def test_agent_returns_list():
    response = TestClient(_make_app()).get("/api/agent")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["data"], list)
    assert data["location"]["directory"]


def test_model_returns_list():
    response = TestClient(_make_app()).get("/api/model")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["data"], list)
    assert data["data"]
    assert {"id", "modelID", "providerID", "capabilities"} <= data["data"][0].keys()


def test_session_create_and_list():
    client = TestClient(_make_app())
    created = client.post("/api/session", json={"title": "shim test"})
    assert created.status_code == 200
    session = created.json()["data"]
    session_id = session["id"]
    assert session_id.startswith("ses_")

    listed = client.get("/api/session")
    assert listed.status_code == 200
    ids = [item["id"] for item in listed.json()["data"]]
    assert session_id in ids

    fetched = client.get(f"/api/session/{session_id}")
    assert fetched.status_code == 200
    assert fetched.json()["data"]["title"] == "shim test"


def test_unknown_api_path_returns_200_and_non_crashing_body():
    client = TestClient(_make_app())
    for method, path in (
        ("GET", "/api/definitely-not-implemented"),
        ("POST", "/api/session/ses_missing/compact"),
        ("GET", "/api/experimental/artifacts"),
    ):
        response = client.request(method, path)
        assert response.status_code == 200, (method, path, response.text)
        assert isinstance(response.json(), (dict, list))


def test_prompt_never_500_and_exposes_messages():
    client = TestClient(_make_app())
    session = client.post("/api/session").json()["data"]
    session_id = session["id"]
    prompt = client.post(
        f"/api/session/{session_id}/prompt",
        json={"text": "hello from the shim", "delivery": "steer"},
    )
    assert prompt.status_code == 200
    item = prompt.json()["data"]
    assert item["type"] == "user"
    assert item["payload"]["text"] == "hello from the shim"

    messages = client.get(f"/api/session/{session_id}/message")
    assert messages.status_code == 200
    assert any(m.get("text") == "hello from the shim" for m in messages.json()["data"])


class _FakeEngine:
    def health(self) -> bool:
        return True

    def generate(self, messages, *, model="", **kwargs):
        return {"content": "Hi from Jarvis"}


def test_prompt_produces_assistant_reply():
    app = create_app(engine=_FakeEngine(), model="test-model", config=JarvisConfig())
    client = TestClient(app)
    session_id = client.post("/api/session", json={}).json()["data"]["id"]
    response = client.post(
        f"/api/session/{session_id}/prompt",
        json={"text": "hello"},
    )
    assert response.status_code == 200
    messages = client.get(f"/api/session/{session_id}/message").json()["data"]
    assert any(
        message.get("type") == "assistant"
        and "Hi from Jarvis" in str(message.get("content"))
        for message in messages
    )


def test_inventory_endpoints_are_shape_safe():
    client = TestClient(_make_app())
    for path in (
        "/api/project",
        "/api/config",
        "/api/provider",
        "/api/plugin",
        "/api/mcp",
        "/api/command",
        "/api/path",
        "/api/permission/request",
        "/api/permission/saved",
        "/api/session/active",
    ):
        response = client.get(path)
        assert response.status_code == 200, (path, response.text)
        assert isinstance(response.json(), (dict, list))
