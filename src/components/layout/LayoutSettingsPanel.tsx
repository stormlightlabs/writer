import { XIcon } from "$icons";
import type { EditorFontFamily } from "$types";
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
  onSetSidebarCollapsed: (value: boolean) => void;
  onSetTopBarsCollapsed: (value: boolean) => void;
  onSetStatusBarCollapsed: (value: boolean) => void;
  onSetLineNumbersVisible: (value: boolean) => void;
  onSetTextWrappingEnabled: (value: boolean) => void;
  onSetSyntaxHighlightingEnabled: (value: boolean) => void;
  onSetEditorFontSize: (value: number) => void;
  onSetEditorFontFamily: (value: EditorFontFamily) => void;
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

type FontFamilyRowProps = {
  fontFamily: EditorFontFamily;
  handleFontChange: (event: ChangeEvent<HTMLSelectElement>) => void;
};

const FontFamilyRow = ({ fontFamily, handleFontChange }: FontFamilyRowProps) => (
  <div className="py-2.5">
    <label className="m-0 text-[0.8125rem] text-text-primary block mb-1.5" htmlFor="editor-font-family">
      Editor Font
    </label>
    <select
      id="editor-font-family"
      value={fontFamily}
      onChange={handleFontChange}
      className="w-full h-9 px-2.5 rounded border border-border-subtle bg-field-01 text-text-primary text-sm">
      {EDITOR_FONT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
);

const FontSizeRow = (
  { fontSize, handleFontSizeChange }: {
    fontSize: number;
    handleFontSizeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  },
) => (
  <div className="py-2.5">
    <div className="flex items-center justify-between gap-4 mb-1.5">
      <label className="m-0 text-[0.8125rem] text-text-primary" htmlFor="editor-font-size">Editor Size</label>
      <span className="text-xs text-text-secondary">{fontSize}px</span>
    </div>
    <input
      id="editor-font-size"
      type="range"
      min={12}
      max={24}
      step={1}
      value={fontSize}
      onChange={handleFontSizeChange}
      className="w-full accent-accent-cyan cursor-pointer" />
  </div>
);

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
    onSetSidebarCollapsed,
    onSetTopBarsCollapsed,
    onSetStatusBarCollapsed,
    onSetLineNumbersVisible,
    onSetTextWrappingEnabled,
    onSetSyntaxHighlightingEnabled,
    onSetEditorFontSize,
    onSetEditorFontFamily,
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
          <FontFamilyRow fontFamily={editorFontFamily} handleFontChange={handleFontFamilyChange} />
          <FontSizeRow fontSize={editorFontSize} handleFontSizeChange={handleFontSizeChange} />
        </section>
      </div>
    );
  }

  return null;
}
