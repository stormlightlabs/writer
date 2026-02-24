import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  resetAppStore,
  useAppStore,
  useEditorPresentationActions,
  useEditorPresentationState,
  useLayoutChromeActions,
  useLayoutChromeState,
  useTabsActions,
  useTabsState,
  useViewModeActions,
  useViewModeState,
  useWorkspaceDocumentsActions,
  useWorkspaceDocumentsState,
  useWorkspaceLocationsActions,
  useWorkspaceLocationsState,
} from "../state/stores/app";

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

  it("focused layout hooks expose and update layout state", () => {
    const { result: chromeState } = renderHook(() => useLayoutChromeState());
    const { result: chromeActions } = renderHook(() => useLayoutChromeActions());
    const { result: editorState } = renderHook(() => useEditorPresentationState());
    const { result: editorActions } = renderHook(() => useEditorPresentationActions());
    const { result: viewModeState } = renderHook(() => useViewModeState());
    const { result: viewModeActions } = renderHook(() => useViewModeActions());

    expect(chromeState.current.sidebarCollapsed).toBeFalsy();
    expect(chromeState.current.topBarsCollapsed).toBeFalsy();
    expect(chromeState.current.statusBarCollapsed).toBeFalsy();
    expect(editorState.current.lineNumbersVisible).toBeTruthy();
    expect(editorState.current.textWrappingEnabled).toBeTruthy();
    expect(editorState.current.syntaxHighlightingEnabled).toBeTruthy();
    expect(editorState.current.editorFontSize).toBe(16);
    expect(editorState.current.editorFontFamily).toBe("IBM Plex Mono");
    expect(viewModeState.current.isSplitView).toBeFalsy();
    expect(viewModeState.current.isFocusMode).toBeFalsy();

    act(() => {
      chromeActions.current.toggleSidebarCollapsed();
      chromeActions.current.toggleTabBarCollapsed();
      chromeActions.current.toggleStatusBarCollapsed();
      chromeActions.current.setShowSearch(true);
      editorActions.current.toggleLineNumbersVisible();
      editorActions.current.toggleTextWrappingEnabled();
      editorActions.current.toggleSyntaxHighlightingEnabled();
      editorActions.current.setEditorFontSize(20);
      editorActions.current.setEditorFontFamily("Monaspace Neon");
      viewModeActions.current.setSplitView(true);
      viewModeActions.current.toggleFocusMode();
      viewModeActions.current.setPreviewVisible(false);
    });

    expect(chromeState.current.sidebarCollapsed).toBeTruthy();
    expect(chromeState.current.topBarsCollapsed).toBeTruthy();
    expect(chromeState.current.statusBarCollapsed).toBeTruthy();
    expect(chromeState.current.showSearch).toBeTruthy();
    expect(editorState.current.lineNumbersVisible).toBeFalsy();
    expect(editorState.current.textWrappingEnabled).toBeFalsy();
    expect(editorState.current.syntaxHighlightingEnabled).toBeFalsy();
    expect(editorState.current.editorFontSize).toBe(20);
    expect(editorState.current.editorFontFamily).toBe("Monaspace Neon");
    expect(editorState.current.theme).toBe("dark");
    expect(viewModeState.current.isSplitView).toBeTruthy();
    expect(viewModeState.current.isFocusMode).toBeTruthy();
    expect(viewModeState.current.isPreviewVisible).toBeFalsy();
  });

  it("enabling split view forces preview visible", () => {
    const { result: viewModeState } = renderHook(() => useViewModeState());
    const { result: viewModeActions } = renderHook(() => useViewModeActions());

    act(() => {
      viewModeActions.current.setPreviewVisible(false);
      viewModeActions.current.toggleSplitView();
    });

    expect(viewModeState.current.isSplitView).toBeTruthy();
    expect(viewModeState.current.isPreviewVisible).toBeTruthy();
  });

  it("focused workspace hooks expose and update workspace state", () => {
    const { result: locationsState } = renderHook(() => useWorkspaceLocationsState());
    const { result: locationsActions } = renderHook(() => useWorkspaceLocationsActions());
    const { result: documentsState } = renderHook(() => useWorkspaceDocumentsState());
    const { result: documentsActions } = renderHook(() => useWorkspaceDocumentsActions());

    act(() => {
      locationsActions.current.setLoadingLocations(false);
      locationsActions.current.setSidebarFilter("draft");
      documentsActions.current.setDocuments([{
        location_id: 1,
        rel_path: "a.md",
        title: "A",
        updated_at: "2024-01-01T00:00:00Z",
        word_count: 10,
      }]);
      documentsActions.current.setLoadingDocuments(true);
      locationsActions.current.addLocation({ id: 9, name: "N", root_path: "/n", added_at: "2024-01-01" });
      locationsActions.current.removeLocation(9);
    });

    expect(locationsState.current.isLoadingLocations).toBeFalsy();
    expect(locationsState.current.sidebarFilter).toBe("draft");
    expect(documentsState.current.documents).toStrictEqual([{
      location_id: 1,
      rel_path: "a.md",
      title: "A",
      updated_at: "2024-01-01T00:00:00Z",
      word_count: 10,
    }]);
    expect(documentsState.current.isLoadingDocuments).toBeTruthy();
    expect(locationsState.current.locations).toStrictEqual([]);
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

  it("should update typewriter scrolling setting", () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setTypewriterScrollingEnabled(false);
    });

    expect(result.current.focusModeSettings.typewriterScrollingEnabled).toBe(false);
  });

  it("should update focus dimming mode", () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setFocusDimmingMode("paragraph");
    });

    expect(result.current.focusModeSettings.dimmingMode).toBe("paragraph");
  });

  it("should toggle typewriter scrolling", () => {
    const { result } = renderHook(() => useAppStore());
    const initialValue = result.current.focusModeSettings.typewriterScrollingEnabled;

    act(() => {
      result.current.toggleTypewriterScrolling();
    });

    expect(result.current.focusModeSettings.typewriterScrollingEnabled).toBe(!initialValue);
  });
});

