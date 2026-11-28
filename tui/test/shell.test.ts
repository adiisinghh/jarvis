import { expect, test } from "bun:test";
import { formatShellLine, shellColor } from "../src/shell";
import { theme } from "../src/theme";

test("formatShellLine prefixes each shell line kind", () => {
  expect(formatShellLine("command", "ls -la")).toBe("$ ls -la");
  expect(formatShellLine("output", "file.txt")).toBe("  file.txt");
  expect(formatShellLine("error", "not found")).toBe("! not found");
});

test("formatShellLine handles empty text", () => {
  expect(formatShellLine("command", "")).toBe("$ ");
  expect(formatShellLine("output", "")).toBe("  ");
  expect(formatShellLine("error", "")).toBe("! ");
});

test("shellColor maps kinds to theme colors", () => {
  expect(shellColor("command")).toBe(theme.accent);
  expect(shellColor("output")).toBe(theme.text);
  expect(shellColor("error")).toBe(theme.error);
});
