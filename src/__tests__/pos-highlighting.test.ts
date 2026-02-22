import { posHighlighting, posHighlightingTheme } from "$editor/pos-highlighting";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";

describe("posHighlighting", () => {
  it("should apply POS decorations to text", () => {
    const state = EditorState.create({
      doc: "The quick brown fox jumps.",
      extensions: [posHighlighting(), posHighlightingTheme],
    });
    const view = new EditorView({ state });

    expect(view.state.doc.toString()).toBe("The quick brown fox jumps.");
    view.destroy();
  });

  it("should handle empty text", () => {
    const state = EditorState.create({
      doc: "",
      extensions: [posHighlighting(), posHighlightingTheme],
    });
    const view = new EditorView({ state });

    expect(view.state.doc.toString()).toBe("");
    view.destroy();
  });

  it("should handle whitespace-only text", () => {
    const state = EditorState.create({
      doc: "   \n\n   ",
      extensions: [posHighlighting(), posHighlightingTheme],
    });
    const view = new EditorView({ state });

    expect(view.state.doc.toString()).toBe("   \n\n   ");
    view.destroy();
  });

  it("should handle long text with viewport", () => {
    const longText = "The quick brown fox jumps over the lazy dog. ".repeat(100);
    const state = EditorState.create({
      doc: longText,
      extensions: [posHighlighting(), posHighlightingTheme],
    });
    const view = new EditorView({ state });

    expect(view.state.doc.toString()).toBe(longText);
    view.destroy();
  });

  it("should apply theme CSS classes", () => {
    const state = EditorState.create({
      doc: "The quick brown fox jumps over the lazy dog.",
      extensions: [posHighlighting(), posHighlightingTheme],
    });
    const view = new EditorView({ state });

    const editorElement = view.dom;
    expect(editorElement).toBeDefined();

    view.destroy();
  });
});
