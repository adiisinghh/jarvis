import type { Message } from "./store";

export type LineKind = "text" | "code" | "tool" | "error";

export type DisplayLine = { kind: LineKind; text: string };

/** Classify a single line so the transcript can style code, tools and errors. */
export function classifyLine(line: string): DisplayLine {
  if (line.startsWith("```")) return { kind: "code", text: line.slice(3) };
  if (line.startsWith("tool:")) return { kind: "tool", text: line.slice(5).trim() };
  if (/^error\b/i.test(line)) return { kind: "error", text: line };
  return { kind: "text", text: line };
}

/** Split a message into display lines; only the first line carries the role. */
export function formatMessageLines(message: Message): string[] {
  const label = message.role === "user" ? "you" : "jarvis";
  const lines = message.content.split("\n");
  if (lines.length === 0) return [`${label}: `];
  return [`${label}: ${lines[0]}`, ...lines.slice(1)];
}
