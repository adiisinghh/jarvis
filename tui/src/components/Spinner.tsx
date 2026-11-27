import { theme } from "../theme";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/** Simple braille spinner; frame is chosen by the caller-provided tick. */
export function Spinner({ busy, tick = 0 }: { busy: boolean; tick?: number }) {
  return <text fg={theme.warning} content={busy ? FRAMES[tick % FRAMES.length] : " "} />;
}
