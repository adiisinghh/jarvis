/** Pure helpers for the tool inventory returned by the Jarvis API. */

export type ToolInfo = { name: string; category?: string; source?: string; description?: string };

/** Only tools backed by an MCP server. */
export function mcpTools<T extends { source?: string }>(tools: T[]): T[] {
  return tools.filter((tool) => tool.source === "mcp");
}

/** Group tools by category in first-seen order; tools without a category go to "other". */
export function groupByCategory<T extends { name: string; category?: string }>(
  tools: T[],
): Record<string, { name: string }[]> {
  const groups: Record<string, { name: string }[]> = {};
  for (const tool of tools) {
    const category = tool.category || "other";
    if (!Object.hasOwn(groups, category)) groups[category] = [];
    groups[category].push({ name: tool.name });
  }
  return groups;
}
