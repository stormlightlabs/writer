import { resetShortcutsStore, useShortcutsStore } from "$state/stores/shortcuts";
import { resetUiStore, useUiStore } from "$state/stores/ui";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useHelpSheetHotkey } from "../hooks/useHelpSheetHotkey";

describe("useHelpSheetHotkey", () => {
  beforeEach(() => {
    resetUiStore();
    resetShortcutsStore();
  });

  it("registers the help shortcut", () => {
    renderHook(() => useHelpSheetHotkey());

    const shortcuts = useShortcutsStore.getState().shortcuts;
    const helpShortcut = shortcuts.find((s) => s.id === "toggle-help-sheet");

    expect(helpShortcut).toBeDefined();
    expect(helpShortcut?.label).toBe("Toggle Help Sheet");
    expect(helpShortcut?.category).toBe("Help");
    expect(helpShortcut?.keys).toStrictEqual(["Cmd", "/"]);
  });

  it("toggles help sheet on Cmd+?", () => {
    renderHook(() => useHelpSheetHotkey());

    expect(useUiStore.getState().helpSheetOpen).toBe(false);

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "?", metaKey: true, bubbles: true });
      document.dispatchEvent(event);
    });

    expect(useUiStore.getState().helpSheetOpen).toBe(true);

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "?", metaKey: true, bubbles: true });
      document.dispatchEvent(event);
    });

    expect(useUiStore.getState().helpSheetOpen).toBe(false);
  });

  it("toggles help sheet on Cmd+Shift+/", () => {
    renderHook(() => useHelpSheetHotkey());

    expect(useUiStore.getState().helpSheetOpen).toBe(false);

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "/", metaKey: true, shiftKey: true, bubbles: true });
      document.dispatchEvent(event);
    });

    expect(useUiStore.getState().helpSheetOpen).toBe(true);
  });

  it("toggles help sheet on Cmd+/", () => {
    renderHook(() => useHelpSheetHotkey());

    expect(useUiStore.getState().helpSheetOpen).toBe(false);

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "/", metaKey: true, bubbles: true });
      document.dispatchEvent(event);
    });

    expect(useUiStore.getState().helpSheetOpen).toBe(true);
  });

  it("cleans up event listener on unmount", () => {
    const { unmount } = renderHook(() => useHelpSheetHotkey());

    unmount();

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "?", metaKey: true, bubbles: true });
      document.dispatchEvent(event);
    });

    expect(useUiStore.getState().helpSheetOpen).toBe(false);
  });

  it("toggles while an input is focused when command modifiers are used", () => {
    renderHook(() => useHelpSheetHotkey());
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "/", metaKey: true, shiftKey: true, bubbles: true });
      input.dispatchEvent(event);
    });

    expect(useUiStore.getState().helpSheetOpen).toBe(true);
    input.remove();
  });

  it("ignores repeated keydown events", () => {
    renderHook(() => useHelpSheetHotkey());

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "/",
        metaKey: true,
        shiftKey: true,
        repeat: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(useUiStore.getState().helpSheetOpen).toBe(false);
  });
});
