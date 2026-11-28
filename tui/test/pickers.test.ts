import { expect, test } from "bun:test";
import type { AgentInfo } from "../src/client";
import { toOptions } from "../src/components/ModelPicker";

test("toOptions preserves ids via option values and uses the label callback for names", () => {
  const models = [{ id: "gpt-5" }, { id: "claude-sonnet" }];
  expect(toOptions(models, (model) => model.id)).toEqual([
    { name: "gpt-5", description: "", value: models[0] },
    { name: "claude-sonnet", description: "", value: models[1] },
  ]);
});

test("toOptions supports human-friendly labels while keeping agent ids", () => {
  const agents: AgentInfo[] = [
    { id: "orchestrator", name: "Orchestrator", description: "Routes work" },
    { id: "coder" },
  ];
  const options = toOptions(agents, (agent) => agent.name || agent.id);
  expect(options.map((option) => option.name)).toEqual(["Orchestrator", "coder"]);
  expect(options.map((option) => (option.value as AgentInfo).id)).toEqual(["orchestrator", "coder"]);
});

test("toOptions returns an empty array for empty input", () => {
  expect(toOptions([], (item: { id: string }) => item.id)).toEqual([]);
});
