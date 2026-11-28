import { theme } from "./theme";

export type ShellLineKind = "command" | "output" | "error";

export type ShellLine = { kind: ShellLineKind; text: string };

/** Prefix a shell history line so commands, output and errors are distinguishable. */
export function formatShellLine(kind: ShellLineKind, text: string): string {
  switch (kind) {
    case "command": return `$ ${text}`;
    case "error": return `! ${text}`;
    case "output": return `  ${text}`;
  }
}

/** Map a shell line kind onto the palette color used to render it. */
export function shellColor(kind: ShellLineKind): string {
  switch (kind) {
    case "command": return theme.accent;
    case "error": return theme.error;
    case "output": return theme.text;
  }
}
