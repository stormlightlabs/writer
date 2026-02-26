import type { AppError } from "$types";
import { invoke } from "@tauri-apps/api/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBackendEvents } from "../hooks/useBackendEvents";
import { emitBackendEvent } from "../test/setup";
import { usePorts } from "../usePorts";

describe(usePorts, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has initial state", () => {
    const { result } = renderHook(() => usePorts<string>());

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBeFalsy();
  });

  it("executes invoke commands", async () => {
    const onOk = vi.fn();
    vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: "success" });

    const { result } = renderHook(() => usePorts<string>());

    await act(async () => {
      await result.current.execute({ type: "Invoke", command: "test", payload: {}, onOk, onErr: vi.fn() });
    });

    expect(onOk).toHaveBeenCalledWith("success");
    expect(result.current.loading).toBeFalsy();
  });

  it("ignores None command", async () => {
    const { result } = renderHook(() => usePorts<unknown>());

    await act(async () => {
      await result.current.execute({ type: "None" });
    });

    expect(result.current.loading).toBeFalsy();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("captures execution errors", async () => {
    const onErr = vi.fn();
    vi.mocked(invoke).mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => usePorts<unknown>());

    await act(async () => {
      await result.current.execute({ type: "Invoke", command: "test", payload: {}, onOk: vi.fn(), onErr });
    });

    expect(onErr).toHaveBeenCalledWith(
      expect.objectContaining({ code: "IO_ERROR", message: "boom" } satisfies Partial<AppError>),
    );
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBeFalsy();
  });
});

describe(useBackendEvents, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes LocationMissing callback", () => {
    const onLocationMissing = vi.fn();

    renderHook(() => useBackendEvents({ onLocationMissing }));

    act(() => {
      emitBackendEvent({ type: "LocationMissing", location_id: 42, path: "/missing/path" });
    });

    expect(onLocationMissing).toHaveBeenCalledWith(42, "/missing/path");
  });

  it("invokes latest callback after rerender", () => {
    const onLocationMissing1 = vi.fn();
    const onLocationMissing2 = vi.fn();

    const { rerender } = renderHook(({ handler }) => useBackendEvents({ onLocationMissing: handler }), {
      initialProps: { handler: onLocationMissing1 },
    });

    rerender({ handler: onLocationMissing2 });
    act(() => {
      emitBackendEvent({ type: "LocationMissing", location_id: 1, path: "/test" });
    });

    expect(onLocationMissing1).not.toHaveBeenCalled();
    expect(onLocationMissing2).toHaveBeenCalledWith(1, "/test");
  });

  it("cleans up listener on unmount", async () => {
    const onLocationMissing = vi.fn();
    const { unmount } = renderHook(() => useBackendEvents({ onLocationMissing }));

    await waitFor(() => {
      expect(true).toBeTruthy();
    });

    unmount();
    emitBackendEvent({ type: "LocationMissing", location_id: 1, path: "/test" });
    expect(onLocationMissing).not.toHaveBeenCalled();
  });
});
