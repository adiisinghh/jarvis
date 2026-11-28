import { theme } from "../theme";

/** Presentational list of worktree paths. The active worktree is highlighted. */
export function WorktreePicker({ worktrees, current, onSelect }: {
  worktrees: string[];
  current?: string;
  onSelect: (path: string) => void;
}) {
  return (
    <box
      style={{
        border: true,
        borderColor: worktrees.length > 0 ? theme.borderFocused : theme.border,
        backgroundColor: theme.surface,
        flexDirection: "column",
        height: 8,
      }}
    >
      <text fg={theme.muted} content={`worktree${current ? ` · ${current}` : ""}`} />
      {worktrees.length > 0 ? (
        <scrollbox style={{ height: 5 }}>
          {worktrees.map((path) => {
            const isCurrent = path === current;
            return (
              <text
                key={path}
                fg={isCurrent ? theme.accent : theme.text}
                content={`${isCurrent ? "* " : "  "}${path}`}
                onMouseDown={() => onSelect(path)}
              />
            );
          })}
        </scrollbox>
      ) : (
        <text fg={theme.muted} content="no worktrees available" />
      )}
    </box>
  );
}
