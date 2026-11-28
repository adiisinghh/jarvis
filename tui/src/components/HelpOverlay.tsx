import { formatKeymap } from "../keymap";
import { theme } from "../theme";

/** Keyboard help panel toggled with `?`. */
export function HelpOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <box
      title="Jarvis keys"
      style={{
        border: true,
        borderColor: theme.borderFocused,
        backgroundColor: theme.surface,
        padding: 1,
        width: 40,
        flexDirection: "column",
      }}
    >
      {formatKeymap().map((line, index) => (
        <text key={index} fg={theme.text} content={line} />
      ))}
      <text fg={theme.muted} content="Press ? or escape to close" />
    </box>
  );
}
