import { useWorkspaceSync } from "$hooks/useWorkspaceSync";
import { docList, locationList, runCmd, startWatch, stopWatch } from "$ports";
import { resetAppStore, useAppStore } from "$state/stores/app";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearMockListeners, emitBackendEvent } from "./setup";

const LOCATIONS = [{ id: 1, name: "One", root_path: "/one", added_at: "2024-01-01" }, {
  id: 2,
  name: "Two",
  root_path: "/two",
  added_at: "2024-01-01",
}];

vi.mock(
  "$ports",
  () => ({
    runCmd: vi.fn(async () => {}),
    locationList: vi.fn((onOk: (locations: typeof LOCATIONS) => void) => {
      onOk(LOCATIONS);
      return { type: "None" };
    }),
    docList: vi.fn((locationId: number, onOk: (docs: unknown[]) => void) => {
      onOk([{
        location_id: locationId,
        rel_path: `${locationId}.md`,
        title: `${locationId}`,
        updated_at: "2024-01-01T00:00:00Z",
        word_count: 1,
      }]);
      return { type: "None" };
    }),
    startWatch: vi.fn((locationId: number) => ({ type: "StartWatch", locationId })),
    stopWatch: vi.fn((locationId: number) => ({ type: "StopWatch", locationId })),
  }),
);

describe("useWorkspaceSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMockListeners();
    resetAppStore();
  });

  it("starts filesystem watchers for all loaded locations", async () => {
    renderHook(() => useWorkspaceSync());

    await waitFor(() => {
      expect(locationList).toHaveBeenCalled();
      expect(startWatch).toHaveBeenCalledTimes(2);
    });

    expect(startWatch).toHaveBeenNthCalledWith(1, 1);
    expect(startWatch).toHaveBeenNthCalledWith(2, 2);
    expect(runCmd).toHaveBeenCalled();
  });

  it("reloads selected location documents when backend emits filesystem changes", async () => {
    renderHook(() => useWorkspaceSync());

    await waitFor(() => {
      expect(docList).toHaveBeenCalledWith(1, expect.any(Function), expect.any(Function));
    });

    act(() => {
      emitBackendEvent({
        type: "FilesystemChanged",
        location_id: 1,
        entry_kind: "File",
        change_kind: "Modified",
        rel_path: "1.md",
      });
    });

    await waitFor(() => {
      expect(vi.mocked(docList).mock.calls.filter(([locationId]) => locationId === 1).length).toBeGreaterThan(1);
    });
  });

  it("stops watchers for removed locations", async () => {
    renderHook(() => useWorkspaceSync());

    await waitFor(() => {
      expect(startWatch).toHaveBeenCalledTimes(2);
    });

    act(() => {
      useAppStore.getState().setLocations([LOCATIONS[0]]);
    });

    await waitFor(() => {
      expect(stopWatch).toHaveBeenCalledWith(2);
    });
  });
});
