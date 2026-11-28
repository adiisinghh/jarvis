# Terminal UI

Jarvis includes an OpenCode-inspired terminal interface. It talks to the same
local server and API key as `jarvis gui`, so you can switch between the two
without losing your configuration.

## Prerequisites

- [Bun](https://bun.sh) 1.4.4 (only needed to build the TUI)
- A built TUI binary in the source checkout

```bash
make build-tui          # installs TUI dependencies and compiles tui/dist/jarvis-tui
```

### Release binaries

For distributable, self-contained builds compile one binary per target:

```bash
make release-tui
```

Artifacts land in `tui/dist/`, named per target (for example
`jarvis-tui-linux-x64`, `jarvis-tui-darwin-arm64`, and
`jarvis-tui-windows-x64.exe`). Copy the binary for your platform somewhere on
your `PATH` and run it directly, or keep using `jarvis tui` from the checkout.

## Run

```bash
jarvis tui
jarvis tui --model qwen3:8b
jarvis tui --url http://127.0.0.1:8000 --api-key "$JARVIS_API_KEY"
```

Flags:

| Flag | Default | Description |
|---|---|---|
| `--url` | `http://<server.host>:<server.port>` | Jarvis server base URL |
| `--api-key` | `JARVIS_API_KEY` env / config | API key for a key-protected server |
| `--model` | empty | Model ID to chat with |

The TUI uses `JARVIS_URL`, `JARVIS_API_KEY`, and `JARVIS_MODEL` environment
variables internally. `0.0.0.0` in the server config is translated to
`127.0.0.1` for the client.

## Keys and layout

- Type a message and press **Enter** to send. **Shift/Enter** style multiline
  editing is available through the textarea.
- **↑ / ↓** walk prompt history; **Tab** accepts an autocomplete suggestion.
- Type `/` for command completion (`/help`, `/model`, `/clear`, …) or `@` for
  file/path completion.
- **?** toggles the keyboard help overlay; **Escape** closes it.
- **Ctrl+P** toggles the scrollable side panel with session management, model
  and agent pickers, pending approvals, tool-call details, unified diffs, a
  shell pane, file/worktree pickers, and MCP/plugin listings. **Ctrl+Q** quits.
- The shell pane runs commands through the selected agent; tool approvals still
  flow through the approval panel when the server requires them.
- Single-letter shortcuts are Ctrl-prefixed so they never steal typed text.
- The tab strip at the top switches sessions. The status line shows the model,
  session, tokens, latency, energy, and current status.

## Reconnect and telemetry

The TUI subscribes to agent events over a WebSocket. If the connection drops —
for example during a brief server restart — it reconnects automatically with
backoff, so you do not need to relaunch the client.

Telemetry is **disabled by default**. It is only enabled when both
`JARVIS_TUI_TELEMETRY=1` and `JARVIS_TUI_TELEMETRY_URL` are set; otherwise the
TUI collects and sends no telemetry.

## Troubleshooting

- **Server not running / connection refused** — the TUI talks to the same local
  server as `jarvis gui`. Start it with `jarvis serve` or `jarvis gui`, or pass
  `--url` pointing at a running server. `jarvis doctor` reports server status.
- **Wrong API key (401 / 403)** — pass the server's key with `--api-key` or set
  `JARVIS_API_KEY`; the same key used by `jarvis gui` works here.
- **Bun is missing** — `make build-tui` requires [Bun](https://bun.sh) 1.4.4.
  Install it first, or run the prebuilt binary from `tui/dist/` instead of
  rebuilding.
- **Large binary** — the compiled `tui/dist/jarvis-tui` bundles the Bun runtime
  and OpenTUI native libraries, so it is roughly 130 MB. That is expected; use
  the packaged release artifact if download size matters.

## Development

```bash
cd tui
bun install
bun test
bun run typecheck
bun run dev           # run from source instead of the compiled binary
```

The TUI source lives in `tui/`. It is a standalone Bun/TypeScript package using
OpenTUI and React 19; see `THIRD_PARTY_NOTICES.md` for attribution.
