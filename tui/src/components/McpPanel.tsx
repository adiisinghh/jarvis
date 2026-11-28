import { theme } from "../theme";
import { mcpTools } from "../tool-utils";

/** Scrollable list of MCP-provided tools and their descriptions. */
export function McpPanel({ tools }: {
  tools: { name: string; description?: string; source?: string }[];
}) {
  const mcp = mcpTools(tools);
  if (mcp.length === 0) {
    return <text fg={theme.muted} content="No MCP tools configured" />;
  }

  return (
    <scrollbox style={{ backgroundColor: theme.background, flexGrow: 1 }}>
      {mcp.map((tool) => (
        <box key={tool.name} style={{ flexDirection: "column" }}>
          <text fg={theme.accent} content={tool.name} />
          {tool.description && (
            <text fg={theme.muted} content={`  ${tool.description}`} />
          )}
        </box>
      ))}
    </scrollbox>
  );
}
