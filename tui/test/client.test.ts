import { expect, test } from "bun:test";
import { JarvisClient } from "../src/client";

test("listModels sends bearer auth and returns ids", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toBe("http://localhost:8000/v1/models");
    expect((init?.headers as Record<string, string>).authorization).toBe("Bearer secret");
    return new Response(JSON.stringify({ data: [{ id: "qwen3:8b" }] }), { status: 200 });
  }) as unknown as typeof fetch;

  const client = new JarvisClient({ baseUrl: "http://localhost:8000", apiKey: "secret" });
  expect((await client.listModels()).map((m) => m.id)).toEqual(["qwen3:8b"]);
  globalThis.fetch = original;
});

test("chat yields SSE delta content", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n',
      { status: 200 },
    )) as unknown as typeof fetch;

  const client = new JarvisClient({ baseUrl: "http://localhost:8000" });
  const out: string[] = [];
  for await (const token of client.chat("qwen3:8b", [{ role: "user", content: "hello" }])) {
    out.push(token);
  }
  expect(out).toEqual(["Hi"]);
  globalThis.fetch = original;
});
