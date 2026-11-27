import { expect, test } from "bun:test";
import { formatMessage } from "../src/format";

test("formats a message with role label", () => {
  expect(formatMessage({ role: "user", content: "hi" })).toBe("you: hi");
  expect(formatMessage({ role: "assistant", content: "hello" })).toBe("jarvis: hello");
});
