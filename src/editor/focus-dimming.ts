import { RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import type { FocusDimmingMode } from "../types";

const DIMMED_CLASS = "cm-dimmed-text";
type Region = { start: number; end: number };

function findSentenceBoundaries(text: string): Region[] {
  const sentences: Region[] = [];
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

function findParagraphBoundaries(view: EditorView): Region[] {
  const paragraphs: Region[] = [];
  const doc = view.state.doc;
  let paragraphStart: number | null = null;
  let paragraphEnd = 0;

  for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber += 1) {
    const line = doc.line(lineNumber);
    const isBlankLine = line.text.trim().length === 0;

    if (isBlankLine) {
      if (paragraphStart !== null) {
        paragraphs.push({ start: paragraphStart, end: paragraphEnd });
        paragraphStart = null;
      }
      continue;
    }

    if (paragraphStart === null) {
      paragraphStart = line.from;
    }
    paragraphEnd = line.to;
  }

  if (paragraphStart !== null) {
    paragraphs.push({ start: paragraphStart, end: paragraphEnd });
  }

  return paragraphs;
}

function createRegions(view: EditorView, mode: FocusDimmingMode): Region[] {
  const paragraphs = findParagraphBoundaries(view);
  if (mode === "paragraph") {
    return paragraphs;
  }

  const doc = view.state.doc;
  const sentenceRegions: Region[] = [];
  for (const paragraph of paragraphs) {
    const paragraphText = doc.sliceString(paragraph.start, paragraph.end);
    const sentenceBoundaries = findSentenceBoundaries(paragraphText);
    for (const sentence of sentenceBoundaries) {
      sentenceRegions.push({
        start: paragraph.start + sentence.start,
        end: paragraph.start + sentence.end,
      });
    }
  }

  return sentenceRegions;
}

function isWithinRegion(cursorPos: number, region: Region, docLength: number): boolean {
  return cursorPos >= region.start && (cursorPos < region.end || (cursorPos === docLength && region.end === docLength));
}

function createDimmingDecorations(view: EditorView, mode: FocusDimmingMode): DecorationSet {
  if (mode === "off") {
    return Decoration.none;
  }

  const cursorPos = view.state.selection.main.head;
  const builder = new RangeSetBuilder<Decoration>();
  const regions = createRegions(view, mode);
  const docLength = view.state.doc.length;
  const activeRegion = regions.find((region) => isWithinRegion(cursorPos, region, docLength));

  for (const region of regions) {
    if (!activeRegion || region.start !== activeRegion.start || region.end !== activeRegion.end) {
      builder.add(region.start, region.end, Decoration.mark({ class: DIMMED_CLASS }));
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
