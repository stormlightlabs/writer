import type { TextExportResult } from "$ports";
import { renderMarkdownForText, runCmd, type TextExportResult as TextExportResultType } from "$ports";
import { useTextExportActions } from "$state/selectors";
import { showErrorToast, showSuccessToast } from "$state/stores/toasts";
import type { Tab } from "$types";
import { f } from "$utils/serialize";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback } from "react";

function sanitizeExportFilename(title: string, extension: string): string {
  const sanitized = title.replaceAll(/[^\w\s.-]/g, "").replaceAll(/\s+/g, "_").replaceAll(/_+/g, "_").replaceAll(
    /^_|_$/g,
    "",
  );
  return sanitized ? `${sanitized}.${extension}` : `document.${extension}`;
}

export type ExportTextFn = (result: TextExportResultType) => Promise<boolean>;

export function useTextExport(): ExportTextFn {
  const { startTextExport, finishTextExport, failTextExport } = useTextExportActions();

  const exportText = useCallback(async (result: TextExportResultType) => {
    startTextExport();

    try {
      const textBytes = new TextEncoder().encode(result.text);
      const uint8Array = new Uint8Array(textBytes);
      const defaultFileName = result.title ? sanitizeExportFilename(result.title, "txt") : "document.txt";
      const filePath = await save({ filters: [{ name: "Text", extensions: ["txt"] }], defaultPath: defaultFileName });

      if (!filePath) {
        logger.info("Text export canceled before writing file");
        finishTextExport();
        return false;
      }

      await writeFile(filePath, uint8Array);
      showSuccessToast("Plaintext exported successfully");

      finishTextExport();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to export text";
      failTextExport(errorMessage);
      showErrorToast(`Export failed: ${errorMessage}`);
      throw err;
    }
  }, [failTextExport, finishTextExport, startTextExport]);

  return exportText;
}

export type ExportMarkdownFn = (text: string, title: string | null) => Promise<boolean>;

export function useMarkdownExport(): ExportMarkdownFn {
  const { startTextExport, finishTextExport, failTextExport } = useTextExportActions();

  const exportMarkdown = useCallback(async (text: string, title: string | null) => {
    startTextExport();

    try {
      const textBytes = new TextEncoder().encode(text);
      const uint8Array = new Uint8Array(textBytes);
      const defaultFileName = title ? sanitizeExportFilename(title, "md") : "document.md";
      const filePath = await save({
        filters: [{ name: "Markdown", extensions: ["md"] }],
        defaultPath: defaultFileName,
      });

      if (!filePath) {
        logger.info("Markdown export canceled before writing file");
        finishTextExport();
        return false;
      }

      await writeFile(filePath, uint8Array);

      showSuccessToast("Markdown saved successfully");
      finishTextExport();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to export markdown";
      failTextExport(errorMessage);
      showErrorToast(`Export failed: ${errorMessage}`);
      throw err;
    }
  }, [failTextExport, finishTextExport, startTextExport]);

  return exportMarkdown;
}

type UseTextExportUIArgs = { activeTab: Tab | null; text: string };

export function useTextExportUI({ activeTab, text }: UseTextExportUIArgs) {
  const exportText = useTextExport();
  const exportMarkdown = useMarkdownExport();

  const handleExportText = useCallback(async () => {
    if (!activeTab) {
      logger.warn("Cannot export text without an active document.");
      return;
    }

    const docRef = activeTab.docRef;

    try {
      const renderResult = await new Promise<TextExportResult>((resolve, reject) => {
        void runCmd(renderMarkdownForText(docRef.location_id, docRef.rel_path, text, void 0, resolve, reject));
      });

      await exportText(renderResult);
    } catch (error) {
      logger.error(f("Failed to export text", { error: error instanceof Error ? error.message : String(error) }));
    }
  }, [activeTab, exportText, text]);

  const handleExportMarkdown = useCallback(async () => {
    if (!activeTab) {
      logger.warn("Cannot export markdown without an active document.");
      return;
    }

    try {
      await exportMarkdown(text, activeTab.title);
    } catch (error) {
      logger.error(f("Failed to export markdown", { error: error instanceof Error ? error.message : String(error) }));
    }
  }, [activeTab, exportMarkdown, text]);

  return { handleExportText, handleExportMarkdown };
}
