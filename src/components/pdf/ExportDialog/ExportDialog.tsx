import { Dialog } from "$components/Dialog";
import { useViewportTier } from "$hooks/useViewportTier";
import { DEFAULT_OPTIONS } from "$pdf/constants";
import type { MarginSide, PdfExportOptions, StandardPageSize } from "$pdf/types";
import { usePdfExportState } from "$state/stores/app";
import { useCallback, useState } from "react";
import { PdfExportDialogFooter } from "./ExportFooter";
import { PdfExportDialogHeader } from "./ExportHeader";
import { PdfExportDialogOptions } from "./ExportOptions";

export type PdfExportDialogProps = {
  isOpen: boolean;
  title?: string;
  onExport: (options: PdfExportOptions) => Promise<void>;
  onCancel: () => void;
};

const PdfTitle = ({ title }: { title?: string }) => (title
  ? (
    <p className="text-sm text-text-secondary mb-4">
      Exporting: <span className="font-medium text-text-primary">{title}</span>
    </p>
  )
  : null);

export function PdfExportDialog({ isOpen, title, onExport, onCancel }: PdfExportDialogProps) {
  const { isExportingPdf, pdfExportError } = usePdfExportState();

  const { isCompact, viewportWidth } = useViewportTier();
  const [options, setOptions] = useState<PdfExportOptions>(DEFAULT_OPTIONS);

  const handlePageSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const pageSize = e.target.value as StandardPageSize;
    setOptions((prev) => ({ ...prev, pageSize }));
  }, []);

  const handleOrientationChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const orientation = e.target.value as "portrait" | "landscape";
    setOptions((prev) => ({ ...prev, orientation }));
  }, []);

  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fontSize = parseInt(e.target.value, 10);
    setOptions((prev) => ({ ...prev, fontSize }));
  }, []);

  const handleMarginChange = useCallback((side: MarginSide, value: number) => {
    const margin = Number.isNaN(value) ? 0 : value;
    setOptions((prev) => ({ ...prev, margins: { ...prev.margins, [side]: margin } }));
  }, []);

  const handleIncludeHeaderChange = useCallback((value: boolean) => {
    setOptions((prev) => ({ ...prev, includeHeader: value }));
  }, []);

  const handleIncludeFooterChange = useCallback((value: boolean) => {
    setOptions((prev) => ({ ...prev, includeFooter: value }));
  }, []);

  const handleExportClick = useCallback(async () => {
    await onExport(options);
  }, [onExport, options]);

  const compactPanel = isCompact || viewportWidth < 880;
  const optionsContent = (
    <PdfExportDialogOptions
      options={options}
      handlePageSizeChange={handlePageSizeChange}
      handleOrientationChange={handleOrientationChange}
      handleFontSizeChange={handleFontSizeChange}
      handleMarginChange={handleMarginChange}
      handleIncludeHeaderChange={handleIncludeHeaderChange}
      handleIncludeFooterChange={handleIncludeFooterChange} />
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      ariaLabel="Export to PDF"
      motionPreset={compactPanel ? "slideUp" : "scale"}
      backdropClassName={compactPanel ? "bg-black/40" : "bg-black/50"}
      containerClassName={`z-50 flex pointer-events-none ${
        compactPanel ? "items-end justify-center px-3 pb-3" : "items-center justify-center p-4"
      }`}
      panelClassName={`pointer-events-auto bg-layer-01 border border-border-subtle shadow-xl ${
        compactPanel
          ? "w-full max-w-2xl max-h-[calc(100vh-4.25rem)] rounded-lg"
          : "w-full max-w-xl max-h-[calc(100vh-2rem)] rounded-lg"
      }`}>
      <div className={`flex h-full flex-col ${compactPanel ? "p-4" : "p-6"}`}>
        <PdfExportDialogHeader handleCancel={onCancel} />
        <PdfTitle title={title} />
        {pdfExportError ? <p className="text-sm text-support-error mb-4">{pdfExportError}</p> : null}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{optionsContent}</div>
        <PdfExportDialogFooter
          handleCancel={onCancel}
          handleExportClick={handleExportClick}
          isExporting={isExportingPdf} />
      </div>
    </Dialog>
  );
}
