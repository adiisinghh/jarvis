import { useState } from "react";
import { formatShellLine, shellColor, type ShellLine } from "../shell";
import { theme } from "../theme";

/** Presentational shell history plus a command input; the parent runs commands. */
export function ShellPane({ history, busy, onRun }: {
  history: ShellLine[];
  busy?: boolean;
  onRun: (command: string) => void;
}) {
  const [value, setValue] = useState("");

  function submit(command: string) {
    const trimmed = command.trim();
    if (!trimmed) return;
    onRun(trimmed);
    setValue("");
  }

  return (
    <box style={{ flexDirection: "column", backgroundColor: theme.background, flexGrow: 1 }}>
      {history.length === 0 ? (
        <text fg={theme.muted} content="No commands yet" />
      ) : (
        <scrollbox style={{ flexGrow: 1 }}>
          {history.map((line, index) => (
            <text
              key={index}
              fg={shellColor(line.kind)}
              content={formatShellLine(line.kind, line.text)}
            />
          ))}
        </scrollbox>
      )}
      {busy && <text fg={theme.warning} content="Running command…" />}
      <box style={{ border: true, borderColor: theme.borderFocused, height: 3, flexDirection: "row" }}>
        <text fg={theme.accent} content="$ " />
        <input
          focused
          placeholder="Enter a command…"
          value={value}
          onInput={setValue}
          onSubmit={submit}
        />
      </box>
    </box>
  );
}
