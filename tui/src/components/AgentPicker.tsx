import type { AgentInfo } from "../client";
import { theme } from "../theme";
import { toOptions } from "./ModelPicker";

/** Focused agent chooser built from the agents returned by the Jarvis API. */
export function AgentPicker({ agents, current, onSelect }: {
  agents: AgentInfo[];
  current?: string;
  onSelect: (id: string) => void;
}) {
  const options = toOptions(agents, (agent) => agent.name || agent.id).map((option, index) => ({
    ...option,
    description: agents[index].description ?? "",
  }));
  const currentIndex = options.findIndex((option) => (option.value as AgentInfo).id === current);
  const selectedIndex = currentIndex < 0 ? 0 : currentIndex;
  const hasAgents = options.length > 0;

  return (
    <box
      style={{
        border: true,
        borderColor: hasAgents ? theme.borderFocused : theme.border,
        backgroundColor: theme.surface,
        flexDirection: "column",
        height: 8,
      }}
    >
      <text fg={theme.muted} content={`agent${current ? ` · ${current}` : ""}`} />
      {hasAgents ? (
        <select
          options={options}
          focused
          selectedIndex={selectedIndex}
          style={{ height: 6, backgroundColor: theme.surface }}
          onChange={(_index, option) => {
            const agent = option?.value as AgentInfo | undefined;
            if (agent?.id) onSelect(agent.id);
          }}
        />
      ) : (
        <text fg={theme.muted} content="no agents available" />
      )}
    </box>
  );
}
