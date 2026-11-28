export type KeyBinding = {
  keys: string[];
  ctrl?: boolean;
  command: string;
  description: string;
};

/** OpenCode-inspired keymap. Letters require Ctrl so typing is never stolen. */
export const DEFAULT_KEYMAP: KeyBinding[] = [
  { keys: ["return"], command: "submit", description: "Send message" },
  { keys: ["up"], command: "history-previous", description: "Previous prompt" },
  { keys: ["down"], command: "history-next", description: "Next prompt" },
  { keys: ["tab"], command: "complete", description: "Accept suggestion" },
  { keys: ["?"], command: "help", description: "Toggle help" },
  { keys: ["escape"], command: "escape", description: "Close overlay" },
  { keys: ["p"], ctrl: true, command: "panel", description: "Toggle side panel" },
  { keys: ["q"], ctrl: true, command: "quit", description: "Quit" },
];

export function commandForKey(name: string, ctrl = false): string | undefined {
  return DEFAULT_KEYMAP.find(
    (binding) => binding.keys.includes(name) && (binding.ctrl === undefined || binding.ctrl === ctrl),
  )?.command;
}

export function formatKeymap(): string[] {
  return DEFAULT_KEYMAP.map((binding) => {
    const keys = binding.keys.map((key) => (binding.ctrl ? `ctrl+${key}` : key)).join(" / ");
    return `${keys}  ${binding.description}`;
  });
}
