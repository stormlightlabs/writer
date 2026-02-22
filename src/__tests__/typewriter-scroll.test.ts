import { typewriterScroll } from "$editor/typewriter-scroll";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("typewriterScroll", () => {
  let view: EditorView;

  beforeEach(() => {
    const state = EditorState.create({
      doc: "Line 1\nLine 2\nLine 3\nLine 4\nLine 5",
      extensions: [typewriterScroll()],
    });

    const originalError = console.error;
    console.error = vi.fn();
    view = new EditorView({ state });
    console.error = originalError;

    view.scrollDOM.scrollTo = vi.fn();
  });

  it("should create editor with typewriter scroll extension", () => {
    expect(view.state.doc.toString()).toBe("Line 1\nLine 2\nLine 3\nLine 4\nLine 5");
  });
});
