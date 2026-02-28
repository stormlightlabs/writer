import { useDocxExport } from "$hooks/useDocxExport";
import { useAppStore } from "$state/stores/app";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import * as logger from "@tauri-apps/plugin-log";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/plugin-dialog", () => ({ save: vi.fn() }));

vi.mock("@tauri-apps/plugin-fs", () => ({ writeFile: vi.fn() }));

vi.mock("$state/stores/toasts", () => ({ showSuccessToast: vi.fn(), showErrorToast: vi.fn() }));

const docxRenderResult = { data: [80, 75, 3, 4, 0, 0, 0, 0], title: "Test Document", word_count: 10 };

describe(useDocxExport, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().resetDocxExport();
  });

  it("exports DOCX successfully", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/output.docx");

    const { result } = renderHook(() => useDocxExport());

    let didExport = false;
    await act(async () => {
      didExport = await result.current(docxRenderResult);
    });

    expect(didExport).toBeTruthy();
    expect(save).toHaveBeenCalledWith({
      filters: [{ name: "Word Document", extensions: ["docx"] }],
      defaultPath: "Test_Document.docx",
    });
    expect(writeFile).toHaveBeenCalledOnce();
    expect(useAppStore.getState().isExportingDocx).toBeFalsy();
    expect(useAppStore.getState().docxExportError).toBeNull();
  });

  it("returns false when user cancels save dialog", async () => {
    vi.mocked(save).mockResolvedValue(null);

    const { result } = renderHook(() => useDocxExport());

    let didExport = false;
    await act(async () => {
      didExport = await result.current(docxRenderResult);
    });

    expect(didExport).toBeFalsy();
    expect(save).toHaveBeenCalledOnce();
    expect(writeFile).not.toHaveBeenCalled();
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith("DOCX export canceled before writing file");
  });

  it("uses default filename when title is null", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/output.docx");

    const { result } = renderHook(() => useDocxExport());

    const resultWithoutTitle = { ...docxRenderResult, title: null };

    await act(async () => {
      await result.current(resultWithoutTitle);
    });

    expect(save).toHaveBeenCalledWith({
      filters: [{ name: "Word Document", extensions: ["docx"] }],
      defaultPath: "document.docx",
    });
  });

  it("sanitizes filename allowing spaces, dashes, and dots", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/output.docx");

    const { result } = renderHook(() => useDocxExport());

    const resultWithSpecialChars = { ...docxRenderResult, title: "Version 1.1 - Final Draft" };

    await act(async () => {
      await result.current(resultWithSpecialChars);
    });

    expect(save).toHaveBeenCalledWith({
      filters: [{ name: "Word Document", extensions: ["docx"] }],
      defaultPath: "Version_1.1_-_Final_Draft.docx",
    });
  });

  it("handles export errors and sets error state", async () => {
    vi.mocked(save).mockRejectedValue(new Error("Disk full"));

    const { result } = renderHook(() => useDocxExport());

    await act(async () => {
      await expect(result.current(docxRenderResult)).rejects.toThrow("Disk full");
    });

    expect(useAppStore.getState().isExportingDocx).toBeFalsy();
    expect(useAppStore.getState().docxExportError).toBe("Disk full");
  });

  it("writes correct Uint8Array data", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/output.docx");

    const { result } = renderHook(() => useDocxExport());

    await act(async () => {
      await result.current(docxRenderResult);
    });

    expect(writeFile).toHaveBeenCalledOnce();
    const writtenData = vi.mocked(writeFile).mock.calls[0][1] as Uint8Array;
    expect(writtenData[0]).toBe(80);
    expect(writtenData[1]).toBe(75);
  });
});
