import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import {
  docDelete,
  docList,
  docMove,
  docRename,
  runCmd,
  sessionDropDoc,
  sessionGet,
  sessionPruneLocations,
  sessionUpdateTabDoc,
} from "$ports";
import { resetAppStore, useAppStore } from "$state/stores/app";
import { useTabsStore } from "$state/stores/tabs";
import { useWorkspaceStore } from "$state/stores/workspace";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "$ports",
  () => ({
    runCmd: vi.fn(async () => {}),
    docList: vi.fn((_locationId: number, _onOk: (docs: unknown[]) => void, _onErr: (error: unknown) => void) => ({
      type: "None",
    })),
    docDelete: vi.fn(() => ({ type: "None" })),
    docMove: vi.fn(() => ({ type: "None" })),
    docRename: vi.fn(() => ({ type: "None" })),
    docSave: vi.fn(() => ({ type: "None" })),
    locationAddViaDialog: vi.fn(() => ({ type: "None" })),
    locationList: vi.fn(() => ({ type: "None" })),
    locationRemove: vi.fn(() => ({ type: "None" })),
    sessionGet: vi.fn((_onOk: (session: { tabs: unknown[]; activeTabId: string | null }) => void) => ({
      type: "None",
    })),
    sessionPruneLocations: vi.fn(() => ({ type: "None" })),
    sessionOpenTab: vi.fn(() => ({ type: "None" })),
    sessionSelectTab: vi.fn(() => ({ type: "None" })),
    sessionCloseTab: vi.fn(() => ({ type: "None" })),
    sessionReorderTabs: vi.fn(() => ({ type: "None" })),
    sessionMarkTabModified: vi.fn(() => ({ type: "None" })),
    sessionUpdateTabDoc: vi.fn(() => ({ type: "None" })),
    sessionDropDoc: vi.fn(() => ({ type: "None" })),
  }),
);

describe("useWorkspaceController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAppStore();
    useAppStore.getState().setLocations([{
      id: 1,
      name: "Workspace",
      root_path: "/workspace",
      added_at: "2024-01-01",
    }]);
  });

  it("ignores non-numeric locationId values in handleCreateNewDocument", () => {
    const { result } = renderHook(() => useWorkspaceController());

    let createdRef;
    act(() => {
      createdRef = result.current.handleCreateNewDocument({ type: "click" } as unknown as number);
    });

    expect(createdRef).toMatchObject({ location_id: 1 });
    expect(sessionGet).toHaveBeenCalledOnce();
    expect(sessionPruneLocations).not.toHaveBeenCalled();
  });

  it("ignores non-numeric locationId values in handleRefreshSidebar", () => {
    const { result } = renderHook(() => useWorkspaceController());

    act(() => {
      result.current.handleRefreshSidebar({ type: "click" } as unknown as number);
    });

    expect(docList).toHaveBeenCalledWith(1, expect.any(Function), expect.any(Function));
    expect(runCmd).toHaveBeenCalled();
  });

  it("does not prune hydrated session tabs until locations finish loading", () => {
    useTabsStore.setState({
      tabs: [{
        id: "tab-1",
        docRef: { location_id: 1, rel_path: "notes/today.md" },
        title: "Today",
        isModified: false,
      }],
      activeTabId: "tab-1",
      isSessionHydrated: true,
    });
    useWorkspaceStore.setState({
      locations: [useAppStore.getState().locations[0]],
      selectedLocationId: 1,
      isLoadingLocations: true,
    });

    renderHook(() => useWorkspaceController());

    expect(sessionPruneLocations).not.toHaveBeenCalled();
  });

  it("prunes hydrated session tabs after locations finish loading", () => {
    useTabsStore.setState({
      tabs: [{
        id: "tab-1",
        docRef: { location_id: 1, rel_path: "notes/today.md" },
        title: "Today",
        isModified: false,
      }],
      activeTabId: "tab-1",
      isSessionHydrated: true,
    });
    useWorkspaceStore.setState({
      locations: [useAppStore.getState().locations[0]],
      selectedLocationId: 1,
      isLoadingLocations: false,
    });

    renderHook(() => useWorkspaceController());

    expect(sessionPruneLocations).toHaveBeenCalledWith([1], expect.any(Function), expect.any(Function));
  });

  it("does not patch documents in JS after rename", async () => {
    const originalDoc = {
      location_id: 1,
      rel_path: "draft.md",
      title: "Draft",
      updated_at: "2024-01-01T00:00:00Z",
      word_count: 10,
    };
    useAppStore.getState().setDocuments([originalDoc]);
    vi.mocked(docRename).mockImplementation((_locationId, _relPath, _newName, onOk) => {
      onOk({ ...originalDoc, rel_path: "renamed.md", title: "Renamed" });
      return { type: "None" };
    });

    const { result } = renderHook(() => useWorkspaceController());

    const renamed = await act(async () => {
      return await result.current.handleRenameDocument(1, "draft.md", "renamed.md");
    });

    expect(renamed).toBeTruthy();
    expect(useAppStore.getState().documents).toStrictEqual([originalDoc]);
    expect(sessionUpdateTabDoc).toHaveBeenCalledWith(
      1,
      "draft.md",
      { location_id: 1, rel_path: "renamed.md" },
      "Renamed",
      expect.any(Function),
      expect.any(Function),
    );
  });

  it("does not patch documents in JS after delete", async () => {
    const originalDoc = {
      location_id: 1,
      rel_path: "delete-me.md",
      title: "Delete me",
      updated_at: "2024-01-01T00:00:00Z",
      word_count: 8,
    };
    useAppStore.getState().setDocuments([originalDoc]);
    vi.mocked(docDelete).mockImplementation((_locationId, _relPath, onOk) => {
      onOk(true);
      return { type: "None" };
    });

    const { result } = renderHook(() => useWorkspaceController());

    const deleted = await act(async () => {
      return await result.current.handleDeleteDocument(1, "delete-me.md");
    });

    expect(deleted).toBeTruthy();
    expect(useAppStore.getState().documents).toStrictEqual([originalDoc]);
    expect(sessionDropDoc).toHaveBeenCalledWith(1, "delete-me.md", expect.any(Function), expect.any(Function));
  });

  it("updates session tab location when moving a document across locations", async () => {
    vi.mocked(docMove).mockImplementation((_locationId, _relPath, _newRelPath, onOk) => {
      onOk({
        location_id: 2,
        rel_path: "archive/moved.md",
        title: "Moved",
        updated_at: "2024-01-01T00:00:00Z",
        word_count: 3,
      });
      return { type: "None" };
    });

    const { result } = renderHook(() => useWorkspaceController());

    const moved = await act(async () => {
      return await result.current.handleMoveDocument(1, "draft.md", "archive/moved.md", 2);
    });

    expect(moved).toBeTruthy();
    expect(docMove).toHaveBeenCalledWith(
      1,
      "draft.md",
      "archive/moved.md",
      expect.any(Function),
      expect.any(Function),
      2,
    );
    expect(sessionUpdateTabDoc).toHaveBeenCalledWith(
      1,
      "draft.md",
      { location_id: 2, rel_path: "archive/moved.md" },
      "Moved",
      expect.any(Function),
      expect.any(Function),
    );
  });
});
