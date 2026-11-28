/** Case-sensitive prefix filter for @ file references, capped at a short, readable list. */
export function filterPaths(paths: string[], prefix: string): string[] {
  return paths.filter((path) => path.startsWith(prefix)).slice(0, 20);
}

/** Turn a selected file path into an @ reference for the prompt.
 * The prefix only narrows the list; the path itself is already the full reference target. */
export function joinAt(_prefix: string, path: string): string {
  return `@${path}`;
}
