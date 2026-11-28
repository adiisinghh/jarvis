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
- **Ctrl+P** toggles the side panel with session management, model and agent
  pickers, pending approvals, and tool-call details. **Ctrl+Q** quits.
- Single-letter shortcuts are Ctrl-prefixed so they never steal typed text.
- The tab strip at the top switches sessions. The status line shows the model,
  session, tokens, latency, energy, and current status.

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
