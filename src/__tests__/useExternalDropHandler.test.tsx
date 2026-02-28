import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import { useExternalDropHandler } from "$hooks/useExternalDropHandler";
import { showSuccessToast, showWarnToast } from "$state/stores/toasts";
import type { DocMeta } from "$types";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$hooks/controllers/useWorkspaceController", () => ({ useWorkspaceController: vi.fn() }));

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
    vi.mocked(useWorkspaceController).mockReturnValue(
      { handleImportExternalFile: vi.fn().mockResolvedValue(true) } as unknown as ReturnType<
        typeof useWorkspaceController
      >,
    );
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

    const setExternalDropTarget = vi.fn();
    const refreshSidebar = vi.fn();
    const handleImportExternalFile = vi.fn().mockResolvedValue(true);
    vi.mocked(useWorkspaceController).mockReturnValue(
      { handleImportExternalFile } as unknown as ReturnType<typeof useWorkspaceController>,
    );

    renderHook(() => useExternalDropHandler(1, DOCS, setExternalDropTarget, refreshSidebar));

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
    hitTarget.dataset.locationId = "2";
    hitTarget.dataset.folderPath = "archive/2026";
    globalThis.document.elementFromPoint = vi.fn(() => hitTarget);
    vi.mocked(readTextFile).mockResolvedValue("# moved by drop");

    const setExternalDropTarget = vi.fn();
    const refreshSidebar = vi.fn();
    const handleImportExternalFile = vi.fn().mockResolvedValue(true);
    vi.mocked(useWorkspaceController).mockReturnValue(
      { handleImportExternalFile } as unknown as ReturnType<typeof useWorkspaceController>,
    );

    renderHook(() => useExternalDropHandler(1, DOCS, setExternalDropTarget, refreshSidebar));

    await act(async () => {
      await dragDropListener?.({ payload: { type: "over", position: { x: 12, y: 18 } } });
      await dragDropListener?.({ payload: { type: "drop", position: { x: 12, y: 18 }, paths: ["/tmp/entry.md"] } });
    });

    expect(setExternalDropTarget).toHaveBeenCalledWith(2);
    expect(setExternalDropTarget.mock.calls.at(-1)?.[0]).toBeUndefined();
    expect(handleImportExternalFile).toHaveBeenCalledWith(2, "archive/2026/entry.md", "# moved by drop");
    expect(refreshSidebar).toHaveBeenCalledWith(2);
  });
});
