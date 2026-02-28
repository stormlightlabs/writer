import { Button } from "$components/Button";
import { Dialog } from "$components/Dialog";
import { PdfPreviewPanel } from "$components/export/preview/PdfPreview";
import { TextPreviewPanel } from "$components/export/preview/TextPreview";
import { FileTextIcon } from "$components/icons";
import { useTextExportUI } from "$hooks/useTextExport";
import { useViewportTier } from "$hooks/useViewportTier";
import type { PdfExportOptions, PdfRenderResult } from "$pdf/types";
import {
  usePdfDialogUiState,
  usePdfExportActions,
  usePdfExportState,
  useTabsState,
  useTextExportActions,
  useTextExportState,
  useWorkspaceDocumentsState,
} from "$state/selectors";
import type { EditorFontFamily, ExportFormat } from "$types";
import { type MouseEvent, useCallback, useMemo, useState } from "react";
import { ExportDialogFooter, PdfExportDialogFooter } from "./ExportFooter";
import { ExportDialogHeader } from "./ExportHeader";
import { PdfExportDialogOptions } from "./ExportOptions";

export type ExportDialogProps = {
  onExport: (options: PdfExportOptions) => Promise<void>;
  previewResult: PdfRenderResult | null;
  editorFontFamily: EditorFontFamily;
  documentText?: string;
};

type ExportFormatTab = { id: ExportFormat; label: string; disabled: boolean };

const EXPORT_FORMAT_TABS: ExportFormatTab[] = [{ id: "pdf", label: "PDF", disabled: false }, {
  id: "docx",
  label: "DOC/DOCX",
  disabled: true,
}, { id: "txt", label: "Plaintext", disabled: false }];

