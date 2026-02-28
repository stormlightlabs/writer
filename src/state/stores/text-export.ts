import type { TextExportActions, TextExportState } from "$state/types";
import { create } from "zustand";

export type TextExportStore = TextExportState & TextExportActions;

export const getInitialTextExportState = (): TextExportState => ({ isExportingText: false, textExportError: null });

export const useTextExportStore = create<TextExportStore>()((set) => ({
  ...getInitialTextExportState(),

  startTextExport: () => set({ isExportingText: true, textExportError: null }),
  finishTextExport: () => set({ isExportingText: false, textExportError: null }),
  failTextExport: (message) => set({ isExportingText: false, textExportError: message }),
  resetTextExport: () => set(getInitialTextExportState()),
}));

export function resetTextExportStore(): void {
  useTextExportStore.setState(getInitialTextExportState());
}
