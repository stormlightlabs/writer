import type { PdfExportActions, PdfExportState } from "$state/types";
import { create } from "zustand";

export type PdfExportStore = PdfExportState & PdfExportActions;

export const getInitialPdfExportState = (): PdfExportState => ({ isExportingPdf: false, pdfExportError: null });

export const usePdfExportStore = create<PdfExportStore>()((set) => ({
  ...getInitialPdfExportState(),

  startPdfExport: () => set({ isExportingPdf: true, pdfExportError: null }),
  finishPdfExport: () => set({ isExportingPdf: false, pdfExportError: null }),
  failPdfExport: (message) => set({ isExportingPdf: false, pdfExportError: message }),
  resetPdfExport: () => set(getInitialPdfExportState()),
}));

export function resetPdfExportStore(): void {
  usePdfExportStore.setState(getInitialPdfExportState());
}
