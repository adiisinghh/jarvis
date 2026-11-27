import { expect, test } from "bun:test";
import { mapEvent } from "../src/events";

test("maps tool and error events", () => {
  expect(mapEvent({ type: "tool_call_start", data: { tool: "shell_exec" } }))
    .toEqual({ kind: "tool", text: "Calling shell_exec" });
  expect(mapEvent({ type: "agent_tick_error", data: { message: "boom" } }))
    .toEqual({ kind: "error", text: "boom" });
  expect(mapEvent({ type: "unknown_event" })).toBeNull();
});
