import { useCallback, useEffect, useMemo } from "react";
import { AppHeaderBar } from "./components/layout/AppHeaderBar";
import { BackendAlerts } from "./components/layout/BackendAlerts";
import { FocusModePanel } from "./components/layout/FocusModePanel";
import { SearchOverlay } from "./components/layout/SearchOverlay";
import { WorkspacePanel } from "./components/layout/WorkspacePanel";
import { useBackendEvents } from "./hooks/useBackendEvents";
import { useEditor } from "./hooks/useEditor";
import { useLayoutHotkeys } from "./hooks/useLayoutHotkeys";
import { useSearchController } from "./hooks/useSearchController";
import { useWorkspaceController } from "./hooks/useWorkspaceController";
import { useWorkspaceSync } from "./hooks/useWorkspaceSync";
import { useLayoutActions, useLayoutState } from "./state/appStore";
import "./App.css";

function App() {
  const { model: editorModel, dispatch: editorDispatch, openDoc } = useEditor();
  const { missingLocations, conflicts } = useBackendEvents();

  useWorkspaceSync();
  useLayoutHotkeys();

  const layoutState = useLayoutState();
  const layoutActions = useLayoutActions();

  const workspace = useWorkspaceController(openDoc);
  const search = useSearchController(workspace.documents, workspace.handleSelectDocument);

  useEffect(() => {
    workspace.markActiveTabModified(editorModel.saveStatus === "Dirty");
  }, [editorModel.saveStatus, workspace.markActiveTabModified]);

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

  const activeTab = useMemo(() => workspace.tabs.find((tab) => tab.id === workspace.activeTabId) ?? null, [
    workspace.activeTabId,
    workspace.tabs,
  ]);

  const activeDocMeta = useMemo(
    () =>
      activeTab
        ? workspace.documents.find((doc) =>
          doc.location_id === activeTab.docRef.location_id && doc.rel_path === activeTab.docRef.rel_path
        ) ?? null
        : null,
    [activeTab, workspace.documents],
  );

  const handleSave = useCallback(() => {
    editorDispatch({ type: "SaveRequested" });
  }, [editorDispatch]);

  const handleEditorChange = useCallback((text: string) => {
    editorDispatch({ type: "EditorChanged", text });
  }, [editorDispatch]);

  const handleCursorMove = useCallback((line: number, column: number) => {
    editorDispatch({ type: "CursorMoved", line, column });
  }, [editorDispatch]);

  const handleSelectionChange = useCallback((from: number, to: number | null) => {
    editorDispatch({ type: "SelectionChanged", from, to });
  }, [editorDispatch]);

  const handleOpenSettings = useCallback(() => {
    console.log("Open settings");
  }, []);

  const handleOpenSearch = useCallback(() => layoutActions.setShowSearch(true), [layoutActions]);

  const handleExit = useCallback(() => layoutActions.setFocusMode(false), [layoutActions]);

  const layoutProps = useMemo(
    () => ({
      sidebarCollapsed: layoutState.sidebarCollapsed,
      isSplitView: layoutState.isSplitView,
      isPreviewVisible: layoutState.isPreviewVisible,
    }),
    [layoutState.sidebarCollapsed, layoutState.isSplitView, layoutState.isPreviewVisible],
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
      handleSave,
      layoutActions.toggleSplitView,
      layoutActions.toggleFocusMode,
      layoutActions.togglePreviewVisible,
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
      onChange: handleEditorChange,
      onSave: handleSave,
      onCursorMove: handleCursorMove,
      onSelectionChange: handleSelectionChange,
    }),
    [editorModel.text, layoutState.theme, handleEditorChange, handleSave, handleCursorMove, handleSelectionChange],
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

  const searchProps = useMemo(
    () => ({
      isVisible: layoutState.showSearch,
      query: search.searchQuery,
      results: search.searchResults,
      isSearching: search.isSearching,
      locations: workspace.locations,
      filters: search.searchFilters,
      onQueryChange: search.handleSearch,
      onFiltersChange: search.setSearchFilters,
      onSelectResult: search.handleSelectSearchResult,
      onClose: () => layoutActions.setShowSearch(false),
    }),
    [
      layoutState.showSearch,
      search.searchQuery,
      search.searchResults,
      search.isSearching,
      workspace.locations,
      search.searchFilters,
      search.handleSearch,
      search.setSearchFilters,
      search.handleSelectSearchResult,
      layoutActions.setShowSearch,
    ],
  );

  if (layoutState.isFocusMode) {
    return (
      <FocusModePanel
        theme={layoutState.theme}
        text={editorModel.text}
        docMeta={activeDocMeta}
        cursorLine={editorModel.cursorLine}
        cursorColumn={editorModel.cursorColumn}
        wordCount={wordCount}
        charCount={charCount}
        selectionCount={selectionCount}
        onExit={handleExit}
        onEditorChange={handleEditorChange}
        onSave={handleSave}
        onCursorMove={handleCursorMove}
        onSelectionChange={handleSelectionChange} />
    );
  }

  return (
    <div data-theme={layoutState.theme} className="h-screen flex flex-col bg-bg-primary text-text-primary font-sans">
      <AppHeaderBar onToggleSidebar={layoutActions.toggleSidebarCollapsed} onOpenSearch={handleOpenSearch} />

      <WorkspacePanel
        layout={layoutProps}
        sidebar={sidebarProps}
        toolbar={toolbarProps}
        tabs={tabProps}
        editor={editorProps}
        statusBar={statusBarProps} />
      <SearchOverlay {...searchProps} />
      <BackendAlerts missingLocations={missingLocations} conflicts={conflicts} />
    </div>
  );
}

export default App;
