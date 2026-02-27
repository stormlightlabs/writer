import { useCallback } from "react";
import { useLocation, useRoute } from "wouter";

type RoutedSheetController = { isOpen: boolean; open: () => void; close: () => void };

export function useRoutedSheet(path: string, fallbackPath = "/"): RoutedSheetController {
  const [isOpen] = useRoute(path);
  const [, navigate] = useLocation();

  const open = useCallback(() => {
    navigate(path);
  }, [navigate, path]);

  const close = useCallback(() => {
    if (typeof globalThis.history?.back === "function" && globalThis.history.length > 1) {
      globalThis.history.back();
      return;
    }

    navigate(fallbackPath, { replace: true });
  }, [fallbackPath, navigate]);

  return { isOpen, open, close };
}
