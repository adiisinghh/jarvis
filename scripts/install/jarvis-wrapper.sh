#!/usr/bin/env bash
# jarvis-wrapper.sh — symlinked to ~/.local/bin/jarvis.
# Activates the managed venv and execs the real jarvis CLI.

JARVIS_HOME="${JARVIS_HOME:-$HOME/.jarvis}"
VENV="$JARVIS_HOME/.venv"

if [[ ! -d "$VENV" ]]; then
    echo "jarvis: venv not found at $VENV" >&2
    echo "Re-run the installer: curl -fsSL https://raw.githubusercontent.com/adiisinghh/jarvis/main/scripts/install/install.sh | bash" >&2
    exit 1
fi

exec "$VENV/bin/jarvis" "$@"
