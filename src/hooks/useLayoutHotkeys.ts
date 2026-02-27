import { useLayoutChromeActions, useViewModeActions } from "$state/selectors";
import { useEffect } from "react";

export function useLayoutHotkeys(): void {
  const { toggleShowSearch, toggleSidebarCollapsed, toggleTabBarCollapsed } = useLayoutChromeActions();
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
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleFocusMode, toggleShowSearch, toggleSidebarCollapsed, toggleTabBarCollapsed, toggleSplitView]);
}
