import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBackendEvents } from "../hooks/useBackendEvents";
import { emitBackendEvent } from "./setup";

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
