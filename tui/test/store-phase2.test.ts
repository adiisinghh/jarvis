import { expect, test } from "bun:test";
import { initialState, reduce } from "../src/store";

test("stores sessions and active session", () => {
  let state = reduce(initialState, { type: "sessions", value: [{ id: "a" }, { id: "b" }] });
  state = reduce(state, { type: "active-session", text: "b" });
  expect(state.sessions.map((s) => s.id)).toEqual(["a", "b"]);
  expect(state.sessionId).toBe("b");
});

test("stores telemetry metrics", () => {
  const state = reduce(initialState, { type: "metrics", value: { tokens: 12, latencyMs: 340 } });
  expect(state.metrics).toEqual({ tokens: 12, latencyMs: 340 });
});
