"""Phase 3 API gaps used by the terminal UI.

Covers the TUI-facing ``agents`` view and session create/update/delete routes
without depending on a running ``jarvis serve`` instance.
"""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from jarvis.server.api_routes import agents_router, sessions_router  # noqa: E402


@pytest.fixture
def client(tmp_path):
    """Minimal app with only the routers under test mounted."""
    app = FastAPI()
    app.state.session_db_path = str(tmp_path / "sessions.db")
    app.include_router(agents_router)
    app.include_router(sessions_router)
    return TestClient(app)


class _WritableSessionStore:
    """Fake store that *does* support metadata writes and deletion."""

    def __init__(self):
        self.sessions = {}

    def get_or_create(
        self,
        user_id,
        *,
        channel="api",
        channel_user_id="",
        display_name="",
    ):
        session_id = uuid4().hex[:16]
        session = SimpleNamespace(
            session_id=session_id,
            identity=SimpleNamespace(user_id=user_id, display_name=display_name),
            created_at=1.0,
            last_activity=1.0,
            metadata={},
        )
        self.sessions[session_id] = session
        return session

    def list_sessions(self, *, active_only=True, limit=50):
        return list(self.sessions.values())[:limit]

    def update_metadata(self, session_id, metadata):
        session = self.sessions.get(session_id)
        if session is None:
            return False
        session.metadata.update(metadata)
        return True

    def delete(self, session_id):
        return self.sessions.pop(session_id, None) is not None


class TestAgentsList:
    def test_returns_200_and_a_list(self, client):
        resp = client.get("/v1/agents")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data["agents"], list)
        assert all("id" in agent for agent in data["agents"])
        # Legacy shape must survive for existing clients.
        assert "registered" in data and "running" in data

    def test_never_500_when_registry_lookup_fails(self, monkeypatch, client):
        from jarvis.core.registry import AgentRegistry

        def _boom():
            raise RuntimeError("registry offline")

        monkeypatch.setattr(AgentRegistry, "keys", _boom)
        resp = client.get("/v1/agents")
        assert resp.status_code == 200
        assert resp.json()["agents"] == []


class TestSessionCreate:
    def test_returns_an_id(self, client):
        resp = client.post("/v1/sessions", json={})
        assert resp.status_code == 201
        data = resp.json()
        assert data["id"]
        assert data["session_id"] == data["id"]

        listed = client.get("/v1/sessions")
        assert listed.status_code == 200
        assert any(s["id"] == data["id"] for s in listed.json()["sessions"])

    def test_body_optional(self, client):
        # The TUI calls createSession() with no request body.
        resp = client.post("/v1/sessions")
        assert resp.status_code == 201
        assert resp.json()["id"]

    def test_get_created_session(self, client):
        session_id = client.post("/v1/sessions", json={}).json()["id"]
        resp = client.get(f"/v1/sessions/{session_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == session_id


class TestSessionWriteRoutes:
    def test_patch_and_delete_are_not_implemented_without_500(self, client):
        session_id = client.post("/v1/sessions", json={}).json()["id"]
        for resp in (
            client.patch(
                f"/v1/sessions/{session_id}", json={"title": "Renamed chat"}
            ),
            client.delete(f"/v1/sessions/{session_id}"),
        ):
            assert resp.status_code == 200
            assert resp.json()["status"] == "not_implemented"

    def test_patch_and_delete_when_store_supports_writes(self, client):
        store = _WritableSessionStore()
        client.app.state.session_store = store
        session_id = client.post("/v1/sessions", json={}).json()["id"]

        patched = client.patch(
            f"/v1/sessions/{session_id}", json={"title": "Renamed chat"}
        )
        assert patched.status_code == 200
        assert patched.json()["status"] == "updated"
        assert store.sessions[session_id].metadata["title"] == "Renamed chat"

        deleted = client.delete(f"/v1/sessions/{session_id}")
        assert deleted.status_code == 200
        assert deleted.json()["status"] == "deleted"
        assert session_id not in store.sessions

    def test_unknown_session_write_does_not_500(self, client):
        assert (
            client.patch(
                "/v1/sessions/does-not-exist", json={"title": "x"}
            ).status_code
            == 200
        )
        assert client.delete("/v1/sessions/does-not-exist").status_code == 200
