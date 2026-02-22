import { initialEditorModel, updateEditor, useEditor } from "$hooks/useEditor";
import type { AppError } from "$types";
import { invoke } from "@tauri-apps/api/core";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe(useEditor, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockImplementation(() => new Promise(() => {}));
  });

  describe("initial state", () => {
    it("should have initial model with default values", () => {
      const { result } = renderHook(() => useEditor());

      expect(result.current.model).toStrictEqual(initialEditorModel);
    });

    it("should have empty text initially", () => {
      const { result } = renderHook(() => useEditor());

      expect(result.current.model.text).toBe("");
    });

    it("should have Idle save status initially", () => {
      const { result } = renderHook(() => useEditor());

      expect(result.current.model.saveStatus).toBe("Idle");
    });

    it("should have cursor at line 1, column 0 initially", () => {
      const { result } = renderHook(() => useEditor());

      expect(result.current.model.cursorLine).toBe(1);
      expect(result.current.model.cursorColumn).toBe(0);
    });
  });

  describe("editorChanged", () => {
    it("should update text and set status to Dirty when text changes", () => {
      const { result } = renderHook(() => useEditor());

      act(() => {
        result.current.dispatch({ type: "EditorChanged", text: "New text" });
      });

      expect(result.current.model.text).toBe("New text");
      expect(result.current.model.saveStatus).toBe("Dirty");
    });

    it("should not update if text is the same", () => {
      const { result } = renderHook(() => useEditor());

      act(() => {
        result.current.dispatch({ type: "EditorChanged", text: "Text" });
      });

      const firstUpdate = result.current.model;

      act(() => {
        result.current.dispatch({ type: "EditorChanged", text: "Text" });
      });

      expect(result.current.model).toBe(firstUpdate);
    });

    it("should keep Dirty status if already dirty", () => {
      const { result } = renderHook(() => useEditor());

      act(() => {
        result.current.dispatch({ type: "EditorChanged", text: "Text 1" });
      });

      act(() => {
        result.current.dispatch({ type: "EditorChanged", text: "Text 2" });
      });

      expect(result.current.model.saveStatus).toBe("Dirty");
    });
  });

  describe("saveRequested", () => {
    it("should not save if no docRef is set", () => {
      const { result } = renderHook(() => useEditor());

      act(() => {
        result.current.dispatch({ type: "SaveRequested" });
      });

      expect(result.current.model.saveStatus).toBe("Idle");
    });

    it("should set status to Saving when save is requested", () => {
      const { result } = renderHook(() => useEditor());

      act(() => {
        result.current.dispatch({
          type: "DocOpened",
          doc: {
            text: "Hello",
            meta: { location_id: 1, rel_path: "test.md", title: "Test", updated_at: "2024-01-01", word_count: 1 },
          },
        });
      });

      act(() => {
        result.current.dispatch({ type: "SaveRequested" });
      });

      expect(result.current.model.saveStatus).toBe("Saving");
    });

    it("should not save if already saving", () => {
      const { result } = renderHook(() => useEditor());

      act(() => {
        result.current.dispatch({
          type: "DocOpened",
          doc: {
            text: "Hello",
            meta: { location_id: 1, rel_path: "test.md", title: "Test", updated_at: "2024-01-01", word_count: 1 },
          },
        });
      });

      act(() => {
        result.current.dispatch({ type: "SaveRequested" });
      });

      act(() => {
        result.current.dispatch({ type: "SaveRequested" });
      });

      expect(result.current.model.saveStatus).toBe("Saving");
    });

    it("should save after a draft doc is initialized", () => {
      const { result } = renderHook(() => useEditor());

      act(() => {
        result.current.dispatch({ type: "DraftDocInitialized", docRef: { location_id: 3, rel_path: "Untitled.md" } });
      });

      act(() => {
        result.current.dispatch({ type: "SaveRequested" });
      });

      expect(result.current.model.docRef).toStrictEqual({ location_id: 3, rel_path: "Untitled.md" });
      expect(result.current.model.saveStatus).toBe("Saving");
    });
  });

  describe("saveFinished", () => {
    it("should set status to Saved on successful save", () => {
      const { result } = renderHook(() => useEditor());

      act(() => {
        result.current.dispatch({ type: "SaveFinished", success: true });
      });

      expect(result.current.model.saveStatus).toBe("Saved");
    });

    it("should set status to Error on failed save", () => {
      const { result } = renderHook(() => useEditor());

      const error: AppError = { code: "IO_ERROR", message: "Save failed" };

      act(() => {
        result.current.dispatch({ type: "SaveFinished", success: false, error });
      });

      expect(result.current.model.saveStatus).toBe("Error");
      expect(result.current.model.error).toStrictEqual(error);
    });

    it("should clear error on successful save", () => {
      const { result } = renderHook(() => useEditor());

      act(() => {
        result.current.dispatch({
          type: "SaveFinished",
          success: false,
          error: { code: "IO_ERROR", message: "Error" },
        });
      });

      act(() => {
        result.current.dispatch({ type: "SaveFinished", success: true });
      });

      expect(result.current.model.error).toBeNull();
    });
  });

  describe("docOpened", () => {
    it("should update text and meta when doc is opened", () => {
      const { result } = renderHook(() => useEditor());

      const docContent = {
        text: "# Test Document",
        meta: {
          location_id: 1,
          rel_path: "docs/test.md",
          title: "Test Document",
          updated_at: "2024-01-15T10:00:00Z",
          word_count: 100,
        },
      };

      act(() => {
        result.current.dispatch({ type: "DocOpened", doc: docContent });
      });

      expect(result.current.model.text).toBe("# Test Document");
      expect(result.current.model.docRef).toStrictEqual({ location_id: 1, rel_path: "docs/test.md" });
      expect(result.current.model.saveStatus).toBe("Saved");
      expect(result.current.model.isLoading).toBeFalsy();
    });
  });

  describe("cursorMoved", () => {
    it("should update cursor position", () => {
      const { result } = renderHook(() => useEditor());

      act(() => {
        result.current.dispatch({ type: "CursorMoved", line: 5, column: 10 });
      });

      expect(result.current.model.cursorLine).toBe(5);
      expect(result.current.model.cursorColumn).toBe(10);
    });

    it("should handle multiple cursor moves", () => {
      const { result } = renderHook(() => useEditor());

      act(() => {
        result.current.dispatch({ type: "CursorMoved", line: 3, column: 5 });
      });

      act(() => {
        result.current.dispatch({ type: "CursorMoved", line: 10, column: 0 });
      });

      expect(result.current.model.cursorLine).toBe(10);
      expect(result.current.model.cursorColumn).toBe(0);
    });
  });

  describe("selectionChanged", () => {
    it("should update selection", () => {
      const { result } = renderHook(() => useEditor());

      act(() => {
        result.current.dispatch({ type: "SelectionChanged", from: 10, to: 25 });
      });

      expect(result.current.model.selectionFrom).toBe(10);
      expect(result.current.model.selectionTo).toBe(25);
    });

    it("should handle empty selection", () => {
      const { result } = renderHook(() => useEditor());

      act(() => {
        result.current.dispatch({ type: "SelectionChanged", from: 10, to: null });
      });

      expect(result.current.model.selectionFrom).toBe(10);
      expect(result.current.model.selectionTo).toBeNull();
    });
  });

  describe("convenience methods", () => {
    it("should dispatch OpenDocRequested when openDoc is called", () => {
      const { result } = renderHook(() => useEditor());

      const docRef = { location_id: 1, rel_path: "test.md" };

      act(() => {
        result.current.openDoc(docRef);
      });

      expect(result.current.model.isLoading).toBeTruthy();
    });

    it("should dispatch SaveRequested when saveDoc is called", () => {
      const { result } = renderHook(() => useEditor());

      act(() => {
        result.current.dispatch({
          type: "DocOpened",
          doc: {
            text: "Hello",
            meta: { location_id: 1, rel_path: "test.md", title: "Test", updated_at: "2024-01-01", word_count: 1 },
          },
        });
      });

      act(() => {
        result.current.saveDoc();
      });

      expect(result.current.model.saveStatus).toBe("Saving");
    });
  });
});

