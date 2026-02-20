export const PdfExportDialogFooter = (
  { handleCancel, handleExportClick }: { handleCancel: () => void; handleExportClick: () => void },
) => (
  <div className="flex gap-3 mt-6 pt-4 border-t border-border-subtle">
    <button
      type="button"
      onClick={handleCancel}
      className="flex-1 px-4 py-2 bg-layer-02 border border-border-subtle rounded text-text-primary text-sm font-medium hover:bg-layer-03 cursor-pointer">
      Cancel
    </button>
    <button
      type="button"
      onClick={handleExportClick}
      className="flex-1 px-4 py-2 bg-accent-cyan border border-accent-cyan rounded text-white text-sm font-medium hover:opacity-90 cursor-pointer">
      Export PDF
    </button>
  </div>
);
