import { afterEach, expect, test } from "bun:test";
import { JarvisClient, backoffDelay, type ConnectionStatus } from "../src/client";
import {
  maybeReport,
  recordError,
  recordEvent,
  recordReconnect,
  resetTelemetry,
  snapshot,
  telemetryEnabled,
} from "../src/telemetry";

const ENV_KEYS = ["JARVIS_TUI_TELEMETRY", "JARVIS_TUI_TELEMETRY_URL"] as const;
const originalEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const originalWebSocket = globalThis.WebSocket;

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
  globalThis.WebSocket = originalWebSocket;
  resetTelemetry();
});

test("counters accumulate, snapshot is a copy, and reset clears all", () => {
  resetTelemetry();
  expect(snapshot()).toEqual({ reconnects: 0, errors: 0, events: 0 });

  recordReconnect();
  recordReconnect();
  recordError();
  recordEvent();
  recordEvent();
  recordEvent();
  expect(snapshot()).toEqual({ reconnects: 2, errors: 1, events: 3 });

  const snap = snapshot();
  snap.events = 99;
  expect(snapshot().events).toBe(3);

  resetTelemetry();
  expect(snapshot()).toEqual({ reconnects: 0, errors: 0, events: 0 });
});

test("telemetryEnabled requires the exact opt-in value", () => {
  delete process.env.JARVIS_TUI_TELEMETRY;
  expect(telemetryEnabled()).toBe(false);
  process.env.JARVIS_TUI_TELEMETRY = "0";
  expect(telemetryEnabled()).toBe(false);
  process.env.JARVIS_TUI_TELEMETRY = "true";
  expect(telemetryEnabled()).toBe(false);
  process.env.JARVIS_TUI_TELEMETRY = "1";
  expect(telemetryEnabled()).toBe(true);
});

test("maybeReport no-ops unless both opt-in and URL are set", () => {
  const calls: unknown[][] = [];
  globalThis.fetch = (async (...args: unknown[]) => {
    calls.push(args);
    return new Response(null, { status: 200 });
  }) as unknown as typeof fetch;

  const snap = { reconnects: 1, errors: 2, events: 3 };

  delete process.env.JARVIS_TUI_TELEMETRY;
  process.env.JARVIS_TUI_TELEMETRY_URL = "http://localhost:9999/telemetry";
  expect(maybeReport(snap)).toBe(false);

  process.env.JARVIS_TUI_TELEMETRY = "1";
  delete process.env.JARVIS_TUI_TELEMETRY_URL;
  expect(maybeReport(snap)).toBe(false);

  expect(calls).toHaveLength(0);
});

test("maybeReport POSTs JSON when enabled and never throws", () => {
  process.env.JARVIS_TUI_TELEMETRY = "1";
  process.env.JARVIS_TUI_TELEMETRY_URL = "http://localhost:9999/telemetry";

  const calls: unknown[][] = [];
  globalThis.fetch = (async (...args: unknown[]) => {
    calls.push(args);
    return new Response(null, { status: 500 });
  }) as unknown as typeof fetch;

  const snap = snapshot();
  expect(maybeReport(snap)).toBe(true);
  expect(calls).toEqual([[
    "http://localhost:9999/telemetry",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(snap) },
  ]]);

  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as unknown as typeof fetch;
  expect(maybeReport(snap)).toBe(true); // reported attempt, even on rejection
});

test("backoffDelay doubles from 500ms and caps at 8s", () => {
  expect(backoffDelay(1)).toBe(500);
  expect(backoffDelay(2)).toBe(1000);
  expect(backoffDelay(3)).toBe(2000);
  expect(backoffDelay(4)).toBe(4000);
  expect(backoffDelay(5)).toBe(8000);
  expect(backoffDelay(6)).toBe(8000);
  expect(backoffDelay(100)).toBe(8000);
  expect(backoffDelay(0)).toBe(500); // defensive: treated as first attempt
});

test("chat retries network failures before the first token", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    if (calls < 3) throw new Error("network down");
    return new Response(
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n',
      { status: 200 },
    );
  }) as unknown as typeof fetch;
  globalThis.setTimeout = ((cb: () => void) => {
    cb();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;

  const client = new JarvisClient({ baseUrl: "http://localhost:8000" });
  const out: string[] = [];
  for await (const token of client.chat("m", [{ role: "user", content: "hi" }])) out.push(token);
  expect(out).toEqual(["ok"]);
  expect(calls).toBe(3);
  expect(snapshot().errors).toBe(2);
});

test("chat does not retry once tokens have flowed", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    let pulls = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        if (pulls === 1) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n'));
        } else {
          controller.error(new Error("stream broke"));
        }
      },
    });
    return new Response(body, { status: 200 });
  }) as unknown as typeof fetch;

  const client = new JarvisClient({ baseUrl: "http://localhost:8000" });
  const iterator = client.chat("m", [{ role: "user", content: "hi" }]);
  expect((await iterator.next()).value).toBe("hi");
  await expect(iterator.next()).rejects.toThrow("stream broke");
  expect(calls).toBe(1);
});

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onmessage: ((message: { data: string }) => void) | null = null;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(public url: URL | string, public protocols?: string | string[]) {
    FakeWebSocket.instances.push(this);
  }

  close(): void {
    this.closed = true;
    this.onclose?.();
  }
}

test("subscribeWithReconnect backs off, resets on open, and stops on dispose", () => {
  FakeWebSocket.instances = [];
  globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;

  type Timer = { cb: () => void; ms: number; cancelled: boolean };
  const timers: Timer[] = [];
  globalThis.setTimeout = ((cb: () => void, ms: number) => {
    const timer: Timer = { cb, ms, cancelled: false };
    timers.push(timer);
    return timers.length as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  globalThis.clearTimeout = ((id: number) => {
    const timer = timers[id - 1];
    if (timer) timer.cancelled = true;
  }) as typeof clearTimeout;

  const statuses: ConnectionStatus[] = [];
  const events: string[] = [];
  const client = new JarvisClient({ baseUrl: "http://localhost:8000" });
  const dispose = client.subscribeWithReconnect(
    (event) => events.push(event.type),
    (status) => statuses.push(status),
  );

  const ws1 = FakeWebSocket.instances[0];
  expect(ws1.protocols).toEqual([]);
  ws1.onopen?.();
  ws1.onmessage?.({ data: JSON.stringify({ type: "metric" }) });
  expect(events).toEqual(["metric"]);
  expect(snapshot().events).toBe(1);

  // One drop => one reconnect scheduled (error + close is not double-counted).
  ws1.onerror?.();
  ws1.onclose?.();
  expect(snapshot().errors).toBe(1);
  expect(snapshot().reconnects).toBe(1);
  expect(timers[0].ms).toBe(500);

  timers[0].cb(); // fire first retry
  const ws2 = FakeWebSocket.instances[1];
  ws2.onclose?.();
  expect(timers[1].ms).toBe(1000);
  timers[1].cb();
  const ws3 = FakeWebSocket.instances[2];
  ws3.onopen?.(); // backoff resets
  ws3.onclose?.();
  expect(timers[2].ms).toBe(500);
  expect(snapshot().reconnects).toBe(3);

  dispose();
  expect(statuses).toContain("open");
  expect(statuses).toContain("reconnecting");
  expect(ws3.closed).toBe(true);
  expect(timers[2].cancelled).toBe(true);
  const count = FakeWebSocket.instances.length;
  timers[2].cb(); // even if a stale timer fires, dispose() must not reconnect
  expect(FakeWebSocket.instances).toHaveLength(count);
});
