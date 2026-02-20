import type { EditorFontFamily } from "$types";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState as CMEditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import type { ViewUpdate } from "@codemirror/view";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { oxocarbonDark } from "../themes/oxocarbon-dark";
import { oxocarbonLight } from "../themes/oxocarbon-light";

export type EditorTheme = "dark" | "light";

export type EditorProps = {
  initialText?: string;
  theme?: EditorTheme;
  disabled?: boolean;
  showLineNumbers?: boolean;
  textWrappingEnabled?: boolean;
  syntaxHighlightingEnabled?: boolean;
  fontSize?: number;
  fontFamily?: EditorFontFamily;
  placeholder?: string;
  debounceMs?: number;
  onChange?: (text: string) => void;
  onSave?: () => void;
  onCursorMove?: (line: number, column: number) => void;
  onSelectionChange?: (from: number, to: number | null) => void;
  className?: string;
};

type EditorCallbacks = Pick<EditorProps, "onChange" | "onSave" | "onCursorMove" | "onSelectionChange">;

type CreateEditorStateOptions = {
  doc: string;
  theme: EditorTheme;
  disabled: boolean;
  showLineNumbers: boolean;
  textWrappingEnabled: boolean;
  syntaxHighlightingEnabled: boolean;
  placeholder?: string;
  updateListener: ReturnType<typeof EditorView.updateListener.of>;
  onSave: () => void;
};

const EDITOR_FONT_FAMILY_MAP: Record<EditorFontFamily, string> = {
  "IBM Plex Mono": "\"IBM Plex Mono\", \"SF Mono\", Monaco, \"Cascadia Code\", monospace",
  "IBM Plex Sans Variable":
    "\"IBM Plex Sans Variable\", \"IBM Plex Sans\", -apple-system, BlinkMacSystemFont, sans-serif",
  "IBM Plex Serif": "\"IBM Plex Serif\", Georgia, \"Times New Roman\", serif",
  "Monaspace Argon": "\"Monaspace Argon\", \"IBM Plex Mono\", monospace",
  "Monaspace Krypton": "\"Monaspace Krypton\", \"IBM Plex Mono\", monospace",
  "Monaspace Neon": "\"Monaspace Neon\", \"IBM Plex Mono\", monospace",
  "Monaspace Radon": "\"Monaspace Radon\", \"IBM Plex Mono\", monospace",
  "Monaspace Xenon": "\"Monaspace Xenon\", \"IBM Plex Mono\", monospace",
};

function createEditorState(
  {
    doc,
    theme,
    disabled,
    showLineNumbers,
    textWrappingEnabled,
    syntaxHighlightingEnabled,
    placeholder,
    updateListener,
    onSave,
  }: CreateEditorStateOptions,
): CMEditorState {
  const themeExtension = theme === "dark" ? oxocarbonDark : oxocarbonLight;

  const saveKeymap = keymap.of([{
    key: "Mod-s",
    preventDefault: true,
    run: () => {
      onSave();
      return true;
    },
  }]);

  return CMEditorState.create({
    doc,
    extensions: [
      ...(showLineNumbers ? [lineNumbers()] : []),
      ...(textWrappingEnabled ? [EditorView.lineWrapping] : []),
      history(),
      ...(syntaxHighlightingEnabled ? [markdown({ base: markdownLanguage, codeLanguages: [], addKeymap: true })] : []),
      themeExtension,
      updateListener,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      saveKeymap,
      EditorView.editable.of(!disabled),
      placeholder ? EditorView.theme({ ".cm-placeholder": { color: "#888" } }) : [],
    ],
  });
}

