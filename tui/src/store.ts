export type Message = { role: "user" | "assistant"; content: string };
export type TuiState = {
  messages: Message[];
  status: string;
  model: string;
  sessionId: string;
  events: string[];
};

export type Action =
  | { type: "user" | "token"; text: string }
  | { type: "assistant-start" }
  | { type: "status"; text: string }
  | { type: "model"; text: string }
  | { type: "session"; text: string }
  | { type: "event"; text: string }
  | { type: "clear" };

export const initialState: TuiState = {
  messages: [],
  status: "Ready",
  model: "",
  sessionId: "",
  events: [],
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
    case "event":
      return { ...state, events: [...state.events.slice(-19), action.text] };
    case "clear":
      return { ...initialState, model: state.model, sessionId: state.sessionId };
  }
}
