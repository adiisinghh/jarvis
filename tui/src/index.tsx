import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./App";
import { JarvisClient } from "./client";

export async function run(): Promise<void> {
  const client = new JarvisClient({
    baseUrl: process.env.JARVIS_URL ?? "http://127.0.0.1:8000",
    apiKey: process.env.JARVIS_API_KEY || undefined,
  });
  const model = process.env.JARVIS_MODEL ?? "";

  const renderer = await createCliRenderer({ exitOnCtrlC: true });
  createRoot(renderer).render(<App client={client} model={model} />);
}

if (import.meta.main) void run();
