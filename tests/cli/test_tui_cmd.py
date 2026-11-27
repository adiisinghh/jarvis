from types import SimpleNamespace

from click.testing import CliRunner

from jarvis.cli import tui_cmd
from jarvis.cli.tui_cmd import tui


def test_tui_launches_binary_with_config(monkeypatch, tmp_path):
    binary = tmp_path / "jarvis-tui"
    binary.write_text("stub", encoding="utf-8")
    monkeypatch.setattr(tui_cmd, "_binary_path", lambda: binary)
    monkeypatch.setattr(
        tui_cmd,
        "load_config",
        lambda: SimpleNamespace(server=SimpleNamespace(host="0.0.0.0", port=8123)),
    )
    monkeypatch.setattr(tui_cmd, "_configured_api_key", lambda _cfg: "")
    seen: dict[str, object] = {}

    def fake_run(cmd: list[str], *, env: dict[str, str], check: bool) -> None:
        seen["cmd"] = cmd
        seen["env"] = env
        seen["check"] = check

    monkeypatch.setattr(tui_cmd.subprocess, "run", fake_run)

    result = CliRunner().invoke(tui, ["--model", "qwen3:8b"])

    assert result.exit_code == 0, result.output
    assert seen["cmd"] == [str(binary)]
    assert seen["check"] is True
    assert seen["env"]["JARVIS_URL"] == "http://127.0.0.1:8123"
    assert seen["env"]["JARVIS_MODEL"] == "qwen3:8b"
    assert "JARVIS_API_KEY" not in seen["env"]


def test_tui_reports_missing_binary(monkeypatch, tmp_path):
    monkeypatch.setattr(tui_cmd, "_binary_path", lambda: tmp_path / "missing")
    result = CliRunner().invoke(tui, [])
    assert result.exit_code != 0
    assert "make build-tui" in result.output
