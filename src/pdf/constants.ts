import type { Orientation, PdfExportOptions, StandardPageSize } from "./types";

export const PAGE_SIZES: Array<{ label: string; value: StandardPageSize }> = [
  { label: "A4", value: "A4" },
  { label: "Letter", value: "LETTER" },
  { label: "Legal", value: "LEGAL" },
  { label: "A3", value: "A3" },
  { label: "A5", value: "A5" },
];

export const ORIENTATIONS: Array<{ label: string; value: Orientation }> = [{ label: "Portrait", value: "portrait" }, {
  label: "Landscape",
  value: "landscape",
}];

export const DEFAULT_OPTIONS: PdfExportOptions = {
  pageSize: "A4",
  orientation: "portrait",
  margins: { top: 50, right: 50, bottom: 50, left: 50 },
  fontSize: 11,
  includeHeader: false,
  includeFooter: false,
};
