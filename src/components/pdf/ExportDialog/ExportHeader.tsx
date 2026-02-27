import { Button } from "$components/Button";
import { XIcon } from "$icons";
import { usePdfDialogUiState, usePdfExportActions } from "$state/selectors";
import { useCallback } from "react";

export const PdfExportDialogHeader = () => {
  const { setOpen: setIsOpen } = usePdfDialogUiState();
  const { resetPdfExport } = usePdfExportActions();

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resetPdfExport();
  }, [resetPdfExport, setIsOpen]);

  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="m-0 text-lg font-medium text-text-primary">Export</h2>
      <Button type="button" variant="iconSubtle" size="iconLg" onClick={handleCancel} aria-label="Close export dialog">
        <XIcon size="sm" />
      </Button>
    </div>
  );
};
