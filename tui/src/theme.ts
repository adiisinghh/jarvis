/** OpenCode-inspired dark palette, adapted for Jarvis branding. */
export const theme = {
  background: "#0d0d0d",
  surface: "#181818",
  border: "#333333",
  borderFocused: "#5a5a5a",
  text: "#e0e0e0",
  muted: "#808080",
  accent: "#7aa2f7",
  success: "#5fd75f",
  warning: "#e5c07b",
  error: "#f7768e",
} as const;

export function statusColor(status: string): string {
  const value = status.toLowerCase();
  if (value.includes("error") || value.includes("failed")) return theme.error;
  if (value.includes("thinking") || value.includes("calling")) return theme.warning;
  return theme.success;
}
