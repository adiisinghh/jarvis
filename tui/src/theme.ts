import type { LineKind } from "./transcript-format";

/** OpenCode-inspired dark palette, adapted for Jarvis branding. */
export const theme = {
  background: "#0d0d0d",
  surface: "#181818",
  surfaceAlt: "#1f1f1f",
  border: "#333333",
  borderFocused: "#5a5a5a",
  text: "#e0e0e0",
  muted: "#808080",
  accent: "#7aa2f7",
  success: "#5fd75f",
  warning: "#e5c07b",
  error: "#f7768e",
  code: "#9ece6a",
} as const;

export function statusColor(status: string): string {
  const value = status.toLowerCase();
  if (value.includes("error") || value.includes("failed")) return theme.error;
  if (value.includes("thinking") || value.includes("calling")) return theme.warning;
  return theme.success;
}

export function kindColor(kind: LineKind): string {
  switch (kind) {
    case "code": return theme.code;
    case "tool": return theme.warning;
    case "error": return theme.error;
    default: return theme.text;
  }
}
