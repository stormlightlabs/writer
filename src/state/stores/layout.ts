import type {
  EditorPresentationActions,
  EditorPresentationState,
  LayoutChromeActions,
  LayoutChromeState,
  LayoutState,
  ViewModeActions,
  ViewModeState,
  WriterToolsActions,
  WriterToolsState,
} from "$state/types";
import { create } from "zustand";

export type LayoutStore =
  & LayoutChromeState
  & LayoutChromeActions
  & EditorPresentationState
  & EditorPresentationActions
  & ViewModeState
  & ViewModeActions
  & WriterToolsState
  & WriterToolsActions;

function getInitialTheme(): "dark" | "light" {
  if (typeof globalThis.matchMedia === "function") {
    return globalThis.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  return "dark";
}

export const getInitialLayoutChromeState = (): LayoutChromeState => ({
  sidebarCollapsed: false,
  topBarsCollapsed: false,
  statusBarCollapsed: false,
  showSearch: false,
  calmUiSettings: { enabled: true, focusMode: true },
  chromeTemporarilyVisible: false,
  reduceMotion: false,
});

export const getInitialEditorPresentationState = (): EditorPresentationState => ({
  lineNumbersVisible: true,
  textWrappingEnabled: true,
  syntaxHighlightingEnabled: true,
  editorFontSize: 16,
  editorFontFamily: "IBM Plex Mono",
  theme: getInitialTheme(),
});

export const getInitialViewModeState = (): ViewModeState => ({
  isSplitView: false,
  isFocusMode: false,
  isPreviewVisible: false,
  focusModeSettings: { typewriterScrollingEnabled: true, dimmingMode: "sentence" },
});

export const getInitialWriterToolsState = (): WriterToolsState => ({
  posHighlightingEnabled: false,
  styleCheckSettings: {
    enabled: false,
    categories: { filler: true, redundancy: true, cliche: true },
    customPatterns: [],
  },
});

export const getInitialLayoutState = (): LayoutState => ({
  ...getInitialLayoutChromeState(),
  ...getInitialEditorPresentationState(),
  ...getInitialViewModeState(),
  ...getInitialWriterToolsState(),
});

export const useLayoutStore = create<LayoutStore>()((set) => ({
  ...getInitialLayoutState(),

  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setTopBarsCollapsed: (value) => set({ topBarsCollapsed: value }),
  toggleTabBarCollapsed: () => set((state) => ({ topBarsCollapsed: !state.topBarsCollapsed })),

  setStatusBarCollapsed: (value) => set({ statusBarCollapsed: value }),
  toggleStatusBarCollapsed: () => set((state) => ({ statusBarCollapsed: !state.statusBarCollapsed })),

  setShowSearch: (value) => set({ showSearch: value }),
  toggleShowSearch: () => set((state) => ({ showSearch: !state.showSearch })),

  setCalmUiSettings: (settings) => set({ calmUiSettings: settings }),
  toggleCalmUi: () =>
    set((state) => {
      const nextEnabled = !state.calmUiSettings.enabled;
      return {
        calmUiSettings: { ...state.calmUiSettings, enabled: nextEnabled },
        sidebarCollapsed: nextEnabled,
        topBarsCollapsed: nextEnabled,
        statusBarCollapsed: nextEnabled,
        chromeTemporarilyVisible: false,
      };
    }),
  setCalmUiFocusMode: (value) => set((state) => ({ calmUiSettings: { ...state.calmUiSettings, focusMode: value } })),
  setChromeTemporarilyVisible: (value) => set({ chromeTemporarilyVisible: value }),
  revealChromeTemporarily: () => set({ chromeTemporarilyVisible: true }),
  setReduceMotion: (value) => set({ reduceMotion: value }),

  setLineNumbersVisible: (value) => set({ lineNumbersVisible: value }),
  toggleLineNumbersVisible: () => set((state) => ({ lineNumbersVisible: !state.lineNumbersVisible })),

  setTextWrappingEnabled: (value) => set({ textWrappingEnabled: value }),
  toggleTextWrappingEnabled: () => set((state) => ({ textWrappingEnabled: !state.textWrappingEnabled })),

  setSyntaxHighlightingEnabled: (value) => set({ syntaxHighlightingEnabled: value }),
  toggleSyntaxHighlightingEnabled: () =>
    set((state) => ({ syntaxHighlightingEnabled: !state.syntaxHighlightingEnabled })),

  setEditorFontSize: (value) => set({ editorFontSize: Math.max(12, Math.min(24, Math.round(value))) }),
  setEditorFontFamily: (value) => set({ editorFontFamily: value }),

  setSplitView: (value) =>
    set((state) => ({ isSplitView: value, isPreviewVisible: value ? true : state.isPreviewVisible })),
  toggleSplitView: () =>
    set((state) => ({
      isSplitView: !state.isSplitView,
      isPreviewVisible: state.isSplitView ? state.isPreviewVisible : true,
    })),
  setEditorOnlyMode: () => set({ isSplitView: false, isPreviewVisible: false }),

  setFocusMode: (value) => set({ isFocusMode: value }),
  toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),

  setFocusModeSettings: (settings) => set({ focusModeSettings: settings }),
  setTypewriterScrollingEnabled: (enabled) =>
    set((state) => ({ focusModeSettings: { ...state.focusModeSettings, typewriterScrollingEnabled: enabled } })),
  setFocusDimmingMode: (mode) =>
    set((state) => ({ focusModeSettings: { ...state.focusModeSettings, dimmingMode: mode } })),
  toggleTypewriterScrolling: () =>
    set((state) => ({
      focusModeSettings: {
        ...state.focusModeSettings,
        typewriterScrollingEnabled: !state.focusModeSettings.typewriterScrollingEnabled,
      },
    })),

  setPreviewVisible: (value) => set({ isPreviewVisible: value }),
  togglePreviewVisible: () => set((state) => ({ isPreviewVisible: !state.isPreviewVisible })),

  setPosHighlightingEnabled: (value) => set({ posHighlightingEnabled: value }),
  togglePosHighlighting: () => set((state) => ({ posHighlightingEnabled: !state.posHighlightingEnabled })),

  setStyleCheckSettings: (settings) => set({ styleCheckSettings: settings }),
  toggleStyleCheck: () =>
    set((state) => ({
      styleCheckSettings: { ...state.styleCheckSettings, enabled: !state.styleCheckSettings.enabled },
    })),
  setStyleCheckCategory: (category, enabled) =>
    set((state) => ({
      styleCheckSettings: {
        ...state.styleCheckSettings,
        categories: { ...state.styleCheckSettings.categories, [category]: enabled },
      },
    })),
  addCustomPattern: (pattern) =>
    set((state) => ({
      styleCheckSettings: {
        ...state.styleCheckSettings,
        customPatterns: [...state.styleCheckSettings.customPatterns, pattern],
      },
    })),
  removeCustomPattern: (index) =>
    set((state) => ({
      styleCheckSettings: {
        ...state.styleCheckSettings,
        customPatterns: state.styleCheckSettings.customPatterns.filter((_, i) => i !== index),
      },
    })),
}));

export function resetLayoutStore(): void {
  useLayoutStore.setState(getInitialLayoutState());
}