export function Editor(
  {
    initialText = "",
    theme = "dark",
    disabled = false,
    showLineNumbers = true,
    textWrappingEnabled = true,
    syntaxHighlightingEnabled = true,
    fontSize = 16,
    fontFamily = "IBM Plex Mono",
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
  const callbacksRef = useRef<EditorCallbacks>({ onChange, onSave, onCursorMove, onSelectionChange });
  const debounceMsRef = useRef(debounceMs);
  const onChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialTextRef = useRef(initialText);
  const presentationRef = useRef({
    theme,
    disabled,
    showLineNumbers,
    textWrappingEnabled,
    syntaxHighlightingEnabled,
    placeholder,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onChange, onSave, onCursorMove, onSelectionChange };
  }, [onChange, onSave, onCursorMove, onSelectionChange]);

  useEffect(() => {
    debounceMsRef.current = debounceMs;
  }, [debounceMs]);

  const emitChange = useCallback((text: string) => {
    if (onChangeTimeoutRef.current) {
      clearTimeout(onChangeTimeoutRef.current);
      onChangeTimeoutRef.current = null;
    }

    if (debounceMsRef.current <= 0) {
      callbacksRef.current.onChange?.(text);
      return;
    }

    onChangeTimeoutRef.current = setTimeout(() => {
      callbacksRef.current.onChange?.(text);
    }, debounceMsRef.current);
  }, []);

  const createUpdateListener = useCallback(() =>
    EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) {
        emitChange(update.state.doc.toString());
      }

      if (update.selectionSet) {
        const selection = update.state.selection.main;
        const { from } = selection;
        const to = selection.empty ? null : selection.to;
        callbacksRef.current.onSelectionChange?.(from, to);
      }

      if (update.selectionSet || update.docChanged) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        const column = pos - line.from;
        callbacksRef.current.onCursorMove?.(line.number, column);
      }
    }), [emitChange]);

  const createView = useCallback((doc: string, selection?: CMEditorState["selection"]) => {
    if (!containerRef.current) {
      return null;
    }

    const currentPresentation = presentationRef.current;
    const state = createEditorState({
      doc,
      theme: currentPresentation.theme,
      disabled: currentPresentation.disabled,
      showLineNumbers: currentPresentation.showLineNumbers,
      textWrappingEnabled: currentPresentation.textWrappingEnabled,
      syntaxHighlightingEnabled: currentPresentation.syntaxHighlightingEnabled,
      placeholder: currentPresentation.placeholder,
      updateListener: createUpdateListener(),
      onSave: () => callbacksRef.current.onSave?.(),
    });

    const view = new EditorView({ state, parent: containerRef.current });

    if (selection) {
      view.dispatch({ selection });
    }

    return view;
  }, [createUpdateListener]);

  useEffect(() => {
    if (viewRef.current || !containerRef.current) {
      return;
    }

    const view = createView(initialTextRef.current);
    if (!view) {
      return;
    }

    viewRef.current = view;
    setIsReady(true);

    return () => {
      if (onChangeTimeoutRef.current) {
        clearTimeout(onChangeTimeoutRef.current);
      }

      view.destroy();
      viewRef.current = null;
      setIsReady(false);
    };
  }, [createView]);

  useEffect(() => {
    const previousPresentation = presentationRef.current;

    if (
      previousPresentation.theme === theme
      && previousPresentation.disabled === disabled
      && previousPresentation.showLineNumbers === showLineNumbers
      && previousPresentation.textWrappingEnabled === textWrappingEnabled
      && previousPresentation.syntaxHighlightingEnabled === syntaxHighlightingEnabled
      && previousPresentation.placeholder === placeholder
    ) {
      return;
    }

    presentationRef.current = {
      theme,
      disabled,
      showLineNumbers,
      textWrappingEnabled,
      syntaxHighlightingEnabled,
      placeholder,
    };

    const view = viewRef.current;
    if (!view) {
      return;
    }

    const currentText = view.state.doc.toString();
    const currentSelection = view.state.selection;

    view.destroy();

    const nextView = createView(currentText, currentSelection);
    if (!nextView) {
      viewRef.current = null;
      return;
    }

    viewRef.current = nextView;
  }, [createView, disabled, placeholder, showLineNumbers, textWrappingEnabled, syntaxHighlightingEnabled, theme]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    const currentText = view.state.doc.toString();
    if (currentText === initialText) {
      return;
    }

    view.dispatch({ changes: { from: 0, to: currentText.length, insert: initialText } });
  }, [initialText]);

  const focus = useCallback(() => {
    viewRef.current?.focus();
  }, []);

  const containerStyle: CSSProperties = useMemo(
    () => ({
      height: "100%",
      overflow: "hidden",
      ["--editor-font-family" as string]: EDITOR_FONT_FAMILY_MAP[fontFamily],
      ["--editor-font-size" as string]: `${Math.max(12, Math.min(24, Math.round(fontSize)))}px`,
    }),
    [fontFamily, fontSize],
  );

  return (
    <div
      ref={containerRef}
      className={`editor-container ${className}`}
      data-theme={theme}
      data-ready={isReady}
      style={containerStyle}
      onClick={focus}
      data-testid="editor-container" />
  );
}

export default Editor;
