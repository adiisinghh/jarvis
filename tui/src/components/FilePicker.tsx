import { useState } from "react";
import { filterPaths, joinAt } from "../path-utils";
import { theme } from "../theme";

/** Presentational picker for @ file references. Filtering and selection stay local. */
export function FilePicker({ files, onSelect, onRefresh }: {
  files: string[];
  onSelect: (path: string) => void;
  onRefresh: (path: string) => void;
}) {
  const [prefix, setPrefix] = useState("");
  const [selected, setSelected] = useState(0);
  const matches = filterPaths(files, prefix);
  const active = Math.min(selected, Math.max(matches.length - 1, 0));

  function select(index: number) {
    const path = matches[index];
    if (path) onSelect(joinAt(prefix, path));
  }

  function refresh() {
    const clean = prefix.replace(/^@/, "");
    const slash = clean.lastIndexOf("/");
    onRefresh(slash >= 0 ? clean.slice(0, slash + 1) : ".");
  }

  return (
    <box
      style={{
        border: true,
        borderColor: theme.borderFocused,
        backgroundColor: theme.surface,
        flexDirection: "column",
        height: 12,
      }}
    >
      <text fg={theme.muted} content="@ files" />
      <box style={{ flexDirection: "row", gap: 1 }}>
        <text fg={theme.accent} content="@" />
        <input
          placeholder="Path prefix"
          value={prefix}
          focused
          onInput={(value) => {
            setPrefix(value);
            setSelected(0);
          }}
          onKeyDown={(key) => {
            if (key.ctrl && key.name === "r") refresh();
            if (key.name === "up") setSelected((index) => Math.max(index - 1, 0));
            if (key.name === "down") setSelected((index) => Math.min(index + 1, matches.length - 1));
          }}
          onSubmit={() => select(active)}
        />
      </box>
      <scrollbox style={{ height: 7 }}>
        {matches.map((path, index) => (
          <text
            key={path}
            fg={index === active ? theme.accent : theme.text}
            content={`${index === active ? "> " : "  "}${path}`}
            onMouseDown={() => {
              setSelected(index);
              select(index);
            }}
          />
        ))}
        {matches.length === 0 && (
          <text fg={theme.muted} content={files.length === 0 ? "no files" : "no matching files"} />
        )}
      </scrollbox>
      <text
        fg={theme.muted}
        content={`[enter] select  [ctrl+r] refresh  ${matches.length} of ${files.length}`}
        onMouseDown={refresh}
      />
    </box>
  );
}
