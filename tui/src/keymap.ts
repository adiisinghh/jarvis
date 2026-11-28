export type KeyBinding = {
  keys: string[];
  command: string;
  description: string;
};

/** OpenCode-inspired default keymap, adapted to Jarvis commands. */
export const DEFAULT_KEYMAP: KeyBinding[] = [
  { keys: ["return"], command: "submit", description: "Send message" },
  { keys: ["up"], command: "history-previous", description: "Previous prompt" },
  { keys: ["down"], command: "history-next", description: "Next prompt" },
  { keys: ["tab"], command: "complete", description: "Accept suggestion" },
  { keys: ["?"], command: "help", description: "Toggle help" },
  { keys: ["escape"], command: "escape", description: "Close overlay" },
  { keys: ["q"], command: "quit", description: "Quit" },
];

export function commandForKey(name: string): string | undefined {
  return DEFAULT_KEYMAP.find((binding) => binding.keys.includes(name))?.command;
}

export function formatKeymap(): string[] {
  return DEFAULT_KEYMAP.map(
    (binding) => `${binding.keys.join(" / ")}  ${binding.description}`,
  );
}
