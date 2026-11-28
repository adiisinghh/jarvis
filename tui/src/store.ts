import type { AgentInfo, ApprovalInfo, Session, ToolCallInfo } from "./client";

export type Message = { role: "user" | "assistant"; content: string };
export type Metrics = { tokens?: number; latencyMs?: number; energyJ?: number };
export type TuiState = {
  messages: Message[];
  status: string;
  model: string;
  sessionId: string;
  sessions: Session[];
  agents: AgentInfo[];
  approvals: ApprovalInfo[];
  toolCalls: ToolCallInfo[];
  agentId: string;
  events: string[];
  metrics: Metrics;
};

export type Action =
  | { type: "user" | "token"; text: string }
  | { type: "assistant-start" }
  | { type: "status"; text: string }
  | { type: "model"; text: string }
  | { type: "session"; text: string }
  | { type: "sessions"; value: Session[] }
  | { type: "active-session"; text: string }
  | { type: "metrics"; value: Metrics }
  | { type: "agents"; value: AgentInfo[] }
  | { type: "approvals"; value: ApprovalInfo[] }
  | { type: "toolcalls"; value: ToolCallInfo[] }
  | { type: "toolcall"; value: ToolCallInfo }
  | { type: "active-agent"; text: string }
  | { type: "event"; text: string }
  | { type: "clear" };

export const initialState: TuiState = {
  messages: [],
  status: "Ready",
  model: "",
  sessionId: "",
  sessions: [],
  agents: [],
  approvals: [],
  toolCalls: [],
  agentId: "",
  events: [],
  metrics: {},
};

export function reduce(state: TuiState, action: Action): TuiState {
  switch (action.type) {
    case "user":
      return {
        ...state,
        messages: [...state.messages, { role: "user", content: action.text }],
        status: "Thinking…",
      };
    case "assistant-start":
      return { ...state, messages: [...state.messages, { role: "assistant", content: "" }] };
    case "token": {
      const messages = [...state.messages];
      const last = messages.at(-1);
      if (last?.role === "assistant") {
        messages[messages.length - 1] = { ...last, content: last.content + action.text };
      }
      return { ...state, messages };
    }
    case "status":
      return { ...state, status: action.text };
    case "model":
      return { ...state, model: action.text };
    case "session":
      return { ...state, sessionId: action.text, messages: [], events: [] };
    case "sessions":
      return { ...state, sessions: action.value };
    case "active-session":
      return { ...state, sessionId: action.text, messages: [], events: [] };
    case "metrics":
      return { ...state, metrics: action.value };
    case "agents":
      return { ...state, agents: action.value };
    case "approvals":
      return { ...state, approvals: action.value };
    case "toolcalls":
      return { ...state, toolCalls: action.value };
    case "toolcall":
      return { ...state, toolCalls: [...state.toolCalls.slice(-49), action.value] };
    case "active-agent":
      return { ...state, agentId: action.text };
    case "event":
      return { ...state, events: [...state.events.slice(-19), action.text] };
    case "clear":
      return { ...initialState, model: state.model, sessionId: state.sessionId };
  }
}