describe(updateEditor, () => {
  it("should return same model and None command for unknown message types", () => {
    const model = initialEditorModel;
    const [newModel, cmd] = updateEditor(model, { type: "Unknown" as any });

    expect(newModel).toBe(model);
    expect(cmd.type).toBe("None");
  });

  it("should return command for OpenDocRequested", () => {
    const model = initialEditorModel;
    const docRef = { location_id: 1, rel_path: "test.md" };

    const [newModel, cmd] = updateEditor(model, { type: "OpenDocRequested", docRef });

    expect(newModel.isLoading).toBeTruthy();
    expect(cmd.type).toBe("Invoke");
  });

  it("should return command for SaveRequested when docRef exists", () => {
    const model = { ...initialEditorModel, docRef: { location_id: 1, rel_path: "test.md" }, text: "Content" };

    const [newModel, cmd] = updateEditor(model, { type: "SaveRequested" });

    expect(newModel.saveStatus).toBe("Saving");
    expect(cmd.type).toBe("Invoke");
  });

  it("should initialize a draft doc reference", () => {
    const model = { ...initialEditorModel, text: "Draft content" };

    const [newModel, cmd] = updateEditor(model, {
      type: "DraftDocInitialized",
      docRef: { location_id: 2, rel_path: "Untitled.md" },
    });

    expect(newModel.docRef).toStrictEqual({ location_id: 2, rel_path: "Untitled.md" });
    expect(newModel.saveStatus).toBe("Dirty");
    expect(cmd.type).toBe("None");
  });
});
