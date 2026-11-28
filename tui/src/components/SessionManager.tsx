import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { JarvisClient, Session } from "../client";
import { sessionLabel, sortSessions } from "../session-utils";
import { theme } from "../theme";

/** Session list with create/rename/delete shortcuts. Session state stays with the parent. */
export function SessionManager({ sessions, activeId, client, onChanged }: {
  sessions: Session[];
  activeId: string;
  client: JarvisClient;
  onChanged: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const active = sessions.find((session) => session.id === activeId);

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      setError("");
      onChanged();
    } catch (cause) {
      setError(`Session error: ${String(cause)}`);
    }
  }

  useKeyboard((key) => {
    if (renaming) {
      if (key.name === "escape") setRenaming(false);
      return;
    }
    if (key.ctrl && key.name === "n") void run(() => client.createSession());
    if (key.ctrl && key.name === "r" && active) {
      setDraft(active.title ?? "");
      setRenaming(true);
    }
    if (key.ctrl && key.name === "d" && active) void run(() => client.deleteSession(active.id));
  });

  function submitRename(title: string) {
    setRenaming(false);
    const trimmed = title.trim();
    if (active && trimmed) void run(() => client.renameSession(active.id, trimmed));
  }

  return (
    <box style={{ flexDirection: "column", gap: 1 }}>
      {sortSessions(sessions).map((session) => {
        const isActive = session.id === activeId;
        return (
          <text
            key={session.id}
            fg={isActive ? theme.accent : theme.muted}
            content={`${isActive ? "* " : "  "}${sessionLabel(session)}`}
          />
        );
      })}
      {sessions.length === 0 && <text fg={theme.muted} content="no sessions" />}
      {renaming ? (
        <box style={{ flexDirection: "row", gap: 1 }}>
          <text fg={theme.accent} content="rename:" />
          <input
            placeholder="Session title"
            value={draft}
            focused
            onInput={setDraft}
            onSubmit={submitRename}
          />
        </box>
      ) : (
        <text fg={theme.muted} content="[ctrl+n] new  [ctrl+r] rename  [ctrl+d] delete" />
      )}
      {error && <text fg={theme.error} content={error} />}
    </box>
  );
}
