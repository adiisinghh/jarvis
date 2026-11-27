import { expect, test } from "bun:test";
import { initialState, reduce } from "../src/store";

test("appendToken accumulates into the last assistant message", () => {
  const withUser = reduce(initialState, { type: "user", text: "hi" });
  const streaming = reduce(withUser, { type: "assistant-start" });
  const done = reduce(streaming, { type: "token", text: "Hello" });
  expect(done.messages.at(-1)).toEqual({ role: "assistant", content: "Hello" });
});

test("event rings keep the last 20 lines", () => {
  let state = initialState;
  for (let i = 0; i < 25; i += 1) state = reduce(state, { type: "event", text: `line ${i}` });
  expect(state.events.length).toBe(20);
  expect(state.events.at(-1)).toBe("line 24");
});
