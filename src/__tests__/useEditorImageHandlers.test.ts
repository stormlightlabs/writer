import { useEditorImageHandlers } from "$hooks/useEditorImageHandlers";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({ writeFile: vi.fn(), readTextFile: vi.fn(() => "") }));

const mockImportImage = vi.fn();
vi.mock(
  "$hooks/useImageController",
  () => ({ useImageController: () => ({ importImage: mockImportImage, deleteImage: vi.fn() }) }),
);

describe("useEditorImageHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleImageFilePaste", () => {
    it("returns false and skips when locationId is null", async () => {
      const { result } = renderHook(() => useEditorImageHandlers(null, null));

      const file = new File([new Uint8Array([1, 2, 3])], "photo.png", { type: "image/png" });

      await act(async () => {
        result.current.handleImageFilePaste(file);
        await new Promise((r) => {
          setTimeout(r, 0);
        });
      });

      expect(writeFile).not.toHaveBeenCalled();
      expect(mockImportImage).not.toHaveBeenCalled();
    });

    it("skips unsupported MIME types", async () => {
      const { result } = renderHook(() => useEditorImageHandlers(1, "doc.md"));

      const file = new File([new Uint8Array([1])], "doc.pdf", { type: "application/pdf" });

      await act(async () => {
        result.current.handleImageFilePaste(file);
        await new Promise((r) => {
          setTimeout(r, 0);
        });
      });

      expect(writeFile).not.toHaveBeenCalled();
      expect(mockImportImage).not.toHaveBeenCalled();
    });

    it("writes PNG to temp file, calls importImage, and sets insertAt", async () => {
      mockImportImage.mockResolvedValueOnce("images/abc123.png");

      const { result } = renderHook(() => useEditorImageHandlers(7, "photo.md"));

      const bytes = new Uint8Array([137, 80, 78, 71]);
      const file = new File([bytes], "photo.png", { type: "image/png" });

      await act(async () => {
        result.current.handleImageFilePaste(file);
        await new Promise((r) => {
          setTimeout(r, 0);
        });
      });

      expect(writeFile).toHaveBeenCalledOnce();
      const [writtenPath, writtenBytes] = vi.mocked(writeFile).mock.calls[0];
      expect(writtenPath).toMatch(/^\/tmp\/commonplace-paste-\d+\.png$/);
      expect(writtenBytes).toBeInstanceOf(Uint8Array);

      expect(mockImportImage).toHaveBeenCalledWith(7, expect.stringMatching(/\.png$/), "images");

      expect(result.current.insertAt).toStrictEqual({ text: "![image](images/abc123.png)", requestId: 1 });
    });

    it("maps JPEG MIME type to .jpg extension", async () => {
      mockImportImage.mockResolvedValueOnce("abc.jpg");

      const { result } = renderHook(() => useEditorImageHandlers(3, "drafts/doc.md"));

      const file = new File([new Uint8Array([1])], "photo.jpg", { type: "image/jpeg" });

      await act(async () => {
        result.current.handleImageFilePaste(file);
        await new Promise((r) => {
          setTimeout(r, 0);
        });
      });

      const [writtenPath] = vi.mocked(writeFile).mock.calls[0];
      expect(writtenPath).toMatch(/\.jpg$/);
    });

    it("does not update insertAt when importImage returns false", async () => {
      mockImportImage.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useEditorImageHandlers(1, "doc.md"));

      const file = new File([new Uint8Array([1])], "photo.png", { type: "image/png" });

      await act(async () => {
        result.current.handleImageFilePaste(file);
        await new Promise((r) => {
          setTimeout(r, 0);
        });
      });

      expect(result.current.insertAt).toBeNull();
    });

    it("increments requestId on each paste", async () => {
      mockImportImage.mockResolvedValueOnce("first.png").mockResolvedValueOnce("second.png");

      const { result } = renderHook(() => useEditorImageHandlers(1, "doc.md"));

      const file = new File([new Uint8Array([1])], "a.png", { type: "image/png" });

      await act(async () => {
        result.current.handleImageFilePaste(file);
        await new Promise((r) => {
          setTimeout(r, 0);
        });
      });

      expect(result.current.insertAt?.requestId).toBe(1);

      await act(async () => {
        result.current.handleImageFilePaste(file);
        await new Promise((r) => {
          setTimeout(r, 0);
        });
      });

      expect(result.current.insertAt?.requestId).toBe(2);
    });
  });

  describe("handlePickAndInsertImage", () => {
    it("does nothing when locationId is null", async () => {
      const { result } = renderHook(() => useEditorImageHandlers(null, null));

      await act(async () => {
        await result.current.handlePickAndInsertImage();
      });

      expect(open).not.toHaveBeenCalled();
      expect(mockImportImage).not.toHaveBeenCalled();
    });

    it("does nothing when dialog is cancelled", async () => {
      vi.mocked(open).mockResolvedValueOnce(null);

      const { result } = renderHook(() => useEditorImageHandlers(5, "doc.md"));

      await act(async () => {
        await result.current.handlePickAndInsertImage();
      });

      expect(mockImportImage).not.toHaveBeenCalled();
      expect(result.current.insertAt).toBeNull();
    });

    it("opens dialog with image filters and inserts markdown on success", async () => {
      vi.mocked(open).mockResolvedValueOnce("/Users/me/photo.png");
      mockImportImage.mockResolvedValueOnce("images/hash.png");

      const { result } = renderHook(() => useEditorImageHandlers(4, "drafts/doc.md"));

      await act(async () => {
        await result.current.handlePickAndInsertImage();
      });

      expect(open).toHaveBeenCalledWith({
        multiple: false,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"] }],
      });
      expect(mockImportImage).toHaveBeenCalledWith(4, "/Users/me/photo.png", "images");
      expect(result.current.insertAt).toStrictEqual({ text: "![image](../images/hash.png)", requestId: 1 });
    });

    it("does not set insertAt when importImage returns false", async () => {
      vi.mocked(open).mockResolvedValueOnce("/Users/me/photo.png");
      mockImportImage.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useEditorImageHandlers(4, "doc.md"));

      await act(async () => {
        await result.current.handlePickAndInsertImage();
      });

      expect(result.current.insertAt).toBeNull();
    });
  });

  describe("drag-and-drop onto editor area", () => {
    it("ignores drop events outside the editor area", async () => {
      let dropListener: ((event: { payload: unknown }) => Promise<void>) | undefined;
      vi.mocked(getCurrentWindow).mockReturnValue({
        onDragDropEvent: vi.fn((listener) => {
          dropListener = listener;
          return Promise.resolve(() => {});
        }),
      } as never);

      renderHook(() => useEditorImageHandlers(1, "doc.md"));

      await act(async () => {
        await dropListener?.({ payload: { type: "drop", position: { x: 0, y: 0 }, paths: ["/tmp/photo.png"] } });
      });

      expect(mockImportImage).not.toHaveBeenCalled();
    });

    it("imports image when dropped onto editor container", async () => {
      let dropListener: ((event: { payload: unknown }) => Promise<void>) | undefined;
      vi.mocked(getCurrentWindow).mockReturnValue({
        onDragDropEvent: vi.fn((listener) => {
          dropListener = listener;
          return Promise.resolve(() => {});
        }),
      } as never);

      const editorEl = document.createElement("div");
      editorEl.dataset.testid = "editor-container";
      document.body.append(editorEl);
      vi.spyOn(document, "elementFromPoint").mockReturnValue(editorEl);

      mockImportImage.mockResolvedValueOnce("images/drop.png");

      const { result } = renderHook(() => useEditorImageHandlers(2, "drafts/doc.md"));

      await act(async () => {
        await dropListener?.({
          payload: { type: "drop", position: { x: 50, y: 100 }, paths: ["/home/user/drop.png"] },
        });
      });

      expect(mockImportImage).toHaveBeenCalledWith(2, "/home/user/drop.png", "images");
      expect(result.current.insertAt).toStrictEqual({ text: "![image](../images/drop.png)", requestId: 1 });

      editorEl.remove();
    });

    it("skips non-image file paths in drop", async () => {
      let dropListener: ((event: { payload: unknown }) => Promise<void>) | undefined;
      vi.mocked(getCurrentWindow).mockReturnValue({
        onDragDropEvent: vi.fn((listener) => {
          dropListener = listener;
          return Promise.resolve(() => {});
        }),
      } as never);

      const editorEl = document.createElement("div");
      editorEl.dataset.testid = "editor-container";
      document.body.append(editorEl);
      vi.spyOn(document, "elementFromPoint").mockReturnValue(editorEl);

      renderHook(() => useEditorImageHandlers(1, "doc.md"));

      await act(async () => {
        await dropListener?.({
          payload: { type: "drop", position: { x: 10, y: 10 }, paths: ["/home/user/doc.md", "/home/user/data.csv"] },
        });
      });

      expect(mockImportImage).not.toHaveBeenCalled();

      editorEl.remove();
    });

    it("ignores non-drop event types", async () => {
      let dropListener: ((event: { payload: unknown }) => Promise<void>) | undefined;
      vi.mocked(getCurrentWindow).mockReturnValue({
        onDragDropEvent: vi.fn((listener) => {
          dropListener = listener;
          return Promise.resolve(() => {});
        }),
      } as never);

      renderHook(() => useEditorImageHandlers(1, "doc.md"));

      await act(async () => {
        await dropListener?.({ payload: { type: "enter", position: { x: 0, y: 0 }, paths: ["/tmp/a.png"] } });
      });

      expect(mockImportImage).not.toHaveBeenCalled();
    });
  });
});
