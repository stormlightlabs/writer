import { RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import type { ItemToken } from "wink-nlp";

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

const POS_CLASS_MAP: Record<string, string> = {
  NOUN: "cm-pos-noun",
  VERB: "cm-pos-verb",
  ADJ: "cm-pos-adjective",
  ADV: "cm-pos-adverb",
  CONJ: "cm-pos-conjunction",
  CCONJ: "cm-pos-conjunction",
  SCONJ: "cm-pos-conjunction",
};

function getPosClass(posTag: string): string | undefined {
  return POS_CLASS_MAP[posTag];
}

async function createPosDecorations(view: EditorView): Promise<DecorationSet> {
  const nlp = await getNlp();
  const builder = new RangeSetBuilder<Decoration>();
  const { viewport } = view;

  const bufferStart = Math.max(0, viewport.from - 500);
  const bufferEnd = Math.min(view.state.doc.length, viewport.to + 500);

  const text = view.state.doc.sliceString(bufferStart, bufferEnd);

  if (!text.trim()) {
    return Decoration.none;
  }

  const doc = nlp.readDoc(text);

  doc.tokens().each((token: ItemToken) => {
    const posTag = token.out(nlp.its.pos);
    const posClass = getPosClass(posTag);

    if (posClass) {
      const tokenIndex = token.index();
      const value = token.out();
      const start = tokenIndex + bufferStart;
      const end = start + value.length;
      builder.add(start, end, Decoration.mark({ class: posClass }));
    }
  });

  return builder.finish();
}

export function posHighlighting(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;

      constructor(private view: EditorView) {
        void createPosDecorations(view).then((decs) => {
          this.decorations = decs;
          this.view.dispatch({});
        });
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          void createPosDecorations(this.view).then((decs) => {
            this.decorations = decs;
            this.view.dispatch({});
          });
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
}

export const posHighlightingTheme = EditorView.theme({
  ".cm-pos-noun": { color: "#ef4444" },
  ".cm-pos-verb": { color: "#3b82f6" },
  ".cm-pos-adjective": { color: "#a87132" },
  ".cm-pos-adverb": { color: "#8b5cf6" },
  ".cm-pos-conjunction": { color: "#22c55e" },
});
