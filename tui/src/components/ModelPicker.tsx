import type { SelectOption } from "@opentui/core";
import { theme } from "../theme";

/** Turn a list of API items into OpenTUI select options, preserving each item as the option value. */
export function toOptions<T>(items: readonly T[], label: (item: T) => string): SelectOption[] {
  return items.map((item) => ({ name: label(item), description: "", value: item }));
}

/** Focused model chooser built from the models returned by GET /v1/models. */
export function ModelPicker({ models, current, onSelect }: {
  models: { id: string }[];
  current?: string;
  onSelect: (id: string) => void;
}) {
  const options = toOptions(models, (model) => model.id);
  const currentIndex = options.findIndex((option) => (option.value as { id: string }).id === current);
  const selectedIndex = currentIndex < 0 ? 0 : currentIndex;
  const hasModels = options.length > 0;

  return (
    <box
      style={{
        border: true,
        borderColor: hasModels ? theme.borderFocused : theme.border,
        backgroundColor: theme.surface,
        flexDirection: "column",
        height: 8,
      }}
    >
      <text fg={theme.muted} content={`model${current ? ` · ${current}` : ""}`} />
      {hasModels ? (
        <select
          options={options}
          focused
          selectedIndex={selectedIndex}
          showDescription={false}
          style={{ height: 6, backgroundColor: theme.surface }}
          onChange={(_index, option) => {
            const model = option?.value as { id: string } | undefined;
            if (model?.id) onSelect(model.id);
          }}
        />
      ) : (
        <text fg={theme.muted} content="no models available" />
      )}
    </box>
  );
}
