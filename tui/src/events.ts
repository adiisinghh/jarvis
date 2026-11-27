import type { JarvisEvent } from "./client";

export type UiEvent = { kind: "status" | "tool" | "error"; text: string };

/** Translate Jarvis's EventBus vocabulary into displayable lines. */
export function mapEvent(event: JarvisEvent): UiEvent | null {
  const tool = String(event.data?.tool ?? "tool");
  switch (event.type) {
    case "inference_start":
      return { kind: "status", text: "Thinking…" };
    case "inference_end":
      return { kind: "status", text: "Ready" };
    case "tool_call_start":
      return { kind: "tool", text: `Calling ${tool}` };
    case "tool_call_end":
      return { kind: "tool", text: `Finished ${tool}` };
    case "agent_tick_error":
    case "error":
      return { kind: "error", text: String(event.data?.message ?? "Error") };
    default:
      return null;
  }
}
