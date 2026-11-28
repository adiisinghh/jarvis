import { extractDiff } from "../diff";
import { theme } from "../theme";

/** Presentational viewer for a unified diff embedded in tool output. */
export function DiffView({ diff, filetype, view = "unified" }: {
  diff: string;
  filetype?: string;
  view?: "unified" | "split";
}) {
  const content = extractDiff(diff);
  if (!content) {
    return <text fg={theme.muted} content="No diff available" />;
  }

  return (
    <box
      style={{
        backgroundColor: theme.surface,
        border: true,
        borderColor: theme.border,
        flexDirection: "column",
      }}
    >
      <diff diff={content} view={view} filetype={filetype} showLineNumbers />
    </box>
  );
}
