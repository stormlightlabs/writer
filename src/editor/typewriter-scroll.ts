import type { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

export function typewriterScroll(): Extension {
  return ViewPlugin.fromClass(
    class {
      constructor(private view: EditorView) {
        this.centerCursor();
      }

      update(update: ViewUpdate) {
        if (update.selectionSet || update.docChanged) {
          this.centerCursor();
        }
      }

      private centerCursor() {
        const view = this.view;
        const cursorPos = view.state.selection.main.head;
        const coords = view.coordsAtPos(cursorPos);

        if (!coords) return;

        const scroller = view.scrollDOM;
        const scrollerRect = scroller.getBoundingClientRect();
        const scrollerHeight = scrollerRect.height;
        const cursorY = coords.top - scrollerRect.top;
        const targetY = scrollerHeight / 2;

        const scrollOffset = cursorY - targetY + scroller.scrollTop;

        scroller.scrollTo({ top: scrollOffset, behavior: "smooth" });
      }
    },
  );
}
