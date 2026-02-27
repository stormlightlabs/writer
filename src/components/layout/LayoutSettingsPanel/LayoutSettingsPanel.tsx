import { Button } from "$components/Button";
import { CollapsibleSection } from "$components/CollapsibleSection";
import { Sheet, type SheetPosition } from "$components/Sheet";
import { useRoutedSheet } from "$hooks/useRoutedSheet";
import { useViewportTier } from "$hooks/useViewportTier";
import { XIcon } from "$icons";
import {
  useCreateReadmeState,
  useGlobalCaptureSettingsState,
  useLayoutSettingsChromeState,
  useLayoutSettingsEditorState,
  useLayoutSettingsFocusState,
  useLayoutSettingsUiState,
  useLayoutSettingsWriterToolsState,
  useReduceMotionState,
  useShowFilenamesState,
} from "$state/selectors";
import type { EditorFontFamily, StyleMarkerStyle } from "$types";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CustomPatternControls } from "./CustomPatternControls";
import { DimmingModeRow } from "./DimmingModeRow";
import { FontFamilyRow, FontSizeRow } from "./FontRows";
import { ToggleRow } from "./ToggleRow";

type SettingsScope = "basic" | "full";
type SettingsSheetLayout = { position: SheetPosition; className: string; backdropClassName: string };

const STYLE_MARKER_OPTIONS: Array<{ value: StyleMarkerStyle; label: string }> = [
  { value: "highlight", label: "Highlight" },
  { value: "strikethrough", label: "Strikethrough" },
  { value: "underline", label: "Underline" },
];

function SettingsHeader(
  { title, onClose, closeAriaLabel, onViewMore }: {
    title: string;
    onClose: () => void;
    closeAriaLabel: string;
    onViewMore?: () => void;
  },
) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="m-0 text-sm font-medium text-text-primary">{title}</h2>
      <div className="flex items-center gap-2">
        {onViewMore && <Button type="button" variant="outline" size="sm" onClick={onViewMore}>View more</Button>}
        <Button type="button" variant="iconSubtle" size="iconLg" onClick={onClose} aria-label={closeAriaLabel}>
          <XIcon size="sm" />
        </Button>
      </div>
    </div>
  );
}

