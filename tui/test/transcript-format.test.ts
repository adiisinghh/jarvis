import { expect, test } from "bun:test";
import { classifyLine, formatMessageLines } from "../src/transcript-format";

test("classifies code fences, tool lines and errors", () => {
  expect(classifyLine("```python")).toEqual({ kind: "code", text: "python" });
  expect(classifyLine("tool: shell_exec")).toEqual({ kind: "tool", text: "shell_exec" });
  expect(classifyLine("Error: boom")).toEqual({ kind: "error", text: "Error: boom" });
  expect(classifyLine("hello")).toEqual({ kind: "text", text: "hello" });
});

test("splits messages into display lines", () => {
  expect(formatMessageLines({ role: "user", content: "one\ntwo" })).toEqual([
    "you: one",
    "two",
  ]);
});
