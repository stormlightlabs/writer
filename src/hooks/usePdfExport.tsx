import { MarkdownPdfDocument } from "$components/pdf/MarkdownPdfDocument";
import { logger } from "$logger";
import { describePdfFont, ensurePdfFontRegistered, type FontStrategy } from "$pdf/fonts";
import type { PdfExportOptions, PdfRenderResult } from "$pdf/types";
import type { EditorFontFamily } from "$types";
import { pdf } from "@react-pdf/renderer";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { useCallback, useState } from "react";

export type PdfExportState = { isExporting: boolean; error: string | null };

type ExportFn = (
  result: PdfRenderResult,
  options: PdfExportOptions,
  editorFontFamily: EditorFontFamily,
) => Promise<boolean>;

export type UsePdfExportReturn = { state: PdfExportState; exportPdf: ExportFn; reset: () => void };

const initialState: PdfExportState = { isExporting: false, error: null };

type SerializedError = {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  details?: unknown;
  cause?: SerializedError;
};

const serializeError = (error: unknown, depth = 0): SerializedError => {
  if (depth > 4) {
    return { name: "TruncatedError", message: "Error cause chain exceeded depth limit" };
  }

  if (error instanceof Error) {
    const withFields = error as Error & { code?: string; details?: unknown; cause?: unknown };
    const serialized: SerializedError = { name: error.name, message: error.message, stack: error.stack };

    if (withFields.code) {
      serialized.code = withFields.code;
    }
    if (withFields.details) {
      serialized.details = withFields.details;
    }
    if (withFields.cause) {
      serialized.cause = serializeError(withFields.cause, depth + 1);
    }
    return serialized;
  }

  return { name: "UnknownError", message: String(error) };
};

const runtimeContext = () => ({
  href: globalThis.location?.href ?? null,
  origin: globalThis.location?.origin ?? null,
  userAgent: globalThis.navigator?.userAgent ?? null,
});

export function usePdfExport(): UsePdfExportReturn {
  const [state, setState] = useState<PdfExportState>(initialState);

  const renderPdfBlob = useCallback(
    async (
      result: PdfRenderResult,
      options: PdfExportOptions,
      editorFontFamily: EditorFontFamily,
      strategy: FontStrategy,
    ) => {
      const bodyFont = describePdfFont(editorFontFamily, strategy);
      const codeFont = describePdfFont("IBM Plex Mono", strategy);
      logger.debug("PDF export render attempt started", { strategy, bodyFont, codeFont, runtime: runtimeContext() });

      await ensurePdfFontRegistered(editorFontFamily, strategy);
      await ensurePdfFontRegistered("IBM Plex Mono", strategy);

      const blob = await pdf(
        <MarkdownPdfDocument
          nodes={result.nodes}
          title={result.title}
          options={options}
          editorFontFamily={editorFontFamily}
          useBuiltinFonts={strategy === "builtin"} />,
      ).toBlob();

      logger.debug("PDF export render attempt completed", { strategy, outputSizeBytes: blob.size });

      return blob;
    },
    [],
  );

  const exportPdf = useCallback(
    async (result: PdfRenderResult, options: PdfExportOptions, editorFontFamily: EditorFontFamily) => {
      setState({ isExporting: true, error: null });

      try {
        let blob: Blob;
        let customRenderError: unknown = null;
        try {
          blob = await renderPdfBlob(result, options, editorFontFamily, "custom");
        } catch (initialError) {
          customRenderError = initialError;
          logger.warn("PDF export custom font render failed; retrying with built-in fonts", {
            editorFontFamily,
            error: serializeError(initialError),
          });

          try {
            blob = await renderPdfBlob(result, options, editorFontFamily, "builtin");
            logger.warn("PDF export completed with built-in fonts after custom font failure", {
              editorFontFamily,
              customError: serializeError(customRenderError),
            });
          } catch (builtinError) {
            logger.error("PDF export failed with both custom and built-in fonts", {
              editorFontFamily,
              customError: serializeError(customRenderError),
              builtinError: serializeError(builtinError),
            });
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
          logger.info("PDF export canceled before writing file", {
            editorFontFamily,
            fallbackUsed: customRenderError !== null,
          });
          setState({ isExporting: false, error: null });
          return false;
        }

        await writeFile(filePath, uint8Array);
        logger.info("PDF export completed", { filePath, editorFontFamily, fallbackUsed: customRenderError !== null });

        setState({ isExporting: false, error: null });
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to export PDF";
        logger.error("PDF export failed", { editorFontFamily, error: serializeError(err) });
        setState({ isExporting: false, error: errorMessage });
        throw err;
      }
    },
    [renderPdfBlob],
  );

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return { state, exportPdf, reset };
}
