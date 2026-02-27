import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import { docList, runCmd } from "$ports";
import { resetAppStore, useAppStore } from "$state/stores/app";
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
    locationAddViaDialog: vi.fn(() => ({ type: "None" })),
    locationRemove: vi.fn(() => ({ type: "None" })),
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
  });

  it("ignores non-numeric locationId values in handleRefreshSidebar", () => {
    const { result } = renderHook(() => useWorkspaceController());

    act(() => {
      result.current.handleRefreshSidebar({ type: "click" } as unknown as number);
    });

    expect(docList).toHaveBeenCalledWith(1, expect.any(Function), expect.any(Function));
    expect(runCmd).toHaveBeenCalled();
  });
});
