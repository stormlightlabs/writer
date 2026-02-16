import { useEffect } from "react";
import { useLayoutActions } from "../state/appStore";

export function useLayoutHotkeys(): void {
  const { toggleFocusMode, toggleShowSearch, toggleSidebarCollapsed, toggleSplitView } = useLayoutActions();

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

      if (hasMod && lowerKey === "b") {
        event.preventDefault();
        toggleSidebarCollapsed();
      }

      if (hasMod && event.key === "\\") {
        event.preventDefault();
        toggleSplitView();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [toggleFocusMode, toggleShowSearch, toggleSidebarCollapsed, toggleSplitView]);
}
