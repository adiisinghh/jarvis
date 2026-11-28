# Terminal UI

`jarvis tui` launches the vendored **OpenCode v2.4.2** terminal interface:
OpenCode's own prompt, transcript, dialogs, diff viewer, and status line, with
Jarvis branding where visible. It connects to the running Jarvis server through
an OpenCode-compatible `/api/*` shim, using the same server and API key as
`jarvis gui`, so switching between the two keeps your configuration.

!!! note
    The earlier hand-written React TUI under `tui/src` is legacy. `jarvis tui`
    now launches the vendored OpenCode TUI from `tui/opencode/`.

## Setup

Prerequisites:

- A running Jarvis server — start one with `jarvis serve` or `jarvis gui`.
- [Bun](https://bun.sh) 1.4.4 for a source checkout.

Install the vendored workspace dependencies **once** from a source checkout:

```bash
cd tui/opencode && bun install
```

## Launch

```bash
jarvis tui
jarvis tui --model qwen3:8b
jarvis tui --url http://127.0.0.1:8000 --api-key "$JARVIS_API_KEY"
```

| Flag | Default | Description |
|---|---|---|
| `--url` | derived from Jarvis server config (`http://<host>:<port>`) | Base URL of the running Jarvis server that exposes the `/api/*` shim |
| `--api-key` | `JARVIS_API_KEY` env / config | API key for a key-protected server |
| `--model` | empty | Default model for the session |

A server host of `0.0.0.0` in the config is translated to `127.0.0.1` for the
client.

## Authentication

Jarvis protects its API with `JARVIS_API_KEY` (Bearer), while the OpenCode TUI
expects a password (`OPENCODE_PASSWORD`, Basic auth). `jarvis tui` maps
`JARVIS_API_KEY` / `--api-key` to `OPENCODE_PASSWORD` automatically. A keyless
loopback server needs no key — leave both unset. Use the same key that
`jarvis gui` uses.

## Key bindings

These are OpenCode's own defaults. The **leader key is `Ctrl+X`**: press it,
then press the second key (for example `Ctrl+X` then `N` for a new session).

Everyday keys:

| Action | Keys |
|---|---|
| Submit prompt | `Enter` |
| Insert a newline instead of submitting | `Shift+Enter`, `Ctrl+Enter`, `Alt+Enter`, or `Ctrl+J` |
| Interrupt the current session | `Escape` |
| Clear the input | `Ctrl+C` |
| Previous / next prompt in history | `Up` / `Down` |
| Accept an autocomplete suggestion | `Tab` (dismiss with `Escape`) |
| Command palette | `Ctrl+P` |
| Open recent sessions and projects | `Ctrl+O` |
| Next / previous session tab | `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| Next agent | `Shift+Tab` |
| Cycle recent models | `F2` / `Shift+F2` |
| Page through the transcript | `PageUp` / `PageDown` |
| First / last message | `Ctrl+G` / `Ctrl+Alt+G` |
| Exit the TUI | `Ctrl+C` or `Ctrl+D` |

Leader combinations:

| Action | Keys |
|---|---|
| New session | `Ctrl+X` `N` |
| List sessions | `Ctrl+X` `L` |
| Toggle the sidebar | `Ctrl+X` `B` |
| Toggle the terminal pane | `Ctrl+X` `T` |
| List models | `Ctrl+X` `M` |
| List agents | `Ctrl+X` `A` |
| View status | `Ctrl+X` `S` |
| Open the external editor | `Ctrl+X` `E` |
| Compact the session | `Ctrl+X` `C` |
| Undo / redo a message | `Ctrl+X` `U` / `Ctrl+X` `R` |
| Copy a message | `Ctrl+X` `Y` |
| Export a session | `Ctrl+X` `X` |

The full shortcut sheet is available through the which-key panel
(`Ctrl+Alt+K`). Open the built-in help dialog with the command palette
(`Ctrl+P`, then choose **Help**) or with the `/help` command. In the diff
viewer, `]` / `[` jump between hunks and `?` lists the diff-specific keys.

## Running from source

For development you can launch the vendored CLI directly instead of using
`jarvis tui`:

```bash
cd tui/opencode
export OPENCODE_PASSWORD="$JARVIS_API_KEY"   # omit for a keyless server
bun run --cwd packages/cli src/index.ts --server http://127.0.0.1:8000
```

Replace the `--server` URL with your Jarvis server address if it differs.

## Troubleshooting

- **Server not running / connection refused** — the TUI talks to the same
  server as `jarvis gui`. Start it with `jarvis serve` or `jarvis gui`, or pass
  `--url` pointing at a running server. `jarvis doctor` reports server status.
- **Wrong API key (401 / 403)** — pass the server's key with `--api-key` or set
  `JARVIS_API_KEY`; it is mapped to `OPENCODE_PASSWORD` for the TUI. The key
  must match the one used by `jarvis gui`. For a keyless loopback server, leave
  both unset.
- **Bun is missing / dependencies are not installed** — install Bun 1.4.4 and
  run `cd tui/opencode && bun install` once. `jarvis tui` cannot start the
  vendored CLI without `bun` on `PATH`.
- **Broken UI after pulling changes** — re-run `cd tui/opencode && bun install`
  to refresh the vendored workspace dependencies.
- **Forgot a shortcut** — open the which-key panel with `Ctrl+Alt+K`, or use
  `Ctrl+P` and choose **Help**.

## Licensing

The TUI source is vendored from [OpenCode](https://github.com/anomalyco/opencode)
v2.4.2 (MIT License) in `tui/opencode/`. Its license, attribution, and the
licenses of its dependencies are documented in
[`THIRD_PARTY_NOTICES.md`](https://github.com/adiisinghh/jarvis/blob/main/THIRD_PARTY_NOTICES.md).
OpenCode branding is replaced with Jarvis branding where visible; the vendored
code remains under its upstream license.
