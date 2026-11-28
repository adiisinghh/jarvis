import { expect, test } from "bun:test";
import { formatToolCall, parseToolEvent } from "../src/tool-events";

test("parses a tool_call_start event with arguments", () => {
  expect(parseToolEvent({
    type: "tool_call_start",
    timestamp: "2026-01-01T00:00:00Z",
    data: { tool: "shell_exec", arguments: { command: "ls" } },
  })).toEqual({
    id: "2026-01-01T00:00:00Z",
    tool: "shell_exec",
    params: { command: "ls" },
  });
});

test("parses a tool_call_end event with an outcome", () => {
  expect(parseToolEvent({
    type: "tool_call_end",
    data: {
      id: "a1",
      tool_name: "file_read",
      params: { path: "/tmp/note.txt", taint: "secret" },
      success: false,
      error: "denied",
    },
  })).toEqual({
    id: "a1",
    tool: "file_read",
    params: { path: "/tmp/note.txt", taint: "secret" },
    outcome: "denied",
  });

  expect(parseToolEvent({
    type: "tool_call_end",
    data: { tool: "calculator", success: true, duration_ms: 12 },
  })?.outcome).toBe("ok");
});

test("ignores non-tool events", () => {
  expect(parseToolEvent({ type: "inference_start" })).toBeNull();
  expect(parseToolEvent({ type: "trace_step", data: { tool: "shell_exec" } })).toBeNull();
  expect(parseToolEvent({ type: "agent_tick_error", data: { message: "boom" } })).toBeNull();
});

test("formats tool calls", () => {
  expect(formatToolCall({ id: "a1", tool: "shell_exec", outcome: "ok" }))
    .toBe("shell_exec [a1] ok");
  expect(formatToolCall({ id: "a1", tool: "shell_exec" }))
    .toBe("shell_exec [a1]");
});
