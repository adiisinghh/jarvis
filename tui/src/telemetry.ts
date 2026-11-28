/** Local-only resilience counters for the Jarvis TUI.
 *
 * Nothing here sends data unless the user explicitly opts in with
 * JARVIS_TUI_TELEMETRY=1 *and* provides JARVIS_TUI_TELEMETRY_URL.
 */
export type TelemetrySnapshot = {
  reconnects: number;
  errors: number;
  events: number;
};

let reconnects = 0;
let errors = 0;
let events = 0;

export function recordReconnect(): void {
  reconnects += 1;
}

export function recordError(): void {
  errors += 1;
}

export function recordEvent(): void {
  events += 1;
}

export function snapshot(): TelemetrySnapshot {
  return { reconnects, errors, events };
}

export function resetTelemetry(): void {
  reconnects = 0;
  errors = 0;
  events = 0;
}

/** Opt-in flag, read lazily so it can be changed at runtime. */
export function telemetryEnabled(): boolean {
  return process.env.JARVIS_TUI_TELEMETRY === "1";
}

/** Best-effort POST of a snapshot. Returns true only when a POST was attempted. */
export function maybeReport(telemetry: TelemetrySnapshot): boolean {
  if (!telemetryEnabled()) return false;
  const url = process.env.JARVIS_TUI_TELEMETRY_URL;
  if (!url) return false;
  try {
    void fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(telemetry),
    }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}
