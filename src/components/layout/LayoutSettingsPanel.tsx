import { XIcon } from "$icons";
import type { EditorFontFamily, FocusDimmingMode, FocusModeSettings } from "$types";
import { type ChangeEvent, useCallback } from "react";

type LayoutSettingsPanelProps = {
  isVisible: boolean;
  sidebarCollapsed: boolean;
  topBarsCollapsed: boolean;
  statusBarCollapsed: boolean;
  lineNumbersVisible: boolean;
  textWrappingEnabled: boolean;
  syntaxHighlightingEnabled: boolean;
  editorFontSize: number;
  editorFontFamily: EditorFontFamily;
  focusModeSettings: FocusModeSettings;
  posHighlightingEnabled: boolean;
  onSetSidebarCollapsed: (value: boolean) => void;
  onSetTopBarsCollapsed: (value: boolean) => void;
  onSetStatusBarCollapsed: (value: boolean) => void;
  onSetLineNumbersVisible: (value: boolean) => void;
  onSetTextWrappingEnabled: (value: boolean) => void;
  onSetSyntaxHighlightingEnabled: (value: boolean) => void;
  onSetEditorFontSize: (value: number) => void;
  onSetEditorFontFamily: (value: EditorFontFamily) => void;
  onSetTypewriterScrollingEnabled: (enabled: boolean) => void;
  onSetFocusDimmingMode: (mode: FocusDimmingMode) => void;
  onSetPosHighlightingEnabled: (value: boolean) => void;
  onClose: () => void;
};

type ToggleRowProps = {
  label: string;
  description: string;
  isVisible: boolean;
  onToggle: (isVisible: boolean) => void;
};

