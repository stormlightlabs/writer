import { MarkdownPdfDocument } from "$components/pdf/MarkdownPdfDocument";
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

export function usePdfExport(): UsePdfExportReturn {
  const [state, setState] = useState<PdfExportState>(initialState);

  const exportPdf = useCallback(
    async (result: PdfRenderResult, options: PdfExportOptions, editorFontFamily: EditorFontFamily) => {
      setState({ isExporting: true, error: null });

      try {
        const blob = await pdf(
          <MarkdownPdfDocument
            nodes={result.nodes}
            title={result.title}
            options={options}
            editorFontFamily={editorFontFamily} />,
        ).toBlob();

        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const defaultFileName = result.title ? `${result.title.replaceAll(/[^a-zA-Z0-9]/g, "_")}.pdf` : "document.pdf";
        const filePath = await save({ filters: [{ name: "PDF", extensions: ["pdf"] }], defaultPath: defaultFileName });

        if (!filePath) {
          setState({ isExporting: false, error: null });
          return false;
        }

        await writeFile(filePath, uint8Array);

        setState({ isExporting: false, error: null });
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to export PDF";
        setState({ isExporting: false, error: errorMessage });
        throw err;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return { state, exportPdf, reset };
}
