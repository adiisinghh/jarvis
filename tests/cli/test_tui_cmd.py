from types import SimpleNamespace

import pytest
from click.testing import CliRunner

from jarvis.cli import tui_cmd
from jarvis.cli.tui_cmd import tui


def _config(host: str = "127.0.0.1", port: int = 8000) -> SimpleNamespace:
    return SimpleNamespace(server=SimpleNamespace(host=host, port=port))


def _stub_workspace(monkeypatch, tmp_path):
    workspace = tmp_path / "opencode"
    workspace.mkdir()
    monkeypatch.setattr(tui_cmd, "_workspace_path", lambda: workspace)
    monkeypatch.setattr(tui_cmd, "_find_bun", lambda: "/usr/bin/bun")
    return workspace


def _record_run(monkeypatch) -> dict[str, object]:
    seen: dict[str, object] = {}

    def fake_run(cmd, *, cwd, env, check) -> None:
        seen["cmd"] = cmd
        seen["cwd"] = cwd
        seen["env"] = env
        seen["check"] = check

    monkeypatch.setattr(tui_cmd.subprocess, "run", fake_run)
    return seen


def test_tui_launches_vendored_workspace_with_config(monkeypatch, tmp_path):
    workspace = _stub_workspace(monkeypatch, tmp_path)
    monkeypatch.setattr(tui_cmd, "load_config", lambda: _config(host="0.0.0.0", port=8123))
    monkeypatch.setattr(tui_cmd, "_configured_api_key", lambda _cfg: "")
    monkeypatch.delenv("JARVIS_API_KEY", raising=False)
    monkeypatch.delenv("OPENCODE_PASSWORD", raising=False)
    seen = _record_run(monkeypatch)

    result = CliRunner().invoke(tui, ["--model", "qwen3:8b"])

    assert result.exit_code == 0, result.output
    assert seen["cmd"] == [
        "/usr/bin/bun",
        "run",
        "--cwd",
        "packages/cli",
        "src/index.ts",
        "--server",
        "http://127.0.0.1:8123",
    ]
    assert seen["cwd"] == str(workspace)
    assert seen["check"] is True
    assert seen["env"]["JARVIS_URL"] == "http://127.0.0.1:8123"
    assert seen["env"]["JARVIS_MODEL"] == "qwen3:8b"
    assert "OPENCODE_PASSWORD" not in seen["env"]


@pytest.mark.parametrize(
    "host, expected",
    [
        ("0.0.0.0", "http://127.0.0.1:8123"),
        ("::", "http://127.0.0.1:8123"),
        ("", "http://127.0.0.1:8123"),
        ("localhost", "http://localhost:8123"),
    ],
)
def test_tui_translates_bind_host_to_client_url(monkeypatch, tmp_path, host, expected):
    _stub_workspace(monkeypatch, tmp_path)
    monkeypatch.setattr(tui_cmd, "load_config", lambda: _config(host=host, port=8123))
    monkeypatch.setattr(tui_cmd, "_configured_api_key", lambda _cfg: "")
    seen = _record_run(monkeypatch)

    result = CliRunner().invoke(tui, [])

    assert result.exit_code == 0, result.output
    assert seen["env"]["JARVIS_URL"] == expected
    assert seen["cmd"][-1] == expected


def test_tui_url_and_api_key_flags_are_used(monkeypatch, tmp_path):
    _stub_workspace(monkeypatch, tmp_path)
    monkeypatch.setattr(tui_cmd, "load_config", lambda: _config(port=8123))
    monkeypatch.setattr(tui_cmd, "_configured_api_key", lambda _cfg: "config-key")
    seen = _record_run(monkeypatch)

    result = CliRunner().invoke(
        tui, ["--url", "http://example.test:9000", "--api-key", "flag-key", "--model", "m1"]
    )

    assert result.exit_code == 0, result.output
    assert seen["env"]["JARVIS_URL"] == "http://example.test:9000"
    assert seen["env"]["JARVIS_MODEL"] == "m1"
    assert seen["env"]["OPENCODE_PASSWORD"] == "flag-key"
    assert seen["cmd"][-1] == "http://example.test:9000"


def test_tui_maps_env_api_key_to_opencode_password(monkeypatch, tmp_path):
    _stub_workspace(monkeypatch, tmp_path)
    monkeypatch.setattr(tui_cmd, "load_config", lambda: _config())
    monkeypatch.setenv("JARVIS_API_KEY", "env-key")
    seen = _record_run(monkeypatch)

    result = CliRunner().invoke(tui, [])

    assert result.exit_code == 0, result.output
    assert seen["env"]["OPENCODE_PASSWORD"] == "env-key"


def test_tui_reads_api_key_from_raw_config(monkeypatch, tmp_path):
    _stub_workspace(monkeypatch, tmp_path)
    config_file = tmp_path / "config.toml"
    config_file.write_text('[server.auth]\napi_key = "toml-key"\n', encoding="utf-8")
    monkeypatch.setattr("jarvis.core.paths.get_config_path", lambda: config_file)
    monkeypatch.setattr(tui_cmd, "load_config", lambda: _config())
    monkeypatch.delenv("JARVIS_API_KEY", raising=False)
    seen = _record_run(monkeypatch)

    result = CliRunner().invoke(tui, [])

    assert result.exit_code == 0, result.output
    assert seen["env"]["OPENCODE_PASSWORD"] == "toml-key"


def test_tui_reports_missing_workspace(monkeypatch, tmp_path):
    monkeypatch.setattr(tui_cmd, "_workspace_path", lambda: tmp_path / "missing")
    result = CliRunner().invoke(tui, [])
    assert result.exit_code != 0
    assert "make build-tui" in result.output
    assert "tui/opencode" in result.output


def test_tui_reports_missing_bun(monkeypatch, tmp_path):
    workspace = tmp_path / "opencode"
    workspace.mkdir()
    monkeypatch.setattr(tui_cmd, "_workspace_path", lambda: workspace)
    monkeypatch.setattr(tui_cmd, "_find_bun", lambda: None)
    result = CliRunner().invoke(tui, [])
    assert result.exit_code != 0
    assert "bun" in result.output
