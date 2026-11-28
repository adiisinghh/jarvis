"""Launch the vendored OpenCode terminal user interface."""
from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

import click

from jarvis.core.config import load_config

# Bind addresses mean "listen everywhere" for the server, but the client must
# connect through loopback instead.
_LOOPBACK_HOSTS = {"", "0.0.0.0", "::", "[::]"}


def _workspace_path() -> Path:
    """Return the root of the vendored OpenCode workspace."""
    return Path(__file__).resolve().parents[3] / "tui" / "opencode"


def _find_bun() -> str | None:
    """Locate the Bun executable on PATH."""
    return shutil.which("bun")


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


def _base_url(url: str | None, cfg: Any) -> str:
    """Resolve the Jarvis base URL from a flag or the server configuration."""
    if url:
        return url
    host = cfg.server.host
    if host in _LOOPBACK_HOSTS:
        host = "127.0.0.1"
    elif ":" in host and not host.startswith("["):
        host = f"[{host}]"
    return f"http://{host}:{cfg.server.port}"


@click.command("tui")
@click.option("--url", default=None, help="Jarvis server base URL.")
@click.option("--api-key", default=None, help="Jarvis API key.")
@click.option("--model", default=None, help="Model to chat with.")
def tui(url: str | None, api_key: str | None, model: str | None) -> None:
    """Start the terminal chat interface (vendored OpenCode TUI)."""
    workspace = _workspace_path()
    if not workspace.is_dir():
        raise click.ClickException(
            f"Vendored TUI workspace not found at {workspace}. "
            "`make build-tui` has been replaced by a vendored-workspace setup; "
            "restore tui/opencode from the vendored OpenCode source tree."
        )

    bun = _find_bun()
    if not bun:
        raise click.ClickException(
            "bun not found on PATH. Install Bun (https://bun.sh) to run `jarvis tui`."
        )

    cfg = load_config()
    base = _base_url(url, cfg)
    resolved_key = api_key if api_key is not None else _configured_api_key(cfg)

    env = dict(os.environ)
    env["JARVIS_URL"] = base
    env["JARVIS_MODEL"] = model or ""
    if resolved_key:
        # OpenCode's client authenticates with Basic auth via this variable;
        # Jarvis keeps its own Bearer-style key in JARVIS_API_KEY.
        env["OPENCODE_PASSWORD"] = resolved_key
    else:
        env.pop("OPENCODE_PASSWORD", None)

    cmd = [bun, "run", "--cwd", "packages/cli", "src/index.ts", "--server", base]
    subprocess.run(cmd, cwd=str(workspace), env=env, check=True)
