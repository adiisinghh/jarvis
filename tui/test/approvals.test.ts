import { expect, test } from "bun:test";
import { formatApproval, riskColor } from "../src/approvals";
import { theme } from "../src/theme";

test("formatApproval summarizes tool, id and risk", () => {
  expect(formatApproval({ id: "a1", tool: "shell_exec", risk: "high" })).toBe(
    "shell_exec id=a1 risk=high",
  );
});

test("formatApproval omits missing fields", () => {
  expect(formatApproval({ id: "a2" })).toBe("id=a2");
  expect(formatApproval({ id: "a3", tool: "fs.read" })).toBe("fs.read id=a3");
  expect(formatApproval({ id: "a4", risk: "low" })).toBe("id=a4 risk=low");
});

test("riskColor maps severities to theme colors", () => {
  expect(riskColor("high")).toBe(theme.error);
  expect(riskColor("critical")).toBe(theme.error);
  expect(riskColor("medium")).toBe(theme.warning);
  expect(riskColor("low")).toBe(theme.muted);
  expect(riskColor()).toBe(theme.muted);
});
