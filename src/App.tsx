import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeaderBar } from "./components/layout/AppHeaderBar";
import { BackendAlerts } from "./components/layout/BackendAlerts";
import { FocusModePanel } from "./components/layout/FocusModePanel";
import { LayoutSettingsPanel } from "./components/layout/LayoutSettingsPanel";
import { SearchOverlay } from "./components/layout/SearchOverlay";
import { WorkspacePanel } from "./components/layout/WorkspacePanel";
import { useBackendEvents } from "./hooks/useBackendEvents";
import { useEditor } from "./hooks/useEditor";
import { useLayoutHotkeys } from "./hooks/useLayoutHotkeys";
import { usePreview } from "./hooks/usePreview";
import { useSearchController } from "./hooks/useSearchController";
import { useWorkspaceController } from "./hooks/useWorkspaceController";
import { useWorkspaceSync } from "./hooks/useWorkspaceSync";
import { runCmd, uiLayoutGet, uiLayoutSet } from "./ports";
import { useLayoutActions, useLayoutState } from "./state/appStore";
import type { DocMeta, DocRef, Tab } from "./types";
import "./App.css";
import { logger } from "./logger";

// TODO: make shared utils module
function formatDraftDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}_${month}_${day}`;
}

// TODO: make this recursive
function buildDraftRelPath(locationId: number, documents: DocMeta[], tabs: Tab[]): string {
  const usedPaths = new Set<string>();

  for (const doc of documents) {
    if (doc.location_id === locationId) {
      usedPaths.add(doc.rel_path.toLowerCase());
    }
  }

  for (const tab of tabs) {
    if (tab.docRef.location_id === locationId) {
      usedPaths.add(tab.docRef.rel_path.toLowerCase());
    }
  }

  const base = `untitled_${formatDraftDate(new Date())}`;
  let suffix = 0;
  while (true) {
    const fileName = suffix === 0 ? `${base}.md` : `${base}_${suffix}.md`;
    if (!usedPaths.has(fileName.toLowerCase())) {
      return fileName;
    }
    suffix += 1;
  }
}

const getDraftTitle = (relPath: string): string => relPath.split("/").pop() || "Untitled";

const ShowButton = ({ clickHandler, title, label }: { clickHandler: () => void; title: string; label: string }) => (
  <button
    onClick={clickHandler}
    className="px-2.5 py-1.5 bg-layer-01 border border-border-subtle rounded text-[0.75rem] text-text-secondary hover:text-text-primary cursor-pointer"
    title={title}>
    {label}
  </button>
);

function App() {
  const { model: editorModel, dispatch: editorDispatch, openDoc } = useEditor();
  const { model: previewModel, render: renderPreview, syncLine: syncPreviewLine, setDoc: setPreviewDoc } = usePreview();
  const { missingLocations, conflicts } = useBackendEvents();
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);
  const [layoutSettingsHydrated, setLayoutSettingsHydrated] = useState(false);

  useWorkspaceSync();
  useLayoutHotkeys();

  const layoutState = useLayoutState();
  const layoutActions = useLayoutActions();
  const workspace = useWorkspaceController(openDoc);
  const search = useSearchController(workspace.handleSelectDocument);

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
  }, [
    editorDispatch,
    editorModel.docRef,
    workspace.documents,
    workspace.handleCreateDraftTab,
    workspace.selectedLocationId,
    workspace.tabs,
  ]);

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
  const handleOpenSearch = useCallback(() => layoutActions.setShowSearch(true), [layoutActions]);
  const handleShowSidebar = useCallback(() => layoutActions.setSidebarCollapsed(false), [layoutActions]);
  const handleShowStatusBar = useCallback(() => layoutActions.setStatusBarCollapsed(false), [layoutActions]);
  const handleExit = useCallback(() => layoutActions.setFocusMode(false), [layoutActions]);

  const showToggleControls = useMemo(() => layoutState.sidebarCollapsed || layoutState.statusBarCollapsed, [
    layoutState.sidebarCollapsed,
    layoutState.statusBarCollapsed,
  ]);

  const layoutProps = useMemo(
    () => ({
      sidebarCollapsed: layoutState.sidebarCollapsed,
      topBarsCollapsed: layoutState.topBarsCollapsed,
      statusBarCollapsed: layoutState.statusBarCollapsed,
      isSplitView: layoutState.isSplitView,
      isPreviewVisible: layoutState.isPreviewVisible,
    }),
    [
      layoutState.sidebarCollapsed,
      layoutState.topBarsCollapsed,
      layoutState.statusBarCollapsed,
      layoutState.isSplitView,
      layoutState.isPreviewVisible,
    ],
  );

  const sidebarProps = useMemo(
    () => ({
      locations: workspace.locations,
      selectedLocationId: workspace.selectedLocationId,
      selectedDocPath: workspace.selectedDocPath,
      documents: workspace.locationDocuments,
      isLoading: workspace.isSidebarLoading,
      filterText: workspace.sidebarFilter,
      onAddLocation: workspace.handleAddLocation,
      onRemoveLocation: workspace.handleRemoveLocation,
      onSelectLocation: workspace.handleSelectLocation,
      onSelectDocument: workspace.handleSelectDocument,
      onFilterChange: workspace.setSidebarFilter,
    }),
    [
      workspace.locations,
      workspace.selectedLocationId,
      workspace.selectedDocPath,
      workspace.locationDocuments,
      workspace.isSidebarLoading,
      workspace.sidebarFilter,
      workspace.handleAddLocation,
      workspace.handleRemoveLocation,
      workspace.handleSelectLocation,
      workspace.handleSelectDocument,
      workspace.setSidebarFilter,
    ],
  );

  const toolbarProps = useMemo(
    () => ({
      saveStatus: editorModel.saveStatus,
      isSplitView: layoutState.isSplitView,
      isFocusMode: layoutState.isFocusMode,
      isPreviewVisible: layoutState.isPreviewVisible,
      onSave: handleSave,
      onToggleSplitView: layoutActions.toggleSplitView,
      onToggleFocusMode: layoutActions.toggleFocusMode,
      onTogglePreview: layoutActions.togglePreviewVisible,
      onOpenSettings: handleOpenSettings,
    }),
    [
      editorModel.saveStatus,
      layoutState.isSplitView,
      layoutState.isFocusMode,
      layoutState.isPreviewVisible,
      layoutActions.toggleSplitView,
      layoutActions.toggleFocusMode,
      layoutActions.togglePreviewVisible,
      handleSave,
      handleOpenSettings,
    ],
  );

  const tabProps = useMemo(
    () => ({
      tabs: workspace.tabs,
      activeTabId: workspace.activeTabId,
      onSelectTab: workspace.handleSelectTab,
      onCloseTab: workspace.handleCloseTab,
      onReorderTabs: workspace.handleReorderTabs,
    }),
    [
      workspace.tabs,
      workspace.activeTabId,
      workspace.handleSelectTab,
      workspace.handleCloseTab,
      workspace.handleReorderTabs,
    ],
  );

  const editorProps = useMemo(
    () => ({
      initialText: editorModel.text,
      theme: layoutState.theme,
      showLineNumbers: layoutState.lineNumbersVisible,
      onChange: handleEditorChange,
      onSave: handleSave,
      onCursorMove: handleCursorMove,
      onSelectionChange: handleSelectionChange,
    }),
    [
      editorModel.text,
      layoutState.theme,
      layoutState.lineNumbersVisible,
      handleEditorChange,
      handleSave,
      handleCursorMove,
      handleSelectionChange,
    ],
  );

  const statusBarProps = useMemo(
    () => ({
      docMeta: activeDocMeta,
      cursorLine: editorModel.cursorLine,
      cursorColumn: editorModel.cursorColumn,
      wordCount,
      charCount,
      selectionCount,
    }),
    [activeDocMeta, editorModel.cursorLine, editorModel.cursorColumn, wordCount, charCount, selectionCount],
  );

  const previewProps = useMemo(
    () => ({
      renderResult: previewModel.renderResult,
      theme: layoutState.theme,
      editorLine: editorModel.cursorLine,
      onScrollToLine: syncPreviewLine,
    }),
    [previewModel.renderResult, layoutState.theme, editorModel.cursorLine, syncPreviewLine],
  );

  const searchProps = useMemo(
    () => ({
      isVisible: layoutState.showSearch,
      sidebarCollapsed: layoutState.sidebarCollapsed,
      topOffset: 48,
      query: search.searchQuery,
      results: search.searchResults,
      isSearching: search.isSearching,
      locations: workspace.locations,
      filters: search.filters,
      onQueryChange: search.handleSearch,
      onFiltersChange: search.setFilters,
      onSelectResult: search.handleSelectSearchResult,
      onClose: () => layoutActions.setShowSearch(false),
    }),
    [
      layoutState.showSearch,
      layoutState.sidebarCollapsed,
      search.searchQuery,
      search.searchResults,
      search.isSearching,
      workspace.locations,
      search.filters,
      search.handleSearch,
      search.setFilters,
      search.handleSelectSearchResult,
      layoutActions.setShowSearch,
    ],
  );

  const handleSettingsClose = useCallback(() => {
    setIsLayoutSettingsOpen(false);
  }, []);

  const settingsPanelProps = useMemo(
    () => ({
      isVisible: isLayoutSettingsOpen,
      sidebarCollapsed: layoutState.sidebarCollapsed,
      topBarsCollapsed: layoutState.topBarsCollapsed,
      statusBarCollapsed: layoutState.statusBarCollapsed,
      lineNumbersVisible: layoutState.lineNumbersVisible,
      onSetSidebarCollapsed: layoutActions.setSidebarCollapsed,
      onSetTopBarsCollapsed: layoutActions.setTopBarsCollapsed,
      onSetStatusBarCollapsed: layoutActions.setStatusBarCollapsed,
      onSetLineNumbersVisible: layoutActions.setLineNumbersVisible,
      onClose: handleSettingsClose,
    }),
    [
      isLayoutSettingsOpen,
      layoutState.sidebarCollapsed,
      layoutState.topBarsCollapsed,
      layoutState.statusBarCollapsed,
      layoutState.lineNumbersVisible,
      layoutActions.setSidebarCollapsed,
      layoutActions.setTopBarsCollapsed,
      layoutActions.setStatusBarCollapsed,
      layoutActions.setLineNumbersVisible,
      handleSettingsClose,
    ],
  );

  const focusModePanelProps = useMemo(
    () => ({
      theme: layoutState.theme,
      text: editorModel.text,
      docMeta: activeDocMeta,
      cursorLine: editorModel.cursorLine,
      cursorColumn: editorModel.cursorColumn,
      wordCount: wordCount,
      charCount: charCount,
      selectionCount: selectionCount,
      lineNumbersVisible: layoutState.lineNumbersVisible,
      statusBarCollapsed: layoutState.statusBarCollapsed,
      onExit: handleExit,
      onEditorChange: handleEditorChange,
      onSave: handleSave,
      onCursorMove: handleCursorMove,
      onSelectionChange: handleSelectionChange,
    }),
    [
      layoutState.theme,
      editorModel.text,
      activeDocMeta,
      editorModel.cursorLine,
      editorModel.cursorColumn,
      wordCount,
      charCount,
      selectionCount,
      layoutState.lineNumbersVisible,
      layoutState.statusBarCollapsed,
      handleExit,
      handleEditorChange,
      handleSave,
      handleCursorMove,
      handleSelectionChange,
    ],
  );

  useEffect(() => {
    workspace.markActiveTabModified(editorModel.saveStatus === "Dirty");
  }, [editorModel.saveStatus, workspace.markActiveTabModified]);

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

  useEffect(() => {
    let isCancelled = false;

    void runCmd(uiLayoutGet((settings) => {
      if (isCancelled) {
        return;
      }

      layoutActions.setSidebarCollapsed(settings.sidebar_collapsed);
      layoutActions.setTopBarsCollapsed(settings.top_bars_collapsed);
      layoutActions.setStatusBarCollapsed(settings.status_bar_collapsed);
      layoutActions.setLineNumbersVisible(settings.line_numbers_visible);
      setLayoutSettingsHydrated(true);
    }, () => {
      if (!isCancelled) {
        setLayoutSettingsHydrated(true);
      }
    }));

    return () => {
      isCancelled = true;
    };
  }, [layoutActions]);

  useEffect(() => {
    if (!layoutSettingsHydrated) {
      return;
    }

    void runCmd(
      uiLayoutSet(
        {
          sidebar_collapsed: layoutState.sidebarCollapsed,
          top_bars_collapsed: layoutState.topBarsCollapsed,
          status_bar_collapsed: layoutState.statusBarCollapsed,
          line_numbers_visible: layoutState.lineNumbersVisible,
        },
        () => {},
        () => {},
      ),
    );
  }, [
    layoutSettingsHydrated,
    layoutState.sidebarCollapsed,
    layoutState.topBarsCollapsed,
    layoutState.statusBarCollapsed,
    layoutState.lineNumbersVisible,
  ]);

  const appHeaderBarProps = useMemo(
    () => ({
      onToggleSidebar: layoutActions.toggleSidebarCollapsed,
      onToggleTabBar: layoutActions.toggleTabBarCollapsed,
      onOpenSearch: handleOpenSearch,
      tabBarCollapsed: layoutState.topBarsCollapsed,
    }),
    [layoutActions, handleOpenSearch, layoutState.topBarsCollapsed],
  );

  const workspacePanelProps = useMemo(
    () => ({
      layout: layoutProps,
      onToggleSidebar: layoutActions.toggleSidebarCollapsed,
      sidebar: sidebarProps,
      toolbar: toolbarProps,
      tabs: tabProps,
      editor: editorProps,
      preview: previewProps,
      statusBar: statusBarProps,
    }),
    [layoutProps, layoutActions, sidebarProps, toolbarProps, tabProps, editorProps, previewProps, statusBarProps],
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

  if (layoutState.isFocusMode) {
    return <FocusModePanel {...focusModePanelProps} />;
  }

  return (
    <div
      data-theme={layoutState.theme}
      className="relative h-screen overflow-hidden flex flex-col bg-bg-primary text-text-primary font-sans">
      {showToggleControls && (
        <div className="absolute left-3 top-3 z-50 flex items-center gap-2">
          {layoutState.sidebarCollapsed && (
            <ShowButton clickHandler={handleShowSidebar} title="Show sidebar (Ctrl+B)" label="Show Sidebar" />
          )}
          {layoutState.statusBarCollapsed && (
            <ShowButton clickHandler={handleShowStatusBar} title="Show status bar" label="Show Status Bar" />
          )}
        </div>
      )}

      <AppHeaderBar {...appHeaderBarProps} />
      <WorkspacePanel {...workspacePanelProps} />
      <LayoutSettingsPanel {...settingsPanelProps} />
      <SearchOverlay {...searchProps} />
      <BackendAlerts missingLocations={missingLocations} conflicts={conflicts} />
    </div>
  );
}

export default App;
