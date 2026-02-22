import { focusDimming, focusDimmingTheme } from "$editor/focus-dimming";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";

describe("focusDimming", () => {
  it("should apply dimming decorations in sentence mode", () => {
    const state = EditorState.create({
      doc: "First sentence. Second sentence. Third sentence.",
      extensions: [focusDimming("sentence"), focusDimmingTheme],
    });
    const view = new EditorView({ state });

    expect(view.state.doc.toString()).toBe("First sentence. Second sentence. Third sentence.");
    view.destroy();
  });

  it("should apply dimming decorations in paragraph mode", () => {
    const state = EditorState.create({
      doc: "Paragraph one.\n\nParagraph two.",
      extensions: [focusDimming("paragraph"), focusDimmingTheme],
    });
    const view = new EditorView({ state });

    expect(view.state.doc.toString()).toBe("Paragraph one.\n\nParagraph two.");
    view.destroy();
  });

  it("should not apply dimming when mode is off", () => {
    const state = EditorState.create({ doc: "Some text here.", extensions: [focusDimming("off")] });
    const view = new EditorView({ state });

    expect(view.state.doc.toString()).toBe("Some text here.");
    view.destroy();
  });
});
