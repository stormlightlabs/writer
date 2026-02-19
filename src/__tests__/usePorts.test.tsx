/**
 * Tests for usePorts.ts - React hooks for Elm-style architecture
 */

import type { AppError, LocationDescriptor } from "$types";
import { invoke } from "@tauri-apps/api/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emitBackendEvent } from "../test/setup";
import { useBackendEvents, useLocations, usePorts } from "../usePorts";

describe(usePorts, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have initial state with null data, null error, and not loading", () => {
      const { result } = renderHook(() => usePorts<string>());

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBeFalsy();
    });
  });

  describe("execute", () => {
    it("should set loading state during command execution", async () => {
      vi.mocked(invoke).mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(resolve, 10);
        })
      );

      const { result } = renderHook(() => usePorts<unknown>());

      act(() => {
        result.current.execute({ type: "Invoke", command: "test", payload: {}, onOk: vi.fn(), onErr: vi.fn() });
      });

      expect(result.current.loading).toBeTruthy();

      await waitFor(() => expect(result.current.loading).toBeFalsy());
    });

    it("should clear loading state after command completes", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: null });

      const { result } = renderHook(() => usePorts<unknown>());

      expect(result.current.loading).toBeFalsy();

      await act(async () => {
        await result.current.execute({ type: "Invoke", command: "test", payload: {}, onOk: vi.fn(), onErr: vi.fn() });
      });

      expect(result.current.loading).toBeFalsy();
    });

    it("should handle None command without side effects", async () => {
      const { result } = renderHook(() => usePorts<unknown>());

      await act(async () => {
        await result.current.execute({ type: "None" });
      });

      expect(result.current.loading).toBeFalsy();
      expect(invoke).not.toHaveBeenCalled();
    });

    it("should handle command success via callbacks", async () => {
      const onOk = vi.fn();
      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: "success" });

      const { result } = renderHook(() => usePorts<string>());

      await act(async () => {
        await result.current.execute({ type: "Invoke", command: "test", payload: {}, onOk, onErr: vi.fn() });
      });

      expect(onOk).toHaveBeenCalledWith("success");
      expect(result.current.loading).toBeFalsy();
    });
  });

  describe("reset", () => {
    it("should reset state to initial values", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: "data" });

      const { result } = renderHook(() => usePorts<string>());

      await act(async () => {
        await result.current.execute({ type: "Invoke", command: "test", payload: {}, onOk: () => {}, onErr: vi.fn() });
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBeFalsy();
    });
  });
});

describe(useBackendEvents, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should subscribe to backend events on mount", () => {
    const onLocationMissing = vi.fn();

    renderHook(() => useBackendEvents({ onLocationMissing }));

    emitBackendEvent({ type: "LocationMissing", location_id: 1, path: "/test" });
    expect(onLocationMissing).toHaveBeenCalledWith(1, "/test");
  });

  it("should handle LocationMissing events", () => {
    const onLocationMissing = vi.fn();

    renderHook(() => useBackendEvents({ onLocationMissing }));

    emitBackendEvent({ type: "LocationMissing", location_id: 42, path: "/missing/path" });

    expect(onLocationMissing).toHaveBeenCalledOnce();
    expect(onLocationMissing).toHaveBeenCalledWith(42, "/missing/path");
  });

  it("should handle LocationChanged events", () => {
    const onLocationChanged = vi.fn();

    renderHook(() => useBackendEvents({ onLocationChanged }));

    emitBackendEvent({ type: "LocationChanged", location_id: 1, old_path: "/old", new_path: "/new" });

    expect(onLocationChanged).toHaveBeenCalledWith(1, "/old", "/new");
  });

  it("should handle ReconciliationComplete events", () => {
    const onReconciliationComplete = vi.fn();

    renderHook(() => useBackendEvents({ onReconciliationComplete }));

    emitBackendEvent({ type: "ReconciliationComplete", checked: 10, missing: [1, 2, 3] });

    expect(onReconciliationComplete).toHaveBeenCalledWith(10, [1, 2, 3]);
  });

  it("should handle multiple event types", () => {
    const onLocationMissing = vi.fn();
    const onLocationChanged = vi.fn();
    const onReconciliationComplete = vi.fn();

    renderHook(() => useBackendEvents({ onLocationMissing, onLocationChanged, onReconciliationComplete }));

    emitBackendEvent({ type: "LocationMissing", location_id: 1, path: "/test1" });
    emitBackendEvent({ type: "LocationChanged", location_id: 2, old_path: "/old", new_path: "/new" });
    emitBackendEvent({ type: "ReconciliationComplete", checked: 5, missing: [] });

    expect(onLocationMissing).toHaveBeenCalledOnce();
    expect(onLocationChanged).toHaveBeenCalledOnce();
    expect(onReconciliationComplete).toHaveBeenCalledOnce();
  });

  it("should clean up subscription on unmount", async () => {
    const onLocationMissing = vi.fn();

    const { unmount } = renderHook(() => useBackendEvents({ onLocationMissing }));

    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });

    unmount();

    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });

    emitBackendEvent({ type: "LocationMissing", location_id: 1, path: "/test" });
    expect(onLocationMissing).not.toHaveBeenCalled();
  });

  it("should use latest callback references", () => {
    const onLocationMissing1 = vi.fn();
    const onLocationMissing2 = vi.fn();

    const { rerender } = renderHook(({ handler }) => useBackendEvents({ onLocationMissing: handler }), {
      initialProps: { handler: onLocationMissing1 },
    });

    rerender({ handler: onLocationMissing2 });

    emitBackendEvent({ type: "LocationMissing", location_id: 1, path: "/test" });

    expect(onLocationMissing1).not.toHaveBeenCalled();
    expect(onLocationMissing2).toHaveBeenCalledWith(1, "/test");
  });
});