const StyleMarkerRow = (
  { value, onChange }: { value: StyleMarkerStyle; onChange: (event: ChangeEvent<HTMLSelectElement>) => void },
) => (
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

function ChromeSettingsSection() {
  const {
    sidebarCollapsed,
    topBarsCollapsed,
    statusBarCollapsed,
    toggleSidebarCollapsed,
    toggleTabBarCollapsed,
    toggleStatusBarCollapsed,
  } = useLayoutSettingsChromeState();
  const { filenameVisibility: filenameVisibility, toggleFilenameVisibility: toggleFilenameVisibility } =
    useShowFilenamesState();
  const { createReadmeInNewLocations, setCreateReadmeInNewLocations } = useCreateReadmeState();

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
      <ToggleRow
        label="Show Filenames"
        description="Display filenames instead of document titles in the sidebar."
        isVisible={filenameVisibility}
        onToggle={toggleFilenameVisibility} />
      <ToggleRow
        label="Add README to New Folders"
        description="Create a Markdown guide when adding a new folder."
        isVisible={createReadmeInNewLocations}
        onToggle={setCreateReadmeInNewLocations} />
    </>
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
  const { focusModeSettings, setTypewriterScrollingEnabled, setFocusDimmingMode, setAutoEnterFocusMode } =
    useLayoutSettingsFocusState();

  return (
    <>
      <ToggleRow
        label="Auto-enter Focus Mode"
        description="Enter Focus mode when opening a document."
        isVisible={focusModeSettings.autoEnterFocusMode}
        onToggle={setAutoEnterFocusMode} />
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

const QuickCaptureSection = () => {
  const { settings, setQuickCaptureEnabled } = useGlobalCaptureSettingsState();
  const quickCaptureEnabled = settings.enabled;

  const handleQuickCaptureEnabledChange = useCallback((enabled: boolean) => {
    setQuickCaptureEnabled(enabled);
  }, [setQuickCaptureEnabled]);

  return (
    <ToggleRow
      label="Enable Quick Capture"
      description="Turn global quick-note capture on or off."
      isVisible={quickCaptureEnabled}
      onToggle={handleQuickCaptureEnabledChange} />
  );
};

function AccessibilitySection() {
  const { reduceMotion, setReduceMotion } = useReduceMotionState();

  return (
    <ToggleRow
      label="Reduce Animations"
      description="Minimize motion for accessibility and reduced distraction."
      isVisible={reduceMotion}
      onToggle={setReduceMotion} />
  );
}

const SettingsBody = ({ scope }: { scope: SettingsScope }) => (
  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
    <CollapsibleSection title="Accessibility" description="Configure motion and display preferences.">
      <AccessibilitySection />
    </CollapsibleSection>
    <CollapsibleSection title="Chrome" description="Control visibility of core app UI regions." defaultOpen>
      <ChromeSettingsSection />
    </CollapsibleSection>
    <CollapsibleSection title="Editor" description="Tune text presentation, wrapping, and typography." defaultOpen>
      <EditorSettingsSection />
    </CollapsibleSection>
    {scope === "full" && (
      <>
        <CollapsibleSection title="Focus Mode" description="Configure centered writing and dimming behavior.">
          <FocusModeSection />
        </CollapsibleSection>
        <CollapsibleSection title="Writer's Tools" description="Adjust writing analysis and guidance features.">
          <WriterToolsSection />
        </CollapsibleSection>
        <CollapsibleSection title="Quick Capture" description="Toggle global quick-note capture behavior.">
          <QuickCaptureSection />
        </CollapsibleSection>
      </>
    )}
  </div>
);

function SettingsPanel(
  { title, scope, onClose, closeAriaLabel, onViewMore }: {
    title: string;
    scope: SettingsScope;
    onClose: () => void;
    closeAriaLabel: string;
    onViewMore?: () => void;
  },
) {
  return (
    <section className="flex min-h-0 h-full flex-col overflow-hidden p-4">
      <SettingsHeader title={title} onClose={onClose} closeAriaLabel={closeAriaLabel} onViewMore={onViewMore} />
      <SettingsBody scope={scope} />
    </section>
  );
}

function useSettingsSheetLayout(scope: SettingsScope): SettingsSheetLayout {
  const { isCompact, viewportWidth } = useViewportTier();
  const compactPanel = useMemo(() => isCompact || viewportWidth < 920, [isCompact, viewportWidth]);

  return useMemo(() => {
    if (compactPanel) {
      return {
        position: "b",
        className: scope === "basic"
          ? "left-3 right-3 bottom-3 max-h-[calc(100vh-5rem)] rounded-lg border"
          : "left-3 right-3 bottom-3 max-h-[calc(100vh-2.5rem)] rounded-lg border",
        backdropClassName: "bg-black/35",
      };
    }

    return {
      position: "r",
      className: scope === "basic"
        ? "right-4 top-14 bottom-4 w-[360px] rounded-lg border"
        : "right-4 top-4 bottom-4 w-[420px] rounded-lg border",
      backdropClassName: scope === "basic" ? "bg-black/30" : "bg-black/35",
    };
  }, [compactPanel, scope]);
}

export const LayoutSettingsPanel = () => {
  const { isOpen: isVisible, setOpen } = useLayoutSettingsUiState();
  const { isOpen: isSettingsRouteOpen, open: openSettingsRoute } = useRoutedSheet("/settings");
  const layout = useSettingsSheetLayout("basic");

  useEffect(() => {
    if (isVisible && isSettingsRouteOpen) {
      setOpen(false);
    }
  }, [isSettingsRouteOpen, isVisible, setOpen]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleViewMore = useCallback(() => {
    setOpen(false);
    openSettingsRoute();
  }, [openSettingsRoute, setOpen]);

  return (
    <Sheet
      isOpen={isVisible}
      onClose={handleClose}
      position={layout.position}
      ariaLabel="Layout settings"
      backdropClassName={layout.backdropClassName}
      className={layout.className}>
      <SettingsPanel
        title="Layout Settings"
        scope="basic"
        onClose={handleClose}
        closeAriaLabel="Close layout settings"
        onViewMore={handleViewMore} />
    </Sheet>
  );
};

export const RoutedSettingsSheet = () => {
  const { isOpen, close } = useRoutedSheet("/settings");
  const layout = useSettingsSheetLayout("full");

  return (
    <Sheet
      isOpen={isOpen}
      onClose={close}
      position={layout.position}
      ariaLabel="Settings"
      size="xl"
      backdropClassName={layout.backdropClassName}
      className={layout.className}>
      <SettingsPanel title="Settings" scope="full" onClose={close} closeAriaLabel="Close settings panel" />
    </Sheet>
  );
};
