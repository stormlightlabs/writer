import type {
  AppTheme,
  DocMeta,
  DocRef,
  EditorFontFamily,
  FocusDimmingMode,
  FocusModeSettings,
  LocationDescriptor,
  StyleCheckPattern,
  StyleCheckSettings,
  Tab,
} from "$types";
import { create, type StateCreator } from "zustand";
import { useShallow } from "zustand/react/shallow";

export type OpenDocumentTabResult = { tabId: string; didCreateTab: boolean };

let nextTabId = 1;

function generateTabId(): string {
  return `tab-${nextTabId++}`;
}

export type LayoutState = {
  sidebarCollapsed: boolean;
  topBarsCollapsed: boolean;
  statusBarCollapsed: boolean;
  lineNumbersVisible: boolean;
  textWrappingEnabled: boolean;
  syntaxHighlightingEnabled: boolean;
  editorFontSize: number;
  editorFontFamily: EditorFontFamily;
  isSplitView: boolean;
  isFocusMode: boolean;
  isPreviewVisible: boolean;
  showSearch: boolean;
  theme: AppTheme;
  focusModeSettings: FocusModeSettings;
  posHighlightingEnabled: boolean;
  styleCheckSettings: StyleCheckSettings;
};

export type LayoutActions = {
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setTopBarsCollapsed: (value: boolean) => void;
  toggleTabBarCollapsed: () => void;
  setStatusBarCollapsed: (value: boolean) => void;
  toggleStatusBarCollapsed: () => void;
  setLineNumbersVisible: (value: boolean) => void;
  toggleLineNumbersVisible: () => void;
  setTextWrappingEnabled: (value: boolean) => void;
  toggleTextWrappingEnabled: () => void;
  setSyntaxHighlightingEnabled: (value: boolean) => void;
  toggleSyntaxHighlightingEnabled: () => void;
  setEditorFontSize: (value: number) => void;
  setEditorFontFamily: (value: EditorFontFamily) => void;
  setSplitView: (value: boolean) => void;
  toggleSplitView: () => void;
  setFocusMode: (value: boolean) => void;
  toggleFocusMode: () => void;
  setFocusModeSettings: (settings: FocusModeSettings) => void;
  setTypewriterScrollingEnabled: (enabled: boolean) => void;
  setFocusDimmingMode: (mode: FocusDimmingMode) => void;
  toggleTypewriterScrolling: () => void;
  setPreviewVisible: (value: boolean) => void;
  togglePreviewVisible: () => void;
  setShowSearch: (value: boolean) => void;
  toggleShowSearch: () => void;
  setPosHighlightingEnabled: (value: boolean) => void;
  togglePosHighlighting: () => void;
  setStyleCheckSettings: (settings: StyleCheckSettings) => void;
  toggleStyleCheck: () => void;
  setStyleCheckCategory: (category: keyof StyleCheckSettings["categories"], enabled: boolean) => void;
  addCustomPattern: (pattern: StyleCheckPattern) => void;
  removeCustomPattern: (index: number) => void;
};

export type WorkspaceState = {
  locations: LocationDescriptor[];
  isLoadingLocations: boolean;
  selectedLocationId: number | undefined;
  selectedDocPath: string | undefined;
  documents: DocMeta[];
  isLoadingDocuments: boolean;
  sidebarFilter: string;
};

export type WorkspaceActions = {
  setSidebarFilter: (value: string) => void;
  setLocations: (locations: LocationDescriptor[]) => void;
  setLoadingLocations: (value: boolean) => void;
  setSelectedLocation: (locationId: number | undefined) => void;
  setSelectedDocPath: (path: string | undefined) => void;
  addLocation: (location: LocationDescriptor) => void;
  removeLocation: (locationId: number) => void;
  setDocuments: (documents: DocMeta[]) => void;
  setLoadingDocuments: (value: boolean) => void;
};

export type TabsState = { tabs: Tab[]; activeTabId: string | null };

export type TabsActions = {
  openDocumentTab: (docRef: DocRef, title: string) => OpenDocumentTabResult;
  selectTab: (tabId: string) => DocRef | null;
  closeTab: (tabId: string) => DocRef | null;
  reorderTabs: (tabs: Tab[]) => void;
  markActiveTabModified: (isModified: boolean) => void;
};

export type AppStore = LayoutState & LayoutActions & WorkspaceState & WorkspaceActions & TabsState & TabsActions;

const getInitialLayoutState = (): LayoutState => ({
  sidebarCollapsed: false,
  topBarsCollapsed: false,
  statusBarCollapsed: false,
  lineNumbersVisible: true,
  textWrappingEnabled: true,
  syntaxHighlightingEnabled: true,
  editorFontSize: 16,
  editorFontFamily: "IBM Plex Mono",
  isSplitView: false,
  isFocusMode: false,
  isPreviewVisible: true,
  showSearch: false,
  theme: "dark",
  focusModeSettings: { typewriterScrollingEnabled: true, dimmingMode: "sentence" },
  posHighlightingEnabled: false,
  styleCheckSettings: { enabled: false, categories: { filler: true, redundancy: true, cliche: true }, customPatterns: [] },
});

const getInitialWorkspaceState = (): WorkspaceState => ({
  locations: [],
  isLoadingLocations: true,
  selectedLocationId: undefined,
  selectedDocPath: undefined,
  documents: [],
  isLoadingDocuments: false,
  sidebarFilter: "",
});

