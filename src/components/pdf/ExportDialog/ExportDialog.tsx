import { DEFAULT_OPTIONS } from "$pdf/constants";
import type { MarginSide, PdfExportOptions, StandardPageSize } from "$pdf/types";
import { useCallback, useState } from "react";
import { PdfExportDialogFooter } from "./ExportFooter";
import { PdfExportDialogHeader } from "./ExportHeader";
import { PdfExportDialogOptions } from "./ExportOptions";

export type PdfExportDialogProps = {
  isOpen: boolean;
  title?: string;
  isExporting?: boolean;
  errorMessage?: string | null;
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

export function PdfExportDialog(
  { isOpen, title, isExporting = false, errorMessage, onExport, onCancel }: PdfExportDialogProps,
) {
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

  if (isOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md bg-layer-01 rounded-lg shadow-xl border border-border-subtle p-6">
          <PdfExportDialogHeader handleCancel={onCancel} />
          <PdfTitle title={title} />
          {errorMessage ? <p className="text-sm text-support-error mb-4">{errorMessage}</p> : null}
          <PdfExportDialogOptions
            options={options}
            handlePageSizeChange={handlePageSizeChange}
            handleOrientationChange={handleOrientationChange}
            handleFontSizeChange={handleFontSizeChange}
            handleMarginChange={handleMarginChange}
            handleIncludeHeaderChange={handleIncludeHeaderChange}
            handleIncludeFooterChange={handleIncludeFooterChange} />
          <PdfExportDialogFooter
            handleCancel={onCancel}
            handleExportClick={handleExportClick}
            isExporting={isExporting} />
        </div>
      </div>
    );
  }

  return null;
}
