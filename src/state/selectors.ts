import type { CalmUiSettings, StyleCheckSettings } from "$types";
import { useShallow } from "zustand/react/shallow";
import { useLayoutStore } from "./stores/layout";
import { usePdfExportStore } from "./stores/pdf-export";
import { useSearchStore } from "./stores/search";
import { useTabsStore } from "./stores/tabs";
import { useUiStore } from "./stores/ui";
import { useWorkspaceStore } from "./stores/workspace";
import type { EditorPresentation } from "./types";

const FOCUS_MODE_STYLE_CHECK_SETTINGS: StyleCheckSettings = {
  enabled: false,
  categories: { filler: true, redundancy: true, cliche: true },
  customPatterns: [],
};

export const useLayoutChromeState = () =>
  useLayoutStore(
    useShallow((state) => ({
      sidebarCollapsed: state.sidebarCollapsed,
      topBarsCollapsed: state.topBarsCollapsed,
      statusBarCollapsed: state.statusBarCollapsed,
      showSearch: state.showSearch,
      calmUiSettings: state.calmUiSettings,
      chromeTemporarilyVisible: state.chromeTemporarilyVisible,
      reduceMotion: state.reduceMotion,
    })),
  );

export const useLayoutChromeActions = () =>
  useLayoutStore(
    useShallow((state) => ({
      setSidebarCollapsed: state.setSidebarCollapsed,
      toggleSidebarCollapsed: state.toggleSidebarCollapsed,
      setTopBarsCollapsed: state.setTopBarsCollapsed,
      toggleTabBarCollapsed: state.toggleTabBarCollapsed,
      setStatusBarCollapsed: state.setStatusBarCollapsed,
      toggleStatusBarCollapsed: state.toggleStatusBarCollapsed,
      setShowSearch: state.setShowSearch,
      toggleShowSearch: state.toggleShowSearch,
      setCalmUiSettings: state.setCalmUiSettings,
      toggleCalmUi: state.toggleCalmUi,
      setCalmUiFocusMode: state.setCalmUiFocusMode,
      setChromeTemporarilyVisible: state.setChromeTemporarilyVisible,
      revealChromeTemporarily: state.revealChromeTemporarily,
    })),
  );

export const useEditorPresentationStateRaw = () =>
  useLayoutStore(
    useShallow((state) => ({
      lineNumbersVisible: state.lineNumbersVisible,
      textWrappingEnabled: state.textWrappingEnabled,
      syntaxHighlightingEnabled: state.syntaxHighlightingEnabled,
      editorFontSize: state.editorFontSize,
      editorFontFamily: state.editorFontFamily,
      theme: state.theme,
    })),
  );

export const useEditorPresentationActions = () =>
  useLayoutStore(
    useShallow((state) => ({
      setLineNumbersVisible: state.setLineNumbersVisible,
      toggleLineNumbersVisible: state.toggleLineNumbersVisible,
      setTextWrappingEnabled: state.setTextWrappingEnabled,
      toggleTextWrappingEnabled: state.toggleTextWrappingEnabled,
      setSyntaxHighlightingEnabled: state.setSyntaxHighlightingEnabled,
      toggleSyntaxHighlightingEnabled: state.toggleSyntaxHighlightingEnabled,
      setEditorFontSize: state.setEditorFontSize,
      setEditorFontFamily: state.setEditorFontFamily,
    })),
  );

export const useViewModeState = () =>
  useLayoutStore(
    useShallow((state) => ({
      isSplitView: state.isSplitView,
      isFocusMode: state.isFocusMode,
      isPreviewVisible: state.isPreviewVisible,
      focusModeSettings: state.focusModeSettings,
    })),
  );

export const useViewModeActions = () =>
  useLayoutStore(
    useShallow((state) => ({
      setSplitView: state.setSplitView,
      toggleSplitView: state.toggleSplitView,
      setEditorOnlyMode: state.setEditorOnlyMode,
      setFocusMode: state.setFocusMode,
      toggleFocusMode: state.toggleFocusMode,
      setFocusModeSettings: state.setFocusModeSettings,
      setTypewriterScrollingEnabled: state.setTypewriterScrollingEnabled,
      setFocusDimmingMode: state.setFocusDimmingMode,
      toggleTypewriterScrolling: state.toggleTypewriterScrolling,
      setPreviewVisible: state.setPreviewVisible,
      togglePreviewVisible: state.togglePreviewVisible,
    })),
  );

