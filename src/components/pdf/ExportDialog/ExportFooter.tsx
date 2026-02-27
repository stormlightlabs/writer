import { Button } from "$components/Button";
import { usePdfDialogUiState, usePdfExportActions, usePdfExportState } from "$state/selectors";
import { useCallback } from "react";

type PdfExportDialogFooterProps = {
  handleExportClick: () => void | Promise<void>;
  exportLabel?: string;
  disableExportButton?: boolean;
};

export const PdfExportDialogFooter = (
  { handleExportClick, exportLabel = "Export PDF", disableExportButton = false }: PdfExportDialogFooterProps,
) => {
  const { setOpen: setIsOpen } = usePdfDialogUiState();
  const { resetPdfExport } = usePdfExportActions();
  const { isExportingPdf } = usePdfExportState();

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resetPdfExport();
  }, [resetPdfExport, setIsOpen]);

  return (
    <div className="mt-4 pt-4 border-t border-border-subtle flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={handleCancel}
        disabled={isExportingPdf}
        className="sm:flex-1">
        Cancel
      </Button>
      <Button
        type="button"
        variant="primary"
        size="lg"
        onClick={handleExportClick}
        disabled={isExportingPdf || disableExportButton}
        className="sm:flex-1">
        {isExportingPdf ? "Exporting..." : exportLabel}
      </Button>
    </div>
  );
};
