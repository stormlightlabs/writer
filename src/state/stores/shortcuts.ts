import { create } from "zustand";

export type KeyboardShortcut = { id: string; category: string; label: string; keys: string[]; description?: string };

type ShortcutListener = (shortcuts: KeyboardShortcut[]) => void;

type ShortcutsState = { shortcuts: KeyboardShortcut[] };

type ShortcutsActions = {
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (id: string) => void;
  subscribe: (listener: ShortcutListener) => () => void;
  getShortcutsByCategory: () => Map<string, KeyboardShortcut[]>;
};

export type ShortcutsStore = ShortcutsState & ShortcutsActions;

const listeners = new Set<ShortcutListener>();

function getInitialState(): ShortcutsState {
  return { shortcuts: [] };
}

function notifyListeners(shortcuts: KeyboardShortcut[]) {
  for (const listener of listeners) {
    listener(shortcuts);
  }
}

export const useShortcutsStore = create<ShortcutsStore>()((set, get) => ({
  ...getInitialState(),

  registerShortcut: (shortcut) => {
    set((state) => {
      const existing = state.shortcuts.find((s) => s.id === shortcut.id);
      if (existing) {
        const updated = state.shortcuts.map((s) => (s.id === shortcut.id ? shortcut : s));
        notifyListeners(updated);
        return { shortcuts: updated };
      }
      const updated = [...state.shortcuts, shortcut];
      notifyListeners(updated);
      return { shortcuts: updated };
    });
  },

  unregisterShortcut: (id) => {
    set((state) => {
      const updated = state.shortcuts.filter((s) => s.id !== id);
      if (updated.length === state.shortcuts.length) {
        return state;
      }
      notifyListeners(updated);
      return { shortcuts: updated };
    });
  },

  subscribe: (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getShortcutsByCategory: () => {
    const { shortcuts } = get();
    const byCategory = new Map<string, KeyboardShortcut[]>();
    for (const shortcut of shortcuts) {
      const existing = byCategory.get(shortcut.category) ?? [];
      existing.push(shortcut);
      byCategory.set(shortcut.category, existing);
    }
    return byCategory;
  },
}));

export function resetShortcutsStore(): void {
  listeners.clear();
  useShortcutsStore.setState(getInitialState());
}
