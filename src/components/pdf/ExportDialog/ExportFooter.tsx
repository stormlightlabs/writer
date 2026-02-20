export const PdfExportDialogFooter = (
  { handleCancel, handleExportClick, isExporting = false }: {
    handleCancel: () => void;
    handleExportClick: () => void | Promise<void>;
    isExporting?: boolean;
  },
) => (
  <div className="flex gap-3 mt-6 pt-4 border-t border-border-subtle">
    <button
      type="button"
      onClick={handleCancel}
      disabled={isExporting}
      className="flex-1 px-4 py-2 bg-layer-02 border border-border-subtle rounded text-text-primary text-sm font-medium hover:bg-layer-03 cursor-pointer">
      Cancel
    </button>
    <button
      type="button"
      onClick={handleExportClick}
      disabled={isExporting}
      className="flex-1 px-4 py-2 bg-accent-cyan border border-accent-cyan rounded text-white text-sm font-medium hover:opacity-90 cursor-pointer">
      {isExporting ? "Exporting..." : "Export PDF"}
    </button>
  </div>
);
