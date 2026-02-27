import { MarkdownPdfDocument } from "$components/pdf/MarkdownPdfDocument";
import { ensurePdfFontRegistered } from "$pdf/fonts";
import type { FontStrategy, PdfExportOptions, PdfRenderResult } from "$pdf/types";
import type { EditorFontFamily } from "$types";
import { pdf } from "@react-pdf/renderer";
import * as pdfjsLib from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).href;

type PdfPreviewState = { status: "idle" } | { status: "loading" } | { status: "error"; message: string } | {
  status: "success";
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageCount: number;
};

type UsePdfPreviewArgs = {
  result: PdfRenderResult | null;
  options: PdfExportOptions;
  editorFontFamily: EditorFontFamily;
};

export type PdfPreviewPanelProps = {
  result: PdfRenderResult | null;
  options: PdfExportOptions;
  editorFontFamily: EditorFontFamily;
};

const MAX_RETRIES = 2;

export function usePdfPreview({ result, options, editorFontFamily }: UsePdfPreviewArgs) {
  const [state, setState] = useState<PdfPreviewState>({ status: "idle" });
  const abortControllerRef = useRef<AbortController | null>(null);

  const renderPdfBlob = useCallback(
    async (
      pdfResult: PdfRenderResult,
      pdfOptions: PdfExportOptions,
      fontFamily: EditorFontFamily,
      strategy: FontStrategy,
      signal: AbortSignal,
    ): Promise<Blob> => {
      if (signal.aborted) {
        throw new Error("Preview generation aborted");
      }

      await ensurePdfFontRegistered(fontFamily, strategy);
      await ensurePdfFontRegistered("IBM Plex Mono", strategy);

      if (signal.aborted) {
        throw new Error("Preview generation aborted");
      }

      const blob = await pdf(
        <MarkdownPdfDocument
          nodes={pdfResult.nodes}
          title={pdfResult.title}
          options={pdfOptions}
          editorFontFamily={fontFamily}
          useBuiltinFonts={strategy === "builtin"} />,
      ).toBlob();

      return blob;
    },
    [],
  );

  const generatePreview = useCallback(async (signal: AbortSignal) => {
    if (!result) {
      setState({ status: "idle" });
      return;
    }

    setState({ status: "loading" });

    try {
      let blob: Blob;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const strategy: FontStrategy = attempt === 0 ? "custom" : "builtin";

        try {
          if (signal.aborted) {
            throw new Error("Preview generation aborted");
          }

          blob = await renderPdfBlob(result, options, editorFontFamily, strategy, signal);
          break;
        } catch (error) {
          if (signal.aborted) {
            throw error;
          }

          if (attempt < MAX_RETRIES - 1) {
            continue;
          }

          throw error;
        }
      }

      if (signal.aborted) {
        throw new Error("Preview generation aborted");
      }

      const arrayBuffer = await blob!.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;

      if (signal.aborted) {
        pdfDoc.destroy();
        throw new Error("Preview generation aborted");
      }

      setState({ status: "success", pdfDoc, pageCount: pdfDoc.numPages });
    } catch (error) {
      if (signal.aborted) {
        return;
      }

      const message = error instanceof Error ? error.message : "Failed to generate preview";
      setState({ status: "error", message });
    }
  }, [result, options, editorFontFamily, renderPdfBlob]);

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const { signal } = abortControllerRef.current;

    const timeoutId = setTimeout(() => {
      void generatePreview(signal);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      abortControllerRef.current?.abort();
    };
  }, [generatePreview]);

  useEffect(() => {
    return () => {
      if (state.status === "success") {
        state.pdfDoc.destroy();
      }
    };
  }, [state]);

  return state;
}

const PreviewSkeletonLines = () => (
  <>
    <div className="h-4 bg-layer-03 rounded animate-pulse" />
    <div className="space-y-2">
      <div className="h-3 bg-layer-03 rounded animate-pulse w-full" />
      <div className="h-3 bg-layer-03 rounded animate-pulse w-5/6" />
      <div className="h-3 bg-layer-03 rounded animate-pulse w-4/5" />
    </div>
    <div className="h-32 bg-layer-03 rounded animate-pulse" />
    <div className="space-y-2">
      <div className="h-3 bg-layer-03 rounded animate-pulse w-full" />
      <div className="h-3 bg-layer-03 rounded animate-pulse w-3/4" />
    </div>
  </>
);

