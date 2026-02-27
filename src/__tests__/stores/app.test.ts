import {
  useEditorPresentationActions,
  useEditorPresentationStateRaw,
  useLayoutChromeActions,
  useLayoutChromeState,
  useReduceMotionState,
  useTabsActions,
  useTabsState,
  useViewModeActions,
  useViewModeState,
  useWorkspaceDocumentsActions,
  useWorkspaceDocumentsState,
  useWorkspaceLocationsActions,
  useWorkspaceLocationsState,
} from "$state/selectors";
import { resetAppStore, useAppStore } from "$state/stores/app";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

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

  it("focused layout hooks expose and update layout state", () => {
    const { result: chromeState } = renderHook(() => useLayoutChromeState());
    const { result: chromeActions } = renderHook(() => useLayoutChromeActions());
    const { result: editorState } = renderHook(() => useEditorPresentationStateRaw());
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
    expect(viewModeState.current.isPreviewVisible).toBeFalsy();

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

  it("editor-only mode clears split and preview visibility", () => {
    const { result: viewModeState } = renderHook(() => useViewModeState());
    const { result: viewModeActions } = renderHook(() => useViewModeActions());

    act(() => {
      viewModeActions.current.setSplitView(true);
      viewModeActions.current.setEditorOnlyMode();
    });

    expect(viewModeState.current.isSplitView).toBeFalsy();
    expect(viewModeState.current.isPreviewVisible).toBeFalsy();
  });

  it("focused workspace hooks expose and update workspace state", () => {
    const { result: locationsState } = renderHook(() => useWorkspaceLocationsState());
    const { result: locationsActions } = renderHook(() => useWorkspaceLocationsActions());
    const { result: documentsState } = renderHook(() => useWorkspaceDocumentsState());
    const { result: documentsActions } = renderHook(() => useWorkspaceDocumentsActions());

    act(() => {
      locationsActions.current.setLoadingLocations(false);
      locationsActions.current.setSidebarFilter("draft");
      locationsActions.current.setLocations([{ id: 9, name: "N", root_path: "/n", added_at: "2024-01-01" }]);
      documentsActions.current.setDocuments([{
        location_id: 1,
        rel_path: "a.md",
        title: "A",
        updated_at: "2024-01-01T00:00:00Z",
        word_count: 10,
      }]);
      documentsActions.current.setLoadingDocuments(true);
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
    expect(locationsState.current.locations).toStrictEqual([{
      id: 9,
      name: "N",
      root_path: "/n",
      added_at: "2024-01-01",
    }]);
  });

  it("tabs selector hooks apply backend session state", () => {
    const { result: tabsState } = renderHook(() => useTabsState());
    const { result: tabsActions } = renderHook(() => useTabsActions());

    act(() => {
      tabsActions.current.applySessionState({
        activeTabId: "tab-2",
        tabs: [{ id: "tab-1", docRef: { location_id: 1, rel_path: "first.md" }, title: "First", isModified: false }, {
          id: "tab-2",
          docRef: { location_id: 1, rel_path: "second.md" },
          title: "Second",
          isModified: true,
        }],
      });
    });

    expect(tabsState.current.tabs).toHaveLength(2);
    expect(tabsState.current.activeTabId).toBe("tab-2");
    expect(tabsState.current.isSessionHydrated).toBe(true);
    expect(useAppStore.getState().selectedDocPath).toBe("second.md");
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

  it("should have autoEnterFocusMode in default focus mode settings", () => {
    const { result } = renderHook(() => useAppStore());

    expect(result.current.focusModeSettings.autoEnterFocusMode).toBe(true);
  });

  it("should set autoEnterFocusMode", () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setAutoEnterFocusMode(false);
    });

    expect(result.current.focusModeSettings.autoEnterFocusMode).toBe(false);

    act(() => {
      result.current.setAutoEnterFocusMode(true);
    });

    expect(result.current.focusModeSettings.autoEnterFocusMode).toBe(true);
  });
});

describe("reduceMotion state", () => {
  beforeEach(() => {
    resetAppStore();
  });

  it("should have reduceMotion default to false", () => {
    const { result } = renderHook(() => useReduceMotionState());

    expect(result.current.reduceMotion).toBe(false);
  });

  it("should toggle reduceMotion via setReduceMotion", () => {
    const { result } = renderHook(() => useReduceMotionState());

    act(() => {
      result.current.setReduceMotion(true);
    });

    expect(result.current.reduceMotion).toBe(true);

    act(() => {
      result.current.setReduceMotion(false);
    });

    expect(result.current.reduceMotion).toBe(false);
  });

  it("should include reduceMotion in layout chrome state", () => {
    const { result: chromeState } = renderHook(() => useLayoutChromeState());

    expect(chromeState.current.reduceMotion).toBe(false);

    act(() => {
      useAppStore.getState().setReduceMotion(true);
    });

    expect(chromeState.current.reduceMotion).toBe(true);
  });
});
