import { useRef, useState } from "react";
import type { TextareaRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { suggestions } from "../autocomplete";
import { theme } from "../theme";

/** Multiline prompt with history and slash/@ autocomplete. */
export function Prompt({ onSubmit, disabled }: {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}) {
  const input = useRef<TextareaRenderable>(null);
  const history = useRef<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const [matches, setMatches] = useState<string[]>([]);

  function refreshSuggestions() {
    const text = input.current?.plainText ?? "";
    setMatches(text.startsWith("/") || text.startsWith("@") ? suggestions(text) : []);
  }

  useKeyboard((key) => {
    if (disabled) return;
    const current = input.current?.plainText ?? "";

    if (key.name === "up" && history.current.length > 0) {
      const next = Math.min(cursor + 1, history.current.length - 1);
      setCursor(next);
      input.current?.setText(history.current[next] ?? "");
      refreshSuggestions();
      return;
    }
    if (key.name === "down" && cursor >= 0) {
      const next = cursor - 1;
      setCursor(next);
      input.current?.setText(next >= 0 ? history.current[next] ?? "" : "");
      refreshSuggestions();
      return;
    }
    if (key.name === "tab" && matches.length > 0) {
      const chosen = matches[0];
      input.current?.setText(chosen);
      setMatches([]);
      return;
    }
    if (key.name === "return" && current.trim()) {
      history.current = [current, ...history.current].slice(0, 50);
      setCursor(-1);
      setMatches([]);
      input.current?.clear();
      onSubmit(current);
    }
  });

  return (
    <box style={{ backgroundColor: theme.surface }}>
      {matches.length > 0 && (
        <text fg={theme.muted} content={matches.join("   ")} />
      )}
      <box style={{ border: true, borderColor: theme.borderFocused, height: 4, flexDirection: "row" }}>
        <text fg={theme.accent} content="> " />
        <textarea
          ref={input}
          placeholder="Ask Jarvis…"
          focused
          onContentChange={refreshSuggestions}
          onKeyDown={() => refreshSuggestions()}
        />
      </box>
    </box>
  );
}