const PreviewSkeleton = () => (
  <div className="flex flex-col min-h-[400px] bg-layer-02 rounded-lg overflow-hidden">
    <div className="flex items-center justify-center flex-1 p-8">
      <div className="w-full max-w-md space-y-4">
        <PreviewSkeletonLines />
      </div>
    </div>
  </div>
);

const PreviewError = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center min-h-[400px] bg-layer-02 rounded-lg p-4">
    <div className="text-center">
      <p className="text-sm text-support-error mb-2">Failed to generate preview</p>
      <p className="text-xs text-text-secondary">{message}</p>
    </div>
  </div>
);

type PageNavigationProps = { currentPage: number; pageCount: number; onPrev: () => void; onNext: () => void };

const PageNavigation = ({ currentPage, pageCount, onPrev, onNext }: PageNavigationProps) => (
  <div className="flex items-center justify-center gap-3 py-2 px-4 bg-layer-01 border-t border-border-subtle">
    <button
      type="button"
      onClick={onPrev}
      disabled={currentPage <= 1}
      className="p-1.5 rounded hover:bg-layer-03 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      aria-label="Previous page">
      <svg className="w-4 h-4 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <span className="text-sm text-text-secondary min-w-[80px] text-center">{currentPage} / {pageCount}</span>
    <button
      type="button"
      onClick={onNext}
      disabled={currentPage >= pageCount}
      className="p-1.5 rounded hover:bg-layer-03 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      aria-label="Next page">
      <svg className="w-4 h-4 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
);

type PdfPageCanvasProps = { pdfDoc: pdfjsLib.PDFDocumentProxy; pageNumber: number };

const PdfPageCanvas = ({ pdfDoc, pageNumber }: PdfPageCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) {
          page.cleanup();
          return;
        }

        const containerWidth = canvas.parentElement?.clientWidth ?? 600;
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(containerWidth / viewport.width, 1.5);
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        renderTaskRef.current = page.render({ canvasContext: ctx, viewport: scaledViewport, canvas });

        await renderTaskRef.current.promise;
        page.cleanup();
      } catch (err) {
        if (err instanceof Error && err.message.includes("cancelled")) {
          return void 0;
        }
      }
    };

    void renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, pageNumber]);

  return <canvas ref={canvasRef} className="mx-auto shadow-lg bg-white" />;
};

type PreviewSuccessProps = { pdfDoc: pdfjsLib.PDFDocumentProxy; pageCount: number };

const PreviewSuccess = ({ pdfDoc, pageCount }: PreviewSuccessProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  const handlePrev = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentPage((prev) => Math.min(pageCount, prev + 1));
  }, [pageCount]);

  return (
    <div className="flex flex-col min-h-[400px] bg-layer-02 rounded-lg overflow-hidden">
      <div className="flex-1 overflow-auto p-4">
        <PdfPageCanvas pdfDoc={pdfDoc} pageNumber={currentPage} />
      </div>
      {pageCount > 1 && (
        <PageNavigation currentPage={currentPage} pageCount={pageCount} onPrev={handlePrev} onNext={handleNext} />
      )}
    </div>
  );
};

export function PdfPreviewPanel({ result, options, editorFontFamily }: PdfPreviewPanelProps) {
  const previewState = usePdfPreview({ result, options, editorFontFamily });

  if (previewState.status === "idle") {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-layer-02 rounded-lg">
        <p className="text-sm text-text-secondary">Select a document to preview</p>
      </div>
    );
  }

  if (previewState.status === "loading") {
    return <PreviewSkeleton />;
  }

  if (previewState.status === "error") {
    return <PreviewError message={previewState.message} />;
  }

  return <PreviewSuccess pdfDoc={previewState.pdfDoc} pageCount={previewState.pageCount} />;
}
