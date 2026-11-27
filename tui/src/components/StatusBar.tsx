import { statusColor, theme } from "../theme";

/** Bottom status line: model, session, and current status. */
export function StatusBar({ status, model, session }: {
  status: string;
  model: string;
  session?: string;
}) {
  return (
    <box style={{ flexDirection: "row", gap: 2, backgroundColor: theme.surface }}>
      <text fg={theme.accent} content={model || "no model"} />
      <text fg={theme.muted} content={session ? `session ${session.slice(0, 8)}` : "new session"} />
      <text fg={statusColor(status)} content={status} />
      <text fg={theme.muted} content="q: quit" />
    </box>
  );
}
