import {
  useEditorPresentationStateRaw,
  useLayoutChromeActions,
  useLayoutChromeState,
  useViewModeState,
} from "$state/selectors";
import type { AppTheme } from "$types";
import { useCallback } from "react";

export type AppChromeController = {
  theme: AppTheme;
  isFocusMode: boolean;
  isSidebarCollapsed: boolean;
  showToggleControls: boolean;
  handleShowSidebar: () => void;
};

export function useAppChromeController(): AppChromeController {
  const layoutChrome = useLayoutChromeState();
  const editorPresentation = useEditorPresentationStateRaw();
  const { setSidebarCollapsed } = useLayoutChromeActions();
  const { isFocusMode } = useViewModeState();

  const handleShowSidebar = useCallback(() => {
    setSidebarCollapsed(false);
  }, [setSidebarCollapsed]);

  return {
    theme: editorPresentation.theme,
    isFocusMode,
    isSidebarCollapsed: layoutChrome.sidebarCollapsed,
    showToggleControls: layoutChrome.sidebarCollapsed,
    handleShowSidebar,
  };
}
