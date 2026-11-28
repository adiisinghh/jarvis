import { expect, test } from "bun:test";
import { initialState, reduce } from "../src/store";

test("stores agents, approvals and tool calls", () => {
  let state = reduce(initialState, { type: "agents", value: [{ id: "orchestrator" }] });
  state = reduce(state, { type: "approvals", value: [{ id: "a1", tool: "shell_exec" }] });
  state = reduce(state, { type: "toolcalls", value: [{ id: "t1", tool: "file_read" }] });
  state = reduce(state, { type: "active-agent", text: "orchestrator" });
  expect(state.agents[0].id).toBe("orchestrator");
  expect(state.approvals[0].tool).toBe("shell_exec");
  expect(state.toolCalls[0].tool).toBe("file_read");
  expect(state.agentId).toBe("orchestrator");
});
