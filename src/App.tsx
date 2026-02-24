import { Button } from "$components/Button";
import { logger } from "$logger";
import type { PdfExportOptions, PdfRenderResult } from "$pdf/types";
import { renderMarkdownForPdf, runCmd, styleCheckGet, styleCheckSet, uiLayoutGet, uiLayoutSet } from "$ports";
import { pick, stateToLayoutSettings, uiSettingsToCalmUI, uiSettingsToFocusMode } from "$state/helpers";
import type { DocRef } from "$types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildDraftRelPath, getDraftTitle } from "utils/paths";
import { AppHeaderBar } from "./components/layout/AppHeaderBar";
import { BackendAlerts } from "./components/layout/BackendAlerts";
import { FocusModePanel } from "./components/layout/FocusModePanel";
import { LayoutSettingsPanel } from "./components/layout/LayoutSettingsPanel";
import { SearchOverlay } from "./components/layout/SearchOverlay";
import { WorkspacePanel } from "./components/layout/WorkspacePanel";
import { PdfExportDialog } from "./components/pdf/ExportDialog/ExportDialog";
import { useBackendEvents } from "./hooks/useBackendEvents";
import { useEditor } from "./hooks/useEditor";
import { useLayoutHotkeys } from "./hooks/useLayoutHotkeys";
import { usePdfExport } from "./hooks/usePdfExport";
import { usePreview } from "./hooks/usePreview";
import { useSearchController } from "./hooks/useSearchController";
import { useTypingActivity } from "./hooks/useTypingActivity";
import { useWorkspaceController } from "./hooks/useWorkspaceController";
import { useWorkspaceSync } from "./hooks/useWorkspaceSync";
import {
  useEditorPresentationActions,
  useEditorPresentationState,
  useLayoutChromeActions,
  useLayoutChromeState,
  usePdfExportActions,
  usePdfExportState,
  useViewModeActions,
  useViewModeState,
  useWriterToolsActions,
  useWriterToolsState,
} from "./state/stores/app";

const ShowButton = ({ clickHandler, title, label }: { clickHandler: () => void; title: string; label: string }) => (
  <Button
    onClick={clickHandler}
    className="px-2.5 py-1.5 bg-layer-01 border border-border-subtle rounded text-[0.75rem] text-text-secondary hover:text-text-primary cursor-pointer"
    title={title}>
    {label}
  </Button>
);

