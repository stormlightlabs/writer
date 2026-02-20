import { DEFAULT_OPTIONS } from "$pdf/constants";
import type { PdfExportOptions, StandardPageSize } from "$pdf/types";
import { useCallback, useState } from "react";
import { PdfExportDialogFooter } from "./ExportFooter";
import { PdfExportDialogHeader } from "./ExportHeader";
import { PdfExportDialogOptions } from "./ExportOptions";

export type PdfExportDialogProps = {
  isOpen: boolean;
  title?: string;
  onExport: (options: PdfExportOptions) => void;
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

  const handleExportClick = useCallback(() => {
    onExport(options);
  }, [onExport, options]);

  if (isOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md bg-layer-01 rounded-lg shadow-xl border border-border-subtle p-6">
          <PdfExportDialogHeader handleCancel={onCancel} />
          <PdfTitle title={title} />
          <PdfExportDialogOptions
            options={options}
            handlePageSizeChange={handlePageSizeChange}
            handleOrientationChange={handleOrientationChange}
            handleFontSizeChange={handleFontSizeChange} />
          <PdfExportDialogFooter handleCancel={onCancel} handleExportClick={handleExportClick} />
        </div>
      </div>
    );
  }

  return null;
}
