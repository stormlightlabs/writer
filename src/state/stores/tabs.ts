import type { TabsActions, TabsState } from "$state/types";
import { create } from "zustand";
import { useWorkspaceStore } from "./workspace";

export type TabsStore = TabsState & TabsActions;

export const getInitialTabsState = (): TabsState => ({ tabs: [], activeTabId: null, isSessionHydrated: false });

export const useTabsStore = create<TabsStore>()((set) => ({
  ...getInitialTabsState(),

  applySessionState: (session) => {
    set({ tabs: session.tabs, activeTabId: session.activeTabId, isSessionHydrated: true });

    const activeTab = session.tabs.find((tab) => tab.id === session.activeTabId) ?? null;
    const workspaceState = useWorkspaceStore.getState();
    const selectedLocationId = activeTab?.docRef.location_id;
    useWorkspaceStore.setState({
      selectedLocationId,
      selectedDocPath: activeTab?.docRef.rel_path,
      documents: selectedLocationId ? workspaceState.documentsByLocation[selectedLocationId] ?? [] : [],
      directories: selectedLocationId ? workspaceState.directoriesByLocation[selectedLocationId] ?? [] : [],
    });
  },
}));

export function resetTabsStore(): void {
  useTabsStore.setState(getInitialTabsState());
}
