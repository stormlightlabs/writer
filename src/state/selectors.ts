import type { CalmUiSettings, StyleCheckSettings } from "$types";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "./stores/app";
import type { EditorPresentation } from "./types";

const FOCUS_MODE_STYLE_CHECK_SETTINGS: StyleCheckSettings = {
  enabled: false,
  categories: { filler: true, redundancy: true, cliche: true },
  customPatterns: [],
};

export const useLayoutChromeState = () =>
  useAppStore(
    useShallow((state) => ({
      sidebarCollapsed: state.sidebarCollapsed,
      topBarsCollapsed: state.topBarsCollapsed,
      statusBarCollapsed: state.statusBarCollapsed,
      showSearch: state.showSearch,
      calmUiSettings: state.calmUiSettings,
      chromeTemporarilyVisible: state.chromeTemporarilyVisible,
    })),
  );

export const useLayoutChromeActions = () =>
  useAppStore(
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
  useAppStore(
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
  useAppStore(
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
  useAppStore(
    useShallow((state) => ({
      isSplitView: state.isSplitView,
      isFocusMode: state.isFocusMode,
      isPreviewVisible: state.isPreviewVisible,
      focusModeSettings: state.focusModeSettings,
    })),
  );

export const useViewModeActions = () =>
  useAppStore(
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
  useAppStore(
    useShallow((state) => ({
      posHighlightingEnabled: state.posHighlightingEnabled,
      styleCheckSettings: state.styleCheckSettings,
    })),
  );

export const useWriterToolsActions = () =>
  useAppStore(
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
  useAppStore(
    useShallow((state) => ({
      locations: state.locations,
      isLoadingLocations: state.isLoadingLocations,
      selectedLocationId: state.selectedLocationId,
      sidebarFilter: state.sidebarFilter,
    })),
  );

export const useWorkspaceLocationsActions = () =>
  useAppStore(
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
  useAppStore(
    useShallow((state) => ({
      selectedDocPath: state.selectedDocPath,
      documents: state.documents,
      isLoadingDocuments: state.isLoadingDocuments,
      refreshingLocationId: state.refreshingLocationId,
      sidebarRefreshReason: state.sidebarRefreshReason,
    })),
  );

export const useWorkspaceDocumentsActions = () =>
  useAppStore(
    useShallow((state) => ({
      setSelectedDocPath: state.setSelectedDocPath,
      setDocuments: state.setDocuments,
      setLoadingDocuments: state.setLoadingDocuments,
      setSidebarRefreshState: state.setSidebarRefreshState,
    })),
  );

export const useTabsState = () =>
  useAppStore(useShallow((state) => ({ tabs: state.tabs, activeTabId: state.activeTabId })));

export const useTabsActions = () =>
  useAppStore(
    useShallow((state) => ({
      openDocumentTab: state.openDocumentTab,
      selectTab: state.selectTab,
      closeTab: state.closeTab,
      reorderTabs: state.reorderTabs,
      markActiveTabModified: state.markActiveTabModified,
    })),
  );

export const usePdfExportState = () =>
  useAppStore(useShallow((state) => ({ isExportingPdf: state.isExportingPdf, pdfExportError: state.pdfExportError })));

export const usePdfExportActions = () =>
  useAppStore(
    useShallow((state) => ({
      startPdfExport: state.startPdfExport,
      finishPdfExport: state.finishPdfExport,
      failPdfExport: state.failPdfExport,
      resetPdfExport: state.resetPdfExport,
    })),
  );

export const useSearchState = () =>
  useAppStore(
    useShallow((state) => ({
      searchQuery: state.searchQuery,
      searchResults: state.searchResults,
      isSearching: state.isSearching,
      filters: state.searchFilters,
    })),
  );

export const useSearchActions = () =>
  useAppStore(
    useShallow((state) => ({
      setSearchQuery: state.setSearchQuery,
      setSearchResults: state.setSearchResults,
      setIsSearching: state.setIsSearching,
      setFilters: state.setSearchFilters,
      resetSearch: state.resetSearch,
    })),
  );

export const useActiveSearchFilterCount = () =>
  useAppStore((state) => {
    const filters = state.searchFilters;
    return (filters.locations?.length ?? 0) + (filters.fileTypes?.length ?? 0) + (filters.dateRange ? 1 : 0);
  });

export const useLayoutSettingsUiState = () =>
  useAppStore(useShallow((state) => ({ isOpen: state.layoutSettingsOpen, setOpen: state.setLayoutSettingsOpen })));

export const usePdfDialogUiState = () =>
  useAppStore(
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
  useAppStore(
    useShallow((state) => ({
      settings: state.globalCaptureSettings,
      setSettings: state.setGlobalCaptureSettings,
      setQuickCaptureEnabled: state.setQuickCaptureEnabled,
    })),
  );

export const useLayoutSettingsChromeState = () =>
  useAppStore(
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
  useAppStore(
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
  useAppStore(
    useShallow((state) => ({
      focusModeSettings: state.focusModeSettings,
      setTypewriterScrollingEnabled: state.setTypewriterScrollingEnabled,
      setFocusDimmingMode: state.setFocusDimmingMode,
    })),
  );

export const useLayoutSettingsWriterToolsState = () =>
  useAppStore(
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
  useAppStore(
    useShallow((state) => ({
      tabBarCollapsed: state.topBarsCollapsed,
      statusBarCollapsed: state.statusBarCollapsed,
      toggleSidebarCollapsed: state.toggleSidebarCollapsed,
      toggleTabBarCollapsed: state.toggleTabBarCollapsed,
      toggleStatusBarCollapsed: state.toggleStatusBarCollapsed,
      setShowSearch: state.setShowSearch,
    })),
  );

export const useWorkspacePanelSidebarState = () =>
  useAppStore(useShallow((state) => ({ sidebarCollapsed: state.sidebarCollapsed })));

export const useWorkspacePanelModeState = () =>
  useAppStore(useShallow((state) => ({ isSplitView: state.isSplitView, isPreviewVisible: state.isPreviewVisible })));

export const useWorkspacePanelTopBarsCollapsed = () => useAppStore((state) => state.topBarsCollapsed);

export const useWorkspacePanelStatusBarCollapsed = () => useAppStore((state) => state.statusBarCollapsed);

export const useSearchOverlayState = () =>
  useAppStore(useShallow((state) => ({ isVisible: state.showSearch, setShowSearch: state.setShowSearch })));

export const useFocusModePanelState = () =>
  useAppStore(
    useShallow((state) => ({ statusBarCollapsed: state.statusBarCollapsed, setFocusMode: state.setFocusMode })),
  );

export const useSidebarState = () =>
  useAppStore(
    useShallow((state) => ({
      locations: state.locations,
      selectedLocationId: state.selectedLocationId,
      selectedDocPath: state.selectedDocPath,
      documents: state.documents,
      isLoading: state.isLoadingLocations || state.isLoadingDocuments,
      refreshingLocationId: state.refreshingLocationId,
      sidebarRefreshReason: state.sidebarRefreshReason,
      filterText: state.sidebarFilter,
      setFilterText: state.setSidebarFilter,
      selectLocation: state.setSelectedLocation,
      toggleSidebarCollapsed: state.toggleSidebarCollapsed,
    })),
  );

export const useToolbarState = () =>
  useAppStore(
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
  useAppStore(
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
  useAppStore(
    useShallow((state): CalmUiSettings & { chromeTemporarilyVisible: boolean } => ({
      ...state.calmUiSettings,
      chromeTemporarilyVisible: state.chromeTemporarilyVisible,
    })),
  );

export const useCalmUiActions = () =>
  useAppStore(
    useShallow((state) => ({
      setCalmUiSettings: state.setCalmUiSettings,
      toggleCalmUi: state.toggleCalmUi,
      setCalmUiFocusMode: state.setCalmUiFocusMode,
      setChromeTemporarilyVisible: state.setChromeTemporarilyVisible,
      revealChromeTemporarily: state.revealChromeTemporarily,
    })),
  );

export type SidebarStateReturn = ReturnType<typeof useSidebarState>;
export type ToolbarStateReturn = ReturnType<typeof useToolbarState>;
export type EditorPresentationStateReturn = ReturnType<typeof useEditorPresentationState>;
export type WorkspacePanelSidebarStateReturn = ReturnType<typeof useWorkspacePanelSidebarState>;
export type WorkspacePanelModeStateReturn = ReturnType<typeof useWorkspacePanelModeState>;
export type TopBarsCollapsedReturn = ReturnType<typeof useWorkspacePanelTopBarsCollapsed>;
export type StatusBarCollapsedReturn = ReturnType<typeof useWorkspacePanelStatusBarCollapsed>;
