import { useEffect, useReducer, useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { JarvisClient } from "./client";
import { mapEvent } from "./events";
import { initialState, reduce } from "./store";
import { commandForKey } from "./keymap";
import { Frame } from "./components/Frame";
import { Transcript } from "./components/Transcript";
import { Prompt } from "./components/Prompt";
import { StatusBar } from "./components/StatusBar";
import { Spinner } from "./components/Spinner";
import { SessionTabs } from "./components/SessionTabs";
import { HelpOverlay } from "./components/HelpOverlay";

export function App({ client, model }: { client: JarvisClient; model: string }) {
  const [state, dispatch] = useReducer(reduce, { ...initialState, model });
  const [helpVisible, setHelpVisible] = useState(false);

  useEffect(() => {
    void client.listSessions()
      .then((sessions) => dispatch({ type: "sessions", value: sessions }))
      .catch(() => undefined);
  }, [client]);

  useEffect(() => {
    return client.subscribe((event) => {
      const data = event.data ?? {};
      if (data.tokens !== undefined || data.latency_ms !== undefined || data.energy_j !== undefined) {
        dispatch({
          type: "metrics",
          value: {
            tokens: typeof data.tokens === "number" ? data.tokens : undefined,
            latencyMs: typeof data.latency_ms === "number" ? data.latency_ms : undefined,
            energyJ: typeof data.energy_j === "number" ? data.energy_j : undefined,
          },
        });
      }
      const mapped = mapEvent(event);
      if (!mapped) return;
      dispatch({ type: "event", text: mapped.text });
      if (mapped.kind === "status" || mapped.kind === "error") {
        dispatch({ type: "status", text: mapped.text });
      }
    });
  }, [client]);

  useKeyboard((key) => {
    switch (commandForKey(key.name)) {
      case "help":
        setHelpVisible((visible) => !visible);
        break;
      case "escape":
        setHelpVisible(false);
        break;
      case "quit":
        process.exit(0);
        break;
      default:
        break;
    }
  });

  async function send(text: string) {
    dispatch({ type: "user", text });
    dispatch({ type: "assistant-start" });
    try {
      for await (const token of client.chat(state.model, [{ role: "user", content: text }])) {
        dispatch({ type: "token", text: token });
      }
      dispatch({ type: "status", text: "Ready" });
    } catch (error) {
      dispatch({ type: "status", text: `Error: ${String(error)}` });
    }
  }

  const busy = state.status !== "Ready";

  return (
    <box style={{ flexDirection: "column", height: "100%", backgroundColor: "#0d0d0d" }}>
      <SessionTabs
        sessions={state.sessions}
        activeId={state.sessionId}
        onSelect={(id) => dispatch({ type: "active-session", text: id })}
      />
      <Frame title="Jarvis">
        <Transcript messages={state.messages} streaming={busy} />
      </Frame>
      <box style={{ flexDirection: "row", gap: 1, backgroundColor: "#181818" }}>
        <Spinner busy={busy} />
        <Frame title="Events" style={{ height: 4 }}>
          {state.events.slice(-3).map((line, index) => (
            <text key={index} content={line} />
          ))}
        </Frame>
      </box>
      <Frame title="Prompt">
        <Prompt onSubmit={(text) => void send(text)} disabled={busy} />
      </Frame>
      <StatusBar
        status={state.status}
        model={state.model}
        session={state.sessionId}
        metrics={state.metrics}
      />
      <HelpOverlay visible={helpVisible} />
    </box>
  );
}
