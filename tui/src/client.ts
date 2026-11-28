export type JarvisConfig = { baseUrl: string; apiKey?: string };
export type ChatMessage = { role: string; content: string };
export type JarvisEvent = { type: string; timestamp?: string; data?: Record<string, unknown> };
export type Session = { id: string; title?: string; updated_at?: string };
export type AgentInfo = { id: string; name?: string; description?: string };
export type ApprovalInfo = {
  id: string;
  tool?: string;
  params?: Record<string, unknown>;
  risk?: string;
  expires_at?: string;
};
export type ToolCallInfo = { id: string; tool: string; params?: Record<string, unknown>; outcome?: string };

function base64url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

/** Thin client for the Jarvis HTTP + WebSocket API. */
export class JarvisClient {
  constructor(private readonly cfg: JarvisConfig) {}

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.cfg.apiKey) headers.authorization = `Bearer ${this.cfg.apiKey}`;
    return headers;
  }

  async listModels(): Promise<{ id: string }[]> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/models`, { headers: this.headers() });
    if (!res.ok) throw new Error(`models request failed: ${res.status}`);
    const body = (await res.json()) as { data?: { id: string }[] };
    return body.data ?? [];
  }

  async listSessions(): Promise<Session[]> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/sessions`, { headers: this.headers() });
    if (!res.ok) throw new Error(`sessions request failed: ${res.status}`);
    const body = (await res.json()) as { data?: Session[]; sessions?: Session[] } | Session[];
    if (Array.isArray(body)) return body;
    return body.data ?? body.sessions ?? [];
  }

  async createSession(): Promise<Session> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/sessions`, {
      method: "POST",
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`create session failed: ${res.status}`);
    return (await res.json()) as Session;
  }

  async renameSession(id: string, title: string): Promise<void> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/sessions/${id}`, {
      method: "PATCH",
      headers: this.headers(),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error(`rename session failed: ${res.status}`);
  }

  async deleteSession(id: string): Promise<void> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/sessions/${id}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`delete session failed: ${res.status}`);
  }

  async listAgents(): Promise<AgentInfo[]> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/agents`, { headers: this.headers() });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: AgentInfo[]; agents?: AgentInfo[] };
    return body.data ?? body.agents ?? [];
  }

  async listPendingApprovals(): Promise<ApprovalInfo[]> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/approvals/pending`, { headers: this.headers() });
    if (!res.ok) return [];
    const body = (await res.json()) as { actions?: ApprovalInfo[] };
    return body.actions ?? [];
  }

  async listFiles(path = "."): Promise<string[]> {
    const url = new URL(`${this.cfg.baseUrl}/v1/files`);
    url.searchParams.set("path", path);
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) return [];
    const body = (await res.json()) as { files?: string[] };
    return body.files ?? [];
  }

  async listWorktrees(): Promise<string[]> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/worktrees`, { headers: this.headers() });
    if (!res.ok) return [];
    const body = (await res.json()) as { worktrees?: string[] };
    return body.worktrees ?? [];
  }

  async listPlugins(): Promise<{ id: string; kind?: string }[]> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/plugins`, { headers: this.headers() });
    if (!res.ok) return [];
    const body = (await res.json()) as { plugins?: { id: string; kind?: string }[] };
    return body.plugins ?? [];
  }

  async listTools(): Promise<{ name: string; category?: string; source?: string }[]> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/tools`, { headers: this.headers() });
    if (!res.ok) return [];
    const body = (await res.json()) as { tools?: { name: string; category?: string; source?: string }[] };
    return body.tools ?? [];
  }

  async *chat(model: string, messages: ChatMessage[]): AsyncGenerator<string> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ model, messages, stream: true }),
    });
    if (!res.ok || !res.body) throw new Error(`chat request failed: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return;
        const evt = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
        const delta = evt.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      }
    }
  }

  /** Subscribe to agent events. Returns an unsubscribe function. */
  subscribe(onEvent: (event: JarvisEvent) => void): () => void {
    const url = new URL(`${this.cfg.baseUrl}/v1/agents/events`);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const protocols = this.cfg.apiKey ? ["jarvis.auth.v1", base64url(this.cfg.apiKey)] : [];
    const ws = new WebSocket(url, protocols);
    ws.onmessage = (message) => {
      try {
        onEvent(JSON.parse(String(message.data)) as JarvisEvent);
      } catch {
        // Ignore malformed frames; the next one may still be valid.
      }
    };
    return () => ws.close();
  }

  async respondToApproval(id: string, approve: boolean): Promise<void> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/approvals/${id}/${approve ? "approve" : "deny"}`, {
      method: "POST",
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`approval request failed: ${res.status}`);
  }
}
