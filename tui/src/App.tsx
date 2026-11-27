import { useEffect, useReducer } from "react";
import { useKeyboard } from "@opentui/react";
import type { JarvisClient } from "./client";
import { mapEvent } from "./events";
import { initialState, reduce } from "./store";
import { Frame } from "./components/Frame";
import { Transcript } from "./components/Transcript";
import { Prompt } from "./components/Prompt";
import { StatusBar } from "./components/StatusBar";
import { Spinner } from "./components/Spinner";

export function App({ client, model }: { client: JarvisClient; model: string }) {
  const [state, dispatch] = useReducer(reduce, { ...initialState, model });

  useEffect(() => {
    return client.subscribe((event) => {
      const mapped = mapEvent(event);
      if (!mapped) return;
      dispatch({ type: "event", text: mapped.text });
      if (mapped.kind === "status" || mapped.kind === "error") {
        dispatch({ type: "status", text: mapped.text });
      }
    });
  }, [client]);

  useKeyboard((key) => {
    if (key.name === "q") process.exit(0);
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
      <Frame title="Jarvis">
        <Transcript messages={state.messages} />
      </Frame>
      <box style={{ flexDirection: "row", gap: 1, backgroundColor: "#181818" }}>
        <Spinner busy={busy} />
        <Frame title="Event log" style={{ height: 4 }}>
          {state.events.slice(-3).map((line, index) => (
            <text key={index} content={line} />
          ))}
        </Frame>
      </box>
      <Frame title="Prompt">
        <Prompt onSubmit={(text) => void send(text)} disabled={busy} />
      </Frame>
      <StatusBar status={state.status} model={state.model} session={state.sessionId} />
    </box>
  );
}
