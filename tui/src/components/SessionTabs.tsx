import type { Session } from "../client";
import { theme } from "../theme";

/** OpenCode-like session tab strip. */
export function SessionTabs({ sessions, activeId, onSelect }: {
  sessions: Session[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const tabs = sessions.length > 0 ? sessions : [{ id: "" }];

  return (
    <box style={{ flexDirection: "row", gap: 1, height: 2, backgroundColor: theme.surfaceAlt }}>
      {tabs.map((session) => {
        const active = session.id === activeId || (activeId === "" && session.id === "");
        const label = session.id ? session.title || session.id.slice(0, 8) : "new session";
        return (
          <box
            key={session.id || "new"}
            style={{
              border: true,
              borderColor: active ? theme.borderFocused : theme.border,
              backgroundColor: active ? theme.surface : theme.background,
              height: 2,
            }}
          >
            <text fg={active ? theme.accent : theme.muted} content={label} />
          </box>
        );
      })}
      <text fg={theme.muted} content="+ new" />
    </box>
  );
}
