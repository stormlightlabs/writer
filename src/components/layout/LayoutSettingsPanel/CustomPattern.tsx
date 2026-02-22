import { XIcon } from "$icons";
import type { StyleCheckPattern, StyleCheckSettings } from "$types";
import { useCallback } from "react";

const PatternLabel = ({ pattern }: { pattern: StyleCheckPattern }) => (
  <span className="truncate flex-1">
    <span className="text-text-secondary">[{pattern.category}]</span>{" "}
    <span className="text-text-primary">{pattern.text}</span>
    {pattern.replacement && <span className="text-text-secondary">→ {pattern.replacement}</span>}
  </span>
);

const RemovePatternButton = (
  { index, onRemovePattern }: { index: number; onRemovePattern: (index: number) => void },
) => {
  const handleClick = useCallback(() => onRemovePattern(index), [index, onRemovePattern]);
  return (
    <button
      type="button"
      onClick={handleClick}
      className="ml-2 text-text-secondary hover:text-red-500 cursor-pointer bg-transparent border-none p-0">
      <XIcon size="xs" />
    </button>
  );
};

export const CustomPattern = (
  { settings, onRemovePattern }: { settings: StyleCheckSettings; onRemovePattern: (index: number) => void },
) => (
  <div className="max-h-24 overflow-y-auto border border-border-subtle rounded">
    {settings.customPatterns.map((pattern, index) => {
      const key = `${pattern.category}-${pattern.text}`;
      return (
        <div
          key={key}
          className="flex items-center justify-between px-2 py-1.5 text-xs border-b border-border-subtle last:border-b-0">
          <PatternLabel pattern={pattern} />
          <RemovePatternButton index={index} onRemovePattern={onRemovePattern} />
        </div>
      );
    })}
  </div>
);
