import type { ApprovalInfo } from "./client";
import { theme } from "./theme";

/** One-line summary of a pending approval, e.g. `shell_exec id=a1 risk=high`. */
export function formatApproval(approval: ApprovalInfo): string {
  const parts: string[] = [];
  if (approval.tool) parts.push(approval.tool);
  parts.push(`id=${approval.id}`);
  if (approval.risk) parts.push(`risk=${approval.risk}`);
  return parts.join(" ");
}

/** Color used to draw an approval's risk level. */
export function riskColor(risk?: string): string {
  const level = risk?.trim().toLowerCase() ?? "";
  if (level === "high" || level === "critical") return theme.error;
  if (level === "medium") return theme.warning;
  return theme.muted;
}
