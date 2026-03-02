import { MarkdownPdfDocument } from "$components/export/MarkdownPdfDocument";
import { PDFError } from "$pdf/errors";
import { ensurePdfFontRegistered } from "$pdf/fonts";
import type { FontStrategy, PdfExportOptions, PdfRenderResult } from "$pdf/types";
import type { EditorFontFamily } from "$types";
import { f } from "$utils/serialize";
import { pdf } from "@react-pdf/renderer";
import * as logger from "@tauri-apps/plugin-log";
import * as pdfjsLib from "pdfjs-dist";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).href;

type PdfPreviewState = { status: "idle" } | { status: "loading" } | { status: "error"; message: string } | {
  status: "success";
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageCount: number;
  usedBuiltinFonts: boolean;
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

type FitMode = "page" | "width";
type ZoomDirection = "in" | "out";

const MAX_RETRIES = 2;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;
const FIT_MODE_OPTIONS: Array<{ value: FitMode; label: string }> = [{ value: "width", label: "Fit Width" }, {
  value: "page",
  label: "Fit Page",
}];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Failed to generate preview";

export function usePdfPreview({ result, options, editorFontFamily }: UsePdfPreviewArgs) {
  const [state, setState] = useState<PdfPreviewState>({ status: "idle" });
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentPdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  const destroyCurrentPdfDoc = useCallback(() => {
    const currentDoc = currentPdfDocRef.current;
    if (currentDoc) {
      currentDoc.destroy();
      currentPdfDocRef.current = null;
    }
  }, []);

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

      logger.debug(f("PDF preview render attempt started", { strategy, fontFamily }));

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

      logger.debug(f("PDF preview render attempt completed", { strategy, outputSizeBytes: blob.size }));

      return blob;
    },
    [],
  );

  const generatePreview = useCallback(async (signal: AbortSignal) => {
    if (!result) {
      destroyCurrentPdfDoc();
      setState({ status: "idle" });
      return;
    }

    setState({ status: "loading" });

    try {
      let blob: Blob | null = null;
      let strategyUsed: FontStrategy = "custom";
      let customError: unknown = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
        const strategy: FontStrategy = attempt === 0 ? "custom" : "builtin";

        try {
          blob = await renderPdfBlob(result, options, editorFontFamily, strategy, signal);
          strategyUsed = strategy;
          break;
        } catch (error) {
          if (signal.aborted) {
            throw error;
          }

          if (attempt === 0) {
            customError = error;
            logger.warn(
              f("PDF preview custom font render failed; retrying with built-in fonts", {
                editorFontFamily,
                error: PDFError.serialize(error),
              }),
            );
            continue;
          }

          logger.error(
            f("PDF preview render failed", {
              editorFontFamily,
              customError: PDFError.serialize(customError),
              builtinError: PDFError.serialize(error),
            }),
          );
          throw error;
        }
      }

      if (!blob) {
        throw new Error("Failed to build preview blob");
      }

      if (signal.aborted) {
        throw new Error("Preview generation aborted");
      }

      const arrayBuffer = await blob.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;

      if (signal.aborted) {
        pdfDoc.destroy();
        throw new Error("Preview generation aborted");
      }

      destroyCurrentPdfDoc();
      currentPdfDocRef.current = pdfDoc;
      setState({ status: "success", pdfDoc, pageCount: pdfDoc.numPages, usedBuiltinFonts: strategyUsed === "builtin" });
    } catch (error) {
      if (signal.aborted) {
        return;
      }

      destroyCurrentPdfDoc();
      setState({ status: "error", message: getErrorMessage(error) });
    }
  }, [destroyCurrentPdfDoc, editorFontFamily, options, renderPdfBlob, result]);

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
      abortControllerRef.current?.abort();
      destroyCurrentPdfDoc();
    };
  }, [destroyCurrentPdfDoc]);

  return state;
}