describe("Calm UI state", () => {
  beforeEach(() => {
    resetAppStore();
  });

  it("should have default Calm UI settings", () => {
    const { result } = renderHook(() => useAppStore());

    expect(result.current.calmUiSettings).toEqual({ enabled: true, autoHide: true, focusMode: true });
    expect(result.current.chromeTemporarilyVisible).toBe(false);
  });

  it("should toggle Calm UI", () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.toggleCalmUi();
    });

    expect(result.current.calmUiSettings.enabled).toBe(false);

    act(() => {
      result.current.toggleCalmUi();
    });

    expect(result.current.calmUiSettings.enabled).toBe(true);
  });

  it("should apply collapsed chrome preset when toggling Calm UI", () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.toggleCalmUi();
    });

    expect(result.current.calmUiSettings.enabled).toBe(false);
    expect(result.current.sidebarCollapsed).toBe(false);
    expect(result.current.topBarsCollapsed).toBe(false);
    expect(result.current.statusBarCollapsed).toBe(false);

    act(() => {
      result.current.toggleCalmUi();
    });

    expect(result.current.calmUiSettings.enabled).toBe(true);
    expect(result.current.sidebarCollapsed).toBe(true);
    expect(result.current.topBarsCollapsed).toBe(true);
    expect(result.current.statusBarCollapsed).toBe(true);

    act(() => {
      result.current.toggleCalmUi();
    });

    expect(result.current.calmUiSettings.enabled).toBe(false);
    expect(result.current.sidebarCollapsed).toBe(false);
    expect(result.current.topBarsCollapsed).toBe(false);
    expect(result.current.statusBarCollapsed).toBe(false);
  });

  it("should set Calm UI auto-hide", () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setCalmUiAutoHide(false);
    });

    expect(result.current.calmUiSettings.autoHide).toBe(false);
  });

  it("should set Calm UI focus mode", () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setCalmUiFocusMode(false);
    });

    expect(result.current.calmUiSettings.focusMode).toBe(false);
  });

  it("should set all Calm UI settings at once", () => {
    const { result } = renderHook(() => useAppStore());
    const newSettings = { enabled: false, autoHide: false, focusMode: false };

    act(() => {
      result.current.setCalmUiSettings(newSettings);
    });

    expect(result.current.calmUiSettings).toEqual(newSettings);
  });

  it("should set chrome temporarily visible", () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setChromeTemporarilyVisible(true);
    });

    expect(result.current.chromeTemporarilyVisible).toBe(true);

    act(() => {
      result.current.setChromeTemporarilyVisible(false);
    });

    expect(result.current.chromeTemporarilyVisible).toBe(false);
  });

  it("should reveal chrome temporarily", () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.revealChromeTemporarily();
    });

    expect(result.current.chromeTemporarilyVisible).toBe(true);
  });
});
