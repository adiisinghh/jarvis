import type { Session } from "./client";

export type Message = { role: "user" | "assistant"; content: string };
export type Metrics = { tokens?: number; latencyMs?: number; energyJ?: number };
export type TuiState = {
  messages: Message[];
  status: string;
  model: string;
  sessionId: string;
  sessions: Session[];
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
  | { type: "event"; text: string }
  | { type: "clear" };

export const initialState: TuiState = {
  messages: [],
  status: "Ready",
  model: "",
  sessionId: "",
  sessions: [],
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
    case "event":
      return { ...state, events: [...state.events.slice(-19), action.text] };
    case "clear":
      return { ...initialState, model: state.model, sessionId: state.sessionId };
  }
}
