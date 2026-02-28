import { Button } from "$components/Button";
import { usePdfDialogUiState, usePdfExportActions, usePdfExportState, useTextExportActions } from "$state/selectors";
import { useCallback } from "react";

type ExportDialogFooterProps = {
  handleExport: () => void | Promise<void>;
  label?: string;
  disable?: boolean;
  isLoading?: boolean;
};

export function ExportDialogFooter(
  { handleExport, label = "Export", disable = false, isLoading = false }: ExportDialogFooterProps,
) {
  const { setOpen } = usePdfDialogUiState();
  const { resetPdfExport } = usePdfExportActions();
  const { resetTextExport } = useTextExportActions();

  const handleCancel = useCallback(() => {
    setOpen(false);
    resetPdfExport();
    resetTextExport();
  }, [resetPdfExport, resetTextExport, setOpen]);

  return (
    <div className="mt-4 pt-4 border-t border-border-subtle flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={handleCancel}
        disabled={isLoading}
        className="sm:flex-1">
        Cancel
      </Button>
      <Button
        type="button"
        variant="primary"
        size="lg"
        onClick={handleExport}
        disabled={isLoading || disable}
        className="sm:flex-1">
        {isLoading ? "Exporting..." : label}
      </Button>
    </div>
  );
}

type PdfExportDialogFooterProps = { handleExportClick: () => void | Promise<void>; label?: string; disable?: boolean };

export function PdfExportDialogFooter(
  { handleExportClick, label = "Export PDF", disable = false }: PdfExportDialogFooterProps,
) {
  const { isExportingPdf } = usePdfExportState();

  return (
    <ExportDialogFooter handleExport={handleExportClick} label={label} disable={disable} isLoading={isExportingPdf} />
  );
}
