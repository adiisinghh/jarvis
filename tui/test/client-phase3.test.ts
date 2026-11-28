import { expect, test } from "bun:test";
import { JarvisClient } from "../src/client";

test("listSessions accepts the {sessions: [...]} response shape", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ sessions: [{ id: "abc" }] }), { status: 200 })) as unknown as typeof fetch;
  const client = new JarvisClient({ baseUrl: "http://localhost:8000" });
  expect((await client.listSessions()).map((s) => s.id)).toEqual(["abc"]);
  globalThis.fetch = original;
});

test("listPendingApprovals maps actions", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ actions: [{ id: "a1", tool: "shell_exec" }], count: 1 }), { status: 200 })) as unknown as typeof fetch;
  const client = new JarvisClient({ baseUrl: "http://localhost:8000" });
  expect((await client.listPendingApprovals())[0].tool).toBe("shell_exec");
  globalThis.fetch = original;
});
