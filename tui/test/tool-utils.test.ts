import { expect, test } from "bun:test";
import { groupByCategory, mcpTools } from "../src/tool-utils";

test("mcpTools keeps only tools sourced from MCP", () => {
  const tools = [
    { name: "read", source: "builtin" },
    { name: "search", source: "mcp" },
    { name: "fetch", source: "mcp" },
    { name: "write" },
  ];
  expect(mcpTools(tools).map((tool) => tool.name)).toEqual(["search", "fetch"]);
});

test("mcpTools preserves the input order and extra fields", () => {
  const tools = [
    { name: "search", source: "mcp" as const, description: "web search" },
    { name: "local", source: "plugin" as const },
  ];
  expect(mcpTools(tools)).toEqual([{ name: "search", source: "mcp", description: "web search" }]);
});

test("mcpTools returns an empty list when nothing is from MCP", () => {
  expect(mcpTools([])).toEqual([]);
  expect(mcpTools([{ name: "read", source: "builtin" }, { name: "write" }])).toEqual([]);
});

test("groupByCategory groups tools by their category", () => {
  const tools = [
    { name: "read", category: "files" },
    { name: "search", category: "web" },
    { name: "write", category: "files" },
  ];
  expect(groupByCategory(tools)).toEqual({
    files: [{ name: "read" }, { name: "write" }],
    web: [{ name: "search" }],
  });
});

test("groupByCategory puts tools without a category into other", () => {
  const tools = [{ name: "one" }, { name: "two", category: "" }, { name: "three", category: "files" }];
  expect(groupByCategory(tools)).toEqual({
    other: [{ name: "one" }, { name: "two" }],
    files: [{ name: "three" }],
  });
});

test("groupByCategory preserves order within and between groups", () => {
  const tools = [
    { name: "a", category: "z" },
    { name: "b", category: "a" },
    { name: "c", category: "z" },
    { name: "d", category: "a" },
  ];
  const groups = groupByCategory(tools);
  expect(Object.keys(groups)).toEqual(["z", "a"]);
  expect(groups.z).toEqual([{ name: "a" }, { name: "c" }]);
  expect(groups.a).toEqual([{ name: "b" }, { name: "d" }]);
});

test("groupByCategory returns an empty record for no tools", () => {
  expect(groupByCategory([])).toEqual({});
});
