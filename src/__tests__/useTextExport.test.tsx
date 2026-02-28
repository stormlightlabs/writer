import { useMarkdownExport, useTextExport } from "$hooks/useTextExport";
import { useAppStore } from "$state/stores/app";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import * as logger from "@tauri-apps/plugin-log";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/plugin-dialog", () => ({ save: vi.fn() }));

vi.mock("@tauri-apps/plugin-fs", () => ({ writeFile: vi.fn() }));

vi.mock("$state/stores/toasts", () => ({ showSuccessToast: vi.fn(), showErrorToast: vi.fn() }));

const textRenderResult = { text: "Exported text content", title: "Test Document", word_count: 10 };

describe(useTextExport, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().resetTextExport();
  });

  it("exports text successfully", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/output.txt");

    const { result } = renderHook(() => useTextExport());

    let didExport = false;
    await act(async () => {
      didExport = await result.current(textRenderResult);
    });

    expect(didExport).toBeTruthy();
    expect(save).toHaveBeenCalledWith({
      filters: [{ name: "Text", extensions: ["txt"] }],
      defaultPath: "Test_Document.txt",
    });
    expect(writeFile).toHaveBeenCalledOnce();
    expect(useAppStore.getState().isExportingText).toBeFalsy();
    expect(useAppStore.getState().textExportError).toBeNull();
  });

  it("returns false when user cancels save dialog", async () => {
    vi.mocked(save).mockResolvedValue(null);

    const { result } = renderHook(() => useTextExport());

    let didExport = false;
    await act(async () => {
      didExport = await result.current(textRenderResult);
    });

    expect(didExport).toBeFalsy();
    expect(save).toHaveBeenCalledOnce();
    expect(writeFile).not.toHaveBeenCalled();
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith("Text export canceled before writing file");
  });

  it("uses default filename when title is null", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/output.txt");

    const { result } = renderHook(() => useTextExport());

    const resultWithoutTitle = { ...textRenderResult, title: null };

    await act(async () => {
      await result.current(resultWithoutTitle);
    });

    expect(save).toHaveBeenCalledWith({
      filters: [{ name: "Text", extensions: ["txt"] }],
      defaultPath: "document.txt",
    });
  });

  it("sanitizes filename by replacing special characters", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/output.txt");

    const { result } = renderHook(() => useTextExport());

    const resultWithSpecialChars = { ...textRenderResult, title: "My Document: Version 1.0!" };

    await act(async () => {
      await result.current(resultWithSpecialChars);
    });

    expect(save).toHaveBeenCalledWith({
      filters: [{ name: "Text", extensions: ["txt"] }],
      defaultPath: "My_Document__Version_1_0_.txt",
    });
  });

  it("handles export errors and sets error state", async () => {
    vi.mocked(save).mockRejectedValue(new Error("Disk full"));

    const { result } = renderHook(() => useTextExport());

    await act(async () => {
      await expect(result.current(textRenderResult)).rejects.toThrow("Disk full");
    });

    expect(useAppStore.getState().isExportingText).toBeFalsy();
    expect(useAppStore.getState().textExportError).toBe("Disk full");
  });

  it("encodes text to Uint8Array correctly", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/output.txt");

    const { result } = renderHook(() => useTextExport());

    const unicodeResult = { text: "Hello 世界 🌍", title: "Unicode Test", word_count: 3 };

    await act(async () => {
      await result.current(unicodeResult);
    });

    expect(writeFile).toHaveBeenCalledOnce();
    const writtenData = vi.mocked(writeFile).mock.calls[0][1] as Uint8Array;
    const decoder = new TextDecoder();
    expect(decoder.decode(writtenData)).toBe("Hello 世界 🌍");
  });
});

describe(useMarkdownExport, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports markdown successfully", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/output.md");

    const { result } = renderHook(() => useMarkdownExport());

    let didExport = false;
    await act(async () => {
      didExport = await result.current("# Markdown content", "Test Document");
    });

    expect(didExport).toBeTruthy();
    expect(save).toHaveBeenCalledWith({
      filters: [{ name: "Markdown", extensions: ["md"] }],
      defaultPath: "Test_Document.md",
    });
    expect(writeFile).toHaveBeenCalledOnce();
  });

  it("returns false when user cancels save dialog", async () => {
    vi.mocked(save).mockResolvedValue(null);

    const { result } = renderHook(() => useMarkdownExport());

    let didExport = false;
    await act(async () => {
      didExport = await result.current("# Markdown", "Test");
    });

    expect(didExport).toBeFalsy();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("uses default filename when title is null", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/output.md");

    const { result } = renderHook(() => useMarkdownExport());

    await act(async () => {
      await result.current("# Markdown", null);
    });

    expect(save).toHaveBeenCalledWith({
      filters: [{ name: "Markdown", extensions: ["md"] }],
      defaultPath: "document.md",
    });
  });

  it("handles export errors", async () => {
    vi.mocked(save).mockRejectedValue(new Error("Permission denied"));

    const { result } = renderHook(() => useMarkdownExport());

    await act(async () => {
      await expect(result.current("# Markdown", "Test")).rejects.toThrow("Permission denied");
    });
  });
});