type ExportFormatTabsProps = {
  activeTabId: ExportFormatTab["id"];
  onTabClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

const ExportFormatTabs = ({ activeTabId, onTabClick }: ExportFormatTabsProps) => (
  <div className="mb-4 border-b border-border-subtle">
    <div className="flex items-center gap-2">
      {EXPORT_FORMAT_TABS.map((tab) => (
        <ExportFormatTabButton key={tab.id} tab={tab} isActive={tab.id === activeTabId} onTabClick={onTabClick} />
      ))}
    </div>
  </div>
);

type ExportFormatTabButtonProps = {
  tab: ExportFormatTab;
  isActive: boolean;
  onTabClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

const ExportFormatTabButton = ({ tab, isActive, onTabClick }: ExportFormatTabButtonProps) => (
  <button
    type="button"
    disabled={tab.disabled}
    data-tab-id={tab.id}
    onClick={onTabClick}
    className={`px-3 py-2 text-sm rounded-t border border-b-0 transition-colors ${
      isActive
        ? "bg-layer-02 text-text-primary border-border-subtle"
        : "bg-transparent text-text-secondary border-transparent hover:text-text-primary hover:bg-layer-02/60"
    } disabled:opacity-40 disabled:cursor-not-allowed`}
    aria-label={`${tab.label} export tab`}>
    {tab.label}
  </button>
);

type PdfExportContentProps = {
  showPreview: boolean;
  previewResult: PdfRenderResult | null;
  options: PdfExportOptions;
  editorFontFamily: EditorFontFamily;
  handleExportClick: () => Promise<void>;
};

function PdfExportContent(
  { showPreview, previewResult, options, editorFontFamily, handleExportClick }: PdfExportContentProps,
) {
  const { pdfExportError: error } = usePdfExportState();
  return (
    <>
      <ExportError error={error} />
      <div className={`flex-1 min-h-0 ${showPreview ? "grid grid-cols-[1fr,320px] gap-6" : ""}`}>
        {showPreview
          ? <PreviewPane previewResult={previewResult} options={options} editorFontFamily={editorFontFamily} />
          : null}
        <OptionsPane isFullWidth={!showPreview} />
      </div>
      <PdfExportDialogFooter handleExportClick={handleExportClick} label="Export PDF" />
    </>
  );
}

const ExportInfo = () => (
  <div className="text-center mb-4">
    <p className="text-sm text-text-secondary mb-2">
      Export your document as plain text with Markdown formatting removed.
    </p>
    <p className="text-xs text-text-tertiary">Logical structure (paragraphs, lists, blockquotes) will be preserved.</p>
  </div>
);

function ExportMarkdownButton({ handleClick }: { handleClick: () => Promise<void> }) {
  const { isExportingText } = useTextExportState();
  return (
    <div className="flex justify-center">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleClick}
        disabled={isExportingText}
        className="flex items-center gap-2">
        <FileTextIcon size="sm" />
        Save Original Markdown
      </Button>
    </div>
  );
}

type TextExportContentProps = {
  handleMarkdownExport: () => Promise<void>;
  handleTextExport: () => Promise<void>;
  showPreview: boolean;
  locationId: number;
  relPath: string;
  text: string;
};

const MarkdownExporter = ({ handleClick, showPreview }: { handleClick: () => Promise<void>; showPreview: boolean }) => (
  <div className={`flex flex-col min-h-0 overflow-auto ${showPreview ? "shrink-0" : "flex-1"}`}>
    <div className="flex-1 flex flex-col justify-center rounded-lg border border-dashed border-border-subtle bg-layer-02/40 p-6">
      <ExportInfo />
      <ExportMarkdownButton handleClick={handleClick} />
    </div>
  </div>
);

function TextExportContent(
  { handleMarkdownExport, handleTextExport, showPreview, locationId, relPath, text }: TextExportContentProps,
) {
  const { textExportError: error, isExportingText } = useTextExportState();
  return (
    <>
      <ExportError error={error} />
      <div className={`flex-1 min-h-0 ${showPreview ? "grid grid-cols-[1fr,320px] gap-6" : ""}`}>
        {showPreview && (
          <div className="min-h-0 flex-1 overflow-auto">
            <TextPreviewPanel locationId={locationId} relPath={relPath} text={text} />
          </div>
        )}
        <MarkdownExporter handleClick={handleMarkdownExport} showPreview={showPreview} />
      </div>
      <ExportDialogFooter handleExport={handleTextExport} label="Export Text" isLoading={isExportingText} />
    </>
  );
}

function DocumentTitle({ title }: { title?: string }) {
  if (!title) {
    return null;
  }

  return (
    <p className="text-sm text-text-secondary mb-4">
      Exporting: <span className="font-medium text-text-primary">{title}</span>
    </p>
  );
}

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

function ExportError({ error }: { error: string | null }) {
  if (error) {
    return <p className="text-sm text-support-error mb-4">{error}</p>;
  }

  return null;
}

export function ExportDialog({ onExport, previewResult, editorFontFamily, documentText = "" }: ExportDialogProps) {
  const { isOpen, setOpen: setIsOpen, options } = usePdfDialogUiState();
  const { resetPdfExport } = usePdfExportActions();
  const { resetTextExport } = useTextExportActions();
  const { tabs, activeTabId } = useTabsState();
  const { documents } = useWorkspaceDocumentsState();
  const { isCompact, viewportWidth } = useViewportTier();
  const [activeExportTabId, setActiveExportTabId] = useState<ExportFormatTab["id"]>("pdf");
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [tabs, activeTabId]);

  const title = useMemo(
    () =>
      activeTab
        ? documents.find((doc) =>
          doc.location_id === activeTab.docRef.location_id && doc.rel_path === activeTab.docRef.rel_path
        )?.title
        : undefined,
    [activeTab, documents],
  );

  const { handleExportText, handleExportMarkdown } = useTextExportUI({ activeTab, text: documentText });

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resetPdfExport();
    resetTextExport();
  }, [resetPdfExport, resetTextExport, setIsOpen]);

  const handlePdfExportClick = useCallback(async () => {
    await onExport(options);
  }, [onExport, options]);

  const handleTextExportClick = useCallback(async () => {
    await handleExportText();
    setIsOpen(false);
  }, [handleExportText, setIsOpen]);

  const handleMarkdownExportClick = useCallback(async () => {
    await handleExportMarkdown();
    setIsOpen(false);
  }, [handleExportMarkdown, setIsOpen]);

  const compactPanel = useMemo(() => isCompact || viewportWidth < 1024, [isCompact, viewportWidth]);
  const showPreview = useMemo(() => !compactPanel && viewportWidth >= 1200, [compactPanel, viewportWidth]);
  const isPdfTabActive = useMemo(() => activeExportTabId === "pdf", [activeExportTabId]);
  const isTextTabActive = useMemo(() => activeExportTabId === "txt", [activeExportTabId]);

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

  const handleExportFormatTabClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const nextTabId = event.currentTarget.dataset.tabId as ExportFormatTab["id"] | undefined;
    if (!nextTabId) {
      return;
    }

    setActiveExportTabId(nextTabId);
    resetPdfExport();
    resetTextExport();
  }, [resetPdfExport, resetTextExport]);

  const pdfExportProps = useMemo(() => ({ showPreview, previewResult, options, editorFontFamily }), [
    showPreview,
    previewResult,
    options,
    editorFontFamily,
  ]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCancel}
      ariaLabel="Export"
      motionPreset={compactPanel ? "slideUp" : "scale"}
      backdropClassName={compactPanel ? "bg-black/40" : "bg-black/40"}
      containerClassName={containerClasses}
      panelClassName={panelClasses}>
      <div className={`flex flex-col min-h-0 ${compactPanel ? "p-4" : "p-6"}`}>
        <ExportDialogHeader />
        <ExportFormatTabs activeTabId={activeExportTabId} onTabClick={handleExportFormatTabClick} />
        <DocumentTitle title={title} />
        {isPdfTabActive && <PdfExportContent {...pdfExportProps} handleExportClick={handlePdfExportClick} />}
        {isTextTabActive && activeTab && (
          <TextExportContent
            handleTextExport={handleTextExportClick}
            handleMarkdownExport={handleMarkdownExportClick}
            showPreview={showPreview}
            locationId={activeTab.docRef.location_id}
            relPath={activeTab.docRef.rel_path}
            text={documentText} />
        )}
      </div>
    </Dialog>
  );
}
