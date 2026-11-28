/** Pure helpers for detecting and describing unified diffs in text. */

/**
 * Return the portion of `text` starting at the first unified-diff header.
 * All three markers (`--- `, `+++ ` and `@@ `) must be present after that
 * point; otherwise the text is treated as ordinary output.
 */
export function extractDiff(text: string): string {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith("--- "));
  if (start === -1) return "";

  const diffLines = lines.slice(start);
  const hasFileHeader = diffLines.some((line) => line.startsWith("+++ "));
  const hasHunkHeader = diffLines.some((line) => line.startsWith("@@ "));
  if (!hasFileHeader || !hasHunkHeader) return "";

  return diffLines.join("\n");
}

/** Count added and removed lines, ignoring the `+++`/`---` file headers. */
export function diffStats(diff: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) added += 1;
    else if (line.startsWith("-")) removed += 1;
  }
  return { added, removed };
}
