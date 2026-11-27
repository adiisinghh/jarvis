import type { Message } from "./store";

/** One-line rendering of a message, used by the transcript. */
export function formatMessage(message: Message): string {
  return `${message.role === "user" ? "you" : "jarvis"}: ${message.content}`;
}
