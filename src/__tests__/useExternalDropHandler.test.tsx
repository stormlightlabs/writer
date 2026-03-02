import { useExternalDropHandler } from "$hooks/useExternalDropHandler";
import { showSuccessToast, showWarnToast } from "$state/stores/toasts";
import type { DocMeta } from "$types";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const DOCS: DocMeta[] = [{
  location_id: 1,
  rel_path: "existing.md",
  title: "Existing",
  updated_at: "2026-01-01T00:00:00Z",
  word_count: 1,
}];

describe("useExternalDropHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("imports markdown files, skips conflicts, and refreshes once", async () => {
    let dragDropListener: ((event: { payload: unknown }) => Promise<void>) | undefined;
    vi.mocked(getCurrentWindow).mockReturnValue({
      onDragDropEvent: vi.fn((listener) => {
        dragDropListener = listener;
        return Promise.resolve(() => {});
      }),
    } as never);
    vi.mocked(readTextFile).mockResolvedValue("# imported");

    const setActiveDropTarget = vi.fn();
    const refreshSidebar = vi.fn();
    const handleImportExternalFile = vi.fn().mockResolvedValue(true);

    renderHook(() => useExternalDropHandler(1, DOCS, setActiveDropTarget, refreshSidebar, handleImportExternalFile));

    await act(async () => {
      await dragDropListener?.({
        payload: {
          type: "drop",
          position: { x: 0, y: 0 },
          paths: ["/tmp/new.md", "/tmp/existing.md", "/tmp/skip.txt"],
        },
      });
    });

    expect(handleImportExternalFile).toHaveBeenCalledTimes(1);
    expect(handleImportExternalFile).toHaveBeenCalledWith(1, "new.md", "# imported");
    expect(refreshSidebar).toHaveBeenCalledWith(1);
    expect(showSuccessToast).toHaveBeenCalledWith("Imported 1 file");
    expect(showWarnToast).toHaveBeenCalledWith("Skipped 1 file (already exists)");
    expect(setActiveDropTarget).toHaveBeenCalledWith(null);
  });

  it("uses hovered folder target from pointer position", async () => {
    let dragDropListener: ((event: { payload: unknown }) => Promise<void>) | undefined;
    vi.mocked(getCurrentWindow).mockReturnValue({
      onDragDropEvent: vi.fn((listener) => {
        dragDropListener = listener;
        return Promise.resolve(() => {});
      }),
    } as never);

    const hitTarget = document.createElement("div");
    hitTarget.dataset.dropFolderRow = "true";
    hitTarget.dataset.locationId = "2";
    hitTarget.dataset.folderPath = "archive/2026";
    hitTarget.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 300,
        top: 0,
        bottom: 100,
        width: 300,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    vi.spyOn(document, "elementFromPoint").mockReturnValue(hitTarget);
    vi.mocked(readTextFile).mockResolvedValue("# moved by drop");

    const setActiveDropTarget = vi.fn();
    const refreshSidebar = vi.fn();
    const handleImportExternalFile = vi.fn().mockResolvedValue(true);

    renderHook(() => useExternalDropHandler(1, DOCS, setActiveDropTarget, refreshSidebar, handleImportExternalFile));

    await act(async () => {
      await dragDropListener?.({ payload: { type: "enter", position: { x: 12, y: 50 }, paths: ["/tmp/entry.md"] } });
      await dragDropListener?.({ payload: { type: "over", position: { x: 12, y: 50 } } });
      await dragDropListener?.({ payload: { type: "drop", position: { x: 12, y: 50 }, paths: ["/tmp/entry.md"] } });
    });

    expect(setActiveDropTarget).toHaveBeenCalledWith({
      source: "external",
      locationId: 2,
      targetType: "folder",
      folderPath: "archive/2026",
      intent: "into",
    });
    expect(setActiveDropTarget.mock.calls.at(-1)).toEqual([null]);
    expect(handleImportExternalFile).toHaveBeenCalledWith(2, "archive/2026/entry.md", "# moved by drop");
    expect(refreshSidebar).toHaveBeenCalledWith(2);
  });

  it("uses parent folder when pointer hovers a document row", async () => {
    let dragDropListener: ((event: { payload: unknown }) => Promise<void>) | undefined;
    vi.mocked(getCurrentWindow).mockReturnValue({
      onDragDropEvent: vi.fn((listener) => {
        dragDropListener = listener;
        return Promise.resolve(() => {});
      }),
    } as never);

    const hitTarget = document.createElement("div");
    hitTarget.dataset.dropDocumentRow = "true";
    hitTarget.dataset.locationId = "2";
    hitTarget.dataset.documentPath = "archive/2026/entry.md";
    hitTarget.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 300,
        top: 0,
        bottom: 100,
        width: 300,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    vi.spyOn(document, "elementFromPoint").mockReturnValue(hitTarget);
    vi.mocked(readTextFile).mockResolvedValue("# from document hover");

    const setActiveDropTarget = vi.fn();
    const refreshSidebar = vi.fn();
    const handleImportExternalFile = vi.fn().mockResolvedValue(true);

    renderHook(() => useExternalDropHandler(1, DOCS, setActiveDropTarget, refreshSidebar, handleImportExternalFile));

    await act(async () => {
      await dragDropListener?.({ payload: { type: "enter", position: { x: 50, y: 42 }, paths: ["/tmp/entry.md"] } });
      await dragDropListener?.({ payload: { type: "over", position: { x: 50, y: 42 } } });
      await dragDropListener?.({ payload: { type: "drop", position: { x: 50, y: 42 }, paths: ["/tmp/entry.md"] } });
    });

    expect(setActiveDropTarget).toHaveBeenCalledWith({
      source: "external",
      locationId: 2,
      targetType: "document",
      relPath: "archive/2026/entry.md",
      folderPath: "archive/2026",
      edge: "bottom",
      intent: "between",
    });
    expect(handleImportExternalFile).toHaveBeenCalledWith(2, "archive/2026/entry.md", "# from document hover");
  });

  it("ignores non-file drops from internal drag and drop", async () => {
    let dragDropListener: ((event: { payload: unknown }) => Promise<void>) | undefined;
    vi.mocked(getCurrentWindow).mockReturnValue({
      onDragDropEvent: vi.fn((listener) => {
        dragDropListener = listener;
        return Promise.resolve(() => {});
      }),
    } as never);

    const setActiveDropTarget = vi.fn();
    const refreshSidebar = vi.fn();
    const handleImportExternalFile = vi.fn().mockResolvedValue(true);

    renderHook(() => useExternalDropHandler(1, DOCS, setActiveDropTarget, refreshSidebar, handleImportExternalFile));

    await act(async () => {
      await dragDropListener?.({ payload: { type: "enter", position: { x: 4, y: 8 }, paths: [] } });
      await dragDropListener?.({ payload: { type: "over", position: { x: 4, y: 8 } } });
      await dragDropListener?.({ payload: { type: "drop", position: { x: 4, y: 8 }, paths: [] } });
    });

    expect(handleImportExternalFile).not.toHaveBeenCalled();
    expect(refreshSidebar).not.toHaveBeenCalled();
    expect(showWarnToast).not.toHaveBeenCalled();
    expect(showSuccessToast).not.toHaveBeenCalled();
    expect(setActiveDropTarget).toHaveBeenCalledWith(null);
  });
});
