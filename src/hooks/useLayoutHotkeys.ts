import { useEffect } from "react";
import { useLayoutChromeActions, useViewModeActions } from "../state/stores/app";

export function useLayoutHotkeys(): void {
  const {
    toggleShowSearch,
    toggleSidebarCollapsed,
    toggleTabBarCollapsed,
    revealChromeTemporarily,
    setChromeTemporarilyVisible,
  } = useLayoutChromeActions();
  const { toggleFocusMode, toggleSplitView } = useViewModeActions();

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

      if (hasMod && event.shiftKey && lowerKey === "h") {
        event.preventDefault();
        revealChromeTemporarily();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const hasMod = event.ctrlKey || event.metaKey;

      if (!hasMod) {
        setChromeTemporarilyVisible(false);
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    globalThis.addEventListener("keyup", handleKeyUp);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
      globalThis.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    toggleFocusMode,
    toggleShowSearch,
    toggleSidebarCollapsed,
    toggleTabBarCollapsed,
    toggleSplitView,
    revealChromeTemporarily,
    setChromeTemporarilyVisible,
  ]);
}
