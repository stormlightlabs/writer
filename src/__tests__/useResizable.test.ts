import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useResizable } from "../hooks/useResizable";

describe("useResizable", () => {
  it("initializes and resizes within bounds", () => {
    const { result } = renderHook(() => useResizable({ initialSize: 280, minSize: 220, maxSize: 420 }));

    expect(result.current.size).toBe(280);
    expect(result.current.isResizing).toBeFalsy();

    act(() => {
      result.current.startResizing(280);
    });

    expect(result.current.isResizing).toBeTruthy();

    act(() => {
      globalThis.dispatchEvent(new MouseEvent("pointermove", { clientX: 340 }));
    });

    expect(result.current.size).toBe(340);
  });

  it("clamps size to min and max values", () => {
    const { result } = renderHook(() => useResizable({ initialSize: 280, minSize: 220, maxSize: 420 }));

    act(() => {
      result.current.startResizing(280);
    });

    act(() => {
      globalThis.dispatchEvent(new MouseEvent("pointermove", { clientX: 600 }));
    });

    expect(result.current.size).toBe(420);

    act(() => {
      globalThis.dispatchEvent(new MouseEvent("pointermove", { clientX: 20 }));
    });

    expect(result.current.size).toBe(220);
  });

  it("stops resizing on pointerup", () => {
    const { result } = renderHook(() => useResizable({ initialSize: 300, minSize: 220, maxSize: 420 }));

    act(() => {
      result.current.startResizing(300);
    });

    act(() => {
      globalThis.dispatchEvent(new MouseEvent("pointermove", { clientX: 330 }));
    });

    act(() => {
      globalThis.dispatchEvent(new Event("pointerup"));
    });

    expect(result.current.size).toBe(330);
    expect(result.current.isResizing).toBeFalsy();

    act(() => {
      globalThis.dispatchEvent(new MouseEvent("pointermove", { clientX: 380 }));
    });

    expect(result.current.size).toBe(330);
  });
});
