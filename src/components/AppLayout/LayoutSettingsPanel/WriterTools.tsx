import { POS_HIGHLIGHT_LEGEND } from "$editor/constants";
import { useLayoutSettingsWriterToolsState } from "$state/selectors";
import { StyleMarkerStyle } from "$types";
import { ChangeEvent, useCallback, useState } from "react";
import { CustomPatternControls } from "./CustomPatternControls";
import { ToggleRow } from "./ToggleRow";

const STYLE_MARKER_OPTIONS: Array<{ value: StyleMarkerStyle; label: string }> = [
  { value: "highlight", label: "Highlight" },
  { value: "strikethrough", label: "Strikethrough" },
  { value: "underline", label: "Underline" },
];

type StyleMarkerRowProps = { value: StyleMarkerStyle; onChange: (event: ChangeEvent<HTMLSelectElement>) => void };

const StyleMarkerRow = ({ value, onChange }: StyleMarkerRowProps) => (
  <div className="py-2.5">
    <label className="m-0 text-[0.8125rem] text-text-primary block mb-1.5" htmlFor="style-marker-style">
      Marker Style
    </label>
    <select
      id="style-marker-style"
      value={value}
      onChange={onChange}
      className="w-full h-9 px-2.5 rounded border border-border-subtle bg-field-01 text-text-primary text-sm">
      {STYLE_MARKER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
);

const PosHighlightLegendRow = ({ label, swatchClassName }: { label: string; swatchClassName: string }) => (
  <li className="flex items-center gap-2 text-xs text-text-primary">
    <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full border border-border-subtle ${swatchClassName}`} />
    <span>{label}</span>
  </li>
);

const PosHighlightLegend = () => (
  <div className="mt-2 rounded border border-border-subtle bg-layer-02/40 px-3 py-2.5">
    <p className="m-0 mb-2 text-xs text-text-secondary">Part of Speech Colors</p>
    <ul className="m-0 grid list-none grid-cols-1 gap-1.5 p-0 sm:grid-cols-2">
      {POS_HIGHLIGHT_LEGEND.map((item) => (
        <PosHighlightLegendRow key={item.className} label={item.label} swatchClassName={item.swatchClassName} />
      ))}
    </ul>
  </div>
);

function StyleCheckSection() {
  const { styleCheckSettings, setStyleCheckSettings, setStyleCheckCategory, addCustomPattern, removeCustomPattern } =
    useLayoutSettingsWriterToolsState();
  const [showCustom, setShowCustom] = useState(false);

  const toggleFiller = useCallback(() => {
    setStyleCheckCategory("filler", !styleCheckSettings.categories.filler);
  }, [setStyleCheckCategory, styleCheckSettings.categories.filler]);

  const toggleRedundancy = useCallback(() => {
    setStyleCheckCategory("redundancy", !styleCheckSettings.categories.redundancy);
  }, [setStyleCheckCategory, styleCheckSettings.categories.redundancy]);

  const toggleCliche = useCallback(() => {
    setStyleCheckCategory("cliche", !styleCheckSettings.categories.cliche);
  }, [setStyleCheckCategory, styleCheckSettings.categories.cliche]);

  const handleStyleCheckEnabled = useCallback((enabled: boolean) => {
    setStyleCheckSettings({ ...styleCheckSettings, enabled });
  }, [setStyleCheckSettings, styleCheckSettings]);

  const handleMarkerStyleChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setStyleCheckSettings({ ...styleCheckSettings, markerStyle: event.target.value as StyleMarkerStyle });
  }, [setStyleCheckSettings, styleCheckSettings]);

  return (
    <div className="py-2.5">
      <ToggleRow
        label="Style Check"
        description="Flag weak patterns: fillers, redundancies, and clichés."
        isVisible={styleCheckSettings.enabled}
        onToggle={handleStyleCheckEnabled} />

      {styleCheckSettings.enabled && (
        <div className="mt-2 pl-3 border-l-2 border-border-subtle">
          <p className="m-0 text-xs text-text-secondary mb-2">Categories</p>
          <ToggleRow
            label="Fillers & Weak Language"
            description="Flag filler words like 'basically', 'actually', 'just'."
            isVisible={styleCheckSettings.categories.filler}
            onToggle={toggleFiller} />
          <ToggleRow
            label="Redundancies"
            description="Flag complex phrases that could be simplified."
            isVisible={styleCheckSettings.categories.redundancy}
            onToggle={toggleRedundancy} />
          <ToggleRow
            label="Clichés"
            description="Flag overused expressions like 'at the end of the day'."
            isVisible={styleCheckSettings.categories.cliche}
            onToggle={toggleCliche} />
          <StyleMarkerRow value={styleCheckSettings.markerStyle} onChange={handleMarkerStyleChange} />
          <CustomPatternControls
            showCustom={showCustom}
            setShowCustom={setShowCustom}
            settings={styleCheckSettings}
            onRemovePattern={removeCustomPattern}
            onAddPattern={addCustomPattern} />
        </div>
      )}
    </div>
  );
}

export function WriterToolsSection() {
  const { posHighlightingEnabled, togglePosHighlighting } = useLayoutSettingsWriterToolsState();

  return (
    <>
      <ToggleRow
        label="Parts of Speech Highlighting"
        description="Color text by grammatical role (nouns, verbs, adjectives, etc.)."
        isVisible={posHighlightingEnabled}
        onToggle={togglePosHighlighting} />
      {posHighlightingEnabled && <PosHighlightLegend />}

      <StyleCheckSection />
    </>
  );
}
