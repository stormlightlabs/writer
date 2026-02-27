import { normalizeText } from "$utils/text";
import { RangeSetBuilder } from "@codemirror/state";
import type { EditorState as CMEditorState, Extension } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { POS_CLASS_MAP, POS_THEME } from "./constants";
import type { PosNlp, PosToken } from "./types";

let nlpInstance: ReturnType<typeof import("wink-nlp").default> | null = null;

async function getNlp() {
  if (nlpInstance) {
    return nlpInstance;
  }

  const winkNlp = (await import("wink-nlp")).default;
  const model = (await import("wink-eng-lite-web-model")).default;

  nlpInstance = winkNlp(model);
  return nlpInstance;
}

function getPosClass(posTag: string): string | undefined {
  return POS_CLASS_MAP[posTag];
}

export function collectPosTokenRanges(
  text: string,
  nlp: PosNlp,
): Array<{ from: number; to: number; className: string }> {
  if (!text.trim()) {
    return [];
  }

  const ranges: Array<{ from: number; to: number; className: string }> = [];
  const doc = nlp.readDoc(text);
  let cursor = 0;

  doc.tokens().each((token: PosToken) => {
    const leading = normalizeText(token.out(nlp.its.precedingSpaces));
    cursor += leading.length;

    const rawTokenText = token.out(nlp.its.value);
    const tokenText = normalizeText(rawTokenText) || normalizeText(token.out());
    const posTag = normalizeText(token.out(nlp.its.pos));
    const posClass = getPosClass(posTag);

    const start = cursor;
    const end = start + tokenText.length;
    cursor = end;

    if (!posClass || tokenText.length === 0 || start >= end) {
      return;
    }

    ranges.push({ from: start, to: end, className: posClass });
  });

  return ranges;
}

async function createPosDecorations(
  state: CMEditorState,
  viewport: { from: number; to: number },
): Promise<DecorationSet> {
  const nlp = await getNlp();
  const builder = new RangeSetBuilder<Decoration>();

  const bufferStart = Math.max(0, viewport.from - 500);
  const bufferEnd = Math.min(state.doc.length, viewport.to + 500);

  const text = state.doc.sliceString(bufferStart, bufferEnd);
  const ranges = collectPosTokenRanges(text, nlp);

  for (const range of ranges) {
    const start = bufferStart + range.from;
    const end = bufferStart + range.to;

    if (start >= end || start < 0 || end > state.doc.length) {
      continue;
    }

    builder.add(start, end, Decoration.mark({ class: range.className }));
  }

  return builder.finish();
}

export function posHighlighting(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      private requestId = 0;
      private destroyed = false;

      constructor(private view: EditorView) {
        this.refresh(view.state, view.viewport);
      }

      private refresh(state: CMEditorState, viewport: { from: number; to: number }) {
        const activeRequest = this.requestId + 1;
        this.requestId = activeRequest;

        void createPosDecorations(state, viewport).then((decs) => {
          if (this.destroyed || activeRequest !== this.requestId) {
            return;
          }

          this.decorations = decs;
          if (this.view.state === state) {
            this.view.dispatch({});
          }
        }).catch(() => {
          if (this.destroyed || activeRequest !== this.requestId) {
            return;
          }

          this.decorations = Decoration.none;
          if (this.view.state === state) {
            this.view.dispatch({});
          }
        });
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.refresh(update.state, update.view.viewport);
        }
      }

      destroy() {
        this.destroyed = true;
      }
    },
    { decorations: (v) => v.decorations },
  );
}

export const posHighlightingTheme = EditorView.theme(POS_THEME);
