import type { ApprovalInfo } from "../client";
import { formatApproval, riskColor } from "../approvals";
import { theme } from "../theme";

/** Framed list of pending approvals with inline approve/deny affordances. */
export function ApprovalPanel({ approvals, onApprove, onDeny, selected }: {
  approvals: ApprovalInfo[];
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  selected?: number;
}) {
  return (
    <box
      title="Pending approvals"
      style={{
        border: true,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        padding: 1,
        flexDirection: "column",
        gap: 1,
      }}
    >
      {approvals.length === 0 ? (
        <text fg={theme.muted} content="No pending approvals" />
      ) : (
        approvals.map((approval, index) => {
          const active = index === selected;
          return (
            <box
              key={approval.id}
              style={{
                flexDirection: "row",
                gap: 1,
                backgroundColor: active ? theme.surfaceAlt : theme.surface,
              }}
            >
              <text
                fg={riskColor(approval.risk)}
                content={`${active ? "›" : " "} ${formatApproval(approval)}`}
              />
              <text
                fg={theme.success}
                content="[a] approve"
                onMouseDown={() => onApprove(approval.id)}
              />
              <text
                fg={theme.error}
                content="[d] deny"
                onMouseDown={() => onDeny(approval.id)}
              />
            </box>
          );
        })
      )}
    </box>
  );
}
