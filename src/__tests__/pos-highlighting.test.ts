import { POS_HIGHLIGHT_LEGEND } from "$editor/constants";
import { collectPosTokenRanges, posHighlighting, posHighlightingTheme } from "$editor/pos-highlighting";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import model from "wink-eng-lite-web-model";
import winkNLP from "wink-nlp";

describe("posHighlighting", () => {
  const nlp = winkNLP(model);

  it("collects ranges using token character positions instead of token index", () => {
    const text = "The quick brown fox jumps and runs quickly.";
    const ranges = collectPosTokenRanges(text, nlp);
    const highlighted = ranges.map((range) => ({ text: text.slice(range.from, range.to), className: range.className }));

    expect(highlighted).toContainEqual({ text: "fox", className: "cm-pos-noun" });
    expect(highlighted).toContainEqual({ text: "jumps", className: "cm-pos-verb" });
    expect(highlighted).toContainEqual({ text: "runs", className: "cm-pos-verb" });
    expect(highlighted).toContainEqual({ text: "quickly", className: "cm-pos-adverb" });
  });

  it("accounts for multiple spaces when mapping ranges", () => {
    const text = "Fox   jumps\tquickly.";
    const ranges = collectPosTokenRanges(text, nlp);
    const highlighted = ranges.map((range) => text.slice(range.from, range.to));

    expect(highlighted).toContain("jumps");
    expect(highlighted).toContain("quickly");
  });

  it("handles empty text", () => {
    expect(collectPosTokenRanges("", nlp)).toStrictEqual([]);
  });

  it("creates editor extension without mutating text", () => {
    const state = EditorState.create({ doc: "", extensions: [posHighlighting(), posHighlightingTheme] });
    const view = new EditorView({ state });

    expect(view.state.doc.toString()).toBe("");
    view.destroy();
  });

  it("handles whitespace-only text", () => {
    const state = EditorState.create({ doc: "   \n\n   ", extensions: [posHighlighting(), posHighlightingTheme] });
    const view = new EditorView({ state });

    expect(view.state.doc.toString()).toBe("   \n\n   ");
    view.destroy();
  });

  it("handles long text with viewport", () => {
    const longText = "The quick brown fox jumps over the lazy dog. ".repeat(100);
    const state = EditorState.create({ doc: longText, extensions: [posHighlighting(), posHighlightingTheme] });
    const view = new EditorView({ state });

    expect(view.state.doc.toString()).toBe(longText);
    view.destroy();
  });

  it("exposes legend entries for settings UI", () => {
    expect(POS_HIGHLIGHT_LEGEND.map((item) => item.label)).toStrictEqual([
      "Noun",
      "Verb",
      "Adjective",
      "Adverb",
      "Conjunction",
    ]);
  });
});
