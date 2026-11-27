import { formatMessage } from "../format";
import type { Message } from "../store";
import { theme } from "../theme";

/** Scrollable conversation history. */
export function Transcript({ messages }: { messages: Message[] }) {
  return (
    <scrollbox
      style={{ backgroundColor: theme.background, flexGrow: 1 }}
      focused
    >
      {messages.map((message, index) => (
        <text
          key={index}
          fg={message.role === "user" ? theme.accent : theme.text}
          content={formatMessage(message)}
        />
      ))}
    </scrollbox>
  );
}
