import { theme } from "../theme";

/** Scrollable list of installed plugins and recipes, labelled by kind. */
export function PluginPanel({ plugins }: {
  plugins: { id: string; kind?: string }[];
}) {
  if (plugins.length === 0) {
    return <text fg={theme.muted} content="No plugins configured" />;
  }

  return (
    <scrollbox style={{ backgroundColor: theme.background, flexGrow: 1 }}>
      {plugins.map((plugin) => (
        <box key={plugin.id} style={{ flexDirection: "row", gap: 1 }}>
          <text fg={theme.accent} content={plugin.id} />
          <text fg={theme.muted} content={`[${plugin.kind || "plugin"}]`} />
        </box>
      ))}
    </scrollbox>
  );
}
