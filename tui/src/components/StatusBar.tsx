import type { Metrics } from "../store";
import { statusColor, theme } from "../theme";

/** Bottom status line: model, session, telemetry, and current status. */
export function StatusBar({ status, model, session, metrics }: {
  status: string;
  model: string;
  session?: string;
  metrics?: Metrics;
}) {
  const tokens = metrics?.tokens !== undefined ? `${metrics.tokens} tok` : "0 tok";
  const latency = metrics?.latencyMs !== undefined ? `${Math.round(metrics.latencyMs)} ms` : "— ms";
  const energy = metrics?.energyJ !== undefined ? `${metrics.energyJ.toFixed(2)} J` : "— J";

  return (
    <box style={{ flexDirection: "row", gap: 2, backgroundColor: theme.surface }}>
      <text fg={theme.accent} content={model || "no model"} />
      <text fg={theme.muted} content={session ? `session ${session.slice(0, 8)}` : "new session"} />
      <text fg={theme.muted} content={tokens} />
      <text fg={theme.muted} content={latency} />
      <text fg={theme.muted} content={energy} />
      <text fg={statusColor(status)} content={status} />
      <text fg={theme.muted} content="?: help  ctrl+p: panel  ctrl+q: quit" />
    </box>
  );
}
