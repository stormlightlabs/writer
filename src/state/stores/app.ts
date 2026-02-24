import type { Tab } from "$types";
import { create, type StateCreator } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type {
  AppStore,
  EditorPresentationActions,
  EditorPresentationState,
  LayoutChromeActions,
  LayoutChromeState,
  LayoutState,
  PdfExportActions,
  PdfExportState,
  TabsActions,
  TabsState,
  ViewModeActions,
  ViewModeState,
  WorkspaceDocumentsActions,
  WorkspaceDocumentsState,
  WorkspaceLocationsActions,
  WorkspaceLocationsState,
  WorkspaceState,
  WriterToolsActions,
  WriterToolsState,
} from "../types";

let nextTabId = 1;

function generateTabId(): string {
  return `tab-${nextTabId++}`;
}

const getInitialLayoutChromeState = (): LayoutChromeState => ({
  sidebarCollapsed: false,
  topBarsCollapsed: false,
  statusBarCollapsed: false,
  showSearch: false,
  calmUiSettings: { enabled: true, autoHide: true, focusMode: true },
  chromeTemporarilyVisible: false,
});

const getInitialEditorPresentationState = (): EditorPresentationState => ({
  lineNumbersVisible: true,
  textWrappingEnabled: true,
  syntaxHighlightingEnabled: true,
  editorFontSize: 16,
  editorFontFamily: "IBM Plex Mono",
  theme: "dark",
});

const getInitialViewModeState = (): ViewModeState => ({
  isSplitView: false,
  isFocusMode: false,
  isPreviewVisible: true,
  focusModeSettings: { typewriterScrollingEnabled: true, dimmingMode: "sentence" },
});

const getInitialWriterToolsState = (): WriterToolsState => ({
  posHighlightingEnabled: false,
  styleCheckSettings: {
    enabled: false,
    categories: { filler: true, redundancy: true, cliche: true },
    customPatterns: [],
  },
});

const getInitialLayoutState = (): LayoutState => ({
  ...getInitialLayoutChromeState(),
  ...getInitialEditorPresentationState(),
  ...getInitialViewModeState(),
  ...getInitialWriterToolsState(),
});

const getInitialWorkspaceLocationsState = (): WorkspaceLocationsState => ({
  locations: [],
  isLoadingLocations: true,
  selectedLocationId: undefined,
  sidebarFilter: "",
});

const getInitialWorkspaceDocumentsState = (): WorkspaceDocumentsState => ({
  selectedDocPath: undefined,
  documents: [],
  isLoadingDocuments: false,
});

const getInitialWorkspaceState = (): WorkspaceState => ({
  ...getInitialWorkspaceLocationsState(),
  ...getInitialWorkspaceDocumentsState(),
});

const getInitialTabsState = (): TabsState => ({ tabs: [], activeTabId: null });

const getInitialPdfExportState = (): PdfExportState => ({ isExportingPdf: false, pdfExportError: null });

const createLayoutChromeSlice: StateCreator<AppStore, [], [], LayoutChromeState & LayoutChromeActions> = (set) => ({
  ...getInitialLayoutChromeState(),

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
  setCalmUiAutoHide: (value) => set((state) => ({ calmUiSettings: { ...state.calmUiSettings, autoHide: value } })),
  setCalmUiFocusMode: (value) => set((state) => ({ calmUiSettings: { ...state.calmUiSettings, focusMode: value } })),
  setChromeTemporarilyVisible: (value) => set({ chromeTemporarilyVisible: value }),
  revealChromeTemporarily: () => set({ chromeTemporarilyVisible: true }),
});

const createEditorPresentationSlice: StateCreator<
  AppStore,
  [],
  [],
  EditorPresentationState & EditorPresentationActions
> = (set) => ({
  ...getInitialEditorPresentationState(),

  setLineNumbersVisible: (value) => set({ lineNumbersVisible: value }),
  toggleLineNumbersVisible: () => set((state) => ({ lineNumbersVisible: !state.lineNumbersVisible })),

  setTextWrappingEnabled: (value) => set({ textWrappingEnabled: value }),
  toggleTextWrappingEnabled: () => set((state) => ({ textWrappingEnabled: !state.textWrappingEnabled })),

  setSyntaxHighlightingEnabled: (value) => set({ syntaxHighlightingEnabled: value }),
  toggleSyntaxHighlightingEnabled: () =>
    set((state) => ({ syntaxHighlightingEnabled: !state.syntaxHighlightingEnabled })),

  setEditorFontSize: (value) => set({ editorFontSize: Math.max(12, Math.min(24, Math.round(value))) }),
  setEditorFontFamily: (value) => set({ editorFontFamily: value }),
});

const createViewModeSlice: StateCreator<AppStore, [], [], ViewModeState & ViewModeActions> = (set) => ({
  ...getInitialViewModeState(),

  setSplitView: (value) =>
    set((state) => ({ isSplitView: value, isPreviewVisible: value ? true : state.isPreviewVisible })),
  toggleSplitView: () =>
    set((state) => ({
      isSplitView: !state.isSplitView,
      isPreviewVisible: state.isSplitView ? state.isPreviewVisible : true,
    })),

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
});

const createWriterToolsSlice: StateCreator<AppStore, [], [], WriterToolsState & WriterToolsActions> = (set) => ({
  ...getInitialWriterToolsState(),

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
});

const createWorkspaceLocationsSlice: StateCreator<
  AppStore,
  [],
  [],
  WorkspaceLocationsState & WorkspaceLocationsActions
