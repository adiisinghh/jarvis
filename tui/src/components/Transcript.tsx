import { classifyLine, formatMessageLines, type LineKind } from "../transcript-format";
import type { Message } from "../store";
import { kindColor, theme } from "../theme";

function prefix(kind: LineKind): string {
  switch (kind) {
    case "code": return "  ";
    case "tool": return "⚙ ";
    case "error": return "! ";
    default: return "";
  }
}

/** Scrollable, styled conversation history with a streaming cursor. */
export function Transcript({ messages, streaming }: {
  messages: Message[];
  streaming?: boolean;
}) {
  const flat: { key: string; kind: LineKind; text: string }[] = [];
  messages.forEach((message, index) => {
    formatMessageLines(message).forEach((line, lineIndex) => {
      const classified = classifyLine(line);
      flat.push({
        key: `${index}-${lineIndex}`,
        kind: classified.kind,
        text: `${prefix(classified.kind)}${classified.text}`,
      });
    });
  });

  const lastAssistant = messages.at(-1)?.role === "assistant";

  return (
    <scrollbox style={{ backgroundColor: theme.background, flexGrow: 1 }} focused>
      {flat.map((line) => (
        <text key={line.key} fg={kindColor(line.kind)} content={line.text} />
      ))}
      {streaming && lastAssistant && <text fg={theme.accent} content="▍" />}
    </scrollbox>
  );
}