export const useWriterToolsState = () =>
  useLayoutStore(
    useShallow((state) => ({
      posHighlightingEnabled: state.posHighlightingEnabled,
      styleCheckSettings: state.styleCheckSettings,
    })),
  );

export const useWriterToolsActions = () =>
  useLayoutStore(
    useShallow((state) => ({
      setPosHighlightingEnabled: state.setPosHighlightingEnabled,
      togglePosHighlighting: state.togglePosHighlighting,
      setStyleCheckSettings: state.setStyleCheckSettings,
      toggleStyleCheck: state.toggleStyleCheck,
      setStyleCheckCategory: state.setStyleCheckCategory,
      addCustomPattern: state.addCustomPattern,
      removeCustomPattern: state.removeCustomPattern,
    })),
  );

export const useWorkspaceLocationsState = () =>
  useWorkspaceStore(
    useShallow((state) => ({
      locations: state.locations,
      isLoadingLocations: state.isLoadingLocations,
      selectedLocationId: state.selectedLocationId,
      sidebarFilter: state.sidebarFilter,
    })),
  );

export const useWorkspaceLocationsActions = () =>
  useWorkspaceStore(
    useShallow((state) => ({
      setSidebarFilter: state.setSidebarFilter,
      setLocations: state.setLocations,
      setLoadingLocations: state.setLoadingLocations,
      setSelectedLocation: state.setSelectedLocation,
      addLocation: state.addLocation,
      removeLocation: state.removeLocation,
    })),
  );

export const useWorkspaceDocumentsState = () =>
  useWorkspaceStore(
    useShallow((state) => ({
      selectedDocPath: state.selectedDocPath,
      documents: state.documents,
      isLoadingDocuments: state.isLoadingDocuments,
      refreshingLocationId: state.refreshingLocationId,
      sidebarRefreshReason: state.sidebarRefreshReason,
    })),
  );

export const useWorkspaceDocumentsActions = () =>
  useWorkspaceStore(
    useShallow((state) => ({
      setSelectedDocPath: state.setSelectedDocPath,
      setDocuments: state.setDocuments,
      setLoadingDocuments: state.setLoadingDocuments,
      setSidebarRefreshState: state.setSidebarRefreshState,
    })),
  );

export const useTabsState = () =>
  useTabsStore(useShallow((state) => ({ tabs: state.tabs, activeTabId: state.activeTabId })));

export const useTabsActions = () =>
  useTabsStore(
    useShallow((state) => ({
      openDocumentTab: state.openDocumentTab,
      selectTab: state.selectTab,
      closeTab: state.closeTab,
      reorderTabs: state.reorderTabs,
      markActiveTabModified: state.markActiveTabModified,
    })),
  );

export const usePdfExportState = () =>
  usePdfExportStore(
    useShallow((state) => ({ isExportingPdf: state.isExportingPdf, pdfExportError: state.pdfExportError })),
  );

export const usePdfExportActions = () =>
  usePdfExportStore(
    useShallow((state) => ({
      startPdfExport: state.startPdfExport,
      finishPdfExport: state.finishPdfExport,
      failPdfExport: state.failPdfExport,
      resetPdfExport: state.resetPdfExport,
    })),
  );

export const useSearchState = () =>
  useSearchStore(
    useShallow((state) => ({
      searchQuery: state.searchQuery,
      searchResults: state.searchResults,
      isSearching: state.isSearching,
      filters: state.searchFilters,
    })),
  );

export const useSearchActions = () =>
  useSearchStore(
    useShallow((state) => ({
      setSearchQuery: state.setSearchQuery,
      setSearchResults: state.setSearchResults,
      setIsSearching: state.setIsSearching,
      setFilters: state.setSearchFilters,
      resetSearch: state.resetSearch,
    })),
  );

export const useActiveSearchFilterCount = () =>
  useSearchStore((state) => {
    const filters = state.searchFilters;
    return (filters.locations?.length ?? 0) + (filters.fileTypes?.length ?? 0) + (filters.dateRange ? 1 : 0);
  });

export const useLayoutSettingsUiState = () =>
  useUiStore(useShallow((state) => ({ isOpen: state.layoutSettingsOpen, setOpen: state.setLayoutSettingsOpen })));

