import { MarkdownPdfDocument } from "$components/export/MarkdownPdfDocument";
import { PDFError } from "$pdf/errors";
import { describePdfFont, ensurePdfFontRegistered, resolvePdfFont } from "$pdf/fonts";
import { preloadPdfImages } from "$pdf/images";
import type { FontName, FontStrategy, MarkdownNode, PdfExportOptions, PdfRenderResult } from "$pdf/types";
import { renderMarkdownForPdf, runCmd } from "$ports";
import { usePdfDialogUiState, usePdfExportActions } from "$state/selectors";
import type { EditorFontFamily, LocationDescriptor, Tab } from "$types";
import { f } from "$utils/serialize";
import { pdf } from "@react-pdf/renderer";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useState } from "react";

export type ExportPdfFn = (
  result: PdfRenderResult,
  options: PdfExportOptions,
  editorFontFamily: EditorFontFamily,
  locationRootPath?: string,
  docRelPath?: string,
) => Promise<boolean>;

const runtimeContext = () => ({
  href: globalThis.location?.href ?? null,
  origin: globalThis.location?.origin ?? null,
  userAgent: globalThis.navigator?.userAgent ?? null,
});

export function usePdfExport(): ExportPdfFn {
  const { startPdfExport, finishPdfExport, failPdfExport } = usePdfExportActions();

  const resolveImages = useCallback(async (nodes: MarkdownNode[], locationRootPath?: string, docRelPath?: string) => {
    return locationRootPath && docRelPath ? await preloadPdfImages(nodes, locationRootPath, docRelPath) : {};
  }, []);

  const renderPdfBlob = useCallback(
    async (
      result: PdfRenderResult,
      options: PdfExportOptions,
      editorFontFamily: EditorFontFamily,
      strategy: FontStrategy,
      images: Record<string, string>,
    ) => {
      const bodyFont = describePdfFont(editorFontFamily, strategy);
      const codeFont = describePdfFont("IBM Plex Mono", strategy);
      logger.debug(f("PDF export render attempt started", { strategy, bodyFont, codeFont, runtime: runtimeContext() }));

      await ensurePdfFontRegistered(editorFontFamily, strategy);
      await ensurePdfFontRegistered("IBM Plex Mono", strategy);

      const blob = await pdf(
        <MarkdownPdfDocument
          nodes={result.nodes}
          title={result.title}
          options={options}
          editorFontFamily={editorFontFamily}
          useBuiltinFonts={strategy === "builtin"}
          resolvedImages={images} />,
      ).toBlob();

      logger.debug(f("PDF export render attempt completed", { strategy, outputSizeBytes: blob.size }));

      return blob;
    },
    [],
  );

  const exportPdf = useCallback(
    async (
      result: PdfRenderResult,
      options: PdfExportOptions,
      editorFontFamily: EditorFontFamily,
      locationRootPath?: string,
      docRelPath?: string,
    ) => {
      startPdfExport();

      try {
        let blob: Blob;
        let customRenderError: unknown = null;
        try {
          const images = await resolveImages(result.nodes, locationRootPath, docRelPath);
          blob = await renderPdfBlob(result, options, editorFontFamily, "custom", images);
        } catch (initialError) {
          customRenderError = initialError;
          logger.warn(
            f("PDF export custom font render failed; retrying with built-in fonts", {
              editorFontFamily,
              error: PDFError.serialize(initialError),
            }),
          );

          try {
            const images = await resolveImages(result.nodes, locationRootPath, docRelPath);
            blob = await renderPdfBlob(result, options, editorFontFamily, "builtin", images);
            logger.warn(
              f("PDF export completed with built-in fonts after custom font failure", {
                editorFontFamily,
                customError: PDFError.serialize(customRenderError),
              }),
            );
          } catch (builtinError) {
            logger.error(
              f("PDF export failed with both custom and built-in fonts", {
                editorFontFamily,
                customError: PDFError.serialize(customRenderError),
                builtinError: PDFError.serialize(builtinError),
              }),
            );
            throw new Error("Failed to render PDF using both custom and built-in fonts. Check logs for details.", {
              cause: builtinError,
            });
          }
        }

        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const defaultFileName = result.title ? `${result.title.replaceAll(/[^a-zA-Z0-9]/g, "_")}.pdf` : "document.pdf";
        const filePath = await save({ filters: [{ name: "PDF", extensions: ["pdf"] }], defaultPath: defaultFileName });

        if (!filePath) {
          logger.info(
            f("PDF export canceled before writing file", {
              editorFontFamily,
              fallbackUsed: customRenderError !== null,
            }),
          );
          finishPdfExport();
          return false;
        }

        await writeFile(filePath, uint8Array);
        logger.info(
          f("PDF export completed", { filePath, editorFontFamily, fallbackUsed: customRenderError !== null }),
        );

        finishPdfExport();
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to export PDF";
        logger.error(f("PDF export failed", { editorFontFamily, error: PDFError.serialize(err) }));
        failPdfExport(errorMessage);
        throw err;
      }
    },
    [failPdfExport, finishPdfExport, renderPdfBlob, startPdfExport, resolveImages],
  );

  return exportPdf;
}

