import { usePdfExport } from "$hooks/usePdfExport";
import { DEFAULT_OPTIONS } from "$pdf/constants";
import { describePdfFont, ensurePdfFontRegistered } from "$pdf/fonts";
import type { PdfRenderResult } from "$pdf/types";
import { useAppStore } from "$state/stores/app";
import { pdf } from "@react-pdf/renderer";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import * as logger from "@tauri-apps/plugin-log";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$components/pdf/MarkdownPdfDocument", () => ({ MarkdownPdfDocument: () => null }));

vi.mock(
  "$pdf/fonts",
  () => ({
    ensurePdfFontRegistered: vi.fn(),
    describePdfFont: vi.fn((fontName: string, strategy: string) => ({
      fontName,
      strategy,
      family: `${fontName}-${strategy}`,
      sources: strategy === "custom" ? [{ file: "font.woff", src: "/fonts/font.woff", fontWeight: "normal" }] : [],
    })),
  }),
);

vi.mock("@tauri-apps/plugin-dialog", () => ({ save: vi.fn() }));

vi.mock("@tauri-apps/plugin-fs", () => ({ writeFile: vi.fn() }));

const toBlobMock = vi.fn();

vi.mock(
  "@react-pdf/renderer",
  () => ({
    Font: { register: vi.fn() },
    Document: "Document",
    Page: "Page",
    Text: "Text",
    View: "View",
    StyleSheet: { create: (styles: unknown) => styles },
    pdf: vi.fn(() => ({ toBlob: toBlobMock })),
  }),
);

const renderResult: PdfRenderResult = {
  title: "Doc",
  word_count: 2,
  nodes: [{ type: "paragraph", content: "Hello world" }],
};

describe(usePdfExport, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toBlobMock.mockReset();
    useAppStore.getState().resetPdfExport();
  });

  it("retries with built-in fonts on any custom render failure", async () => {
    toBlobMock.mockRejectedValueOnce(new Error("Custom font failure without known substrings")).mockResolvedValueOnce(
      new Blob(["pdf-bytes"], { type: "application/pdf" }),
    );
    vi.mocked(save).mockResolvedValue("/tmp/output.pdf");

    const { result } = renderHook(() => usePdfExport());

    let didExport = false;
    await act(async () => {
      didExport = await result.current(renderResult, DEFAULT_OPTIONS, "IBM Plex Sans Variable");
    });

    expect(didExport).toBeTruthy();
    expect(pdf).toHaveBeenCalledTimes(2);
    expect(vi.mocked(ensurePdfFontRegistered)).toHaveBeenNthCalledWith(1, "IBM Plex Sans Variable", "custom");
    expect(vi.mocked(ensurePdfFontRegistered)).toHaveBeenNthCalledWith(2, "IBM Plex Mono", "custom");
    expect(vi.mocked(ensurePdfFontRegistered)).toHaveBeenNthCalledWith(3, "IBM Plex Sans Variable", "builtin");
    expect(vi.mocked(ensurePdfFontRegistered)).toHaveBeenNthCalledWith(4, "IBM Plex Mono", "builtin");
    expect(vi.mocked(writeFile)).toHaveBeenCalledOnce();
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining("PDF export custom font render failed; retrying with built-in fonts"),
    );
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining("\"editorFontFamily\":\"IBM Plex Sans Variable\""),
    );
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining("\"message\":\"Custom font failure without known substrings\""),
    );
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining("PDF export completed with built-in fonts after custom font failure"),
    );
    expect(vi.mocked(describePdfFont)).toHaveBeenCalled();
  });

  it("fails with combined diagnostics when both custom and built-in rendering fail", async () => {
    toBlobMock.mockRejectedValueOnce(new Error("custom failed")).mockRejectedValueOnce(new Error("builtin failed"));

    const { result } = renderHook(() => usePdfExport());

    await act(async () => {
      await expect(result.current(renderResult, DEFAULT_OPTIONS, "IBM Plex Sans Variable")).rejects.toThrow(
        "Failed to render PDF using both custom and built-in fonts. Check logs for details.",
      );
    });

    expect(vi.mocked(save)).not.toHaveBeenCalled();
    expect(useAppStore.getState().isExportingPdf).toBeFalsy();
    expect(useAppStore.getState().pdfExportError).toBe(
      "Failed to render PDF using both custom and built-in fonts. Check logs for details.",
    );
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      expect.stringContaining("PDF export failed with both custom and built-in fonts"),
    );
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(expect.stringContaining("\"message\":\"custom failed\""));
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(expect.stringContaining("\"message\":\"builtin failed\""));
  });
});