function App() {
  const { model: editorModel, dispatch: editorDispatch, openDoc } = useEditor();
  const { model: previewModel, render: renderPreview, syncLine: syncPreviewLine, setDoc: setPreviewDoc } = usePreview();
  const exportPdf = usePdfExport();
  const { isExportingPdf, pdfExportError } = usePdfExportState();
  const { resetPdfExport } = usePdfExportActions();
  const { missingLocations, conflicts } = useBackendEvents();
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);
  const [isPdfExportDialogOpen, setIsPdfExportDialogOpen] = useState(false);
  const [layoutSettingsHydrated, setLayoutSettingsHydrated] = useState(false);

  useWorkspaceSync();
  useLayoutHotkeys();

  const layoutChrome = useLayoutChromeState();
  const { setSidebarCollapsed, setTopBarsCollapsed, setStatusBarCollapsed, setCalmUiSettings } =
    useLayoutChromeActions();
  const editorPresentation = useEditorPresentationState();
  const {
    setLineNumbersVisible,
    setTextWrappingEnabled,
    setSyntaxHighlightingEnabled,
    setEditorFontSize,
    setEditorFontFamily,
  } = useEditorPresentationActions();
  const { isFocusMode, focusModeSettings } = useViewModeState();
  const { setFocusMode, setFocusModeSettings } = useViewModeActions();
  const { styleCheckSettings } = useWriterToolsState();
  const { setStyleCheckSettings } = useWriterToolsActions();
  const workspace = useWorkspaceController(openDoc);
  const search = useSearchController(workspace.handleSelectDocument);
  const { isTyping, handleTypingActivity } = useTypingActivity({ idleTimeout: 1500 });

  const activeTab = useMemo(() => workspace.tabs.find((tab) => tab.id === workspace.activeTabId) ?? null, [
    workspace.activeTabId,
    workspace.tabs,
  ]);

  const { wordCount, charCount, selectionCount } = useMemo(() => {
    const { text } = editorModel;
    const trimmedText = text.trim();

    return {
      wordCount: trimmedText ? trimmedText.split(/\s+/).length : 0,
      charCount: text.length,
      selectionCount: editorModel.selectionFrom !== null && editorModel.selectionTo !== null
        ? editorModel.selectionTo - editorModel.selectionFrom
        : undefined,
    };
  }, [editorModel.selectionFrom, editorModel.selectionTo, editorModel.text]);

  const activeDocMeta = useMemo(() => {
    if (!activeTab) {
      return null;
    }

    const activeDoc = workspace.documents.find((doc) =>
      doc.location_id === activeTab.docRef.location_id && doc.rel_path === activeTab.docRef.rel_path
    );
    return activeDoc ?? null;
  }, [activeTab, workspace.documents]);

  const handleSave = useCallback(() => {
    if (!editorModel.docRef && !workspace.selectedLocationId) {
      logger.warn("Cannot save draft without a selected location.");
      return;
    }

    if (!editorModel.docRef && workspace.selectedLocationId) {
      const relPath = buildDraftRelPath(workspace.selectedLocationId, workspace.documents, workspace.tabs);
      const draftRef: DocRef = { location_id: workspace.selectedLocationId, rel_path: relPath };

      workspace.handleCreateDraftTab(draftRef, getDraftTitle(relPath));
      editorDispatch({ type: "DraftDocInitialized", docRef: draftRef });
    }

    editorDispatch({ type: "SaveRequested" });
  }, [editorDispatch, editorModel.docRef, workspace]);

  const handleEditorChange = useCallback((text: string) => {
    editorDispatch({ type: "EditorChanged", text });
  }, [editorDispatch]);

  const handleCursorMove = useCallback((line: number, column: number) => {
    editorDispatch({ type: "CursorMoved", line, column });
    syncPreviewLine(line);
  }, [editorDispatch, syncPreviewLine]);

  const handleSelectionChange = useCallback((from: number, to: number | null) => {
    editorDispatch({ type: "SelectionChanged", from, to });
  }, [editorDispatch]);

  const handleOpenSettings = useCallback(() => setIsLayoutSettingsOpen((prev) => !prev), []);

  const handleOpenPdfExport = useCallback(() => {
    if (!activeTab) {
      logger.warn("Cannot export PDF without an active document.");
      return;
    }

    resetPdfExport();
    setIsPdfExportDialogOpen(true);
  }, [activeTab, resetPdfExport]);

  const handleShowSidebar = useCallback(() => setSidebarCollapsed(false), [setSidebarCollapsed]);
  const handleShowStatusBar = useCallback(() => setStatusBarCollapsed(false), [setStatusBarCollapsed]);

  const handleCancelPdfExport = useCallback(() => {
    setIsPdfExportDialogOpen(false);
    resetPdfExport();
  }, [resetPdfExport]);

  const handleExportPdf = useCallback(async (options: PdfExportOptions) => {
    if (!activeTab) {
      logger.warn("Cannot export PDF without an active document.");
      return;
    }

    const docRef = activeTab.docRef;

    try {
      const renderResult = await new Promise<PdfRenderResult>((resolve, reject) => {
        void runCmd(
          renderMarkdownForPdf(docRef.location_id, docRef.rel_path, editorModel.text, void 0, resolve, reject),
        );
      });

      const didExport = await exportPdf(renderResult, options, editorPresentation.editorFontFamily);
      if (didExport) {
        setIsPdfExportDialogOpen(false);
        resetPdfExport();
      }
    } catch (error) {
      logger.error("Failed to export PDF", { error: error instanceof Error ? error.message : String(error) });
    }
  }, [activeTab, editorModel.text, exportPdf, editorPresentation.editorFontFamily, resetPdfExport]);

  const showToggleControls = useMemo(() => layoutChrome.sidebarCollapsed || layoutChrome.statusBarCollapsed, [
    layoutChrome.sidebarCollapsed,
    layoutChrome.statusBarCollapsed,
  ]);

  const calmUiEffectiveVisibility = useMemo(() => {
    const { calmUiSettings, chromeTemporarilyVisible } = layoutChrome;
    if (!calmUiSettings.enabled || chromeTemporarilyVisible) {
      return { sidebar: true, statusBar: true, tabBar: true };
    }

    const hideWhileTyping = calmUiSettings.autoHide && isTyping;
    return { sidebar: !hideWhileTyping, statusBar: !hideWhileTyping, tabBar: !hideWhileTyping };
  }, [layoutChrome, isTyping]);

  const sidebarProps = useMemo(
    () => pick(workspace, ["handleAddLocation", "handleRemoveLocation", "handleSelectDocument"]),
    [workspace],
  );

  const toolbarProps = useMemo(
    () => ({
      saveStatus: editorModel.saveStatus,
      onSave: handleSave,
      onExportPdf: handleOpenPdfExport,
      isExportingPdf: isExportingPdf,
      isPdfExportDisabled: !activeTab,
      onOpenSettings: handleOpenSettings,
    }),
    [editorModel.saveStatus, handleOpenPdfExport, isExportingPdf, activeTab, handleSave, handleOpenSettings],
  );

  const tabProps = useMemo(
    () => pick(workspace, ["tabs", "activeTabId", "handleSelectTab", "handleCloseTab", "handleReorderTabs"]),
    [workspace],
  );

  const handleEditorChangeWithTyping = useCallback((text: string) => {
    handleEditorChange(text);
    handleTypingActivity();
  }, [handleEditorChange, handleTypingActivity]);

  const editorProps = useMemo(
    () => ({
      initialText: editorModel.text,
      onChange: handleEditorChangeWithTyping,
      onSave: handleSave,
      onCursorMove: handleCursorMove,
      onSelectionChange: handleSelectionChange,
    }),
    [editorModel.text, handleEditorChangeWithTyping, handleSave, handleCursorMove, handleSelectionChange],
  );

  const statusBarProps = useMemo(
    () => ({
      docMeta: activeDocMeta,
      stats: { ...pick(editorModel, ["cursorLine", "cursorColumn"]), wordCount, charCount, selectionCount },
    }),
    [activeDocMeta, editorModel, wordCount, charCount, selectionCount],
  );

  const previewProps = useMemo(
    () => ({
      renderResult: previewModel.renderResult,
      theme: editorPresentation.theme,
      editorLine: editorModel.cursorLine,
      onScrollToLine: syncPreviewLine,
    }),
    [previewModel.renderResult, editorPresentation.theme, editorModel.cursorLine, syncPreviewLine],
  );

  const searchProps = useMemo(
    () => ({
      locations: workspace.locations,
      ...pick(search, [
        "searchQuery",
        "searchResults",
        "isSearching",
        "filters",
        "handleSearch",
        "setFilters",
        "handleSelectSearchResult",
      ]),
    }),
    [workspace.locations, search],
  );

  const handleSettingsClose = useCallback(() => {
    setIsLayoutSettingsOpen(false);
  }, []);

  const focusModePanelProps = useMemo(() => {
    const pos = pick(editorModel, ["cursorLine", "cursorColumn"]);
    const stats = { ...pos, wordCount, charCount, selectionCount };
    return ({
      editor: {
        initialText: editorModel.text,
        onChange: handleEditorChange,
        onSave: handleSave,
        onCursorMove: handleCursorMove,
        onSelectionChange: handleSelectionChange,
      },
      statusBar: { docMeta: activeDocMeta, stats },
    });
  }, [
    activeDocMeta,
    editorModel,
    wordCount,
    charCount,
    selectionCount,
    handleEditorChange,
    handleSave,
    handleCursorMove,
    handleSelectionChange,
  ]);

  useEffect(() => {
    workspace.markActiveTabModified(editorModel.saveStatus === "Dirty");
  }, [editorModel.saveStatus, workspace]);

  useEffect(() => {
    if (activeTab) {
      setPreviewDoc(activeTab.docRef);
    } else {
      setPreviewDoc(null);
    }
  }, [activeTab, setPreviewDoc]);

  useEffect(() => {
    if (!activeTab) return;

    const timeoutId = setTimeout(() => {
      renderPreview(activeTab.docRef, editorModel.text);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [activeTab, editorModel.text, renderPreview]);

  const lastEnteredFocusDocRef = useRef<string | null>(null);

  useEffect(() => {
    if (!layoutSettingsHydrated || !activeTab || isFocusMode) {
      return;
    }

    const { calmUiSettings } = layoutChrome;
    const docKey = `${activeTab.docRef.location_id}:${activeTab.docRef.rel_path}`;

    if (calmUiSettings.enabled && calmUiSettings.focusMode && lastEnteredFocusDocRef.current !== docKey) {
      lastEnteredFocusDocRef.current = docKey;
      setFocusMode(true);
    }
  }, [layoutSettingsHydrated, activeTab, isFocusMode, layoutChrome, setFocusMode]);

  useEffect(() => {
    let isCancelled = false;

    void runCmd(uiLayoutGet((settings) => {
      if (isCancelled) {
        return;
      }

      setSidebarCollapsed(settings.sidebar_collapsed);
      setTopBarsCollapsed(settings.top_bars_collapsed);
      setStatusBarCollapsed(settings.status_bar_collapsed);
      setLineNumbersVisible(settings.line_numbers_visible);
      setTextWrappingEnabled(settings.text_wrapping_enabled);
      setSyntaxHighlightingEnabled(settings.syntax_highlighting_enabled);
      setEditorFontSize(settings.editor_font_size);
      setEditorFontFamily(settings.editor_font_family);

      const calmUiSettings = uiSettingsToCalmUI(settings);
      setCalmUiSettings(calmUiSettings);
      setFocusModeSettings(uiSettingsToFocusMode(settings));
      setLayoutSettingsHydrated(true);
    }, () => {
      if (!isCancelled) {
        setLayoutSettingsHydrated(true);
      }
    }));

    void runCmd(styleCheckGet((settings) => {
      if (isCancelled) {
        return;
      }

      setStyleCheckSettings({
        enabled: settings.enabled,
        categories: settings.categories,
        customPatterns: settings.custom_patterns,
      });
    }, () => {}));

    return () => {
      isCancelled = true;
    };
  }, [
    setEditorFontFamily,
    setEditorFontSize,
    setLineNumbersVisible,
    setSidebarCollapsed,
    setStatusBarCollapsed,
    setStyleCheckSettings,
    setSyntaxHighlightingEnabled,
    setTextWrappingEnabled,
    setTopBarsCollapsed,
    setCalmUiSettings,
    setFocusModeSettings,
  ]);

  useEffect(() => {
    if (!layoutSettingsHydrated) {
      return;
    }

    void runCmd(
      uiLayoutSet(stateToLayoutSettings(layoutChrome, editorPresentation, focusModeSettings), () => {}, () => {}),
    );
  }, [layoutSettingsHydrated, layoutChrome, editorPresentation, focusModeSettings]);

  useEffect(() => {
    if (!layoutSettingsHydrated) {
      return;
    }

    void runCmd(
      styleCheckSet(
        { ...pick(styleCheckSettings, ["categories", "enabled"]), custom_patterns: styleCheckSettings.customPatterns },
        () => {},
        () => {},
      ),
    );
  }, [layoutSettingsHydrated, styleCheckSettings]);

  const workspacePanelProps = useMemo(
    () => ({
      sidebar: sidebarProps,
      toolbar: toolbarProps,
      tabs: tabProps,
      editor: editorProps,
      preview: previewProps,
      statusBar: statusBarProps,
      calmUiVisibility: calmUiEffectiveVisibility,
    }),
    [sidebarProps, toolbarProps, tabProps, editorProps, previewProps, statusBarProps, calmUiEffectiveVisibility],
  );

  useEffect(() => {
    if (!isLayoutSettingsOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLayoutSettingsOpen(false);
      }
    };

    globalThis.addEventListener("keydown", closeOnEscape);
    return () => globalThis.removeEventListener("keydown", closeOnEscape);
  }, [isLayoutSettingsOpen]);

  if (isFocusMode) {
    return <FocusModePanel {...focusModePanelProps} />;
  }

  return (
    <div
      data-theme={editorPresentation.theme}
      className="relative h-screen overflow-hidden flex flex-col bg-bg-primary text-text-primary font-sans">
      {showToggleControls && (
        <div className="absolute left-3 top-3 z-50 flex items-center gap-2">
          {layoutChrome.sidebarCollapsed && (
            <ShowButton clickHandler={handleShowSidebar} title="Show sidebar (Ctrl+B)" label="Show Sidebar" />
          )}
          {layoutChrome.statusBarCollapsed && (
            <ShowButton clickHandler={handleShowStatusBar} title="Show status bar" label="Show Status Bar" />
          )}
        </div>
      )}

      <AppHeaderBar />
      <WorkspacePanel {...workspacePanelProps} />
      <LayoutSettingsPanel isVisible={isLayoutSettingsOpen} onClose={handleSettingsClose} />
      <PdfExportDialog
        isOpen={isPdfExportDialogOpen}
        title={activeDocMeta?.title}
        isExporting={isExportingPdf}
        errorMessage={pdfExportError}
        onExport={handleExportPdf}
        onCancel={handleCancelPdfExport} />
      <SearchOverlay {...searchProps} />
      <BackendAlerts missingLocations={missingLocations} conflicts={conflicts} />
    </div>
  );
}

export default App;
