import { useSkipAnimation } from "$hooks/useMotion";
import { useLayoutStore } from "$state/stores/layout";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", () => ({ useReducedMotion: vi.fn(() => false) }));

describe("useSkipAnimation", () => {
  beforeEach(() => {
    useLayoutStore.setState({ reduceMotion: false });
  });

  it("returns false when both OS and app settings have motion enabled", () => {
    const { result } = renderHook(() => useSkipAnimation());

    expect(result.current).toBe(false);
  });

  it("returns true when app-level reduceMotion is enabled", () => {
    const { result } = renderHook(() => useSkipAnimation());

    act(() => {
      useLayoutStore.getState().setReduceMotion(true);
    });

    expect(result.current).toBe(true);
  });

  it("returns true when OS-level reduced motion is enabled", async () => {
    const motion = await import("motion/react");
    vi.mocked(motion.useReducedMotion).mockReturnValue(true);

    const { result } = renderHook(() => useSkipAnimation());

    expect(result.current).toBe(true);
  });

  it("returns true when both OS and app reduced motion are enabled", async () => {
    const motion = await import("motion/react");
    vi.mocked(motion.useReducedMotion).mockReturnValue(true);

    const { result } = renderHook(() => useSkipAnimation());

    act(() => {
      useLayoutStore.getState().setReduceMotion(true);
    });

    expect(result.current).toBe(true);
  });
});
