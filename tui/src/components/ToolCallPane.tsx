import type { ToolCallInfo } from "../client";
import { formatToolCall } from "../tool-events";
import { theme } from "../theme";

const META_KEYS = ["taint", "capability", "risk"] as const;

function metaValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(metaValue).join(", ") || "none";
  if (value !== null && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Metadata attached to a call, e.g. `taint: secret`. */
export function toolCallMetadata(info: ToolCallInfo): string[] {
  if (!info.params) return [];
  return META_KEYS.flatMap((key) => {
    const value = info.params?.[key];
    if (value === undefined || value === null || value === "") return [];
    return [`${key}: ${metaValue(value)}`];
  });
}

function outcomeColor(outcome?: string): string {
  if (!outcome) return theme.warning;
  const value = outcome.toLowerCase();
  if (value.includes("error") || value.includes("fail")) return theme.error;
  if (value === "ok" || value.includes("success")) return theme.success;
  return theme.warning;
}

/** Read-only list of observed tool calls and their security metadata. */
export function ToolCallPane({ calls }: { calls: ToolCallInfo[] }) {
  if (calls.length === 0) {
    return <text fg={theme.muted} content="No tool calls yet" />;
  }

  return (
    <scrollbox style={{ backgroundColor: theme.background, flexGrow: 1 }}>
      {calls.map((call) => {
        const metadata = toolCallMetadata(call);
        return (
          <box key={call.id} style={{ flexDirection: "column" }}>
            <text fg={outcomeColor(call.outcome)} content={formatToolCall(call)} />
            {metadata.map((line, index) => (
              <text key={index} fg={theme.muted} content={`  ${line}`} />
            ))}
          </box>
        );
      })}
    </scrollbox>
  );
}
