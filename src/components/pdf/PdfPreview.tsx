import { MarkdownPdfDocument } from "$components/pdf/MarkdownPdfDocument";
import { ensurePdfFontRegistered } from "$pdf/fonts";
import type { FontStrategy, PdfExportOptions, PdfRenderResult } from "$pdf/types";
import type { EditorFontFamily } from "$types";
import { pdf } from "@react-pdf/renderer";
import * as pdfjsLib from "pdfjs-dist";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
type FitMode = "page" | "width";
type ZoomDirection = "in" | "out";
type ZoomButtonProps = {
  direction: ZoomDirection;
  disabled: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;
const FIT_MODE_OPTIONS: Array<{ value: FitMode; label: string }> = [{ value: "page", label: "Fit Page" }, {
  value: "width",
  label: "Fit Width",
}];

const FitModeSelect = (
  { fitMode, onChange }: { fitMode: FitMode; onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void },
) => (
  <select
    id="pdf-fit-mode"
    value={fitMode}
    onChange={onChange}
    className="px-2 py-1 text-xs bg-layer-02 border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-cyan">
    {FIT_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>
);

const ZoomButton = ({ direction, disabled, onClick }: ZoomButtonProps) => (
  <button
    type="button"
    data-zoom-direction={direction}
    onClick={onClick}
    disabled={disabled}
    className="px-2 py-1 text-xs rounded border border-border-subtle text-text-primary hover:bg-layer-03 disabled:opacity-40 disabled:cursor-not-allowed"
    aria-label={direction === "in" ? "Zoom in" : "Zoom out"}>
    {direction === "in" ? "+" : "-"}
  </button>
);

const PdfPageCanvas = (
  { pdfDoc, pageNumber, fitMode, zoomLevel }: PdfPageCanvasProps & { fitMode: FitMode; zoomLevel: number },
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver !== "function") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const width = Math.max(1, Math.floor(entry.contentRect.width));
      const height = Math.max(1, Math.floor(entry.contentRect.height));
      setContainerSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, []);

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

        const measuredWidth = containerSize.width > 0
          ? containerSize.width
          : (canvas.parentElement?.clientWidth ?? 600);
        const measuredHeight = containerSize.height > 0
          ? containerSize.height
          : (canvas.parentElement?.clientHeight ?? 800);
        const viewport = page.getViewport({ scale: 1 });
        const fitScale = fitMode === "width"
          ? measuredWidth / viewport.width
          : Math.min(measuredWidth / viewport.width, measuredHeight / viewport.height);
        const scale = clamp(fitScale * zoomLevel, 0.1, 4);
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
  }, [containerSize.height, containerSize.width, fitMode, pdfDoc, pageNumber, zoomLevel]);

  return (
    <div ref={containerRef} className="h-full w-full overflow-auto">
      <div className="min-h-full flex items-start justify-center p-2">
        <canvas ref={canvasRef} className="block shadow-lg bg-white" />
      </div>
    </div>
  );
};

type PreviewToolbarProps = {
  fitMode: FitMode;
  zoomLevel: number;
  handleFitModeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  handleZoomClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

function PreviewToolbar({ fitMode, zoomLevel, handleFitModeChange, handleZoomClick }: PreviewToolbarProps) {
  const zoomPercent = useMemo(() => Math.round(zoomLevel * 100), [zoomLevel]);

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-text-secondary" htmlFor="pdf-fit-mode">Fit</label>
      <FitModeSelect fitMode={fitMode} onChange={handleFitModeChange} />
      <ZoomButton direction="out" onClick={handleZoomClick} disabled={zoomLevel <= MIN_ZOOM} />
      <span className="text-xs text-text-secondary min-w-[44px] text-center" aria-label="Zoom level">
        {zoomPercent}%
      </span>
      <ZoomButton direction="in" onClick={handleZoomClick} disabled={zoomLevel >= MAX_ZOOM} />
    </div>
  );
}

type PreviewNavigationInputProps = {
  pageCount: number;
  currentPage: number;
  handlePageInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

function PreviewNavigationInput({ pageCount, currentPage, handlePageInputChange }: PreviewNavigationInputProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary">
      <label htmlFor="pdf-page-input">Page</label>
      <input
        id="pdf-page-input"
        type="number"
        min={1}
        max={pageCount}
        value={currentPage}
        onChange={handlePageInputChange}
        className="w-16 px-2 py-1 bg-layer-02 border border-border-subtle rounded text-text-primary" />
      <span>/ {pageCount}</span>
    </div>
  );
}

type PreviewSuccessProps = { pdfDoc: pdfjsLib.PDFDocumentProxy; pageCount: number };

function PreviewSuccess({ pdfDoc, pageCount }: PreviewSuccessProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [fitMode, setFitMode] = useState<FitMode>("page");
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
    setFitMode("page");
    setZoomLevel(1);
  }, [pdfDoc]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, pageCount));
  }, [pageCount]);

  const handlePrev = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentPage((prev) => Math.min(pageCount, prev + 1));
  }, [pageCount]);

  const handleZoom = useCallback((direction: ZoomDirection) => {
    setZoomLevel((prev) => {
      const next = direction === "in" ? prev + ZOOM_STEP : prev - ZOOM_STEP;
      return clamp(Math.round(next * 10) / 10, MIN_ZOOM, MAX_ZOOM);
    });
  }, []);

  const handleZoomClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const direction = event.currentTarget.dataset.zoomDirection as ZoomDirection | undefined;
    if (!direction) {
      return;
    }
    handleZoom(direction);
  }, [handleZoom]);

  const handleFitModeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setFitMode(event.target.value as FitMode);
    setZoomLevel(1);
  }, []);

  const handlePageInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextPage = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(nextPage)) {
      return;
    }
    setCurrentPage(clamp(nextPage, 1, pageCount));
  }, [pageCount]);

  return (
    <div className="flex flex-col min-h-[400px] bg-layer-02 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-layer-01 border-b border-border-subtle">
        <PreviewToolbar
          fitMode={fitMode}
          zoomLevel={zoomLevel}
          handleFitModeChange={handleFitModeChange}
          handleZoomClick={handleZoomClick} />
        <PreviewNavigationInput
          pageCount={pageCount}
          currentPage={currentPage}
          handlePageInputChange={handlePageInputChange} />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <PdfPageCanvas pdfDoc={pdfDoc} pageNumber={currentPage} fitMode={fitMode} zoomLevel={zoomLevel} />
      </div>
      {pageCount > 1 && (
        <PageNavigation currentPage={currentPage} pageCount={pageCount} onPrev={handlePrev} onNext={handleNext} />
      )}
    </div>
  );
}

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
