import type { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

export function typewriterScroll(): Extension {
  return ViewPlugin.fromClass(
    class {
      constructor(private view: EditorView) {
        this.scheduleCenterCursor();
      }

      update(update: ViewUpdate) {
        if (update.selectionSet || update.docChanged) {
          this.scheduleCenterCursor();
        }
      }

      private scheduleCenterCursor() {
        this.view.requestMeasure({
          read: (view) => {
            const cursorPos = view.state.selection.main.head;
            const coords = view.coordsAtPos(cursorPos);
            if (!coords) {
              return null;
            }

            const scroller = view.scrollDOM;
            const scrollerRect = scroller.getBoundingClientRect();

            return {
              cursorY: coords.top - scrollerRect.top,
              scrollerHeight: scrollerRect.height,
              scrollTop: scroller.scrollTop,
            };
          },
          write: (measurement) => {
            if (!measurement) {
              return;
            }

            const targetY = measurement.scrollerHeight / 2;
            const scrollOffset = measurement.cursorY - targetY + measurement.scrollTop;
            this.view.scrollDOM.scrollTo({ top: scrollOffset, behavior: "smooth" });
          },
        });
      }
    },
  );
}
