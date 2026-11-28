import { expect, test } from "bun:test";
import { diffStats, extractDiff } from "../src/diff";

const SAMPLE = [
  "Running edit tool...",
  "--- a/src/file.ts",
  "+++ b/src/file.ts",
  "@@ -1,3 +1,4 @@",
  " const a = 1;",
  "-const b = 2;",
  "+const b = 3;",
  "+const c = 4;",
  " export default a;",
].join("\n");

test("extractDiff returns the diff from the first --- line onward", () => {
  expect(extractDiff(SAMPLE)).toBe(SAMPLE.slice(SAMPLE.indexOf("--- a/src/file.ts")));
});

test("extractDiff keeps multiple hunks and trailing text", () => {
  const text = `preamble\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-old\n+new\n@@ -9 +9 @@\n-a\n+b`;
  expect(extractDiff(text)).toBe(text.slice(text.indexOf("--- a/x")));
});

test("extractDiff returns an empty string when there is no diff", () => {
  expect(extractDiff("just some output\nwith no changes")).toBe("");
  expect(extractDiff("")).toBe("");
  expect(extractDiff("--- a/x\n+++ b/x\nno hunk header")).toBe("");
  expect(extractDiff("+++ b/x\n@@ -1 +1 @@\n-old\n+new")).toBe("");
});

test("diffStats counts added and removed lines without headers", () => {
  expect(diffStats(SAMPLE)).toEqual({ added: 2, removed: 1 });
  expect(diffStats("--- a/x\n+++ b/x\n@@ -1,0 +1 @@\n+only added")).toEqual({
    added: 1,
    removed: 0,
  });
});

test("diffStats returns zero counts for input without changes", () => {
  expect(diffStats("")).toEqual({ added: 0, removed: 0 });
  expect(diffStats("--- a/x\n+++ b/x\n@@ -1 +1 @@\n context line")).toEqual({
    added: 0,
    removed: 0,
  });
});
