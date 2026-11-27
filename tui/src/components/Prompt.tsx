import { useState } from "react";
import { theme } from "../theme";

/** Single-line input with an OpenCode-like prompt marker. */
export function Prompt({ onSubmit, disabled }: {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  function submit(text: string) {
    if (!text.trim() || disabled) return;
    onSubmit(text);
    setValue("");
  }

  return (
    <box style={{ border: true, borderColor: theme.borderFocused, height: 3, backgroundColor: theme.surface }}>
      <text content="> " fg={theme.accent} />
      <input
        placeholder="Ask Jarvis…"
        focused
        onInput={setValue}
        onSubmit={submit}
      />
    </box>
  );
}
