import type { CalmUiSettings, StyleCheckSettings } from "$types";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "./stores/app";
import { EditorPresentation } from "./types";

const FOCUS_MODE_STYLE_CHECK_SETTINGS: StyleCheckSettings = {
  enabled: false,
  categories: { filler: true, redundancy: true, cliche: true },
  customPatterns: [],
};

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
      toggleSidebarCollapsed: state.toggleSidebarCollapsed,
      toggleTabBarCollapsed: state.toggleTabBarCollapsed,
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
      setCalmUiAutoHide: state.setCalmUiAutoHide,
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
