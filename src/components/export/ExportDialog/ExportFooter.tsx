import { Button } from "$components/Button";
import { usePdfExportState } from "$state/selectors";

type ExportDialogFooterProps = {
  handleExport: () => void | Promise<void>;
  onCancel: () => void;
  label?: string;
  disable?: boolean;
  isLoading?: boolean;
};

export const ExportDialogFooter = (
  { handleExport, onCancel, label = "Export", disable = false, isLoading = false }: ExportDialogFooterProps,
) => (
  <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border-subtle bg-layer-01/80 pt-4 sm:flex-row sm:gap-3">
    <Button type="button" variant="secondary" size="lg" onClick={onCancel} disabled={isLoading} className="sm:flex-1">
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

type PdfExportDialogFooterProps = {
  handleExportClick: () => void | Promise<void>;
  onCancel: () => void;
  label?: string;
  disable?: boolean;
};

export function PdfExportDialogFooter(
  { handleExportClick, onCancel, label = "Export PDF", disable = false }: PdfExportDialogFooterProps,
) {
  const { isExportingPdf } = usePdfExportState();

  return (
    <ExportDialogFooter
      handleExport={handleExportClick}
      onCancel={onCancel}
      label={label}
      disable={disable}
      isLoading={isExportingPdf} />
  );
}
