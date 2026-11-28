const COMMANDS = [
  "help",
  "clear",
  "model",
  "session",
  "approve",
  "quit",
];

const FILE_PREFIXES = [
  "src/",
  "docs/",
  "tests/",
  "tui/",
  "configs/",
  "README.md",
  "pyproject.toml",
];

/** Suggest slash commands and @-file references for the current prompt text. */
export function suggestions(input: string): string[] {
  if (input.startsWith("/")) {
    const prefix = input.slice(1).toLowerCase();
    return COMMANDS.filter((command) => command.startsWith(prefix)).map((c) => `/${c}`);
  }
  if (input.startsWith("@")) {
    const prefix = input.slice(1);
    return FILE_PREFIXES.filter((path) => path.startsWith(prefix)).map((p) => `@${p}`);
  }
  return [];
}
