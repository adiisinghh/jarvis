import type { Session } from "./client";

/** Short label for a session: title, short id, or a placeholder. */
export function sessionLabel(session: Session): string {
  if (session.title) return session.title;
  if (session.id) return session.id.slice(0, 8);
  return "new session";
}

/** Newest sessions first. Missing timestamps keep their original order at the end. */
export function sortSessions(sessions: Session[]): Session[] {
  return sessions
    .map((session, index) => ({ session, index }))
    .sort((a, b) => {
      const left = a.session.updated_at;
      const right = b.session.updated_at;
      if (!left && !right) return a.index - b.index;
      if (!left) return 1;
      if (!right) return -1;
      if (left === right) return a.index - b.index;
      return left < right ? 1 : -1;
    })
    .map(({ session }) => session);
}
