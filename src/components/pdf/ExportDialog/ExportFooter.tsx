import { Button } from "$components/Button";

export const PdfExportDialogFooter = (
  { handleCancel, handleExportClick, isExporting = false }: {
    handleCancel: () => void;
    handleExportClick: () => void | Promise<void>;
    isExporting?: boolean;
  },
) => (
  <div className="mt-6 pt-4 border-t border-border-subtle flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
    <Button
      type="button"
      variant="secondary"
      size="lg"
      onClick={handleCancel}
      disabled={isExporting}
      className="sm:flex-1">
      Cancel
    </Button>
    <Button
      type="button"
      variant="primary"
      size="lg"
      onClick={handleExportClick}
      disabled={isExporting}
      className="sm:flex-1">
      {isExporting ? "Exporting..." : "Export PDF"}
    </Button>
  </div>
);
