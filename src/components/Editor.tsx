/**
 * Editor Component
 *
 * A CodeMirror 6-based Markdown editor integrated with Elm-style state management.
 *
 * Features:
 * - Markdown syntax highlighting
 * - Line and selection persistence
 * - Undo/redo support
 * - Debounced change events
 * - Oxocarbon Dark & Light themes
 */

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState as CMEditorState } from "@codemirror/state";
import { EditorView, keymap, ViewUpdate } from "@codemirror/view";
import { lineNumbers } from "@codemirror/view";
import { useEffect, useRef, useState } from "react";

import { oxocarbonDark } from "../themes/oxocarbon-dark";
import { oxocarbonLight } from "../themes/oxocarbon-light";

export type EditorTheme = "dark" | "light";

export type EditorProps = {
  initialText?: string;
  theme?: EditorTheme;
  disabled?: boolean;
  placeholder?: string;
  debounceMs?: number;
  onChange?: (text: string) => void;
  onSave?: () => void;
  onCursorMove?: (line: number, column: number) => void;
  onSelectionChange?: (from: number, to: number | null) => void;
  className?: string;
};

/**
 * Debounces a function call.
 */
function debounce(fn: (text: string) => void, delay: number): (text: string) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (text: string) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(text), delay);
  };
}

/**
 * CodeMirror Markdown Editor
 *
 * This component wraps CodeMirror in a React-friendly interface while
 * maintaining performance by avoiding full re-renders on every keystroke.
 */
export function Editor(
  {
    initialText = "",
    theme = "dark",
    disabled = false,
    placeholder,
    debounceMs = 500,
    onChange,
    onSave,
    onCursorMove,
    onSelectionChange,
    className = "",
  }: EditorProps,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isReady, setIsReady] = useState(false);

  const themeExtension = theme === "dark" ? oxocarbonDark : oxocarbonLight;

  useEffect(() => {
    if (!containerRef.current) return;

    const debouncedOnChange = debounce((text: string) => {
      onChange?.(text);
    }, debounceMs);

    const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) {
        debouncedOnChange(update.state.doc.toString());
      }

      if (update.selectionSet) {
        const selection = update.state.selection.main;
        const from = selection.from;
        const to = selection.empty ? null : selection.to;
        onSelectionChange?.(from, to);
      }

      if (update.selectionSet || update.docChanged) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        const column = pos - line.from;
        onCursorMove?.(line.number, column);
      }
    });

    const saveKeymap = keymap.of([{
      key: "Mod-s",
      preventDefault: true,
      run: () => {
        onSave?.();
        return true;
      },
    }]);

    const customKeymap = keymap.of([...defaultKeymap, ...historyKeymap]);

    const state = CMEditorState.create({
      doc: initialText,
      extensions: [
        lineNumbers(),
        history(),
        markdown({ base: markdownLanguage, codeLanguages: [], addKeymap: true }),
        themeExtension,
        updateListener,
        customKeymap,
        saveKeymap,
        EditorView.editable.of(!disabled),
        placeholder ? EditorView.theme({ ".cm-placeholder": { color: "#888" } }) : [],
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });

    viewRef.current = view;
    setIsReady(true);

    return () => {
      view.destroy();
      viewRef.current = null;
      setIsReady(false);
    };
  }, [initialText, theme, disabled, placeholder, debounceMs, onChange, onSave, onCursorMove, onSelectionChange]);

  useEffect(() => {
    if (viewRef.current) {
      const currentText = viewRef.current.state.doc.toString();
      viewRef.current.destroy();

      const debouncedOnChange = debounce((text: string) => {
        onChange?.(text);
      }, debounceMs);

      const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          debouncedOnChange(update.state.doc.toString());
        }

        if (update.selectionSet) {
          const selection = update.state.selection.main;
          const from = selection.from;
          const to = selection.empty ? null : selection.to;
          onSelectionChange?.(from, to);
        }

        if (update.selectionSet || update.docChanged) {
          const pos = update.state.selection.main.head;
          const line = update.state.doc.lineAt(pos);
          const column = pos - line.from;
          onCursorMove?.(line.number, column);
        }
      });

      const saveKeymap = keymap.of([{
        key: "Mod-s",
        preventDefault: true,
        run: () => {
          onSave?.();
          return true;
        },
      }]);

      const customKeymap = keymap.of([...defaultKeymap, ...historyKeymap]);

      const state = CMEditorState.create({
        doc: currentText,
        extensions: [
          lineNumbers(),
          history(),
          markdown({ base: markdownLanguage, codeLanguages: [], addKeymap: true }),
          themeExtension,
          updateListener,
          customKeymap,
          saveKeymap,
          EditorView.editable.of(!disabled),
          placeholder ? EditorView.theme({ ".cm-placeholder": { color: "#888" } }) : [],
        ],
      });

      viewRef.current = new EditorView({ state, parent: containerRef.current! });
    }
  }, [theme, disabled, placeholder, debounceMs, onChange, onSave, onCursorMove, onSelectionChange, themeExtension]);

  const focus = () => {
    viewRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={`editor-container ${className}`}
      data-theme={theme}
      data-ready={isReady}
      style={{ height: "100%", overflow: "hidden", fontFamily: "\"IBM Plex Mono\", \"SF Mono\", Monaco, monospace" }}
      onClick={focus}
      data-testid="editor-container" />
  );
}

export default Editor;

import { markdownLanguage } from "@codemirror/lang-markdown";
