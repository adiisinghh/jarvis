import { useEffect, useReducer, useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { JarvisClient } from "./client";
import { mapEvent } from "./events";
import { parseToolEvent } from "./tool-events";
import { extractDiff } from "./diff";
import type { ShellLine } from "./shell";
import { initialState, reduce } from "./store";
import { commandForKey } from "./keymap";
import { Frame } from "./components/Frame";
import { Transcript } from "./components/Transcript";
import { Prompt } from "./components/Prompt";
import { StatusBar } from "./components/StatusBar";
import { Spinner } from "./components/Spinner";
import { SessionTabs } from "./components/SessionTabs";
import { SessionManager } from "./components/SessionManager";
import { ModelPicker } from "./components/ModelPicker";
import { AgentPicker } from "./components/AgentPicker";
import { ApprovalPanel } from "./components/ApprovalPanel";
import { ToolCallPane } from "./components/ToolCallPane";
import { DiffView } from "./components/DiffView";
import { ShellPane } from "./components/ShellPane";
import { FilePicker } from "./components/FilePicker";
import { WorktreePicker } from "./components/WorktreePicker";
import { McpPanel } from "./components/McpPanel";
import { PluginPanel } from "./components/PluginPanel";
import { HelpOverlay } from "./components/HelpOverlay";

export function App({ client, model }: { client: JarvisClient; model: string }) {
  const [state, dispatch] = useReducer(reduce, { ...initialState, model });
  const [helpVisible, setHelpVisible] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [models, setModels] = useState<{ id: string }[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [filePath, setFilePath] = useState(".");
  const [worktrees, setWorktrees] = useState<string[]>([]);
  const [currentWorktree, setCurrentWorktree] = useState("");
  const [plugins, setPlugins] = useState<{ id: string; kind?: string }[]>([]);
  const [tools, setTools] = useState<{ name: string; description?: string; source?: string }[]>([]);
  const [shellHistory, setShellHistory] = useState<ShellLine[]>([]);

  function reloadSessions() {
    void client.listSessions()
      .then((sessions) => dispatch({ type: "sessions", value: sessions }))
      .catch(() => undefined);
  }

  async function refreshApprovals() {
    try {
      dispatch({ type: "approvals", value: await client.listPendingApprovals() });
    } catch {
      // A keyless or offline server simply has no approvals to show.
    }
  }

  function refreshPaths() {
    void client.listFiles(filePath).then(setFiles).catch(() => setFiles([]));
    void client.listWorktrees().then(setWorktrees).catch(() => setWorktrees([]));
  }

  useEffect(() => {
    reloadSessions();
    void client.listModels().then(setModels).catch(() => undefined);
    void client.listAgents()
      .then((agents) => dispatch({ type: "agents", value: agents }))
      .catch(() => undefined);
    void client.listPlugins().then(setPlugins).catch(() => undefined);
    void client.listTools().then(setTools).catch(() => undefined);
    void refreshApprovals();
    refreshPaths();
  }, [client]);

  useEffect(() => {
    return client.subscribe((event) => {
      const data = event.data ?? {};
      if (data.tokens !== undefined || data.latency_ms !== undefined || data.energy_j !== undefined) {
        dispatch({
          type: "metrics",
          value: {
            tokens: typeof data.tokens === "number" ? data.tokens : undefined,
            latencyMs: typeof data.latency_ms === "number" ? data.latency_ms : undefined,
            energyJ: typeof data.energy_j === "number" ? data.energy_j : undefined,
          },
        });
      }
      const toolCall = parseToolEvent(event);
      if (toolCall) dispatch({ type: "toolcall", value: toolCall });
      const mapped = mapEvent(event);
      if (!mapped) return;
      dispatch({ type: "event", text: mapped.text });
      if (mapped.kind === "status" || mapped.kind === "error") {
        dispatch({ type: "status", text: mapped.text });
      }
    });
  }, [client]);

  useKeyboard((key) => {
    switch (commandForKey(key.name, key.ctrl)) {
      case "help":
        setHelpVisible((visible) => !visible);
        break;
      case "escape":
        setHelpVisible(false);
        break;
      case "panel":
        setPanelVisible((visible) => !visible);
        break;
      case "quit":
        process.exit(0);
        break;
      default:
        break;
    }
  });

  async function send(text: string) {
    dispatch({ type: "user", text });
    dispatch({ type: "assistant-start" });
    try {
      for await (const token of client.chat(state.model, [{ role: "user", content: text }])) {
        dispatch({ type: "token", text: token });
      }
      dispatch({ type: "status", text: "Ready" });
    } catch (error) {
      dispatch({ type: "status", text: `Error: ${String(error)}` });
    }
  }

  async function resolveApproval(id: string, approve: boolean) {
    try {
      await client.respondToApproval(id, approve);
      await refreshApprovals();
    } catch (error) {
      dispatch({ type: "status", text: `Approval failed: ${String(error)}` });
    }
  }

  async function runShell(command: string) {
    setShellHistory((lines) => [...lines, { kind: "command", text: command }]);
    try {
      let output = "";
      for await (const token of client.chat(state.model, [{
        role: "user",
        content: `Run this shell command and return only its output:\n${command}`,
      }])) {
        output += token;
      }
      setShellHistory((lines) => [
        ...lines,
        { kind: "output", text: output.trim() || "(no output)" },
      ]);
    } catch (error) {
      setShellHistory((lines) => [...lines, { kind: "error", text: String(error) }]);
    }
  }

  const busy = state.status !== "Ready";
  const diffText = state.toolCalls
    .map((call) => String((call.params as { diff?: unknown } | undefined)?.diff ?? call.outcome ?? ""))
    .find((text) => extractDiff(text)) ?? "";

  return (
    <box style={{ flexDirection: "row", height: "100%", backgroundColor: "#0d0d0d" }}>
      <box style={{ flexDirection: "column", flexGrow: 1 }}>
        <SessionTabs
          sessions={state.sessions}
          activeId={state.sessionId}
          onSelect={(id) => dispatch({ type: "active-session", text: id })}
        />
        <Frame title="Jarvis">
          <Transcript messages={state.messages} streaming={busy} />
        </Frame>
        <box style={{ flexDirection: "row", gap: 1, backgroundColor: "#181818" }}>
          <Spinner busy={busy} />
          <Frame title="Events" style={{ height: 4 }}>
            {state.events.slice(-3).map((line, index) => (
              <text key={index} content={line} />
            ))}
          </Frame>
        </box>
        <Frame title="Prompt">
          <Prompt onSubmit={(text) => void send(text)} disabled={busy} />
        </Frame>
        <StatusBar
          status={state.status}
          model={state.model}
          session={state.sessionId}
          metrics={state.metrics}
        />
      </box>
      {panelVisible && (
        <scrollbox style={{ width: 40, backgroundColor: "#141414" }} focused>
          <Frame title="Sessions" style={{ height: 8 }}>
            <SessionManager
              sessions={state.sessions}
              activeId={state.sessionId}
              client={client}
              onChanged={reloadSessions}
            />
          </Frame>
          <Frame title="Model" style={{ height: 6 }}>
            <ModelPicker
              models={models}
              current={state.model}
              onSelect={(id) => dispatch({ type: "model", text: id })}
            />
          </Frame>
          <Frame title="Agent" style={{ height: 6 }}>
            <AgentPicker
              agents={state.agents}
              current={state.agentId}
              onSelect={(id) => dispatch({ type: "active-agent", text: id })}
            />
          </Frame>
          <Frame title="Approvals" style={{ height: 6 }}>
            <ApprovalPanel
              approvals={state.approvals}
              onApprove={(id) => void resolveApproval(id, true)}
              onDeny={(id) => void resolveApproval(id, false)}
            />
          </Frame>
          <Frame title="Tool calls" style={{ height: 8 }}>
            <ToolCallPane calls={state.toolCalls} />
          </Frame>
          <Frame title="Diff" style={{ height: 10 }}>
            <DiffView diff={diffText} />
          </Frame>
          <Frame title="Shell" style={{ height: 8 }}>
            <ShellPane history={shellHistory} onRun={(command) => void runShell(command)} />
          </Frame>
          <Frame title="Files" style={{ height: 8 }}>
            <FilePicker
              files={files}
              onSelect={(path) => dispatch({ type: "event", text: `Reference: ${path}` })}
              onRefresh={(path) => {
                setFilePath(path);
                void client.listFiles(path).then(setFiles).catch(() => setFiles([]));
              }}
            />
          </Frame>
          <Frame title="Worktrees" style={{ height: 6 }}>
            <WorktreePicker
              worktrees={worktrees}
              current={currentWorktree}
              onSelect={(path) => {
                setCurrentWorktree(path);
                dispatch({ type: "event", text: `Worktree: ${path}` });
              }}
            />
          </Frame>
          <Frame title="MCP" style={{ height: 6 }}>
            <McpPanel tools={tools} />
          </Frame>
          <Frame title="Plugins" style={{ height: 6 }}>
            <PluginPanel plugins={plugins} />
          </Frame>
        </scrollbox>
      )}
      <HelpOverlay visible={helpVisible} />
    </box>
  );
}
