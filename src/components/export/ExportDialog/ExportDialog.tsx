import { Button } from "$components/Button";
import { Dialog } from "$components/Dialog";
import { PdfPreviewPanel } from "$components/export/preview/PdfPreview";
import { TextPreviewPanel } from "$components/export/preview/TextPreview";
import { FileTextIcon } from "$components/icons";
import { useDocxExportUI } from "$hooks/useDocxExport";
import { useTextExportUI } from "$hooks/useTextExport";
import { useViewportTier } from "$hooks/useViewportTier";
import type { PdfExportOptions, PdfRenderResult } from "$pdf/types";
import {
  useDocxExportActions,
  useDocxExportState,
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

type ExportFormatTab = { id: ExportFormat; label: string; disabled: boolean; description: string };

const EXPORT_FORMAT_TABS: ExportFormatTab[] = [
  { id: "pdf", label: "PDF", disabled: false, description: "Print-ready layout and typography controls." },
  { id: "docx", label: "DOCX", disabled: false, description: "Word-compatible document with rich formatting." },
  { id: "txt", label: "Plaintext", disabled: false, description: "Markdown removed while preserving structure." },
];

type ExportFormatTabsProps = {
  activeTabId: ExportFormatTab["id"];
  onTabClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

const ExportFormatTabs = ({ activeTabId, onTabClick }: ExportFormatTabsProps) => (
  <div className="mb-4 rounded-lg border border-border-subtle bg-layer-02/35 p-1">
    <div className="grid grid-cols-3 gap-1">
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
    data-description={tab.description}
    onClick={onTabClick}
    className={`rounded-md border px-2 py-2 text-xs transition-colors sm:px-3 sm:text-sm ${
      isActive
        ? "border-border-subtle bg-layer-01 text-text-primary shadow-sm"
        : "border-transparent bg-transparent text-text-secondary hover:bg-layer-01/70 hover:text-text-primary"
    } disabled:cursor-not-allowed disabled:opacity-40`}
    aria-label={`${tab.label} export tab`}>
    {tab.label}
  </button>
);

function ExportError({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return (
    <p className="mb-3 rounded-md border border-support-error/35 bg-support-error/10 px-3 py-2 text-sm text-support-error">
      {error}
    </p>
  );
}

const FormatSummary = ({ title, description }: { title: string; description: string }) => (
  <div className="mb-3 rounded-lg border border-border-subtle bg-layer-02/35 px-3 py-2.5">
    <p className="m-0 text-sm font-medium text-text-primary">{title}</p>
    <p className="m-0 mt-1 text-xs text-text-secondary">{description}</p>
  </div>
);

type PreviewPaneProps = {
  previewResult: PdfRenderResult | null;
  options: PdfExportOptions;
  editorFontFamily: EditorFontFamily;
};

const PreviewPane = ({ previewResult, options, editorFontFamily }: PreviewPaneProps) => (
  <section className="min-h-0 overflow-hidden rounded-lg border border-border-subtle bg-layer-02/35 p-2">
    <PdfPreviewPanel result={previewResult} options={options} editorFontFamily={editorFontFamily} />
  </section>
);

const OptionsPane = ({ isFullWidth }: { isFullWidth: boolean }) => (
  <section className={`min-h-0 overflow-auto ${isFullWidth ? "flex-1" : "shrink-0"}`}>
    <PdfExportDialogOptions />
  </section>
);

type PdfExportContentProps = {
  onCancel: () => void;
  showPreview: boolean;
  previewResult: PdfRenderResult | null;
  options: PdfExportOptions;
  editorFontFamily: EditorFontFamily;
  handleExportClick: () => Promise<void>;
};

function PdfExportContent(
  { onCancel, showPreview, previewResult, options, editorFontFamily, handleExportClick }: PdfExportContentProps,
) {
  const { pdfExportError: error } = usePdfExportState();

  return (
    <>
      <FormatSummary
        title="PDF Export"
        description="Tune pagination and typography, then export a polished, print-ready PDF." />
      <ExportError error={error} />
      <div className={`min-h-0 flex-1 ${showPreview ? "grid grid-cols-[minmax(0,1fr),336px] gap-4" : "flex"}`}>
        {showPreview
          ? <PreviewPane previewResult={previewResult} options={options} editorFontFamily={editorFontFamily} />
          : null}
        <OptionsPane isFullWidth={!showPreview} />
      </div>
      <PdfExportDialogFooter handleExportClick={handleExportClick} onCancel={onCancel} label="Export PDF" />
    </>
  );
}

type TextExportContentProps = {
  onCancel: () => void;
  handleMarkdownExport: () => Promise<void>;
  handleTextExport: () => Promise<void>;
  showPreview: boolean;
  locationId: number;
  relPath: string;
  text: string;
};

const TextExportInfo = ({ handleClick }: { handleClick: () => Promise<void> }) => {
  const { isExportingText } = useTextExportState();

  return (
    <section className="min-h-0 overflow-auto rounded-lg border border-dashed border-border-subtle bg-layer-02/30 p-4">
      <h3 className="m-0 text-sm font-medium text-text-primary">Export Plain Text</h3>
      <p className="m-0 mt-1 text-xs text-text-secondary">
        Strips Markdown syntax while keeping readable paragraph and list structure.
      </p>
      <div className="mt-4 rounded-md border border-border-subtle bg-layer-01 px-3 py-3">
        <p className="m-0 text-xs text-text-secondary">Need the source markdown instead?</p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleClick}
          disabled={isExportingText}
          className="mt-2 inline-flex items-center gap-2">
          <FileTextIcon size="sm" />
          Save Original Markdown
        </Button>
      </div>
    </section>
  );
};

function TextExportContent(
  { onCancel, handleMarkdownExport, handleTextExport, showPreview, locationId, relPath, text }: TextExportContentProps,
) {
  const { textExportError: error, isExportingText } = useTextExportState();

  return (
    <>
      <FormatSummary
        title="Plain Text Export"
        description="Generate a clean text version or save the untouched markdown source." />
      <ExportError error={error} />
      <div className={`min-h-0 flex-1 ${showPreview ? "grid grid-cols-[minmax(0,1fr),336px] gap-4" : "flex"}`}>
        {showPreview
          ? (
            <section className="min-h-0 overflow-hidden rounded-lg border border-border-subtle bg-layer-02/35 p-2">
              <TextPreviewPanel locationId={locationId} relPath={relPath} text={text} />
            </section>
          )
          : null}
        <TextExportInfo handleClick={handleMarkdownExport} />
      </div>
      <ExportDialogFooter
        handleExport={handleTextExport}
        onCancel={onCancel}
        label="Export Text"
        isLoading={isExportingText} />
    </>
  );
}

type DocxExportContentProps = { onCancel: () => void; handleDocxExport: () => Promise<void> };

function DocxExportContent({ onCancel, handleDocxExport }: DocxExportContentProps) {
  const { docxExportError: error, isExportingDocx } = useDocxExportState();

  return (
    <>
      <FormatSummary
        title="DOCX Export"
        description="Create a Word-compatible document preserving key Markdown formatting." />
      <ExportError error={error} />
      <section className="min-h-0 flex-1 rounded-lg border border-border-subtle bg-layer-02/30 p-4">
        <h3 className="m-0 text-sm font-medium text-text-primary">Included formatting</h3>
        <p className="m-0 mt-1 text-xs text-text-secondary">
          Headings, emphasis, code, lists, and blockquotes are retained.
        </p>
        <ul className="m-0 mt-3 list-disc space-y-1 pl-4 text-xs text-text-secondary">
          <li>Uses your document title for the default filename.</li>
          <li>Works with Microsoft Word, Pages, and Google Docs import.</li>
          <li>No temporary files are written until you choose a destination.</li>
        </ul>
      </section>
      <ExportDialogFooter
        handleExport={handleDocxExport}
        onCancel={onCancel}
        label="Export DOCX"
        isLoading={isExportingDocx} />
    </>
  );
}

const EmptyExportState = () => (
  <section className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-border-subtle bg-layer-02/30 p-4">
    <p className="m-0 text-sm text-text-secondary">Open a document to export.</p>
  </section>
);

export function ExportDialog({ onExport, previewResult, editorFontFamily, documentText = "" }: ExportDialogProps) {
  const { isOpen, setOpen: setIsOpen, options } = usePdfDialogUiState();
  const { resetPdfExport } = usePdfExportActions();
  const { resetTextExport } = useTextExportActions();
  const { resetDocxExport } = useDocxExportActions();
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
  const { handleExportDocx } = useDocxExportUI({ activeTab, text: documentText });

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resetPdfExport();
    resetTextExport();
    resetDocxExport();
  }, [resetPdfExport, resetTextExport, resetDocxExport, setIsOpen]);

  const handlePdfExportClick = useCallback(async () => {
    await onExport(options);
  }, [onExport, options]);

  const handleTextExportClick = useCallback(async () => {
    const didExport = await handleExportText();
    if (didExport) {
      handleCancel();
    }
  }, [handleCancel, handleExportText]);

  const handleMarkdownExportClick = useCallback(async () => {
    const didExport = await handleExportMarkdown();
    if (didExport) {
      handleCancel();
    }
  }, [handleCancel, handleExportMarkdown]);

  const handleDocxExportClick = useCallback(async () => {
    const didExport = await handleExportDocx();
    if (didExport) {
      handleCancel();
    }
  }, [handleCancel, handleExportDocx]);

  const compactPanel = useMemo(() => isCompact || viewportWidth < 1024, [isCompact, viewportWidth]);
  const showPreview = useMemo(() => !compactPanel && viewportWidth >= 1200, [compactPanel, viewportWidth]);
  const isPdfTabActive = useMemo(() => activeExportTabId === "pdf", [activeExportTabId]);
  const isDocxTabActive = useMemo(() => activeExportTabId === "docx", [activeExportTabId]);
  const isTextTabActive = useMemo(() => activeExportTabId === "txt", [activeExportTabId]);

  const containerClasses = useMemo(() => {
    if (compactPanel) {
      return "z-50 flex pointer-events-none items-end justify-center px-3 pb-3";
    }
    return "z-50 flex pointer-events-none items-center justify-center p-4";
  }, [compactPanel]);

  const panelClasses = useMemo(() => {
    if (compactPanel) {
      return "pointer-events-auto flex w-full max-w-[980px] max-h-[calc(100vh-4.25rem)] flex-col rounded-xl border border-border-subtle bg-layer-01 shadow-2xl";
    }

    return showPreview
      ? "pointer-events-auto flex w-[min(88vw,1120px)] max-h-[85vh] flex-col rounded-xl border border-border-subtle bg-layer-01 shadow-2xl"
      : "pointer-events-auto flex w-full max-w-3xl max-h-[85vh] flex-col rounded-xl border border-border-subtle bg-layer-01 shadow-2xl";
  }, [compactPanel, showPreview]);

  const handleExportFormatTabClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const nextTabId = event.currentTarget.dataset.tabId as ExportFormatTab["id"] | undefined;
    if (!nextTabId) {
      return;
    }

    setActiveExportTabId(nextTabId);
    resetPdfExport();
    resetTextExport();
    resetDocxExport();
  }, [resetPdfExport, resetTextExport, resetDocxExport]);

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
      backdropClassName="bg-black/40"
      containerClassName={containerClasses}
      panelClassName={panelClasses}>
      <div className={`flex min-h-0 flex-col ${compactPanel ? "p-4" : "p-5"}`}>
        <ExportDialogHeader onCancel={handleCancel} title={title} />
        <ExportFormatTabs activeTabId={activeExportTabId} onTabClick={handleExportFormatTabClick} />
        {isPdfTabActive && (
          <PdfExportContent {...pdfExportProps} onCancel={handleCancel} handleExportClick={handlePdfExportClick} />
        )}
        {isDocxTabActive && <DocxExportContent onCancel={handleCancel} handleDocxExport={handleDocxExportClick} />}
        {isTextTabActive && activeTab && (
          <TextExportContent
            onCancel={handleCancel}
            handleTextExport={handleTextExportClick}
            handleMarkdownExport={handleMarkdownExportClick}
            showPreview={showPreview}
            locationId={activeTab.docRef.location_id}
            relPath={activeTab.docRef.rel_path}
            text={documentText} />
        )}
        {isTextTabActive && !activeTab ? <EmptyExportState /> : null}
      </div>
    </Dialog>
  );
}
