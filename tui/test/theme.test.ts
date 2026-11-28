import { expect, test } from "bun:test";
import { kindColor, statusColor, theme } from "../src/theme";

test("status colors reflect state", () => {
  expect(statusColor("Error: boom")).toBe(theme.error);
  expect(statusColor("Thinking…")).toBe(theme.warning);
  expect(statusColor("Ready")).toBe(theme.success);
});

test("transcript kinds have distinct colors", () => {
  expect(kindColor("code")).toBe(theme.code);
  expect(kindColor("tool")).toBe(theme.warning);
  expect(kindColor("error")).toBe(theme.error);
  expect(kindColor("text")).toBe(theme.text);
});
