import { useLayoutHotkeys } from "$hooks/useLayoutHotkeys";
import { resetAppStore, useAppStore } from "$state/stores/app";
import { resetShortcutsStore, useShortcutsStore } from "$state/stores/shortcuts";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

describe("useLayoutHotkeys", () => {
  beforeEach(() => {
    resetAppStore();
    resetShortcutsStore();
  });

  it("registers Cmd+P preview shortcut metadata", () => {
    renderHook(() => useLayoutHotkeys());

    const shortcuts = useShortcutsStore.getState().shortcuts;
    const previewShortcut = shortcuts.find((s) => s.id === "toggle-preview");

    expect(previewShortcut).toBeDefined();
    expect(previewShortcut?.label).toBe("Toggle Preview");
    expect(previewShortcut?.category).toBe("View");
    expect(previewShortcut?.keys).toStrictEqual(["Cmd", "P"]);
  });

  it("toggles preview visibility on Cmd+P", () => {
    renderHook(() => useLayoutHotkeys());

    expect(useAppStore.getState().isPreviewVisible).toBe(false);

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "p", metaKey: true, bubbles: true });
      document.dispatchEvent(event);
    });

    expect(useAppStore.getState().isPreviewVisible).toBe(true);

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "P", metaKey: true, bubbles: true });
      document.dispatchEvent(event);
    });

    expect(useAppStore.getState().isPreviewVisible).toBe(false);
  });

  it("does not toggle preview on Cmd+Shift+P", () => {
    renderHook(() => useLayoutHotkeys());

    expect(useAppStore.getState().isPreviewVisible).toBe(false);

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "P", metaKey: true, shiftKey: true, bubbles: true });
      document.dispatchEvent(event);
    });

    expect(useAppStore.getState().isPreviewVisible).toBe(false);
  });
});
