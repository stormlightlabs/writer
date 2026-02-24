import { Button } from "$components/Button";
import { CollapsibleSection } from "$components/CollapsibleSection";
import { Dialog } from "$components/Dialog";
import { useViewportTier } from "$hooks/useViewportTier";
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
import { type ChangeEvent, useCallback, useMemo, useState } from "react";
import { CustomPatternControls } from "./CustomPatternControls";
import { DimmingModeRow } from "./DimmingModeRow";
import { FontFamilyRow, FontSizeRow } from "./FontRows";
import { ToggleRow } from "./ToggleRow";

const SettingsHeader = ({ onClose }: { onClose: () => void }) => (
  <div className="flex items-center justify-between mb-2">
    <h2 className="m-0 text-sm font-medium text-text-primary">Layout Settings</h2>
    <Button type="button" variant="iconSubtle" size="iconLg" onClick={onClose} aria-label="Close layout settings">
      <XIcon size="sm" />
    </Button>
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
  const { toggleCalmUi, setCalmUiAutoHide, setCalmUiFocusMode } = useCalmUiActions();

  return (
    <div className="py-2.5">
      <ToggleRow
        label="Enable Calm UI"
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
      <ToggleRow
        label="Parts of Speech Highlighting"
        description="Color text by grammatical role (nouns, verbs, adjectives, etc.)."
        isVisible={posHighlightingEnabled}
        onToggle={togglePosHighlighting} />

      <StyleCheckSection />
    </>
  );
}

type QuickCaptureSectionProps = { enabled: boolean; onEnabledChange: (enabled: boolean) => void };

const QuickCaptureSection = ({ enabled, onEnabledChange }: QuickCaptureSectionProps) => (
  <ToggleRow
    label="Enable Quick Capture"
    description="Turn global quick-note capture on or off."
    isVisible={enabled}
    onToggle={onEnabledChange} />
);

type SettingsBodyProps = { quickCaptureEnabled: boolean; onQuickCaptureEnabledChange: (enabled: boolean) => void };

const SettingsBody = ({ quickCaptureEnabled, onQuickCaptureEnabledChange }: SettingsBodyProps) => (
  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
    <CollapsibleSection title="Calm UI" description="Reduce visual noise and automate focus-oriented behavior.">
      <CalmUiSettingsSection />
    </CollapsibleSection>
    <CollapsibleSection title="Chrome" description="Control visibility of core app UI regions." defaultOpen>
      <ChromeSettingsSection />
    </CollapsibleSection>
    <CollapsibleSection title="Editor" description="Tune text presentation, wrapping, and typography." defaultOpen>
      <EditorSettingsSection />
    </CollapsibleSection>
    <CollapsibleSection title="Focus Mode" description="Configure centered writing and dimming behavior.">
      <FocusModeSection />
    </CollapsibleSection>
    <CollapsibleSection title="Writer's Tools" description="Adjust writing analysis and guidance features.">
      <WriterToolsSection />
    </CollapsibleSection>
    <CollapsibleSection title="Quick Capture" description="Toggle global quick-note capture behavior.">
      <QuickCaptureSection enabled={quickCaptureEnabled} onEnabledChange={onQuickCaptureEnabledChange} />
    </CollapsibleSection>
  </div>
);

type LayoutSettingsPanelProps = {
  isVisible: boolean;
  onClose: () => void;
  quickCaptureEnabled: boolean;
  onQuickCaptureEnabledChange: (enabled: boolean) => void;
};

export const LayoutSettingsPanel = (
  { isVisible, onClose, quickCaptureEnabled, onQuickCaptureEnabledChange }: LayoutSettingsPanelProps,
) => {
  const { isCompact, viewportWidth } = useViewportTier();
  const compactPanel = useMemo(() => isCompact || viewportWidth < 920, [isCompact, viewportWidth]);

  return (
    <Dialog
      isOpen={isVisible}
      onClose={onClose}
      ariaLabel="Layout settings"
      motionPreset={compactPanel ? "slideUp" : "slideRight"}
      backdropClassName={compactPanel ? "bg-black/35" : "bg-black/30"}
      containerClassName="z-50 pointer-events-none"
      panelClassName={`absolute flex min-h-0 flex-col overflow-hidden bg-layer-01 border border-border-subtle shadow-xl ${
        compactPanel
          ? "left-3 right-3 bottom-3 max-h-[calc(100vh-5rem)] rounded-lg"
          : "right-4 top-14 w-[360px] max-h-[calc(100vh-4.5rem)] rounded-lg"
      }`}>
      <section className="flex min-h-0 h-full flex-col overflow-hidden p-4">
        <SettingsHeader onClose={onClose} />
        <SettingsBody
          quickCaptureEnabled={quickCaptureEnabled}
          onQuickCaptureEnabledChange={onQuickCaptureEnabledChange} />
      </section>
    </Dialog>
  );
};
