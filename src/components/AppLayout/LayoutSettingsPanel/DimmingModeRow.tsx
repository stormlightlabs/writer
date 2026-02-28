import { FocusDimmingMode } from "$types";
import { ChangeEvent, useCallback } from "react";

type DimmingModeRowProps = { value: FocusDimmingMode; setter: (dimmingMode: FocusDimmingMode) => void };

export const DimmingModeRow = ({ value, setter }: DimmingModeRowProps) => {
  const handleDimmingModeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setter(event.target.value as FocusDimmingMode);
  }, [setter]);

  const options = [{ value: "off", label: "Off" }, { value: "sentence", label: "Current Sentence" }, {
    value: "paragraph",
    label: "Current Paragraph",
  }];

  return (
    <div className="py-2.5">
      <label className="m-0 text-[0.8125rem] text-text-primary block mb-1.5">Text Dimming</label>
      <select
        value={value}
        onChange={handleDimmingModeChange}
        className="w-full h-9 px-2.5 rounded border border-border-subtle bg-field-01 text-text-primary text-sm">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <p className="m-0 text-xs text-text-secondary mt-1">Dim all text except the active region.</p>
    </div>
  );
};
