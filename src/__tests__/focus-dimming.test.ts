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

  it("should keep all lines in the active paragraph undimmed", () => {
    const doc =
      "First paragraph line one.\nFirst paragraph line two.\n\nSecond paragraph line one.\nSecond paragraph line two.";
    const state = EditorState.create({
      doc,
      extensions: [focusDimming("paragraph"), focusDimmingTheme],
    });
    const view = new EditorView({ state });

    view.dispatch({ selection: { anchor: doc.indexOf("First paragraph line two.") } });

    const dimmedText = Array.from(view.dom.querySelectorAll(".cm-dimmed-text"))
      .map((node) => node.textContent ?? "")
      .join(" ");

    expect(dimmedText).toContain("Second paragraph line one.");
    expect(dimmedText).toContain("Second paragraph line two.");
    expect(dimmedText).not.toContain("First paragraph line one.");
    expect(dimmedText).not.toContain("First paragraph line two.");

    view.destroy();
  });

  it("should not apply dimming when mode is off", () => {
    const state = EditorState.create({ doc: "Some text here.", extensions: [focusDimming("off")] });
    const view = new EditorView({ state });

    expect(view.state.doc.toString()).toBe("Some text here.");
    view.destroy();
  });
});
