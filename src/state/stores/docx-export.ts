import type { DocxExportActions, DocxExportState } from "$state/types";
import { create } from "zustand";

export type DocxExportStore = DocxExportState & DocxExportActions;

export const getInitialDocxExportState = (): DocxExportState => ({ isExportingDocx: false, docxExportError: null });

export const useDocxExportStore = create<DocxExportStore>()((set) => ({
  ...getInitialDocxExportState(),

  startDocxExport: () => set({ isExportingDocx: true, docxExportError: null }),
  finishDocxExport: () => set({ isExportingDocx: false, docxExportError: null }),
  failDocxExport: (message) => set({ isExportingDocx: false, docxExportError: message }),
  resetDocxExport: () => set(getInitialDocxExportState()),
}));

export function resetDocxExportStore(): void {
  useDocxExportStore.setState(getInitialDocxExportState());
}
