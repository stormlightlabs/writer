import { RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import type { FocusDimmingMode } from "../types";

const DIMMED_CLASS = "cm-dimmed-text";

function findSentenceBoundaries(text: string): Array<{ start: number; end: number }> {
  const sentences: Array<{ start: number; end: number }> = [];
  const sentenceRegex = /[^.!?]+[.!?]+\s*/g;
  let match;

  while ((match = sentenceRegex.exec(text)) !== null) {
    sentences.push({ start: match.index, end: match.index + match[0].length });
  }

  if (sentences.length === 0 || sentences.at(-1)!.end < text.length) {
    const lastStart = sentences.length > 0 ? sentences.at(-1)!.end : 0;
    if (lastStart < text.length) {
      sentences.push({ start: lastStart, end: text.length });
    }
  }

  return sentences;
}

function createDimmingDecorations(view: EditorView, mode: FocusDimmingMode): DecorationSet {
  if (mode === "off") {
    return Decoration.none;
  }

  const cursorPos = view.state.selection.main.head;
  const doc = view.state.doc;
  const builder = new RangeSetBuilder<Decoration>();

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const lineText = line.text;

    if (lineText.trim().length === 0) continue;

    let regions: Array<{ start: number; end: number }>;

    if (mode === "sentence") {
      regions = findSentenceBoundaries(lineText);
      regions = regions.map((r) => ({ start: line.from + r.start, end: line.from + r.end }));
    } else {
      regions = [{ start: line.from, end: line.to }];
    }

    const activeRegion = regions.find((r) => cursorPos >= r.start && cursorPos <= r.end);

    for (const region of regions) {
      if (!activeRegion || region.start !== activeRegion.start) {
        builder.add(region.start, region.end, Decoration.mark({ class: DIMMED_CLASS }));
      }
    }
  }

  return builder.finish();
}

export function focusDimming(mode: FocusDimmingMode): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(private view: EditorView) {
        this.decorations = createDimmingDecorations(view, mode);
      }

      update(update: ViewUpdate) {
        if (update.selectionSet || update.docChanged || update.viewportChanged) {
          this.decorations = createDimmingDecorations(this.view, mode);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
}

export const focusDimmingTheme = EditorView.theme({
  [`.${DIMMED_CLASS}`]: { opacity: "0.3", transition: "opacity 0.15s ease-in-out" },
});
