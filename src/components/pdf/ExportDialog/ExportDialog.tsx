import { Dialog } from "$components/Dialog";
import { PdfPreviewPanel } from "$components/pdf/PdfPreview";
import { useViewportTier } from "$hooks/useViewportTier";
import type { PdfExportOptions, PdfRenderResult } from "$pdf/types";
import {
  usePdfDialogUiState,
  usePdfExportActions,
  usePdfExportState,
  useTabsState,
  useWorkspaceDocumentsState,
} from "$state/selectors";
import type { EditorFontFamily } from "$types";
import { useCallback, useMemo } from "react";
import { PdfExportDialogFooter } from "./ExportFooter";
import { PdfExportDialogHeader } from "./ExportHeader";
import { PdfExportDialogOptions } from "./ExportOptions";

export type PdfExportDialogProps = {
  onExport: (options: PdfExportOptions) => Promise<void>;
  previewResult?: PdfRenderResult | null;
  editorFontFamily: EditorFontFamily;
};

const PdfTitle = ({ title }: { title?: string }) => (title
  ? (
    <p className="text-sm text-text-secondary mb-4">
      Exporting: <span className="font-medium text-text-primary">{title}</span>
    </p>
  )
  : null);

const PreviewPane = (
  { previewResult, options, editorFontFamily }: {
    previewResult: PdfRenderResult | null;
    options: PdfExportOptions;
    editorFontFamily: EditorFontFamily;
  },
) => (
  <div className="min-h-0 flex-1 overflow-auto">
    <PdfPreviewPanel result={previewResult} options={options} editorFontFamily={editorFontFamily} />
  </div>
);

const OptionsPane = ({ isFullWidth }: { isFullWidth: boolean }) => (
  <div className={`flex flex-col min-h-0 overflow-auto ${isFullWidth ? "flex-1" : "shrink-0"}`}>
    <PdfExportDialogOptions />
  </div>
);

export function PdfExportDialog({ onExport, previewResult, editorFontFamily }: PdfExportDialogProps) {
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

  const compactPanel = useMemo(() => isCompact || viewportWidth < 1024, [isCompact, viewportWidth]);
  const showPreview = useMemo(() => !compactPanel && viewportWidth >= 1200, [compactPanel, viewportWidth]);

  const containerClasses = useMemo(() => {
    if (compactPanel) {
      return "z-50 flex pointer-events-none items-end justify-center px-3 pb-3";
    }
    return "z-50 flex pointer-events-none items-center justify-center p-4";
  }, [compactPanel]);

  const panelClasses = useMemo(() => {
    if (compactPanel) {
      return "pointer-events-auto bg-layer-01 border border-border-subtle shadow-xl w-full max-w-2xl max-h-[calc(100vh-4.25rem)] rounded-lg flex flex-col";
    }
    if (showPreview) {
      return "pointer-events-auto bg-layer-01 border border-border-subtle shadow-xl w-[min(50vw,900px)] max-h-[85vh] rounded-lg flex flex-col";
    }
    return "pointer-events-auto bg-layer-01 border border-border-subtle shadow-xl w-full max-w-xl max-h-[85vh] rounded-lg flex flex-col";
  }, [compactPanel, showPreview]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCancel}
      ariaLabel="Export to PDF"
      motionPreset={compactPanel ? "slideUp" : "scale"}
      backdropClassName={compactPanel ? "bg-black/40" : "bg-black/40"}
      containerClassName={containerClasses}
      panelClassName={panelClasses}>
      <div className={`flex flex-col min-h-0 ${compactPanel ? "p-4" : "p-6"}`}>
        <PdfExportDialogHeader />
        <PdfTitle title={title} />
        {pdfExportError ? <p className="text-sm text-support-error mb-4">{pdfExportError}</p> : null}

        <div className={`flex-1 min-h-0 ${showPreview ? "grid grid-cols-[1fr,320px] gap-6" : ""}`}>
          {showPreview && (
            <PreviewPane previewResult={previewResult ?? null} options={options} editorFontFamily={editorFontFamily} />
          )}

          <OptionsPane isFullWidth={!showPreview} />
        </div>

        <PdfExportDialogFooter handleExportClick={handleExportClick} />
      </div>
    </Dialog>
  );
}
