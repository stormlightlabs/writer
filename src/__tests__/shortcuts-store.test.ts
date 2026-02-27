import { resetShortcutsStore, useShortcutsStore } from "$state/stores/shortcuts";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("shortcuts store", () => {
  beforeEach(() => {
    resetShortcutsStore();
  });

  it("starts with empty shortcuts", () => {
    const state = useShortcutsStore.getState();
    expect(state.shortcuts).toEqual([]);
  });

  it("registers a shortcut", () => {
    const shortcut = { id: "test-shortcut", category: "Test", label: "Test Shortcut", keys: ["Cmd", "T"] };

    useShortcutsStore.getState().registerShortcut(shortcut);

    const state = useShortcutsStore.getState();
    expect(state.shortcuts).toHaveLength(1);
    expect(state.shortcuts[0]).toEqual(shortcut);
  });

  it("updates an existing shortcut with the same id", () => {
    const shortcut1 = { id: "test-shortcut", category: "Test", label: "Test Shortcut", keys: ["Cmd", "T"] };
    const shortcut2 = {
      id: "test-shortcut",
      category: "Updated",
      label: "Updated Shortcut",
      keys: ["Cmd", "Shift", "T"],
    };

    useShortcutsStore.getState().registerShortcut(shortcut1);
    useShortcutsStore.getState().registerShortcut(shortcut2);

    const state = useShortcutsStore.getState();
    expect(state.shortcuts).toHaveLength(1);
    expect(state.shortcuts[0]).toEqual(shortcut2);
  });

  it("unregisters a shortcut", () => {
    const shortcut = { id: "test-shortcut", category: "Test", label: "Test Shortcut", keys: ["Cmd", "T"] };

    useShortcutsStore.getState().registerShortcut(shortcut);
    useShortcutsStore.getState().unregisterShortcut("test-shortcut");

    const state = useShortcutsStore.getState();
    expect(state.shortcuts).toHaveLength(0);
  });

  it("notifies subscribers when shortcuts change", () => {
    const listener = vi.fn();
    const shortcut = { id: "test-shortcut", category: "Test", label: "Test Shortcut", keys: ["Cmd", "T"] };

    const unsubscribe = useShortcutsStore.getState().subscribe(listener);

    useShortcutsStore.getState().registerShortcut(shortcut);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith([shortcut]);

    unsubscribe();
  });

  it("clears listeners on reset", () => {
    const listener = vi.fn();
    const shortcut = { id: "test-shortcut", category: "Test", label: "Test Shortcut", keys: ["Cmd", "T"] };

    useShortcutsStore.getState().subscribe(listener);
    resetShortcutsStore();
    useShortcutsStore.getState().registerShortcut(shortcut);

    expect(listener).not.toHaveBeenCalled();
  });

  it("groups shortcuts by category", () => {
    const shortcut1 = { id: "shortcut-1", category: "View", label: "Toggle View", keys: ["Cmd", "V"] };
    const shortcut2 = { id: "shortcut-2", category: "Edit", label: "Undo", keys: ["Cmd", "Z"] };
    const shortcut3 = { id: "shortcut-3", category: "View", label: "Toggle Sidebar", keys: ["Cmd", "B"] };

    useShortcutsStore.getState().registerShortcut(shortcut1);
    useShortcutsStore.getState().registerShortcut(shortcut2);
    useShortcutsStore.getState().registerShortcut(shortcut3);

    const byCategory = useShortcutsStore.getState().getShortcutsByCategory();

    expect(byCategory.size).toBe(2);
    expect(byCategory.get("View")).toHaveLength(2);
    expect(byCategory.get("Edit")).toHaveLength(1);
  });
});
