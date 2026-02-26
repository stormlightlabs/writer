import { logger } from "$logger";
import { DEFAULT_OPTIONS } from "$pdf/constants";
import type { MarginSide, PdfExportOptions } from "$pdf/types";
import { globalCaptureSet, runCmd } from "$ports";
import type { GlobalCaptureSettings } from "$types";
import { atom } from "jotai";

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

export const layoutSettingsOpenAtom = atom(false);
export const pdfExportDialogOpenAtom = atom(false);
export const pdfExportOptionsAtom = atom<PdfExportOptions>(DEFAULT_OPTIONS);

export const globalCaptureSettingsAtom = atom<GlobalCaptureSettings>(DEFAULT_GLOBAL_CAPTURE_SETTINGS);

export const setQuickCaptureEnabledAtom = atom(null, (get, set, enabled: boolean) => {
  const previous = get(globalCaptureSettingsAtom);
  if (previous.enabled === enabled) {
    return;
  }

  const next = { ...previous, enabled };
  set(globalCaptureSettingsAtom, next);

  void runCmd(globalCaptureSet(next, () => {}, (error) => {
    logger.error("Failed to persist quick capture enabled state", error);
    set(globalCaptureSettingsAtom, previous);
  }));
});

export const resetPdfExportOptionsAtom = atom(null, (_get, set) => {
  set(pdfExportOptionsAtom, DEFAULT_OPTIONS);
});

export const setPdfPageSizeAtom = atom(null, (_get, set, pageSize: PdfExportOptions["pageSize"]) => {
  set(pdfExportOptionsAtom, (prev) => ({ ...prev, pageSize }));
});

export const setPdfOrientationAtom = atom(null, (_get, set, orientation: PdfExportOptions["orientation"]) => {
  set(pdfExportOptionsAtom, (prev) => ({ ...prev, orientation }));
});

export const setPdfFontSizeAtom = atom(null, (_get, set, fontSize: number) => {
  set(pdfExportOptionsAtom, (prev) => ({ ...prev, fontSize }));
});

export const setPdfMarginAtom = atom(null, (_get, set, payload: { side: MarginSide; value: number }) => {
  set(
    pdfExportOptionsAtom,
    (prev) => ({
      ...prev,
      margins: { ...prev.margins, [payload.side]: Number.isNaN(payload.value) ? 0 : payload.value },
    }),
  );
});

export const setPdfIncludeHeaderAtom = atom(null, (_get, set, includeHeader: boolean) => {
  set(pdfExportOptionsAtom, (prev) => ({ ...prev, includeHeader }));
});

export const setPdfIncludeFooterAtom = atom(null, (_get, set, includeFooter: boolean) => {
  set(pdfExportOptionsAtom, (prev) => ({ ...prev, includeFooter }));
});
