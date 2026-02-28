import { type DocxExportResult, renderMarkdownForDocx, runCmd } from "$ports";
import { useDocxExportActions } from "$state/selectors";
import { showErrorToast, showSuccessToast } from "$state/stores/toasts";
import type { Tab } from "$types";
import { sanitizeExportFilename } from "$utils/paths";
import { f } from "$utils/serialize";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback } from "react";

export type ExportDocxFn = (result: DocxExportResult) => Promise<boolean>;

export function useDocxExport(): ExportDocxFn {
  const { startDocxExport, finishDocxExport, failDocxExport } = useDocxExportActions();

  const exportDocx = useCallback(async (result: DocxExportResult) => {
    startDocxExport();

    try {
      const uint8Array = new Uint8Array(result.data);
      const epoch = Date.now();
      const defaultFileName = result.title ? sanitizeExportFilename(result.title, "docx") : `document_${epoch}.docx`;
      const filePath = await save({
        filters: [{ name: "Word Document", extensions: ["docx"] }],
        defaultPath: defaultFileName,
      });

      if (!filePath) {
        logger.info("DOCX export canceled before writing file");
        finishDocxExport();
        return false;
      }

      await writeFile(filePath, uint8Array);
      showSuccessToast("DOCX exported successfully");

      finishDocxExport();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to export DOCX";
      failDocxExport(errorMessage);
      showErrorToast(`Export failed: ${errorMessage}`);
      throw err;
    }
  }, [failDocxExport, finishDocxExport, startDocxExport]);

  return exportDocx;
}

type UseDocxExportUIArgs = { activeTab: Tab | null; text: string };

export function useDocxExportUI({ activeTab, text }: UseDocxExportUIArgs) {
  const exportDocx = useDocxExport();

  const handleExportDocx = useCallback(async () => {
    if (!activeTab) {
      logger.warn("Cannot export DOCX without an active document.");
      return false;
    }

    const docRef = activeTab.docRef;

    try {
      const renderResult = await new Promise<DocxExportResult>((resolve, reject) => {
        void runCmd(renderMarkdownForDocx(docRef.location_id, docRef.rel_path, text, void 0, resolve, reject));
      });

      return await exportDocx(renderResult);
    } catch (error) {
      logger.error(f("Failed to export DOCX", { error: error instanceof Error ? error.message : String(error) }));
      return false;
    }
  }, [activeTab, exportDocx, text]);

  return { handleExportDocx };
}
