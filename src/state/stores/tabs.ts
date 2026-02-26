import type { TabsActions, TabsState } from "$state/types";
import type { Tab } from "$types";
import { create } from "zustand";
import { useWorkspaceStore } from "./workspace";

export type TabsStore = TabsState & TabsActions;

function generateTabId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const getInitialTabsState = (): TabsState => ({ tabs: [], activeTabId: null });

export const useTabsStore = create<TabsStore>()((set, get) => ({
  ...getInitialTabsState(),

  openDocumentTab: (docRef, title) => {
    const existingTab = get().tabs.find((tab) =>
      tab.docRef.location_id === docRef.location_id && tab.docRef.rel_path === docRef.rel_path
    );

    if (existingTab) {
      useWorkspaceStore.setState({ selectedLocationId: docRef.location_id, selectedDocPath: docRef.rel_path });
      set({ activeTabId: existingTab.id });
      return { tabId: existingTab.id, didCreateTab: false };
    }

    const newTab: Tab = { id: generateTabId(), docRef, title, isModified: false };
    set((state) => ({ tabs: [...state.tabs, newTab], activeTabId: newTab.id }));
    useWorkspaceStore.setState({ selectedLocationId: docRef.location_id, selectedDocPath: docRef.rel_path });
    return { tabId: newTab.id, didCreateTab: true };
  },

  selectTab: (tabId) => {
    const tab = get().tabs.find((item) => item.id === tabId);
    if (!tab) {
      return null;
    }

    set({ activeTabId: tab.id });
    useWorkspaceStore.setState({ selectedLocationId: tab.docRef.location_id, selectedDocPath: tab.docRef.rel_path });
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
      set({ tabs, activeTabId: null });
      useWorkspaceStore.setState({ selectedDocPath: undefined });
      return null;
    }

    const nextIndex = Math.min(tabIndex, tabs.length - 1);
    const nextActiveTab = tabs[nextIndex];
    set({ tabs, activeTabId: nextActiveTab.id });
    useWorkspaceStore.setState({
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

      const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
      if (!activeTab || activeTab.isModified === isModified) {
        return state;
      }

      return { tabs: state.tabs.map((tab) => (tab.id === state.activeTabId ? { ...tab, isModified } : tab)) };
    });
  },
}));

let hasInitializedWorkspaceSync = false;

function initializeWorkspaceSync(): void {
  if (hasInitializedWorkspaceSync) {
    return;
  }
  hasInitializedWorkspaceSync = true;

  useWorkspaceStore.subscribe((workspaceState, previousWorkspaceState) => {
    if (workspaceState.locations === previousWorkspaceState.locations) {
      return;
    }

    const validLocationIds = new Set(workspaceState.locations.map((location) => location.id));
    const tabsState = useTabsStore.getState();
    const nextTabs = tabsState.tabs.filter((tab) => validLocationIds.has(tab.docRef.location_id));

    if (nextTabs.length === tabsState.tabs.length) {
      return;
    }

    const activeTabStillExists = tabsState.activeTabId !== null
      && nextTabs.some((tab) => tab.id === tabsState.activeTabId);
    useTabsStore.setState({ tabs: nextTabs, activeTabId: activeTabStillExists ? tabsState.activeTabId : null });

    if (!activeTabStillExists) {
      useWorkspaceStore.setState({ selectedDocPath: undefined });
    }
  });
}

initializeWorkspaceSync();

export function resetTabsStore(): void {
  useTabsStore.setState(getInitialTabsState());
}
