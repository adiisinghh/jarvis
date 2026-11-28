import { expect, test } from "bun:test";
import { filterPaths, joinAt } from "../src/path-utils";

test("filterPaths keeps only case-sensitive prefix matches", () => {
  const paths = ["src/App.tsx", "src/app.tsx", "src/theme.ts", "README.md"];
  expect(filterPaths(paths, "src/")).toEqual([
    "src/App.tsx",
    "src/app.tsx",
    "src/theme.ts",
  ]);
  expect(filterPaths(paths, "src/A")).toEqual(["src/App.tsx"]);
});

test("filterPaths caps results at 20", () => {
  const paths = Array.from({ length: 30 }, (_, index) => `src/file-${index}.ts`);
  const result = filterPaths(paths, "src/");
  expect(result).toHaveLength(20);
  expect(result[0]).toBe("src/file-0.ts");
  expect(result[19]).toBe("src/file-19.ts");
});

test("filterPaths returns an empty list when nothing matches or input is empty", () => {
  expect(filterPaths(["src/App.tsx"], "docs/")).toEqual([]);
  expect(filterPaths([], "src/")).toEqual([]);
  expect(filterPaths(["src/App.tsx"], "")).toEqual(["src/App.tsx"]);
});

test("joinAt builds an @ reference from the selected path", () => {
  expect(joinAt("src/Ap", "src/App.tsx")).toBe("@src/App.tsx");
  expect(joinAt("", "README.md")).toBe("@README.md");
});