const ToggleRow = ({ label, description, isVisible, onToggle }: ToggleRowProps) => {
  const handleClick = useCallback(() => {
    onToggle(!isVisible);
  }, [isVisible, onToggle]);

  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="m-0 text-[0.8125rem] text-text-primary">{label}</p>
        <p className="m-0 text-xs text-text-secondary">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isVisible}
        onClick={handleClick}
        className={`relative w-11 h-6 rounded-full border transition-colors duration-150 cursor-pointer ${
          isVisible ? "bg-accent-cyan border-accent-cyan" : "bg-layer-02 border-border-subtle"
        }`}>
        <span
          className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white transition-transform duration-150 ${
            isVisible ? "translate-x-[20px]" : ""
          }`} />
      </button>
    </div>
  );
};

const SettingsHeader = ({ onClose }: { onClose: () => void }) => (
  <div className="flex items-center justify-between mb-2">
    <h2 className="m-0 text-sm font-medium text-text-primary">Layout Settings</h2>
    <button
      type="button"
      onClick={onClose}
      className="w-7 h-7 flex items-center justify-center bg-transparent border border-border-subtle rounded text-icon-secondary hover:text-icon-primary cursor-pointer"
      aria-label="Close layout settings">
      <XIcon size="sm" />
    </button>
  </div>
);

const EDITOR_FONT_OPTIONS: Array<{ label: string; value: EditorFontFamily }> = [
  { label: "IBM Plex Mono", value: "IBM Plex Mono" },
  { label: "IBM Plex Sans Variable", value: "IBM Plex Sans Variable" },
  { label: "IBM Plex Serif", value: "IBM Plex Serif" },
  { label: "Monaspace Argon", value: "Monaspace Argon" },
  { label: "Monaspace Krypton", value: "Monaspace Krypton" },
  { label: "Monaspace Neon", value: "Monaspace Neon" },
  { label: "Monaspace Radon", value: "Monaspace Radon" },
  { label: "Monaspace Xenon", value: "Monaspace Xenon" },
];

type FontFamilyRowProps = { value: EditorFontFamily; setter: (event: ChangeEvent<HTMLSelectElement>) => void };

const FontFamilyRow = ({ value, setter }: FontFamilyRowProps) => (
  <div className="py-2.5">
    <label className="m-0 text-[0.8125rem] text-text-primary block mb-1.5" htmlFor="editor-font-family">
      Editor Font
    </label>
    <select
      id="editor-font-family"
      value={value}
      onChange={setter}
      className="w-full h-9 px-2.5 rounded border border-border-subtle bg-field-01 text-text-primary text-sm">
      {EDITOR_FONT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
);

const FontSizeRow = ({ value, setter }: { value: number; setter: (event: ChangeEvent<HTMLInputElement>) => void }) => (
  <div className="py-2.5">
    <div className="flex items-center justify-between gap-4 mb-1.5">
      <label className="m-0 text-[0.8125rem] text-text-primary" htmlFor="editor-font-size">Editor Size</label>
      <span className="text-xs text-text-secondary">{value}px</span>
    </div>
    <input
      id="editor-font-size"
      type="range"
      min={12}
      max={24}
      step={1}
      value={value}
      onChange={setter}
      className="w-full accent-accent-cyan cursor-pointer" />
  </div>
);

type DimmingModeRowProps = { value: FocusDimmingMode; setter: (dimmingMode: FocusDimmingMode) => void };

function DimmingModeRow({ value, setter }: DimmingModeRowProps) {
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
}

export function LayoutSettingsPanel(
  {
    isVisible,
    sidebarCollapsed,
    topBarsCollapsed,
    statusBarCollapsed,
    lineNumbersVisible,
    textWrappingEnabled,
    syntaxHighlightingEnabled,
    editorFontSize,
    editorFontFamily,
    focusModeSettings,
    posHighlightingEnabled,
    onSetSidebarCollapsed,
    onSetTopBarsCollapsed,
    onSetStatusBarCollapsed,
    onSetLineNumbersVisible,
    onSetTextWrappingEnabled,
    onSetSyntaxHighlightingEnabled,
    onSetEditorFontSize,
    onSetEditorFontFamily,
    onSetTypewriterScrollingEnabled,
    onSetFocusDimmingMode,
    onSetPosHighlightingEnabled,
    onClose,
  }: LayoutSettingsPanelProps,
) {
  const toggleSidebar = useCallback(() => {
    onSetSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, onSetSidebarCollapsed]);

  const toggleTopBars = useCallback(() => {
    onSetTopBarsCollapsed(!topBarsCollapsed);
  }, [topBarsCollapsed, onSetTopBarsCollapsed]);

  const toggleStatusBar = useCallback(() => {
    onSetStatusBarCollapsed(!statusBarCollapsed);
  }, [statusBarCollapsed, onSetStatusBarCollapsed]);

  const toggleLineNumbers = useCallback(() => {
    onSetLineNumbersVisible(!lineNumbersVisible);
  }, [lineNumbersVisible, onSetLineNumbersVisible]);

  const toggleTextWrapping = useCallback(() => {
    onSetTextWrappingEnabled(!textWrappingEnabled);
  }, [onSetTextWrappingEnabled, textWrappingEnabled]);

  const toggleSyntaxHighlighting = useCallback(() => {
    onSetSyntaxHighlightingEnabled(!syntaxHighlightingEnabled);
  }, [onSetSyntaxHighlightingEnabled, syntaxHighlightingEnabled]);

  const handleFontSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    onSetEditorFontSize(Number(event.target.value));
  }, [onSetEditorFontSize]);

  const handleFontFamilyChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    onSetEditorFontFamily(event.target.value as EditorFontFamily);
  }, [onSetEditorFontFamily]);

  const togglePosHighlighting = useCallback(() => {
    onSetPosHighlightingEnabled(!posHighlightingEnabled);
  }, [onSetPosHighlightingEnabled, posHighlightingEnabled]);

  if (isVisible) {
    return (
      <div className="fixed inset-0 z-50">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close layout settings"
          className="absolute inset-0 bg-black/30 border-none p-0 m-0" />

        <section className="absolute right-4 top-14 w-[320px] bg-layer-01 border border-border-subtle rounded-lg shadow-xl p-4">
          <SettingsHeader onClose={onClose} />
          <ToggleRow
            label="Sidebar"
            description="Show or hide the left navigation panel."
            isVisible={!sidebarCollapsed}
            onToggle={toggleSidebar} />
          <ToggleRow
            label="Tab Bar"
            description="Show or hide the document tabs."
            isVisible={!topBarsCollapsed}
            onToggle={toggleTopBars} />
          <ToggleRow
            label="Status Bar"
            description="Show or hide the editor status row."
            isVisible={!statusBarCollapsed}
            onToggle={toggleStatusBar} />
          <ToggleRow
            label="Line Numbers"
            description="Show or hide line numbers in the editor gutter."
            isVisible={lineNumbersVisible}
            onToggle={toggleLineNumbers} />
          <ToggleRow
            label="Text Wrapping"
            description="Wrap long lines in the editor instead of horizontal scrolling."
            isVisible={textWrappingEnabled}
            onToggle={toggleTextWrapping} />
          <ToggleRow
            label="Syntax Highlighting"
            description="Enable Markdown syntax colors and token styling."
            isVisible={syntaxHighlightingEnabled}
            onToggle={toggleSyntaxHighlighting} />
          <FontFamilyRow value={editorFontFamily} setter={handleFontFamilyChange} />
          <FontSizeRow value={editorFontSize} setter={handleFontSizeChange} />

          <div className="border-t border-border-subtle my-3" />
          <p className="m-0 text-xs text-text-secondary mb-2">Focus Mode</p>

          <ToggleRow
            label="Typewriter Scrolling"
            description="Keep the active line centered in the viewport."
            isVisible={focusModeSettings.typewriterScrollingEnabled}
            onToggle={onSetTypewriterScrollingEnabled} />

          <DimmingModeRow value={focusModeSettings.dimmingMode} setter={onSetFocusDimmingMode} />

          <div className="border-t border-border-subtle my-3" />
          <p className="m-0 text-xs text-text-secondary mb-2">Writer's Tools</p>

          <ToggleRow
            label="Parts of Speech Highlighting"
            description="Color text by grammatical role (nouns, verbs, adjectives, etc.)."
            isVisible={posHighlightingEnabled}
            onToggle={togglePosHighlighting} />
        </section>
      </div>
    );
  }

  return null;
}
