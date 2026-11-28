import { expect, test } from "bun:test";
import type { Session } from "../src/client";
import { sessionLabel, sortSessions } from "../src/session-utils";

test("sessionLabel prefers the title", () => {
  expect(sessionLabel({ id: "abcdefgh1234", title: "Design review" })).toBe("Design review");
});

test("sessionLabel falls back to the first eight id characters", () => {
  expect(sessionLabel({ id: "abcdefgh1234" })).toBe("abcdefgh");
  expect(sessionLabel({ id: "abc", title: "" })).toBe("abc");
});

test("sessionLabel uses a placeholder without an id or title", () => {
  expect(sessionLabel({ id: "" })).toBe("new session");
  expect(sessionLabel({ id: "", title: "" })).toBe("new session");
});

test("sortSessions orders by updated_at descending", () => {
  const sessions: Session[] = [
    { id: "old", updated_at: "2026-01-01T00:00:00Z" },
    { id: "new", updated_at: "2026-03-01T00:00:00Z" },
    { id: "mid", updated_at: "2026-02-01T00:00:00Z" },
  ];
  expect(sortSessions(sessions).map((session) => session.id)).toEqual(["new", "mid", "old"]);
});

test("sortSessions keeps missing and equal timestamps stable", () => {
  const sessions: Session[] = [
    { id: "a" },
    { id: "first", updated_at: "2026-01-01T00:00:00Z" },
    { id: "b" },
    { id: "second", updated_at: "2026-01-01T00:00:00Z" },
    { id: "c", updated_at: "" },
  ];
  expect(sortSessions(sessions).map((session) => session.id)).toEqual([
    "first",
    "second",
    "a",
    "b",
    "c",
  ]);
});

test("sortSessions does not mutate the input", () => {
  const sessions: Session[] = [{ id: "a" }, { id: "b", updated_at: "2026-01-01T00:00:00Z" }];
  const sorted = sortSessions(sessions);
  expect(sorted).not.toBe(sessions);
  expect(sessions.map((session) => session.id)).toEqual(["a", "b"]);
});
