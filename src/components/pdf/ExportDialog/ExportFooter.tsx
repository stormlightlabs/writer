import { Button } from "$components/Button";
import { usePdfDialogUiState, usePdfExportActions, usePdfExportState } from "$state/selectors";
import { useCallback } from "react";

export const PdfExportDialogFooter = ({ handleExportClick }: { handleExportClick: () => void | Promise<void> }) => {
  const { setOpen: setIsOpen } = usePdfDialogUiState();
  const { resetPdfExport } = usePdfExportActions();
  const { isExportingPdf } = usePdfExportState();

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resetPdfExport();
  }, [resetPdfExport, setIsOpen]);

  return (
    <div className="mt-6 pt-4 border-t border-border-subtle flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
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
        disabled={isExportingPdf}
        className="sm:flex-1">
        {isExportingPdf ? "Exporting..." : "Export PDF"}
      </Button>
    </div>
  );
};
