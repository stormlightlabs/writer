import { useLayoutChromeActions, useViewModeActions } from "$state/selectors";
import { useShortcutsStore } from "$state/stores/shortcuts";
import { useEffect, useMemo } from "react";

export function useLayoutHotkeys(): void {
  const { toggleShowSearch, toggleSidebarCollapsed, toggleTabBarCollapsed } = useLayoutChromeActions();
  const { toggleFocusMode, toggleSplitView } = useViewModeActions();
  const registerShortcut = useShortcutsStore((state) => state.registerShortcut);
  const unregisterShortcut = useShortcutsStore((state) => state.unregisterShortcut);

  const shortcuts = useMemo(
    () => [{
      id: "toggle-search",
      category: "View",
      label: "Toggle Search",
      keys: ["Cmd", "Shift", "F"],
      description: "Open or close the search panel",
    }, {
      id: "toggle-focus-mode",
      category: "View",
      label: "Toggle Focus Mode",
      keys: ["Cmd", "F"],
      description: "Enter or exit focus mode",
    }, {
      id: "toggle-sidebar",
      category: "View",
      label: "Toggle Sidebar",
      keys: ["Cmd", "B"],
      description: "Show or hide the sidebar",
    }, {
      id: "toggle-tab-bar",
      category: "View",
      label: "Toggle Tab Bar",
      keys: ["Cmd", "Shift", "B"],
      description: "Show or hide the tab bar",
    }, {
      id: "toggle-split-view",
      category: "View",
      label: "Toggle Split View",
      keys: ["Cmd", "\\"],
      description: "Switch between editor only and split view",
    }],
    [],
  );

  useEffect(() => {
    for (const shortcut of shortcuts) {
      registerShortcut(shortcut);
    }
    return () => {
      for (const shortcut of shortcuts) {
        unregisterShortcut(shortcut.id);
      }
    };
  }, [shortcuts, registerShortcut, unregisterShortcut]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const hasMod = event.ctrlKey || event.metaKey;
      const lowerKey = event.key.toLowerCase();

      if (hasMod && event.shiftKey && lowerKey === "f") {
        event.preventDefault();
        toggleShowSearch();
      }

      if (hasMod && !event.shiftKey && lowerKey === "f") {
        event.preventDefault();
        toggleFocusMode();
      }

      if (hasMod && event.shiftKey && lowerKey === "b") {
        event.preventDefault();
        toggleTabBarCollapsed();
      }

      if (hasMod && !event.shiftKey && lowerKey === "b") {
        event.preventDefault();
        toggleSidebarCollapsed();
      }

      if (hasMod && event.key === "\\") {
        event.preventDefault();
        toggleSplitView();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleFocusMode, toggleShowSearch, toggleSidebarCollapsed, toggleTabBarCollapsed, toggleSplitView]);
}