export const usePdfDialogUiState = () =>
  useUiStore(
    useShallow((state) => ({
      isOpen: state.pdfExportDialogOpen,
      setOpen: state.setPdfExportDialogOpen,
      options: state.pdfExportOptions,
      setOptions: state.setPdfExportOptions,
      resetOptions: state.resetPdfExportOptions,
      setPageSize: state.setPdfPageSize,
      setOrientation: state.setPdfOrientation,
      setFontSize: state.setPdfFontSize,
      setMargin: state.setPdfMargin,
      setIncludeHeader: state.setPdfIncludeHeader,
      setIncludeFooter: state.setPdfIncludeFooter,
    })),
  );

export const useGlobalCaptureSettingsState = () =>
  useUiStore(
    useShallow((state) => ({
      settings: state.globalCaptureSettings,
      setSettings: state.setGlobalCaptureSettings,
      setQuickCaptureEnabled: state.setQuickCaptureEnabled,
    })),
  );

export const useLayoutSettingsChromeState = () =>
  useLayoutStore(
    useShallow((state) => ({
      sidebarCollapsed: state.sidebarCollapsed,
      topBarsCollapsed: state.topBarsCollapsed,
      statusBarCollapsed: state.statusBarCollapsed,
      toggleSidebarCollapsed: state.toggleSidebarCollapsed,
      toggleTabBarCollapsed: state.toggleTabBarCollapsed,
      toggleStatusBarCollapsed: state.toggleStatusBarCollapsed,
    })),
  );

export const useLayoutSettingsEditorState = () =>
  useLayoutStore(
    useShallow((state) => ({
      lineNumbersVisible: state.lineNumbersVisible,
      textWrappingEnabled: state.textWrappingEnabled,
      syntaxHighlightingEnabled: state.syntaxHighlightingEnabled,
      editorFontSize: state.editorFontSize,
      editorFontFamily: state.editorFontFamily,
      toggleLineNumbersVisible: state.toggleLineNumbersVisible,
      toggleTextWrappingEnabled: state.toggleTextWrappingEnabled,
      toggleSyntaxHighlightingEnabled: state.toggleSyntaxHighlightingEnabled,
      setEditorFontSize: state.setEditorFontSize,
      setEditorFontFamily: state.setEditorFontFamily,
    })),
  );

export const useLayoutSettingsFocusState = () =>
  useLayoutStore(
    useShallow((state) => ({
      focusModeSettings: state.focusModeSettings,
      setTypewriterScrollingEnabled: state.setTypewriterScrollingEnabled,
      setFocusDimmingMode: state.setFocusDimmingMode,
    })),
  );

export const useLayoutSettingsWriterToolsState = () =>
  useLayoutStore(
    useShallow((state) => ({
      posHighlightingEnabled: state.posHighlightingEnabled,
      styleCheckSettings: state.styleCheckSettings,
      togglePosHighlighting: state.togglePosHighlighting,
      setStyleCheckSettings: state.setStyleCheckSettings,
      setStyleCheckCategory: state.setStyleCheckCategory,
      addCustomPattern: state.addCustomPattern,
      removeCustomPattern: state.removeCustomPattern,
    })),
  );

export const useAppHeaderBarState = () =>
  useLayoutStore(
    useShallow((state) => ({
      sidebarCollapsed: state.sidebarCollapsed,
      tabBarCollapsed: state.topBarsCollapsed,
      statusBarCollapsed: state.statusBarCollapsed,
      toggleSidebarCollapsed: state.toggleSidebarCollapsed,
      toggleTabBarCollapsed: state.toggleTabBarCollapsed,
      toggleStatusBarCollapsed: state.toggleStatusBarCollapsed,
      setShowSearch: state.setShowSearch,
    })),
  );

export const useWorkspacePanelSidebarState = () =>
  useLayoutStore(useShallow((state) => ({ sidebarCollapsed: state.sidebarCollapsed })));

export const useWorkspacePanelModeState = () =>
  useLayoutStore(useShallow((state) => ({ isSplitView: state.isSplitView, isPreviewVisible: state.isPreviewVisible })));

export const useWorkspacePanelTopBarsCollapsed = () => useLayoutStore((state) => state.topBarsCollapsed);

export const useWorkspacePanelStatusBarCollapsed = () => useLayoutStore((state) => state.statusBarCollapsed);

export const useSearchOverlayState = () =>
  useLayoutStore(useShallow((state) => ({ isVisible: state.showSearch, setShowSearch: state.setShowSearch })));

export const useFocusModePanelState = () =>
  useLayoutStore(
    useShallow((state) => ({ statusBarCollapsed: state.statusBarCollapsed, setFocusMode: state.setFocusMode })),
  );