> = (set) => ({
  ...getInitialWorkspaceLocationsState(),

  setSidebarFilter: (value) => set({ sidebarFilter: value }),

  setLocations: (locations) => {
    set((state) => ({ locations, selectedLocationId: state.selectedLocationId ?? locations[0]?.id }));
  },

  setLoadingLocations: (value) => set({ isLoadingLocations: value }),

  setSelectedLocation: (locationId) => set({ selectedLocationId: locationId, selectedDocPath: undefined }),

  addLocation: (location) => {
    set((state) => ({
      locations: [...state.locations, location],
      selectedLocationId: location.id,
      selectedDocPath: undefined,
    }));
  },

  removeLocation: (locationId) => {
    set((state) => {
      const locations = state.locations.filter((location) => location.id !== locationId);
      const tabs = state.tabs.filter((tab) => tab.docRef.location_id !== locationId);
      const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
      const activeTabRemoved = activeTab?.docRef.location_id === locationId;

      return {
        locations,
        tabs,
        selectedLocationId: state.selectedLocationId === locationId ? undefined : state.selectedLocationId,
        selectedDocPath: state.selectedLocationId === locationId ? undefined : state.selectedDocPath,
        activeTabId: activeTabRemoved ? null : state.activeTabId,
      };
    });
  },
});

const createWorkspaceDocumentsSlice: StateCreator<
  AppStore,
  [],
  [],
  WorkspaceDocumentsState & WorkspaceDocumentsActions
> = (set) => ({
  ...getInitialWorkspaceDocumentsState(),

  setSelectedDocPath: (path) => set({ selectedDocPath: path }),
  setDocuments: (documents) => set({ documents }),
  setLoadingDocuments: (value) => set({ isLoadingDocuments: value }),
});

const createTabsSlice: StateCreator<AppStore, [], [], TabsState & TabsActions> = (set, get) => ({
  ...getInitialTabsState(),

  openDocumentTab: (docRef, title) => {
    const existingTab = get().tabs.find((tab) =>
      tab.docRef.location_id === docRef.location_id && tab.docRef.rel_path === docRef.rel_path
    );

    if (existingTab) {
      set({ activeTabId: existingTab.id, selectedLocationId: docRef.location_id, selectedDocPath: docRef.rel_path });

      return { tabId: existingTab.id, didCreateTab: false };
    }

    const newTab: Tab = { id: generateTabId(), docRef, title, isModified: false };

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
      selectedLocationId: docRef.location_id,
      selectedDocPath: docRef.rel_path,
    }));

    return { tabId: newTab.id, didCreateTab: true };
  },

  selectTab: (tabId) => {
    const tab = get().tabs.find((item) => item.id === tabId);
    if (!tab) {
      return null;
    }

    set({ activeTabId: tab.id, selectedLocationId: tab.docRef.location_id, selectedDocPath: tab.docRef.rel_path });

    return tab.docRef;
  },

  closeTab: (tabId) => {
    const state = get();
    const tabIndex = state.tabs.findIndex((item) => item.id === tabId);

    if (tabIndex === -1) {
      return null;
    }

    const tabs = state.tabs.filter((item) => item.id !== tabId);

    if (state.activeTabId !== tabId) {
      set({ tabs });
      return null;
    }

    if (tabs.length === 0) {
      set({ tabs, activeTabId: null, selectedDocPath: undefined });
      return null;
    }

    const nextIndex = Math.min(tabIndex, tabs.length - 1);
    const nextActiveTab = tabs[nextIndex];

    set({
      tabs,
      activeTabId: nextActiveTab.id,
      selectedLocationId: nextActiveTab.docRef.location_id,
      selectedDocPath: nextActiveTab.docRef.rel_path,
    });

    return nextActiveTab.docRef;
  },

  reorderTabs: (tabs) => set({ tabs }),

  markActiveTabModified: (isModified) => {
    set((state) => {
      if (!state.activeTabId) {
        return state;
      }

      return { tabs: state.tabs.map((tab) => (tab.id === state.activeTabId ? { ...tab, isModified } : tab)) };
    });
  },
});

const createPdfExportSlice: StateCreator<AppStore, [], [], PdfExportState & PdfExportActions> = (set) => ({
  ...getInitialPdfExportState(),

  startPdfExport: () => set({ isExportingPdf: true, pdfExportError: null }),
  finishPdfExport: () => set({ isExportingPdf: false, pdfExportError: null }),
  failPdfExport: (message) => set({ isExportingPdf: false, pdfExportError: message }),
  resetPdfExport: () => set({ ...getInitialPdfExportState() }),
});

export const useAppStore = create<AppStore>()((...params) => ({
  ...createLayoutChromeSlice(...params),
  ...createEditorPresentationSlice(...params),
  ...createViewModeSlice(...params),
  ...createWriterToolsSlice(...params),
  ...createWorkspaceLocationsSlice(...params),
  ...createWorkspaceDocumentsSlice(...params),
  ...createTabsSlice(...params),
  ...createPdfExportSlice(...params),
}));

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
      setCalmUiAutoHide: state.setCalmUiAutoHide,
      setCalmUiFocusMode: state.setCalmUiFocusMode,
      setChromeTemporarilyVisible: state.setChromeTemporarilyVisible,
      revealChromeTemporarily: state.revealChromeTemporarily,
    })),
  );

export const useEditorPresentationState = () =>
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
    })),
  );

export const useWorkspaceDocumentsActions = () =>
  useAppStore(
    useShallow((state) => ({
      setSelectedDocPath: state.setSelectedDocPath,
      setDocuments: state.setDocuments,
      setLoadingDocuments: state.setLoadingDocuments,
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

export function resetAppStore(): void {
  nextTabId = 1;

  useAppStore.setState({
    ...getInitialLayoutState(),
    ...getInitialWorkspaceState(),
    ...getInitialTabsState(),
    ...getInitialPdfExportState(),
  });
}