const getInitialTabsState = (): TabsState => ({ tabs: [], activeTabId: null });

const createLayoutSlice: StateCreator<AppStore, [], [], LayoutState & LayoutActions> = (set) => ({
  ...getInitialLayoutState(),

  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setTopBarsCollapsed: (value) => set({ topBarsCollapsed: value }),
  toggleTabBarCollapsed: () => set((state) => ({ topBarsCollapsed: !state.topBarsCollapsed })),

  setStatusBarCollapsed: (value) => set({ statusBarCollapsed: value }),
  toggleStatusBarCollapsed: () => set((state) => ({ statusBarCollapsed: !state.statusBarCollapsed })),

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

  setShowSearch: (value) => set({ showSearch: value }),
  toggleShowSearch: () => set((state) => ({ showSearch: !state.showSearch })),

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

const createWorkspaceSlice: StateCreator<AppStore, [], [], WorkspaceState & WorkspaceActions> = (set) => ({
  ...getInitialWorkspaceState(),

  setSidebarFilter: (value) => set({ sidebarFilter: value }),

  setLocations: (locations) => {
    set((state) => ({ locations, selectedLocationId: state.selectedLocationId ?? locations[0]?.id }));
  },

  setLoadingLocations: (value) => set({ isLoadingLocations: value }),

  setSelectedLocation: (locationId) => set({ selectedLocationId: locationId, selectedDocPath: undefined }),

  setSelectedDocPath: (path) => set({ selectedDocPath: path }),

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

export const useAppStore = create<AppStore>()((...params) => ({
  ...createLayoutSlice(...params),
  ...createWorkspaceSlice(...params),
  ...createTabsSlice(...params),
}));

export const useLayoutState = () =>
  useAppStore(
    useShallow((state) => ({
      sidebarCollapsed: state.sidebarCollapsed,
      topBarsCollapsed: state.topBarsCollapsed,
      statusBarCollapsed: state.statusBarCollapsed,
      lineNumbersVisible: state.lineNumbersVisible,
      textWrappingEnabled: state.textWrappingEnabled,
      syntaxHighlightingEnabled: state.syntaxHighlightingEnabled,
      editorFontSize: state.editorFontSize,
      editorFontFamily: state.editorFontFamily,
      isSplitView: state.isSplitView,
      isFocusMode: state.isFocusMode,
      isPreviewVisible: state.isPreviewVisible,
      showSearch: state.showSearch,
      theme: state.theme,
      focusModeSettings: state.focusModeSettings,
      posHighlightingEnabled: state.posHighlightingEnabled,
      styleCheckSettings: state.styleCheckSettings,
    })),
  );

export const useLayoutActions = () =>
  useAppStore(
    useShallow((state) => ({
      setSidebarCollapsed: state.setSidebarCollapsed,
      toggleSidebarCollapsed: state.toggleSidebarCollapsed,
      setTopBarsCollapsed: state.setTopBarsCollapsed,
      toggleTabBarCollapsed: state.toggleTabBarCollapsed,
      setStatusBarCollapsed: state.setStatusBarCollapsed,
      toggleStatusBarCollapsed: state.toggleStatusBarCollapsed,
      setLineNumbersVisible: state.setLineNumbersVisible,
      toggleLineNumbersVisible: state.toggleLineNumbersVisible,
      setTextWrappingEnabled: state.setTextWrappingEnabled,
      toggleTextWrappingEnabled: state.toggleTextWrappingEnabled,
      setSyntaxHighlightingEnabled: state.setSyntaxHighlightingEnabled,
      toggleSyntaxHighlightingEnabled: state.toggleSyntaxHighlightingEnabled,
      setEditorFontSize: state.setEditorFontSize,
      setEditorFontFamily: state.setEditorFontFamily,
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
      setShowSearch: state.setShowSearch,
      toggleShowSearch: state.toggleShowSearch,
      setPosHighlightingEnabled: state.setPosHighlightingEnabled,
      togglePosHighlighting: state.togglePosHighlighting,
      setStyleCheckSettings: state.setStyleCheckSettings,
      toggleStyleCheck: state.toggleStyleCheck,
      setStyleCheckCategory: state.setStyleCheckCategory,
      addCustomPattern: state.addCustomPattern,
      removeCustomPattern: state.removeCustomPattern,
    })),
  );

export const useWorkspaceState = () =>
  useAppStore(
    useShallow((state) => ({
      locations: state.locations,
      isLoadingLocations: state.isLoadingLocations,
      selectedLocationId: state.selectedLocationId,
      selectedDocPath: state.selectedDocPath,
      documents: state.documents,
      isLoadingDocuments: state.isLoadingDocuments,
      sidebarFilter: state.sidebarFilter,
    })),
  );

export const useWorkspaceActions = () =>
  useAppStore(
    useShallow((state) => ({
      setSidebarFilter: state.setSidebarFilter,
      setLocations: state.setLocations,
      setLoadingLocations: state.setLoadingLocations,
      setSelectedLocation: state.setSelectedLocation,
      setSelectedDocPath: state.setSelectedDocPath,
      addLocation: state.addLocation,
      removeLocation: state.removeLocation,
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

export function resetAppStore(): void {
  nextTabId = 1;

  useAppStore.setState({ ...getInitialLayoutState(), ...getInitialWorkspaceState(), ...getInitialTabsState() });
}