export const useSidebarState = () => {
  const layoutState = useLayoutStore(useShallow((state) => ({ toggleSidebarCollapsed: state.toggleSidebarCollapsed })));
  const workspaceState = useWorkspaceStore(
    useShallow((state) => ({
      locations: state.locations,
      selectedLocationId: state.selectedLocationId,
      selectedDocPath: state.selectedDocPath,
      documents: state.documents,
      isLoadingLocations: state.isLoadingLocations,
      isLoadingDocuments: state.isLoadingDocuments,
      refreshingLocationId: state.refreshingLocationId,
      sidebarRefreshReason: state.sidebarRefreshReason,
      filterText: state.sidebarFilter,
      setFilterText: state.setSidebarFilter,
      selectLocation: state.setSelectedLocation,
    })),
  );

  return {
    locations: workspaceState.locations,
    selectedLocationId: workspaceState.selectedLocationId,
    selectedDocPath: workspaceState.selectedDocPath,
    documents: workspaceState.documents,
    isLoading: workspaceState.isLoadingLocations || workspaceState.isLoadingDocuments,
    refreshingLocationId: workspaceState.refreshingLocationId,
    sidebarRefreshReason: workspaceState.sidebarRefreshReason,
    filterText: workspaceState.filterText,
    setFilterText: workspaceState.setFilterText,
    selectLocation: workspaceState.selectLocation,
    toggleSidebarCollapsed: layoutState.toggleSidebarCollapsed,
  };
};

export const useToolbarState = () =>
  useLayoutStore(
    useShallow((state) => ({
      isSplitView: state.isSplitView,
      isFocusMode: state.isFocusMode,
      isPreviewVisible: state.isPreviewVisible,
      setEditorOnlyMode: state.setEditorOnlyMode,
      toggleSplitView: state.toggleSplitView,
      toggleFocusMode: state.toggleFocusMode,
      togglePreviewVisible: state.togglePreviewVisible,
    })),
  );

export const useEditorPresentationState = () =>
  useLayoutStore(
    useShallow((state): EditorPresentation => ({
      theme: state.theme,
      showLineNumbers: state.isFocusMode ? false : state.lineNumbersVisible,
      textWrappingEnabled: state.textWrappingEnabled,
      syntaxHighlightingEnabled: state.syntaxHighlightingEnabled,
      fontSize: state.editorFontSize,
      fontFamily: state.editorFontFamily,
      typewriterScrollingEnabled: state.isFocusMode ? state.focusModeSettings.typewriterScrollingEnabled : false,
      focusDimmingMode: state.isFocusMode ? state.focusModeSettings.dimmingMode : "off",
      posHighlightingEnabled: state.posHighlightingEnabled,
      styleCheckSettings: state.isFocusMode ? FOCUS_MODE_STYLE_CHECK_SETTINGS : state.styleCheckSettings,
    })),
  );

export const useCalmUiSettings = () =>
  useLayoutStore(
    useShallow((state): CalmUiSettings & { chromeTemporarilyVisible: boolean } => ({
      ...state.calmUiSettings,
      chromeTemporarilyVisible: state.chromeTemporarilyVisible,
    })),
  );

export const useCalmUiActions = () =>
  useLayoutStore(
    useShallow((state) => ({
      setCalmUiSettings: state.setCalmUiSettings,
      toggleCalmUi: state.toggleCalmUi,
      setCalmUiFocusMode: state.setCalmUiFocusMode,
      setChromeTemporarilyVisible: state.setChromeTemporarilyVisible,
      revealChromeTemporarily: state.revealChromeTemporarily,
    })),
  );

export const useReduceMotionState = () =>
  useLayoutStore(useShallow((state) => ({ reduceMotion: state.reduceMotion, setReduceMotion: state.setReduceMotion })));

export type SidebarStateReturn = ReturnType<typeof useSidebarState>;
export type ToolbarStateReturn = ReturnType<typeof useToolbarState>;
export type EditorPresentationStateReturn = ReturnType<typeof useEditorPresentationState>;
export type WorkspacePanelSidebarStateReturn = ReturnType<typeof useWorkspacePanelSidebarState>;
export type WorkspacePanelModeStateReturn = ReturnType<typeof useWorkspacePanelModeState>;
export type TopBarsCollapsedReturn = ReturnType<typeof useWorkspacePanelTopBarsCollapsed>;
export type StatusBarCollapsedReturn = ReturnType<typeof useWorkspacePanelStatusBarCollapsed>;
