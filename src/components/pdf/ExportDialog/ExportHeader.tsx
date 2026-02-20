import { XIcon } from "$icons";

export const PdfExportDialogHeader = ({ handleCancel }: { handleCancel: () => void }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="m-0 text-lg font-medium text-text-primary">Export to PDF</h2>
    <button
      type="button"
      onClick={handleCancel}
      className="w-7 h-7 flex items-center justify-center bg-transparent border border-border-subtle rounded text-icon-secondary hover:text-icon-primary cursor-pointer"
      aria-label="Close export dialog">
      <XIcon size="sm" />
    </button>
  </div>
);
