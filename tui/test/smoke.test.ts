import { expect, test } from "bun:test";
import { run } from "../src/index";
import { App } from "../src/App";

test("run and App are exported", () => {
  expect(typeof run).toBe("function");
  expect(typeof App).toBe("function");
});
