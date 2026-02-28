import type { AppStore } from "$state/types";
import { useMemo } from "react";
import { resetDocxExportStore, useDocxExportStore } from "./docx-export";
import { resetLayoutStore, useLayoutStore } from "./layout";
import { resetPdfExportStore, usePdfExportStore } from "./pdf-export";
import { resetSearchStore, useSearchStore } from "./search";
import { resetShortcutsStore } from "./shortcuts";
import { resetTabsStore, useTabsStore } from "./tabs";
import { resetTextExportStore, useTextExportStore } from "./text-export";
import { resetUiStore, useUiStore } from "./ui";
import { resetWorkspaceStore, useWorkspaceStore } from "./workspace";

function getMergedState(): AppStore {
  return {
    ...useLayoutStore.getState(),
    ...useWorkspaceStore.getState(),
    ...useTabsStore.getState(),
    ...usePdfExportStore.getState(),
    ...useTextExportStore.getState(),
    ...useDocxExportStore.getState(),
    ...useSearchStore.getState(),
    ...useUiStore.getState(),
  } as AppStore;
}

export function useAppStore(): AppStore;
export function useAppStore<T>(selector: (state: AppStore) => T): T;
export function useAppStore<T>(selector?: (state: AppStore) => T): AppStore | T {
  const layout = useLayoutStore();
  const workspace = useWorkspaceStore();
  const tabs = useTabsStore();
  const pdfExport = usePdfExportStore();
  const textExport = useTextExportStore();
  const docxExport = useDocxExportStore();
  const search = useSearchStore();
  const ui = useUiStore();

  const state = useMemo(
    () =>
      ({ ...layout, ...workspace, ...tabs, ...pdfExport, ...textExport, ...docxExport, ...search, ...ui }) as AppStore,
    [layout, workspace, tabs, pdfExport, textExport, docxExport, search, ui],
  );

  if (!selector) {
    return state;
  }

  return selector(state);
}

useAppStore.getState = getMergedState;

export function resetAppStore(): void {
  resetLayoutStore();
  resetWorkspaceStore();
  resetTabsStore();
  resetPdfExportStore();
  resetTextExportStore();
  resetDocxExportStore();
  resetSearchStore();
  resetUiStore();
  resetShortcutsStore();
}
