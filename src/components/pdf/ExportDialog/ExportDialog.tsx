import { Dialog } from "$components/Dialog";
import { useViewportTier } from "$hooks/useViewportTier";
import type { PdfExportOptions } from "$pdf/types";
import {
  usePdfDialogUiState,
  usePdfExportActions,
  usePdfExportState,
  useTabsState,
  useWorkspaceDocumentsState,
} from "$state/selectors";
import { useCallback } from "react";
import { PdfExportDialogFooter } from "./ExportFooter";
import { PdfExportDialogHeader } from "./ExportHeader";
import { PdfExportDialogOptions } from "./ExportOptions";

export type PdfExportDialogProps = { onExport: (options: PdfExportOptions) => Promise<void> };

const PdfTitle = ({ title }: { title?: string }) => (title
  ? (
    <p className="text-sm text-text-secondary mb-4">
      Exporting: <span className="font-medium text-text-primary">{title}</span>
    </p>
  )
  : null);

export function PdfExportDialog({ onExport }: PdfExportDialogProps) {
  const { isOpen, setOpen: setIsOpen, options } = usePdfDialogUiState();
  const { pdfExportError } = usePdfExportState();
  const { resetPdfExport } = usePdfExportActions();
  const { tabs, activeTabId } = useTabsState();
  const { documents } = useWorkspaceDocumentsState();

  const { isCompact, viewportWidth } = useViewportTier();
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const title = activeTab
    ? documents.find((doc) =>
      doc.location_id === activeTab.docRef.location_id && doc.rel_path === activeTab.docRef.rel_path
    )?.title
    : undefined;

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resetPdfExport();
  }, [resetPdfExport, setIsOpen]);

  const handleExportClick = useCallback(async () => {
    await onExport(options);
  }, [onExport, options]);

  const compactPanel = isCompact || viewportWidth < 880;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCancel}
      ariaLabel="Export to PDF"
      motionPreset={compactPanel ? "slideUp" : "scale"}
      backdropClassName={compactPanel ? "bg-black/40" : "bg-black/50"}
      containerClassName={`z-50 flex pointer-events-none ${
        compactPanel ? "items-end justify-center px-3 pb-3" : "items-center justify-center p-4"
      }`}
      panelClassName={`pointer-events-auto bg-layer-01 border border-border-subtle shadow-xl ${
        compactPanel
          ? "w-full max-w-2xl max-h-[calc(100vh-4.25rem)] rounded-lg"
          : "w-full max-w-xl max-h-[calc(100vh-2rem)] rounded-lg"
      }`}>
      <div className={`flex h-full flex-col ${compactPanel ? "p-4" : "p-6"}`}>
        <PdfExportDialogHeader />
        <PdfTitle title={title} />
        {pdfExportError ? <p className="text-sm text-support-error mb-4">{pdfExportError}</p> : null}
        <PdfExportDialogOptions />
        <PdfExportDialogFooter handleExportClick={handleExportClick} />
      </div>
    </Dialog>
  );
}
