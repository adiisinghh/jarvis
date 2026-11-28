"""Phase 4 read-only API endpoints used by the Jarvis TUI.

Covers ``/v1/files``, ``/v1/worktrees`` and ``/v1/plugins`` without a running
``jarvis serve`` instance, following the router-only app pattern from
``test_phase3_routes.py``. All three endpoints must degrade to an empty list
instead of leaking filesystem paths or returning a 500.
"""

from __future__ import annotations

from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from jarvis.server import api_routes  # noqa: E402
from jarvis.server.api_routes import (  # noqa: E402
    files_router,
    plugins_router,
    worktrees_router,
)


@pytest.fixture
def client(tmp_path):
    """Minimal app with only the Phase 4 routers mounted."""
    app = FastAPI()
    app.include_router(files_router)
    app.include_router(worktrees_router)
    app.include_router(plugins_router)
    return TestClient(app)


class TestFiles:
    def test_default_listing_returns_200_and_a_list(self, client):
        resp = client.get("/v1/files")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data["files"], list)
        assert data["path"] == "."

    def test_lists_names_inside_configured_workspace(
        self, client, tmp_path, monkeypatch
    ):
        (tmp_path / "notes.txt").write_text("hello")
        (tmp_path / "sub").mkdir()
        (tmp_path / ".env").write_text("SECRET=1")
        monkeypatch.setenv("JARVIS_WORKSPACE", str(tmp_path))

        resp = client.get("/v1/files")
        assert resp.status_code == 200
        files = resp.json()["files"]
        assert "notes.txt" in files
        assert "sub" in files
        # Sensitive files are never advertised by the listing.
        assert ".env" not in files

    def test_traversal_attempt_does_not_leak_paths_or_500(self, client):
        resp = client.get("/v1/files", params={"path": "../../../../etc"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["files"] == []
        assert data.get("status") == "empty"
        # No resolved workspace path or host file is disclosed.
        assert str(Path.cwd()) not in resp.text
        assert "/etc/passwd" not in resp.text

    def test_absolute_path_outside_workspace_is_denied(self, client):
        resp = client.get("/v1/files", params={"path": "/etc"})
        assert resp.status_code == 200
        assert resp.json()["files"] == []
        assert "/etc/passwd" not in resp.text

    def test_any_error_degrades_to_empty_list(self, client, monkeypatch):
        def _boom(request):
            raise RuntimeError("policy backend offline")

        monkeypatch.setattr(api_routes, "_workspace_roots", _boom)
        resp = client.get("/v1/files")
        assert resp.status_code == 200
        assert resp.json()["files"] == []
        assert resp.json()["status"] == "empty"


class TestWorktrees:
    def test_returns_200_and_a_list(self, client):
        resp = client.get("/v1/worktrees")
        assert resp.status_code == 200
        worktrees = resp.json()["worktrees"]
        assert isinstance(worktrees, list)
        assert all(isinstance(path, str) for path in worktrees)

    def test_missing_git_degrades_to_empty_list(self, client, monkeypatch):
        def _boom(*args, **kwargs):
            raise FileNotFoundError("git")

        monkeypatch.setattr(api_routes.subprocess, "run", _boom)
        resp = client.get("/v1/worktrees")
        assert resp.status_code == 200
        data = resp.json()
        assert data["worktrees"] == []
        assert data.get("status") == "empty"


class TestPlugins:
    def test_returns_200_and_a_list(self, client):
        resp = client.get("/v1/plugins")
        assert resp.status_code == 200
        data = resp.json()
        plugins = data["plugins"]
        assert isinstance(plugins, list)
        for plugin in plugins:
            assert set(plugin) == {"id", "kind"}
            assert plugin["id"]
            assert plugin["kind"]
        if not plugins:
            assert data["status"] == "empty"

    def test_broken_loaders_degrade_to_empty_list(self, client, monkeypatch):
        monkeypatch.setattr(
            "jarvis.recipes.loader.discover_recipes",
            lambda: (_ for _ in ()).throw(RuntimeError("recipes offline")),
        )
        monkeypatch.setattr(
            "jarvis.skills.loader.discover_skills",
            lambda directory: (_ for _ in ()).throw(RuntimeError("skills offline")),
        )
        resp = client.get("/v1/plugins")
        assert resp.status_code == 200
        data = resp.json()
        assert data["plugins"] == []
        assert data["status"] == "empty"
