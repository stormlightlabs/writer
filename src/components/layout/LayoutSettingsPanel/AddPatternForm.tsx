import { Button } from "$components/Button";
import type { PatternCategory } from "$types";
import { ChangeEventHandler, useCallback, useState } from "react";

export type AddPatternFn = (pattern: { text: string; category: PatternCategory; replacement?: string }) => void;

export const AddPatternForm = ({ onAddPattern }: { onAddPattern: AddPatternFn }) => {
  const [patternValue, setPatternValue] = useState("");
  const [categoryValue, setCategoryValue] = useState<PatternCategory>("filler");
  const [replacementValue, setReplacementValue] = useState("");

  const handlePatternChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => setPatternValue(e.target.value),
    [setPatternValue],
  );

  const handleReplacementChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => setReplacementValue(e.target.value),
    [setReplacementValue],
  );

  const handleCategoryChange: ChangeEventHandler<HTMLSelectElement> = useCallback(
    (e) => setCategoryValue(e.target.value as PatternCategory),
    [setCategoryValue],
  );

  const handleAddPattern = useCallback(() => {
    const text = patternValue.trim().toLowerCase();
    if (!text) {
      return;
    }

    onAddPattern({ text, category: categoryValue, replacement: replacementValue.trim() || undefined });
    setPatternValue("");
    setReplacementValue("");
  }, [patternValue, categoryValue, replacementValue, onAddPattern]);

  return (
    <div className="space-y-1.5">
      <input
        type="text"
        value={patternValue}
        onChange={handlePatternChange}
        placeholder="Pattern to flag"
        className="w-full h-7 px-2 text-xs rounded border border-border-subtle bg-field-01 text-text-primary" />
      <select
        value={categoryValue}
        onChange={handleCategoryChange}
        className="w-full h-7 px-2 text-xs rounded border border-border-subtle bg-field-01 text-text-primary">
        <option value="filler">Filler</option>
        <option value="redundancy">Redundancy</option>
        <option value="cliche">Cliché</option>
      </select>
      <input
        type="text"
        value={replacementValue}
        onChange={handleReplacementChange}
        placeholder="Replacement (optional)"
        className="w-full h-7 px-2 text-xs rounded border border-border-subtle bg-field-01 text-text-primary" />
      <Button
        type="button"
        onClick={handleAddPattern}
        disabled={!patternValue.trim()}
        className="w-full h-7 text-xs rounded bg-accent-cyan text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none">
        Add Pattern
      </Button>
    </div>
  );
};
