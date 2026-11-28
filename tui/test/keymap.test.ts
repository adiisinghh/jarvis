import { expect, test } from "bun:test";
import { commandForKey, formatKeymap } from "../src/keymap";

test("resolves known keys to commands", () => {
  expect(commandForKey("return")).toBe("submit");
  expect(commandForKey("up")).toBe("history-previous");
  expect(commandForKey("q", true)).toBe("quit");
  expect(commandForKey("q")).toBeUndefined();
  expect(commandForKey("p", true)).toBe("panel");
  expect(commandForKey("?")).toBe("help");
  expect(commandForKey("f-keys-that-do-not-exist")).toBeUndefined();
});

test("formats keymap lines for the help overlay", () => {
  const lines = formatKeymap();
  expect(lines.some((line) => line.includes("Send message"))).toBe(true);
  expect(lines.some((line) => line.includes("Quit"))).toBe(true);
});
