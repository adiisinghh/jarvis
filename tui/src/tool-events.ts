import type { JarvisEvent, ToolCallInfo } from "./client";

const TOOL_EVENT_TYPES = new Set(["tool_call_start", "tool_call_end"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function scalar(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(scalar).join(", ");
  if (isRecord(value)) return JSON.stringify(value);
  return String(value);
}

function paramsFrom(data: Record<string, unknown>): Record<string, unknown> | undefined {
  const raw = data.params ?? data.arguments;
  if (isRecord(raw)) return { ...raw };
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isRecord(parsed)) return parsed;
    } catch {
      // Not JSON-encoded arguments; simply omit the params.
    }
  }
  return undefined;
}

function outcomeFrom(data: Record<string, unknown>): string | undefined {
  const explicit = data.outcome ?? data.error;
  if (explicit !== undefined && explicit !== null && explicit !== false && explicit !== "") {
    return explicit === true ? "error" : scalar(explicit);
  }
  if (data.success === true) return "ok";
  if (data.success === false) return "failed";
  return undefined;
}

/** Translate a tool-call event into a displayable tool call, or ignore it. */
export function parseToolEvent(event: JarvisEvent): ToolCallInfo | null {
  if (!TOOL_EVENT_TYPES.has(event.type)) return null;
  const data = event.data ?? {};
  const info: ToolCallInfo = {
    id: String(data.id ?? event.timestamp ?? event.type),
    tool: String(data.tool ?? data.tool_name ?? "tool"),
  };
  const params = paramsFrom(data);
  if (params) info.params = params;
  const outcome = outcomeFrom(data);
  if (outcome) info.outcome = outcome;
  return info;
}

/** Compact one-line representation, e.g. `shell_exec [a1] ok`. */
export function formatToolCall(info: ToolCallInfo): string {
  const base = `${info.tool} [${info.id}]`;
  return info.outcome ? `${base} ${info.outcome}` : base;
}
