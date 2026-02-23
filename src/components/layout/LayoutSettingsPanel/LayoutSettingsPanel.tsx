import { XIcon } from "$icons";
import {
  useCalmUiActions,
  useCalmUiSettings,
  useLayoutSettingsChromeState,
  useLayoutSettingsEditorState,
  useLayoutSettingsFocusState,
  useLayoutSettingsWriterToolsState,
} from "$state/panel-selectors";
import type { EditorFontFamily } from "$types";
import { type ChangeEvent, useCallback, useState } from "react";
import { CustomPatternControls } from "./CustomPatternControls";
import { DimmingModeRow } from "./DimmingModeRow";
import { FontFamilyRow, FontSizeRow } from "./FontRows";
import { ToggleRow } from "./ToggleRow";

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

function ChromeSettingsSection() {
  const {
    sidebarCollapsed,
    topBarsCollapsed,
    statusBarCollapsed,
    toggleSidebarCollapsed,
    toggleTabBarCollapsed,
    toggleStatusBarCollapsed,
  } = useLayoutSettingsChromeState();

  return (
    <>
      <ToggleRow
        label="Sidebar"
        description="Show or hide the left navigation panel."
        isVisible={!sidebarCollapsed}
        onToggle={toggleSidebarCollapsed} />
      <ToggleRow
        label="Tab Bar"
        description="Show or hide the document tabs."
        isVisible={!topBarsCollapsed}
        onToggle={toggleTabBarCollapsed} />
      <ToggleRow
        label="Status Bar"
        description="Show or hide the editor status row."
        isVisible={!statusBarCollapsed}
        onToggle={toggleStatusBarCollapsed} />
    </>
  );
}

function CalmUiSettingsSection() {
  const { enabled, autoHide, focusMode } = useCalmUiSettings();
  const {
    toggleCalmUi,
    setCalmUiAutoHide,
    setCalmUiFocusMode,
  } = useCalmUiActions();

  return (
    <div className="py-2.5">
      <ToggleRow
        label="Calm UI"
        description="Writing-first defaults with quieter chrome behavior."
        isVisible={enabled}
        onToggle={toggleCalmUi} />

      {enabled && (
        <div className="mt-2 pl-3 border-l-2 border-border-subtle">
          <p className="m-0 text-xs text-text-secondary mb-2">Calm UI Options</p>
          <ToggleRow
            label="Auto-enter Focus Mode"
            description="Enter Focus mode when opening a document."
            isVisible={focusMode}
            onToggle={setCalmUiFocusMode} />
          <ToggleRow
            label="Auto-hide While Typing"
            description="Hide interface elements while you type, show on pause."
            isVisible={autoHide}
            onToggle={setCalmUiAutoHide} />
          <p className="m-0 text-xs text-text-placeholder mt-2">Hold Ctrl+Shift+H to reveal hidden UI</p>
        </div>
      )}
    </div>
  );
}

function EditorSettingsSection() {
  const {
    lineNumbersVisible,
    textWrappingEnabled,
    syntaxHighlightingEnabled,
    editorFontSize,
    editorFontFamily,
    toggleLineNumbersVisible,
    toggleTextWrappingEnabled,
    toggleSyntaxHighlightingEnabled,
    setEditorFontSize,
    setEditorFontFamily,
  } = useLayoutSettingsEditorState();

  const handleFontSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEditorFontSize(Number(event.target.value));
  }, [setEditorFontSize]);

  const handleFontFamilyChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setEditorFontFamily(event.target.value as EditorFontFamily);
  }, [setEditorFontFamily]);

  return (
    <>
      <ToggleRow
        label="Line Numbers"
        description="Show or hide line numbers in the editor gutter."
        isVisible={lineNumbersVisible}
        onToggle={toggleLineNumbersVisible} />
      <ToggleRow
        label="Text Wrapping"
        description="Wrap long lines in the editor instead of horizontal scrolling."
        isVisible={textWrappingEnabled}
        onToggle={toggleTextWrappingEnabled} />
      <ToggleRow
        label="Syntax Highlighting"
        description="Enable Markdown syntax colors and token styling."
        isVisible={syntaxHighlightingEnabled}
        onToggle={toggleSyntaxHighlightingEnabled} />
      <FontFamilyRow value={editorFontFamily} setter={handleFontFamilyChange} />
      <FontSizeRow value={editorFontSize} setter={handleFontSizeChange} />
    </>
  );
}

function FocusModeSection() {
  const { focusModeSettings, setTypewriterScrollingEnabled, setFocusDimmingMode } = useLayoutSettingsFocusState();

  return (
    <>
      <p className="m-0 text-xs text-text-secondary mb-2">Focus Mode</p>

      <ToggleRow
        label="Typewriter Scrolling"
        description="Keep the active line centered in the viewport."
        isVisible={focusModeSettings.typewriterScrollingEnabled}
        onToggle={setTypewriterScrollingEnabled} />

      <DimmingModeRow value={focusModeSettings.dimmingMode} setter={setFocusDimmingMode} />
    </>
  );
}

function WriterToolsSection() {
  const { posHighlightingEnabled, togglePosHighlighting } = useLayoutSettingsWriterToolsState();

  return (
    <>
      <p className="m-0 text-xs text-text-secondary mb-2">Writer's Tools</p>

      <ToggleRow
        label="Parts of Speech Highlighting"
        description="Color text by grammatical role (nouns, verbs, adjectives, etc.)."
        isVisible={posHighlightingEnabled}
        onToggle={togglePosHighlighting} />

      <StyleCheckSection />
    </>
  );
}

type LayoutSettingsPanelProps = { isVisible: boolean; onClose: () => void };

export const LayoutSettingsPanel = ({ isVisible, onClose }: LayoutSettingsPanelProps) =>
  isVisible
    ? (
      <div className="fixed inset-0 z-50">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close layout settings"
          className="absolute inset-0 bg-black/30 border-none p-0 m-0" />

        <section className="absolute right-4 top-14 w-[320px] bg-layer-01 border border-border-subtle rounded-lg shadow-xl p-4">
          <SettingsHeader onClose={onClose} />
          <CalmUiSettingsSection />
          <ChromeSettingsSection />
          <EditorSettingsSection />

          <div className="border-t border-border-subtle my-3" />
          <FocusModeSection />

          <div className="border-t border-border-subtle my-3" />
          <WriterToolsSection />
        </section>
      </div>
    )
    : null;
