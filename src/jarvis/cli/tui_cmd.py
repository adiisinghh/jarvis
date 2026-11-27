"""Launch the Jarvis terminal user interface."""
from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import Any

import click

from jarvis.core.config import load_config


def _binary_path() -> Path:
    """Return the compiled TUI binary shipped in the source checkout."""
    return Path(__file__).resolve().parents[3] / "tui" / "dist" / "jarvis-tui"


def _configured_api_key(cfg: Any) -> str:
    """Match `jarvis serve` key resolution: env first, then raw TOML."""
    key = os.environ.get("JARVIS_API_KEY", "")
    if key:
        return key
    try:
        from jarvis.core.paths import get_config_path

        import tomllib

        path = get_config_path()
        if path.exists():
            raw = tomllib.loads(path.read_text(encoding="utf-8"))
            return str(raw.get("server", {}).get("auth", {}).get("api_key", ""))
    except Exception:
        pass
    return ""


@click.command("tui")
@click.option("--url", default=None, help="Jarvis server base URL.")
@click.option("--api-key", default=None, help="Jarvis API key.")
@click.option("--model", default=None, help="Model to chat with.")
def tui(url: str | None, api_key: str | None, model: str | None) -> None:
    """Start the terminal chat interface (requires `make build-tui`)."""
    cfg = load_config()
    host = cfg.server.host if cfg.server.host not in {"", "0.0.0.0", "::"} else "127.0.0.1"
    base = url or f"http://{host}:{cfg.server.port}"

    binary = _binary_path()
    if not binary.exists():
        raise click.ClickException("TUI is not built. Run `make build-tui` first.")

    env = dict(os.environ)
    env["JARVIS_URL"] = base
    env["JARVIS_MODEL"] = model or ""
    resolved_key = api_key if api_key is not None else _configured_api_key(cfg)
    if resolved_key:
        env["JARVIS_API_KEY"] = resolved_key
    else:
        env.pop("JARVIS_API_KEY", None)

    subprocess.run([str(binary)], env=env, check=True)