describe(useLocations, () => {
  const mockLocations: LocationDescriptor[] = [{
    id: 1,
    name: "Location A",
    root_path: "/path/a",
    added_at: "2024-01-01T00:00:00Z",
  }, { id: 2, name: "Location B", root_path: "/path/b", added_at: "2024-01-02T00:00:00Z" }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial load", () => {
    it("should fetch locations on mount", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: mockLocations });

      const { result } = renderHook(() => useLocations());

      expect(result.current.loading).toBeTruthy();

      await waitFor(() => {
        expect(result.current.locations).toStrictEqual(mockLocations);
      });

      expect(result.current.loading).toBeFalsy();
    });

    it("should handle error during initial load", async () => {
      const error: AppError = { code: "IO_ERROR", message: "Failed to load" };
      vi.mocked(invoke).mockResolvedValueOnce({ type: "err", error });

      const { result } = renderHook(() => useLocations());

      await waitFor(() => {
        expect(result.current.error).toStrictEqual(error);
      });

      expect(result.current.locations).toStrictEqual([]);
      expect(result.current.loading).toBeFalsy();
    });
  });

  describe("refresh", () => {
    it("should refetch locations", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: mockLocations }).mockResolvedValueOnce({
        type: "ok",
        value: [...mockLocations, {
          id: 3,
          name: "Location C",
          root_path: "/path/c",
          added_at: "2024-01-03T00:00:00Z",
        }],
      });

      const { result } = renderHook(() => useLocations());

      await waitFor(() => expect(result.current.locations).toHaveLength(2));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.locations).toHaveLength(3);
    });

    it("should clear error on successful refresh", async () => {
      const error: AppError = { code: "IO_ERROR", message: "Failed" };
      vi.mocked(invoke).mockResolvedValueOnce({ type: "err", error }).mockResolvedValueOnce({
        type: "ok",
        value: mockLocations,
      });

      const { result } = renderHook(() => useLocations());

      await waitFor(() => expect(result.current.error).not.toBeNull());

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("addLocation", () => {
    it("should call location_add_via_dialog and refresh on success", async () => {
      const newLocation: LocationDescriptor = {
        id: 3,
        name: "New Location",
        root_path: "/new/path",
        added_at: "2024-01-03T00:00:00Z",
      };

      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: mockLocations }).mockResolvedValueOnce({
        type: "ok",
        value: newLocation,
      }).mockResolvedValueOnce({ type: "ok", value: [...mockLocations, newLocation] });

      const { result } = renderHook(() => useLocations());

      await waitFor(() => expect(result.current.locations).toHaveLength(2));

      await act(async () => {
        await result.current.addLocation();
      });

      await waitFor(() => expect(result.current.locations).toHaveLength(3));
      expect(invoke).toHaveBeenCalledWith("location_add_via_dialog", {});
    });

    it("should set error on failure", async () => {
      const error: AppError = { code: "PERMISSION_DENIED", message: "Access denied" };

      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: mockLocations }).mockResolvedValueOnce({
        type: "err",
        error,
      });

      const { result } = renderHook(() => useLocations());

      await waitFor(() => expect(result.current.loading).toBeFalsy());

      await act(async () => {
        await result.current.addLocation();
      });

      expect(result.current.error).toStrictEqual(error);
      expect(result.current.loading).toBeFalsy();
    });
  });

  describe("removeLocation", () => {
    it("should call location_remove and refresh on success", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: mockLocations }).mockResolvedValueOnce({
        type: "ok",
        value: true,
      }).mockResolvedValueOnce({ type: "ok", value: [mockLocations[1]] });

      const { result } = renderHook(() => useLocations());

      await waitFor(() => expect(result.current.locations).toHaveLength(2));

      await act(async () => {
        await result.current.removeLocation(1);
      });

      await waitFor(() => expect(result.current.locations).toHaveLength(1));
      expect(invoke).toHaveBeenCalledWith("location_remove", { locationId: 1 });
    });

    it("should not refresh if location was not found", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: mockLocations }).mockResolvedValueOnce({
        type: "ok",
        value: false,
      });

      const { result } = renderHook(() => useLocations());

      await waitFor(() => expect(result.current.locations).toHaveLength(2));

      await act(async () => {
        await result.current.removeLocation(999);
      });

      expect(invoke).toHaveBeenCalledTimes(2);
      expect(result.current.loading).toBeFalsy();
    });
  });

  describe("validateLocations", () => {
    it("should return missing locations", async () => {
      const missing: Array<[number, string]> = [[1, "/missing/path"]];

      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: mockLocations }).mockResolvedValueOnce({
        type: "ok",
        value: missing,
      });

      const { result } = renderHook(() => useLocations());

      await waitFor(() => expect(result.current.loading).toBeFalsy());

      let validationResult: Array<[number, string]> = [];
      await act(async () => {
        validationResult = await result.current.validateLocations();
      });

      expect(validationResult).toStrictEqual(missing);
    });

    it("should reject on error", async () => {
      const error: AppError = { code: "IO_ERROR", message: "Validation failed" };

      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: mockLocations }).mockResolvedValueOnce({
        type: "err",
        error,
      });

      const { result } = renderHook(() => useLocations());

      await waitFor(() => expect(result.current.loading).toBeFalsy());

      await expect(result.current.validateLocations()).rejects.toStrictEqual(error);
    });
  });

  describe("loading states", () => {
    it("should be loading during addLocation", async () => {
      let resolveAdd: (value: unknown) => void;
      const addPromise = new Promise((resolve) => {
        resolveAdd = resolve;
      });

      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: mockLocations }).mockImplementationOnce(() =>
        addPromise
      );

      const { result } = renderHook(() => useLocations());

      await waitFor(() => expect(result.current.loading).toBeFalsy());

      act(() => {
        result.current.addLocation();
      });

      expect(result.current.loading).toBeTruthy();

      resolveAdd!({ type: "ok", value: mockLocations[0] });

      await waitFor(() => expect(result.current.loading).toBeFalsy());
    });

    it("should be loading during removeLocation", async () => {
      let resolveRemove: (value: unknown) => void;
      const removePromise = new Promise((resolve) => {
        resolveRemove = resolve;
      });

      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: mockLocations }).mockImplementationOnce(() =>
        removePromise
      );

      const { result } = renderHook(() => useLocations());

      await waitFor(() => expect(result.current.loading).toBeFalsy());

      act(() => {
        result.current.removeLocation(1);
      });

      expect(result.current.loading).toBeTruthy();

      resolveRemove!({ type: "ok", value: true });

      await waitFor(() => expect(result.current.loading).toBeFalsy());
    });
  });
});