type UsePdfExportUIArgs = {
  activeTab: Tab | null;
  text: string;
  editorFontFamily: EditorFontFamily;
  exportPdf: ExportPdfFn;
  locations: LocationDescriptor[];
};

export function usePdfExportUI({ activeTab, text, editorFontFamily, exportPdf, locations }: UsePdfExportUIArgs) {
  const { setOpen: setPdfExportDialogOpen } = usePdfDialogUiState();
  const { resetPdfExport } = usePdfExportActions();
  const [previewResult, setPreviewResult] = useState<PdfRenderResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const loadPreviewResult = useCallback(async () => {
    if (!activeTab) {
      setPreviewResult(null);
      return;
    }

    setIsLoadingPreview(true);

    try {
      const docRef = activeTab.docRef;
      const renderResult = await new Promise<PdfRenderResult>((resolve, reject) => {
        void runCmd(renderMarkdownForPdf(docRef.location_id, docRef.rel_path, text, void 0, resolve, reject));
      });

      setPreviewResult(renderResult);
    } catch (error) {
      logger.error(f("Failed to load preview", { error: error instanceof Error ? error.message : String(error) }));
      setPreviewResult(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [activeTab, text]);

  const handleOpenPdfExport = useCallback(() => {
    if (!activeTab) {
      logger.warn("Cannot export PDF without an active document.");
      return;
    }

    resetPdfExport();
    setPdfExportDialogOpen(true);
    void loadPreviewResult();
  }, [activeTab, loadPreviewResult, resetPdfExport, setPdfExportDialogOpen]);

  const handleExportPdf = useCallback(async (options: PdfExportOptions) => {
    if (!activeTab) {
      logger.warn("Cannot export PDF without an active document.");
      return;
    }

    const docRef = activeTab.docRef;
    const locationRootPath = locations.find((loc) => loc.id === docRef.location_id)?.root_path;

    try {
      const renderResult = await new Promise<PdfRenderResult>((resolve, reject) => {
        void runCmd(renderMarkdownForPdf(docRef.location_id, docRef.rel_path, text, void 0, resolve, reject));
      });

      const resolvedFont = resolvePdfFont(editorFontFamily as FontName, text);
      const didExport = await exportPdf(renderResult, options, resolvedFont, locationRootPath, docRef.rel_path);
      if (didExport) {
        setPdfExportDialogOpen(false);
        resetPdfExport();
      }
    } catch (error) {
      logger.error(f("Failed to export PDF", { error: error instanceof Error ? error.message : String(error) }));
    }
  }, [activeTab, editorFontFamily, exportPdf, locations, resetPdfExport, setPdfExportDialogOpen, text]);

  const activeDocLocationRootPath = activeTab
    ? locations.find((loc) => loc.id === activeTab.docRef.location_id)?.root_path
    : undefined;
  const activeDocRelPath = activeTab?.docRef.rel_path;

  return {
    handleOpenPdfExport,
    handleExportPdf,
    previewResult,
    isLoadingPreview,
    activeDocLocationRootPath,
    activeDocRelPath,
  };
}
