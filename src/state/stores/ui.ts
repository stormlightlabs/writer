import { DEFAULT_OPTIONS } from "$pdf/constants";
import { globalCaptureSet, runCmd } from "$ports";
import type { UiActions, UiState } from "$state/types";
import type { GlobalCaptureSettings } from "$types";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import { create } from "zustand";

export type UiStore = UiState & UiActions;

const DEFAULT_GLOBAL_CAPTURE_SETTINGS: GlobalCaptureSettings = {
  enabled: true,
  shortcut: "CommandOrControl+Shift+Space",
  paused: false,
  defaultMode: "QuickNote",
  targetLocationId: null,
  inboxRelativeDir: "inbox",
  appendTarget: null,
  closeAfterSave: true,
  showTrayIcon: true,
  lastCaptureTarget: null,
};

export const getInitialUiState = (): UiState => ({
  layoutSettingsOpen: false,
  pdfExportDialogOpen: false,
  pdfExportOptions: DEFAULT_OPTIONS,
  globalCaptureSettings: DEFAULT_GLOBAL_CAPTURE_SETTINGS,
  helpSheetOpen: false,
  styleDiagnosticsOpen: false,
  atProtoSheetMode: "closed",
  atProtoSession: null,
  atProtoHydrated: false,
  atProtoPending: false,
});

export const useUiStore = create<UiStore>()((set, get) => ({
  ...getInitialUiState(),

  setLayoutSettingsOpen: (value) => set({ layoutSettingsOpen: value }),
  setPdfExportDialogOpen: (value) => set({ pdfExportDialogOpen: value }),
  setPdfExportOptions: (value) => set({ pdfExportOptions: value }),
  resetPdfExportOptions: () => set({ pdfExportOptions: DEFAULT_OPTIONS }),
  setPdfPageSize: (value) => set((state) => ({ pdfExportOptions: { ...state.pdfExportOptions, pageSize: value } })),
  setPdfOrientation: (value) =>
    set((state) => ({ pdfExportOptions: { ...state.pdfExportOptions, orientation: value } })),
  setPdfFontSize: (value) => set((state) => ({ pdfExportOptions: { ...state.pdfExportOptions, fontSize: value } })),
  setPdfMargin: (side, value) =>
    set((state) => ({
      pdfExportOptions: {
        ...state.pdfExportOptions,
        margins: { ...state.pdfExportOptions.margins, [side]: Number.isNaN(value) ? 0 : value },
      },
    })),
  setPdfIncludeTitle: (value) =>
    set((state) => ({ pdfExportOptions: { ...state.pdfExportOptions, includeTitle: value } })),
  setPdfIncludeHeader: (value) =>
    set((state) => ({ pdfExportOptions: { ...state.pdfExportOptions, includeHeader: value } })),
  setPdfIncludeFooter: (value) =>
    set((state) => ({ pdfExportOptions: { ...state.pdfExportOptions, includeFooter: value } })),
  setGlobalCaptureSettings: (value) => set({ globalCaptureSettings: value }),
  setQuickCaptureEnabled: async (enabled) => {
    const previous = get().globalCaptureSettings;
    if (previous.enabled === enabled) {
      return;
    }

    const next = { ...previous, enabled };
    set({ globalCaptureSettings: next });

    await runCmd(globalCaptureSet(next, () => {}, (error) => {
      logger.error(f("Failed to persist quick capture enabled state", { error }));
      set({ globalCaptureSettings: previous });
    }));
  },
  setHelpSheetOpen: (value) => set({ helpSheetOpen: value }),
  toggleHelpSheet: () => set((state) => ({ helpSheetOpen: !state.helpSheetOpen })),
  setStyleDiagnosticsOpen: (value) => set({ styleDiagnosticsOpen: value }),
  toggleStyleDiagnostics: () => set((state) => ({ styleDiagnosticsOpen: !state.styleDiagnosticsOpen })),
  openAtProtoLoginSheet: () => set({ atProtoSheetMode: "login" }),
  openAtProtoSessionSheet: () => set({ atProtoSheetMode: "session" }),
  openAtProtoImportSheet: () => set({ atProtoSheetMode: "import" }),
  openAtProtoPublishSheet: () => set({ atProtoSheetMode: "publish" }),
  closeAtProtoSheet: () => set({ atProtoSheetMode: "closed" }),
  setAtProtoSession: (value) => set({ atProtoSession: value }),
  setAtProtoHydrated: (value) => set({ atProtoHydrated: value }),
  setAtProtoPending: (value) => set({ atProtoPending: value }),
}));

export function resetUiStore(): void {
  useUiStore.setState(getInitialUiState());
}
