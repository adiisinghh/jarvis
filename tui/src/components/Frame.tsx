import type { ReactNode } from "react";
import { theme } from "../theme";

/** Rounded, titled container used for each major TUI region. */
export function Frame({ title, children, style }: {
  title?: string;
  children?: ReactNode;
  style?: Record<string, unknown>;
}) {
  return (
    <box
      title={title}
      style={{
        border: true,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        padding: 1,
        flexDirection: "column",
        ...style,
      }}
    >
      {children}
    </box>
  );
}
