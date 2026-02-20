import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  resetAppStore,
  useAppStore,
  useLayoutActions,
  useLayoutState,
  useTabsActions,
  useTabsState,
  useWorkspaceActions,
  useWorkspaceState,
} from "../state/appStore";

describe("appStore", () => {
  beforeEach(() => {
    resetAppStore();
  });

  it("selects the first location when locations load initially", () => {
    useAppStore.getState().setLocations([{ id: 10, name: "A", root_path: "/a", added_at: "2024-01-01" }, {
      id: 11,
      name: "B",
      root_path: "/b",
      added_at: "2024-01-01",
    }]);

    expect(useAppStore.getState().selectedLocationId).toBe(10);
  });

  it("opens and reuses document tabs", () => {
    const state = useAppStore.getState();
    const firstOpen = state.openDocumentTab({ location_id: 1, rel_path: "notes/a.md" }, "A");
    const secondOpen = useAppStore.getState().openDocumentTab({ location_id: 1, rel_path: "notes/a.md" }, "A");

    expect(firstOpen.didCreateTab).toBeTruthy();
    expect(secondOpen.didCreateTab).toBeFalsy();
    expect(useAppStore.getState().tabs).toHaveLength(1);
    expect(useAppStore.getState().activeTabId).toBe(firstOpen.tabId);
  });

  it("closing the active tab activates an adjacent tab", () => {
    const store = useAppStore.getState();
    const first = store.openDocumentTab({ location_id: 1, rel_path: "a.md" }, "A");
    const second = useAppStore.getState().openDocumentTab({ location_id: 1, rel_path: "b.md" }, "B");

    useAppStore.getState().selectTab(first.tabId);

    const nextDocRef = useAppStore.getState().closeTab(first.tabId);
    expect(nextDocRef).toStrictEqual({ location_id: 1, rel_path: "b.md" });
    expect(useAppStore.getState().activeTabId).toBe(second.tabId);
    expect(useAppStore.getState().tabs).toHaveLength(1);
  });

  it("removing a location clears selected and active state tied to that location", () => {
    const store = useAppStore.getState();

    store.setLocations([{ id: 1, name: "A", root_path: "/a", added_at: "2024-01-01" }, {
      id: 2,
      name: "B",
      root_path: "/b",
      added_at: "2024-01-01",
    }]);

    store.openDocumentTab({ location_id: 1, rel_path: "a.md" }, "A");
    useAppStore.getState().removeLocation(1);

    expect(useAppStore.getState().locations.map((location) => location.id)).toStrictEqual([2]);
    expect(useAppStore.getState().selectedLocationId).toBeUndefined();
    expect(useAppStore.getState().activeTabId).toBeNull();
    expect(useAppStore.getState().tabs).toStrictEqual([]);
  });

  it("marks only the active tab as modified", () => {
    const store = useAppStore.getState();
    const first = store.openDocumentTab({ location_id: 1, rel_path: "a.md" }, "A");
    const second = useAppStore.getState().openDocumentTab({ location_id: 1, rel_path: "b.md" }, "B");

    useAppStore.getState().selectTab(first.tabId);
    useAppStore.getState().markActiveTabModified(true);

    const { tabs } = useAppStore.getState();
    expect(tabs.find((tab) => tab.id === first.tabId)?.isModified).toBeTruthy();
    expect(tabs.find((tab) => tab.id === second.tabId)?.isModified).toBeFalsy();
  });

  it("keeps selected location when locations refresh and selected id still exists", () => {
    const store = useAppStore.getState();

    store.setLocations([{ id: 1, name: "A", root_path: "/a", added_at: "2024-01-01" }, {
      id: 2,
      name: "B",
      root_path: "/b",
      added_at: "2024-01-01",
    }]);
    store.setSelectedLocation(2);

    store.setLocations([{ id: 2, name: "B", root_path: "/b", added_at: "2024-01-01" }, {
      id: 3,
      name: "C",
      root_path: "/c",
      added_at: "2024-01-01",
    }]);

    expect(useAppStore.getState().selectedLocationId).toBe(2);
  });

  it("setSelectedLocation clears selected doc path and setSelectedDocPath restores it", () => {
    const store = useAppStore.getState();

    store.setSelectedDocPath("notes/old.md");
    store.setSelectedLocation(5);
    expect(useAppStore.getState().selectedDocPath).toBeUndefined();

    store.setSelectedDocPath("notes/new.md");
    expect(useAppStore.getState().selectedDocPath).toBe("notes/new.md");
  });

  it("closing an inactive tab leaves the active tab unchanged", () => {
    const store = useAppStore.getState();
    const first = store.openDocumentTab({ location_id: 1, rel_path: "a.md" }, "A");
    const second = useAppStore.getState().openDocumentTab({ location_id: 1, rel_path: "b.md" }, "B");
    const closedResult = useAppStore.getState().closeTab(first.tabId);

    expect(closedResult).toBeNull();
    expect(useAppStore.getState().tabs.map((tab) => tab.id)).toStrictEqual([second.tabId]);
    expect(useAppStore.getState().activeTabId).toBe(second.tabId);
  });

  it("closing the final active tab clears tab and selection state", () => {
    const store = useAppStore.getState();
    const only = store.openDocumentTab({ location_id: 1, rel_path: "only.md" }, "Only");

    const nextRef = useAppStore.getState().closeTab(only.tabId);

    expect(nextRef).toBeNull();
    expect(useAppStore.getState().tabs).toStrictEqual([]);
    expect(useAppStore.getState().activeTabId).toBeNull();
    expect(useAppStore.getState().selectedDocPath).toBeUndefined();
  });

  it("markActiveTabModified is a no-op when no active tab exists", () => {
    useAppStore.getState().markActiveTabModified(true);
    expect(useAppStore.getState().tabs).toStrictEqual([]);
  });

  it("layout selector hooks expose and update layout state", () => {
    const { result: layoutState } = renderHook(() => useLayoutState());
    const { result: layoutActions } = renderHook(() => useLayoutActions());

    expect(layoutState.current.sidebarCollapsed).toBeFalsy();
    expect(layoutState.current.topBarsCollapsed).toBeFalsy();
    expect(layoutState.current.statusBarCollapsed).toBeFalsy();
    expect(layoutState.current.lineNumbersVisible).toBeTruthy();
    expect(layoutState.current.textWrappingEnabled).toBeTruthy();
    expect(layoutState.current.syntaxHighlightingEnabled).toBeTruthy();
    expect(layoutState.current.editorFontSize).toBe(16);
    expect(layoutState.current.editorFontFamily).toBe("IBM Plex Mono");
    expect(layoutState.current.isSplitView).toBeFalsy();
    expect(layoutState.current.isFocusMode).toBeFalsy();

    act(() => {
      layoutActions.current.toggleSidebarCollapsed();
      layoutActions.current.toggleTabBarCollapsed();
      layoutActions.current.toggleStatusBarCollapsed();
      layoutActions.current.toggleLineNumbersVisible();
      layoutActions.current.toggleTextWrappingEnabled();
      layoutActions.current.toggleSyntaxHighlightingEnabled();
      layoutActions.current.setEditorFontSize(20);
      layoutActions.current.setEditorFontFamily("Monaspace Neon");
      layoutActions.current.setSplitView(true);
      layoutActions.current.toggleFocusMode();
      layoutActions.current.setPreviewVisible(false);
      layoutActions.current.setShowSearch(true);
    });

    expect(layoutState.current.sidebarCollapsed).toBeTruthy();
    expect(layoutState.current.topBarsCollapsed).toBeTruthy();
    expect(layoutState.current.statusBarCollapsed).toBeTruthy();
    expect(layoutState.current.lineNumbersVisible).toBeFalsy();
    expect(layoutState.current.textWrappingEnabled).toBeFalsy();
    expect(layoutState.current.syntaxHighlightingEnabled).toBeFalsy();
    expect(layoutState.current.editorFontSize).toBe(20);
    expect(layoutState.current.editorFontFamily).toBe("Monaspace Neon");
    expect(layoutState.current.isSplitView).toBeTruthy();
    expect(layoutState.current.isFocusMode).toBeTruthy();
    expect(layoutState.current.isPreviewVisible).toBeFalsy();
    expect(layoutState.current.showSearch).toBeTruthy();
    expect(layoutState.current.theme).toBe("dark");
  });

  it("enabling split view forces preview visible", () => {
    const { result: layoutState } = renderHook(() => useLayoutState());
    const { result: layoutActions } = renderHook(() => useLayoutActions());

    act(() => {
      layoutActions.current.setPreviewVisible(false);
      layoutActions.current.toggleSplitView();
    });

    expect(layoutState.current.isSplitView).toBeTruthy();
    expect(layoutState.current.isPreviewVisible).toBeTruthy();
  });

  it("workspace selector hooks expose and update workspace state", () => {
    const { result: workspaceState } = renderHook(() => useWorkspaceState());
    const { result: workspaceActions } = renderHook(() => useWorkspaceActions());

    act(() => {
      workspaceActions.current.setLoadingLocations(false);
      workspaceActions.current.setSidebarFilter("draft");
      workspaceActions.current.setDocuments([{
        location_id: 1,
        rel_path: "a.md",
        title: "A",
        updated_at: "2024-01-01T00:00:00Z",
        word_count: 10,
      }]);
      workspaceActions.current.setLoadingDocuments(true);
      workspaceActions.current.addLocation({ id: 9, name: "N", root_path: "/n", added_at: "2024-01-01" });
      workspaceActions.current.removeLocation(9);
    });

    expect(workspaceState.current.isLoadingLocations).toBeFalsy();
    expect(workspaceState.current.sidebarFilter).toBe("draft");
    expect(workspaceState.current.documents).toStrictEqual([{
      location_id: 1,
      rel_path: "a.md",
      title: "A",
      updated_at: "2024-01-01T00:00:00Z",
      word_count: 10,
    }]);
    expect(workspaceState.current.isLoadingDocuments).toBeTruthy();
    expect(workspaceState.current.locations).toStrictEqual([]);
  });

  it("tabs selector hooks expose and update tab state", () => {
    const { result: tabsState } = renderHook(() => useTabsState());
    const { result: tabsActions } = renderHook(() => useTabsActions());

    let firstTabId = "";
    let secondTabId = "";

    act(() => {
      firstTabId = tabsActions.current.openDocumentTab({ location_id: 1, rel_path: "first.md" }, "First").tabId;
      secondTabId = tabsActions.current.openDocumentTab({ location_id: 1, rel_path: "second.md" }, "Second").tabId;
      tabsActions.current.selectTab(firstTabId);
      const currentTabs = useAppStore.getState().tabs;
      tabsActions.current.reorderTabs([{ ...currentTabs.find((tab) => tab.id === secondTabId)!, isModified: false }, {
        ...currentTabs.find((tab) => tab.id === firstTabId)!,
        isModified: false,
      }]);
    });

    expect(tabsState.current.tabs).toHaveLength(2);
    expect(tabsState.current.activeTabId).toBe(firstTabId);
    expect(tabsState.current.tabs[0].id).toBe(secondTabId);
    expect(tabsState.current.tabs[1].id).toBe(firstTabId);
  });
});