const PreviewSkeleton = () => (
  <div className="flex h-full min-h-0 items-center justify-center rounded-lg bg-layer-02 p-6">
    <div className="w-full max-w-md space-y-3">
      <div className="h-4 w-32 rounded bg-layer-03 animate-pulse" />
      <div className="h-3 w-full rounded bg-layer-03 animate-pulse" />
      <div className="h-3 w-10/12 rounded bg-layer-03 animate-pulse" />
      <div className="h-72 rounded bg-layer-03 animate-pulse" />
    </div>
  </div>
);

const PreviewError = ({ message }: { message: string }) => (
  <div className="flex h-full min-h-0 items-center justify-center rounded-lg bg-layer-02 p-4">
    <div className="text-center">
      <p className="m-0 text-sm text-support-error">Failed to generate preview</p>
      <p className="m-0 mt-1 text-xs text-text-secondary">{message}</p>
    </div>
  </div>
);

type MultiPageCanvasProps = {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageCount: number;
  fitMode: FitMode;
  zoomLevel: number;
  scrollToPage: number;
  onVisiblePageChange: (page: number) => void;
};

function MultiPageCanvas(
  { pdfDoc, pageCount, fitMode, zoomLevel, scrollToPage, onVisiblePageChange }: MultiPageCanvasProps,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const renderTasksRef = useRef<Map<number, pdfjsLib.RenderTask>>(new Map());
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const pageNumbers = useMemo(() => Array.from({ length: pageCount }, (_, index) => index + 1), [pageCount]);
  const pageContainerRefSetters = useMemo(() =>
    pageNumbers.map((_, index) => (element: HTMLDivElement | null) => {
      pageContainerRefs.current[index] = element;
    }), [pageNumbers]);
  const canvasRefSetters = useMemo(() =>
    pageNumbers.map((_, index) => (element: HTMLCanvasElement | null) => {
      canvasRefs.current[index] = element;
    }), [pageNumbers]);

  useEffect(() => {
    pageContainerRefs.current = Array.from(
      { length: pageCount },
      (_, index) => pageContainerRefs.current[index] ?? null,
    );
    canvasRefs.current = Array.from({ length: pageCount }, (_, index) => canvasRefs.current[index] ?? null);
  }, [pageCount]);

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
      setContainerSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height }
      );
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tasks = renderTasksRef.current;

    const cancelTasks = () => {
      for (const task of tasks.values()) {
        task.cancel();
      }
      tasks.clear();
    };

    const renderPage = async (pageNumber: number) => {
      const canvas = canvasRefs.current[pageNumber - 1];
      if (!canvas) {
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      try {
        const page = await pdfDoc.getPage(pageNumber);

        if (cancelled) {
          page.cleanup();
          return;
        }

        const baseViewport = page.getViewport({ scale: 1 });
        const effectiveWidth = Math.max(1, containerSize.width - 24);
        const effectiveHeight = Math.max(1, containerSize.height - 24);
        const widthScale = effectiveWidth / baseViewport.width;
        const heightScale = effectiveHeight / baseViewport.height;
        const fitScale = fitMode === "width" ? widthScale : Math.min(widthScale, heightScale);
        const previewScale = clamp(fitScale * zoomLevel, 0.1, 4);
        const viewport = page.getViewport({ scale: previewScale });
        const devicePixelRatio = Math.max(1, globalThis.devicePixelRatio || 1);
        const renderViewport = page.getViewport({ scale: previewScale * devicePixelRatio });

        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const existingTask = tasks.get(pageNumber);
        existingTask?.cancel();

        const renderTask = page.render({ canvas, canvasContext: context, viewport: renderViewport });
        tasks.set(pageNumber, renderTask);

        await renderTask.promise;
        tasks.delete(pageNumber);
        page.cleanup();
      } catch (error) {
        if (!(error instanceof Error && error.message.includes("cancelled"))) {
          logger.debug(f("PDF preview page render failed", { pageNumber, message: getErrorMessage(error) }));
        }
      }
    };

    void Promise.all(pageNumbers.map((pageNumber) => renderPage(pageNumber)));

    return () => {
      cancelled = true;
      cancelTasks();
    };
  }, [containerSize.height, containerSize.width, fitMode, pageNumbers, pdfDoc, zoomLevel]);

  useEffect(() => {
    const target = pageContainerRefs.current[scrollToPage - 1];
    if (!target) {
      return;
    }

    if (typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [scrollToPage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let animationFrame = 0;

    const updateVisiblePage = () => {
      const containerRect = container.getBoundingClientRect();
      const viewportMiddleY = containerRect.top + (containerRect.height / 2);

      let closestPage = 1;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (let index = 0; index < pageContainerRefs.current.length; index += 1) {
        const pageElement = pageContainerRefs.current[index];
        if (!pageElement) {
          continue;
        }

        const pageRect = pageElement.getBoundingClientRect();
        const pageMiddleY = pageRect.top + (pageRect.height / 2);
        const distance = Math.abs(pageMiddleY - viewportMiddleY);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = index + 1;
        }
      }

      onVisiblePageChange(closestPage);
      animationFrame = 0;
    };

    const scheduleVisiblePageUpdate = () => {
      if (animationFrame !== 0) {
        return;
      }

      animationFrame = globalThis.requestAnimationFrame(updateVisiblePage);
    };

    scheduleVisiblePageUpdate();
    container.addEventListener("scroll", scheduleVisiblePageUpdate, { passive: true });

    return () => {
      container.removeEventListener("scroll", scheduleVisiblePageUpdate);
      if (animationFrame !== 0) {
        globalThis.cancelAnimationFrame(animationFrame);
      }
    };
  }, [containerSize.height, containerSize.width, onVisiblePageChange, pageCount]);

  return (
    <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto bg-layer-02 px-3 py-3">
      <div className="mx-auto flex w-full max-w-[980px] flex-col gap-4">
        {pageNumbers.map((pageNumber, index) => (
          <div
            key={pageNumber}
            ref={pageContainerRefSetters[index]}
            data-page-number={pageNumber}
            className="flex justify-center rounded border border-stroke-subtle bg-layer-01 px-2 py-2">
            <canvas ref={canvasRefSetters[index]} className="block max-w-full bg-white shadow-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

type PreviewToolbarProps = {
  fitMode: FitMode;
  zoomLevel: number;
  currentPage: number;
  pageCount: number;
  onFitModeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onZoomClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onPageInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPrev: () => void;
  onNext: () => void;
};

function PreviewToolbar(
  { fitMode, zoomLevel, currentPage, pageCount, onFitModeChange, onZoomClick, onPageInputChange, onPrev, onNext }:
    PreviewToolbarProps,
) {
  const zoomPercent = Math.round(zoomLevel * 100);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke-subtle bg-layer-01/80 px-3 py-2">
      <div className="flex items-center gap-2">
        <label htmlFor="pdf-fit-mode" className="text-xs text-text-secondary">Fit</label>
        <select
          id="pdf-fit-mode"
          value={fitMode}
          onChange={onFitModeChange}
          className="px-2 py-1 text-xs bg-layer-02 border border-stroke-subtle rounded text-text-primary focus:outline-none focus:border-accent-cyan">
          {FIT_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>

        <button
          type="button"
          data-zoom-direction="out"
          onClick={onZoomClick}
          disabled={zoomLevel <= MIN_ZOOM}
          className="px-2 py-1 text-xs rounded border border-stroke-subtle text-text-primary hover:bg-layer-03 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Zoom out">
          -
        </button>
        <span className="text-xs text-text-secondary min-w-[44px] text-center" aria-label="Zoom level">
          {zoomPercent}%
        </span>
        <button
          type="button"
          data-zoom-direction="in"
          onClick={onZoomClick}
          disabled={zoomLevel >= MAX_ZOOM}
          className="px-2 py-1 text-xs rounded border border-stroke-subtle text-text-primary hover:bg-layer-03 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Zoom in">
          +
        </button>
      </div>

      {pageCount > 1
        ? (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <button
              type="button"
              onClick={onPrev}
              disabled={currentPage <= 1}
              className="px-2 py-1 rounded border border-stroke-subtle hover:bg-layer-03 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page">
              Prev
            </button>
            <label htmlFor="pdf-page-input" className="sr-only">Page number</label>
            <input
              id="pdf-page-input"
              type="number"
              min={1}
              max={pageCount}
              value={currentPage}
              onChange={onPageInputChange}
              className="w-14 px-2 py-1 bg-layer-02 border border-stroke-subtle rounded text-text-primary" />
            <span>{currentPage} / {pageCount}</span>
            <button
              type="button"
              onClick={onNext}
              disabled={currentPage >= pageCount}
              className="px-2 py-1 rounded border border-stroke-subtle hover:bg-layer-03 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page">
              Next
            </button>
          </div>
        )
        : <span className="text-xs text-text-secondary">{currentPage} / {pageCount}</span>}
    </div>
  );
}

type PreviewSuccessProps = { pdfDoc: pdfjsLib.PDFDocumentProxy; pageCount: number; usedBuiltinFonts: boolean };

function PreviewSuccess({ pdfDoc, pageCount, usedBuiltinFonts }: PreviewSuccessProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [fitMode, setFitMode] = useState<FitMode>("width");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollToPage, setScrollToPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
    setScrollToPage(1);
    setFitMode("width");
    setZoomLevel(1);
  }, [pdfDoc]);

  const goToPage = useCallback((page: number) => {
    const nextPage = clamp(page, 1, pageCount);
    setCurrentPage(nextPage);
    setScrollToPage(nextPage);
  }, [pageCount]);

  const handleFitModeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setFitMode(event.target.value as FitMode);
  }, []);

  const handleZoom = useCallback((direction: ZoomDirection) => {
    setZoomLevel((previous) => {
      const next = direction === "in" ? previous + ZOOM_STEP : previous - ZOOM_STEP;
      return clamp(Math.round(next * 10) / 10, MIN_ZOOM, MAX_ZOOM);
    });
  }, []);

  const handleZoomClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const direction = event.currentTarget.dataset.zoomDirection as ZoomDirection | undefined;
    if (!direction) {
      return;
    }

    handleZoom(direction);
  }, [handleZoom]);

  const handlePageInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextPage = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(nextPage)) {
      return;
    }

    goToPage(nextPage);
  }, [goToPage]);

  const handlePrev = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const handleNext = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-stroke-subtle bg-layer-02/30">
      <PreviewToolbar
        fitMode={fitMode}
        zoomLevel={zoomLevel}
        currentPage={currentPage}
        pageCount={pageCount}
        onFitModeChange={handleFitModeChange}
        onZoomClick={handleZoomClick}
        onPageInputChange={handlePageInputChange}
        onPrev={handlePrev}
        onNext={handleNext} />
      {usedBuiltinFonts
        ? (
          <div className="border-b border-stroke-subtle bg-layer-01/60 px-3 py-1 text-[0.6875rem] text-text-secondary">
            Preview is using built-in fonts due to custom font loading issues.
          </div>
        )
        : null}
      <MultiPageCanvas
        pdfDoc={pdfDoc}
        pageCount={pageCount}
        fitMode={fitMode}
        zoomLevel={zoomLevel}
        scrollToPage={scrollToPage}
        onVisiblePageChange={setCurrentPage} />
    </div>
  );
}

export function PdfPreviewPanel({ result, options, editorFontFamily }: PdfPreviewPanelProps) {
  const previewState = usePdfPreview({ result, options, editorFontFamily });

  if (previewState.status === "idle") {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-lg bg-layer-02">
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

  return (
    <PreviewSuccess
      pdfDoc={previewState.pdfDoc}
      pageCount={previewState.pageCount}
      usedBuiltinFonts={previewState.usedBuiltinFonts} />
  );
}
