import { useShortcutsStore } from "$state/stores/shortcuts";
import type { KeyboardShortcut } from "$state/stores/shortcuts";
import { useEffect, useMemo } from "react";

export function useShortcutRegistry(shortcut: KeyboardShortcut) {
  const registerShortcut = useShortcutsStore((state) => state.registerShortcut);
  const unregisterShortcut = useShortcutsStore((state) => state.unregisterShortcut);

  useEffect(() => {
    registerShortcut(shortcut);
    return () => {
      unregisterShortcut(shortcut.id);
    };
  }, [shortcut, registerShortcut, unregisterShortcut]);
}

export function useShortcutsByCategory() {
  const shortcuts = useShortcutsStore((state) => state.shortcuts);
  return useMemo(() => {
    const byCategory = new Map<string, KeyboardShortcut[]>();
    for (const shortcut of shortcuts) {
      const existing = byCategory.get(shortcut.category) ?? [];
      existing.push(shortcut);
      byCategory.set(shortcut.category, existing);
    }
    return byCategory;
  }, [shortcuts]);
}

export function useAllShortcuts() {
  return useShortcutsStore((state) => state.shortcuts);
}
