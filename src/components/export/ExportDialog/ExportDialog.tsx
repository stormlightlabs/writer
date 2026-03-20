import { Button } from "$components/Button";
import { Dialog } from "$components/Dialog";
import { PdfPreviewPanel } from "$components/export/preview/PdfPreview";
import { TextPreviewPanel } from "$components/export/preview/TextPreview";
import { FileTextIcon } from "$components/icons";
import { useDocxExportUI } from "$hooks/useDocxExport";
import { useTextExportUI } from "$hooks/useTextExport";
import { useViewportTier } from "$hooks/useViewportTier";
import { Tangled } from "$icons";
import type { PdfExportOptions, PdfRenderResult } from "$pdf/types";
import { runCmd, stringCreate } from "$ports";
import {
  useAtProtoUiState,
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
import { showErrorToast, showSuccessToast } from "$state/stores/toasts";
import type { TangledStringRecord } from "$types";
import type { EditorFontFamily, ExportFormat } from "$types";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import { type ChangeEventHandler, type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ExportDialogFooter, PdfExportDialogFooter } from "./ExportFooter";
import { ExportDialogHeader } from "./ExportHeader";
import { PdfExportDialogOptions } from "./ExportOptions";

export type ExportDialogProps = {
  onExport: (options: PdfExportOptions) => Promise<void>;
  previewResult: PdfRenderResult | null;
  editorFontFamily: EditorFontFamily;
  documentText?: string;
};

type ExportFormatTabId = ExportFormat | "string";
type ExportFormatTab = { id: ExportFormatTabId; label: string; disabled: boolean; description: string };

const EXPORT_FORMAT_TABS: ExportFormatTab[] = [
  { id: "pdf", label: "PDF", disabled: false, description: "Print-ready layout and typography controls." },
  { id: "docx", label: "DOCX", disabled: false, description: "Word-compatible document with rich formatting." },
  { id: "txt", label: "Plaintext", disabled: false, description: "Markdown removed while preserving structure." },
  { id: "string", label: "String", disabled: false, description: "Publish to Tangled as an AT Protocol string." },
];

type ExportFormatTabsProps = {
  activeTabId: ExportFormatTabId;
  onTabClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

const ExportFormatTabs = ({ activeTabId, onTabClick }: ExportFormatTabsProps) => (
  <div className="mb-4 rounded-lg border border-stroke-subtle bg-layer-02/35 p-1">
    <div className="grid grid-cols-4 gap-1">
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

function useStringPublishState(docFilename: string, documentText: string) {
  const { session } = useAtProtoUiState();
  const [publishFilename, setPublishFilename] = useState(docFilename);
  const [publishDescription, setPublishDescription] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedRecord, setPublishedRecord] = useState<TangledStringRecord | null>(null);

  useEffect(() => {
    setPublishFilename(docFilename);
    setPublishedRecord(null);
  }, [docFilename]);

  const handlePublish = useCallback(() => {
    const trimFilename = publishFilename.trim();
    const trimContents = documentText.trim();
    if (isPublishing || !session || !trimFilename || !trimContents) {
      return;
    }

    setIsPublishing(true);
    void runCmd(stringCreate(trimFilename, publishDescription.trim(), documentText, (record) => {
      setIsPublishing(false);
      setPublishedRecord(record);
      showSuccessToast(`Published "${trimFilename}" to Tangled`);
    }, (error) => {
      setIsPublishing(false);
      logger.error(f("Failed to publish Tangled string", { filename: trimFilename, error }));
      showErrorToast(error.message);
    }));
  }, [documentText, isPublishing, publishDescription, publishFilename, session]);

  const resetPublish = useCallback(() => {
    setPublishFilename(docFilename);
    setPublishDescription("");
    setPublishedRecord(null);
  }, [docFilename]);

  return {
    session,
    publishFilename,
    publishDescription,
    isPublishing,
    publishedRecord,
    setPublishFilename,
    setPublishDescription,
    handlePublish,
    resetPublish,
  };
}

const ExportFormatTabButton = ({ tab, isActive, onTabClick }: ExportFormatTabButtonProps) => (
  <button
    type="button"
    disabled={tab.disabled}
    data-tab-id={tab.id}
    data-description={tab.description}
    onClick={onTabClick}
    className={`rounded-md border px-2 py-2 text-xs transition-colors sm:px-3 sm:text-sm ${
      isActive
        ? "border-stroke-subtle bg-layer-01 text-text-primary shadow-sm"
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
  <div className="mb-3 shrink-0 rounded-lg border border-stroke-subtle bg-layer-02/35 px-3 py-2.5">
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
  <section className="flex min-h-0 h-full flex-col overflow-hidden rounded-lg border border-stroke-subtle bg-layer-02/35 p-2">
    <PdfPreviewPanel result={previewResult} options={options} editorFontFamily={editorFontFamily} />
  </section>
);

const OptionsPane = ({ isFullWidth }: { isFullWidth: boolean }) => (
  <section className={`flex min-h-0 flex-col overflow-hidden ${isFullWidth ? "flex-1" : "w-[min(32vw,320px)]"}`}>
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
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <FormatSummary
        title="PDF Export"
        description="Tune pagination and typography, then export a polished, print-ready PDF." />
      <ExportError error={error} />
      <div
        className={`min-h-0 flex-1 overflow-hidden ${
          showPreview ? "grid grid-cols-[minmax(0,1fr)_minmax(280px,320px)] gap-3" : "flex"
        }`}>
        {showPreview
          ? <PreviewPane previewResult={previewResult} options={options} editorFontFamily={editorFontFamily} />
          : null}
        <OptionsPane isFullWidth={!showPreview} />
      </div>
      <PdfExportDialogFooter handleExportClick={handleExportClick} onCancel={onCancel} label="Export PDF" />
    </section>
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
    <section className="flex min-h-0 flex-1 flex-col overflow-auto rounded-lg border border-dashed border-stroke-subtle bg-layer-02/30 p-4">
      <h3 className="m-0 text-sm font-medium text-text-primary">Export Plain Text</h3>
      <p className="m-0 mt-1 text-xs text-text-secondary">
        Strips Markdown syntax while keeping readable paragraph and list structure.
      </p>
      <div className="mt-4 rounded-md border border-stroke-subtle bg-layer-01 px-3 py-3">
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
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <FormatSummary
        title="Plain Text Export"
        description="Generate a clean text version or save the untouched markdown source." />
      <ExportError error={error} />
      <div
        className={`min-h-0 flex-1 overflow-hidden ${
          showPreview ? "grid grid-cols-[minmax(0,1fr)_minmax(280px,320px)] gap-3" : "flex"
        }`}>
        {showPreview
          ? (
            <section className="flex min-h-0 h-full flex-col overflow-hidden rounded-lg border border-stroke-subtle bg-layer-02/35 p-2">
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
    </section>
  );
}

type DocxExportContentProps = { onCancel: () => void; handleDocxExport: () => Promise<void> };

function DocxExportContent({ onCancel, handleDocxExport }: DocxExportContentProps) {
  const { docxExportError: error, isExportingDocx } = useDocxExportState();

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <FormatSummary
        title="DOCX Export"
        description="Create a Word-compatible document preserving key Markdown formatting." />
      <ExportError error={error} />
      <section className="min-h-0 flex-1 overflow-auto rounded-lg border border-stroke-subtle bg-layer-02/30 p-4">
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
    </section>
  );
}

const EmptyExportState = () => (
  <section className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-stroke-subtle bg-layer-02/30 p-4">
    <p className="m-0 text-sm text-text-secondary">Open a document to export.</p>
  </section>
);

type StringPublishFormProps = {
  publishFilename: string;
  publishDescription: string;
  sessionHandle: string;
  onFilenameChange: ChangeEventHandler<HTMLInputElement>;
  onDescriptionChange: ChangeEventHandler<HTMLInputElement>;
};

function StringPublishForm(
  { publishFilename, publishDescription, sessionHandle, onFilenameChange, onDescriptionChange }: StringPublishFormProps,
) {
  return (
    <div className="grid gap-3 rounded-lg border border-stroke-subtle bg-layer-02/30 p-3">
      <div className="grid gap-1.5">
        <label htmlFor="string-export-filename" className="text-sm font-medium text-text-primary">Filename</label>
        <input
          id="string-export-filename"
          value={publishFilename}
          onChange={onFilenameChange}
          placeholder="notes.md"
          className="w-full rounded-lg border border-stroke-subtle bg-field-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong" />
        <span className="text-xs text-text-secondary">1–140 characters.</span>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="string-export-description" className="text-sm font-medium text-text-primary">Description</label>
        <input
          id="string-export-description"
          value={publishDescription}
          onChange={onDescriptionChange}
          placeholder="Optional summary (up to 280 characters)"
          maxLength={280}
          className="w-full rounded-lg border border-stroke-subtle bg-field-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong" />
      </div>
      <div className="rounded-lg border border-stroke-subtle bg-layer-02/40 px-3 py-2">
        <p className="m-0 text-xs uppercase tracking-[0.14em] text-text-secondary">Publishing as</p>
        <p className="m-0 mt-1 text-xs font-medium text-text-primary">{sessionHandle}</p>
      </div>
    </div>
  );
}

type StringPreviewPaneProps = { documentText: string };

function StringPreviewPane({ documentText }: StringPreviewPaneProps) {
  return (
    <section className="min-h-0 overflow-hidden rounded-lg border border-stroke-subtle bg-[#0f1720]">
      <div className="border-b border-white/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white/65">
        Preview
      </div>
      <pre className="h-full overflow-auto px-3 py-3 text-xs leading-5 text-white/90">
        {documentText || "No content to preview."}
      </pre>
    </section>
  );
}

type StringPublishSuccessBannerProps = { uri: string };

function StringPublishSuccessBanner({ uri }: StringPublishSuccessBannerProps) {
  return (
    <div className="mb-3 rounded-lg border border-support-success/35 bg-support-success/10 px-3 py-2.5">
      <p className="m-0 text-sm font-medium text-support-success">Published successfully</p>
      <p className="m-0 mt-1 break-all text-xs text-text-secondary">{uri}</p>
    </div>
  );
}

type StringNoSessionProps = Record<string, never>;

function StringNoSession(_: StringNoSessionProps) {
  return (
    <section className="min-h-0 flex-1 overflow-auto rounded-lg border border-dashed border-stroke-subtle bg-layer-02/30 p-4">
      <div className="flex items-center gap-2">
        <Tangled className="h-5 w-5 shrink-0 text-text-secondary" />
        <h3 className="m-0 text-sm font-medium text-text-primary">Connect Tangled to publish</h3>
      </div>
      <p className="m-0 mt-2 text-xs text-text-secondary">
        Sign in with your AT Protocol handle using the <span className="font-medium text-text-primary">@</span>{" "}
        button in the toolbar, then return here to publish.
      </p>
    </section>
  );
}

type StringExportContentProps = { onCancel: () => void; docFilename: string; documentText: string };

function StringExportContent({ onCancel, docFilename, documentText }: StringExportContentProps) {
  const {
    session,
    publishFilename,
    publishDescription,
    isPublishing,
    publishedRecord,
    setPublishFilename,
    setPublishDescription,
    handlePublish,
  } = useStringPublishState(docFilename, documentText);

  const handleFilenameChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    setPublishFilename(event.target.value);
  }, [setPublishFilename]);

  const handleDescriptionChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    setPublishDescription(event.target.value);
  }, [setPublishDescription]);

  const publishDisabled = useMemo(() => isPublishing || !publishFilename.trim() || !documentText.trim() || !session, [
    isPublishing,
    publishFilename,
    documentText,
    session,
  ]);

  if (!session) {
    return (
      <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <FormatSummary
          title="Publish as Tangled String"
          description="Publish this document as an AT Protocol string on Tangled." />
        <StringNoSession />
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <FormatSummary
        title="Publish as Tangled String"
        description="Publish this document as an AT Protocol string on Tangled." />
      {publishedRecord && <StringPublishSuccessBanner uri={publishedRecord.uri} />}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 overflow-hidden">
        <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <StringPublishForm
            publishFilename={publishFilename}
            publishDescription={publishDescription}
            sessionHandle={session.handle}
            onFilenameChange={handleFilenameChange}
            onDescriptionChange={handleDescriptionChange} />
        </section>
        <StringPreviewPane documentText={documentText} />
      </div>
      <ExportDialogFooter
        handleExport={handlePublish}
        onCancel={onCancel}
        label="Publish to Tangled"
        isLoading={isPublishing}
        disable={publishDisabled} />
    </section>
  );
}

export function ExportDialog({ onExport, previewResult, editorFontFamily, documentText = "" }: ExportDialogProps) {
  const { isOpen, setOpen: setIsOpen, options } = usePdfDialogUiState();
  const { resetPdfExport } = usePdfExportActions();
  const { resetTextExport } = useTextExportActions();
  const { resetDocxExport } = useDocxExportActions();
  const { tabs, activeTabId } = useTabsState();
  const { documents } = useWorkspaceDocumentsState();
  const { isCompact, viewportWidth } = useViewportTier();
  const [activeExportTabId, setActiveExportTabId] = useState<ExportFormatTabId>("pdf");
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
  const showPreview = useMemo(() => !compactPanel, [compactPanel]);
  const isPdfTabActive = useMemo(() => activeExportTabId === "pdf", [activeExportTabId]);
  const isDocxTabActive = useMemo(() => activeExportTabId === "docx", [activeExportTabId]);
  const isTextTabActive = useMemo(() => activeExportTabId === "txt", [activeExportTabId]);
  const isStringTabActive = useMemo(() => activeExportTabId === "string", [activeExportTabId]);

  const docFilename = useMemo(() => {
    if (!activeTab) {
      return "";
    }
    const relPath = activeTab.docRef.rel_path;
    return relPath.split("/").pop() ?? relPath;
  }, [activeTab]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    logger.debug(f("Export dialog layout resolved", { viewportWidth, compactPanel, showPreview, activeExportTabId }));
  }, [activeExportTabId, compactPanel, isOpen, showPreview, viewportWidth]);

  const containerClasses = useMemo(() => {
    if (compactPanel) {
      return "z-50 flex pointer-events-none items-end justify-center px-3 pb-3";
    }
    return "z-50 flex pointer-events-none items-center justify-center p-4";
  }, [compactPanel]);

  const panelClasses = useMemo(() => {
    if (compactPanel) {
      return "pointer-events-auto flex h-[min(90vh,760px)] w-full max-w-[980px] flex-col rounded-xl border border-stroke-subtle bg-layer-01 shadow-2xl";
    }

    return showPreview
      ? "pointer-events-auto flex h-[min(86vh,820px)] w-[min(84vw,1020px)] flex-col rounded-xl border border-stroke-subtle bg-layer-01 shadow-2xl"
      : "pointer-events-auto flex h-[min(82vh,720px)] w-[min(84vw,760px)] flex-col rounded-xl border border-stroke-subtle bg-layer-01 shadow-2xl";
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
      <div className={`flex h-full min-h-0 flex-col overflow-hidden ${compactPanel ? "p-4" : "p-5"}`}>
        <ExportDialogHeader onCancel={handleCancel} title={title} />
        <ExportFormatTabs activeTabId={activeExportTabId} onTabClick={handleExportFormatTabClick} />
        <div className="min-h-0 flex-1 overflow-hidden">
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
          {isStringTabActive && activeTab && (
            <StringExportContent onCancel={handleCancel} docFilename={docFilename} documentText={documentText} />
          )}
          {isStringTabActive && !activeTab ? <EmptyExportState /> : null}
        </div>
      </div>
    </Dialog>
  );
}
