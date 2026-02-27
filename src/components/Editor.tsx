import { focusDimming, focusDimmingTheme } from "$editor/focus-dimming";
import { posHighlighting, posHighlightingTheme } from "$editor/pos-highlighting";
import { styleCheck, styleCheckTheme } from "$editor/style-check";
import { oxocarbonDark, oxocarbonLight } from "$editor/themes";
import type { StyleMatch } from "$editor/types";
import { typewriterScroll } from "$editor/typewriter-scroll";
import { useEditorPresentationState } from "$state/selectors";
import type { AppTheme, EditorFontFamily, FocusDimmingMode, StyleCheckPattern, StyleCheckSettings } from "$types";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { Compartment, EditorState as CMEditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import type { ViewUpdate } from "@codemirror/view";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

export type EditorTheme = AppTheme;

export type EditorPresentationOverrides = Partial<
  {
    theme: EditorTheme;
    showLineNumbers: boolean;
    textWrappingEnabled: boolean;
    syntaxHighlightingEnabled: boolean;
    fontSize: number;
    fontFamily: EditorFontFamily;
    typewriterScrollingEnabled: boolean;
    focusDimmingMode: FocusDimmingMode;
    posHighlightingEnabled: boolean;
    styleCheckSettings: StyleCheckSettings;
  }
>;

export type EditorProps = {
  initialText?: string;
  disabled?: boolean;
  placeholder?: string;
  debounceMs?: number;
  styleSelection?: { from: number; to: number; requestId: number } | null;
  presentation?: EditorPresentationOverrides;
  onChange?: (text: string) => void;
  onSave?: () => void;
  onCursorMove?: (line: number, column: number) => void;
  onSelectionChange?: (from: number, to: number | null) => void;
  onStyleMatchesChange?: (matches: StyleMatch[]) => void;
  className?: string;
};

type EditorCallbacks = Pick<
  EditorProps,
  "onChange" | "onSave" | "onCursorMove" | "onSelectionChange" | "onStyleMatchesChange"
>;

type CreateEditorStateOptions = {
  doc: string;
  presentation: PresentationSnapshot;
  placeholder?: string;
  updateListener: ReturnType<typeof EditorView.updateListener.of>;
  onSave: () => void;
  onStyleMatchesChange: (matches: StyleMatch[]) => void;
  compartments: EditorCompartments;
};

type PresentationSnapshot = {
  theme: EditorTheme;
  disabled: boolean;
  showLineNumbers: boolean;
  textWrappingEnabled: boolean;
  syntaxHighlightingEnabled: boolean;
  typewriterScrollingEnabled: boolean;
  focusDimmingMode: FocusDimmingMode;
  posHighlightingEnabled: boolean;
  styleCheckSettings: StyleCheckSettings;
};

type EditorCompartments = {
  theme: Compartment;
  editable: Compartment;
  lineNumbers: Compartment;
  wrapping: Compartment;
  syntax: Compartment;
  placeholder: Compartment;
  typewriter: Compartment;
  focusDimming: Compartment;
  posHighlighting: Compartment;
  styleCheck: Compartment;
};

const EDITOR_FONT_FAMILY_MAP: Record<EditorFontFamily, string> = {
  "IBM Plex Mono": "\"Writer IBM Plex Mono\", \"IBM Plex Mono\", \"SF Mono\", Monaco, \"Cascadia Code\", monospace",
  "IBM Plex Sans Variable":
    "\"Writer IBM Plex Sans\", \"IBM Plex Sans\", -apple-system, BlinkMacSystemFont, sans-serif",
  "IBM Plex Serif": "\"Writer IBM Plex Serif\", \"IBM Plex Serif\", Georgia, \"Times New Roman\", serif",
  "Monaspace Argon": "\"Writer Monaspace Argon\", \"Writer IBM Plex Mono\", monospace",
  "Monaspace Krypton": "\"Writer Monaspace Krypton\", \"Writer IBM Plex Mono\", monospace",
  "Monaspace Neon": "\"Writer Monaspace Neon\", \"Writer IBM Plex Mono\", monospace",
  "Monaspace Radon": "\"Writer Monaspace Radon\", \"Writer IBM Plex Mono\", monospace",
  "Monaspace Xenon": "\"Writer Monaspace Xenon\", \"Writer IBM Plex Mono\", monospace",
};

function getThemeExtension(theme: EditorTheme): Extension {
  const themeExtension = theme === "dark" ? oxocarbonDark : oxocarbonLight;
  return themeExtension;
}

function getSyntaxExtension(enabled: boolean): Extension {
  if (!enabled) {
    return [];
  }

  return markdown({ base: markdownLanguage, codeLanguages: [], addKeymap: true });
}

function getFocusDimmingExtension(mode: FocusDimmingMode): Extension {
  if (mode === "off") {
    return [];
  }

  return [focusDimming(mode), focusDimmingTheme];
}

function getStyleCheckExtension(
  settings: StyleCheckSettings,
  onStyleMatchesChange: (matches: StyleMatch[]) => void,
): Extension {
  if (!settings.enabled) {
    return [];
  }

  return [
    styleCheck({
      enabled: settings.enabled,
      categories: settings.categories,
      customPatterns: settings.customPatterns.map((p) => ({
        text: p.text,
        category: p.category,
        replacement: p.replacement,
      })),
      markerStyle: settings.markerStyle,
      onMatchesChange: onStyleMatchesChange,
    }),
    styleCheckTheme,
  ];
}

function getPlaceholderExtension(placeholder?: string): Extension {
  if (!placeholder) {
    return [];
  }

  return EditorView.theme({ ".cm-placeholder": { color: "#888" } });
}

function createEditorState(
  { doc, presentation, placeholder, updateListener, onSave, onStyleMatchesChange, compartments }:
    CreateEditorStateOptions,
): CMEditorState {
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
      history(),
      updateListener,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      saveKeymap,
      compartments.theme.of(getThemeExtension(presentation.theme)),
      compartments.editable.of(EditorView.editable.of(!presentation.disabled)),
      compartments.lineNumbers.of(presentation.showLineNumbers ? lineNumbers() : []),
      compartments.wrapping.of(presentation.textWrappingEnabled ? EditorView.lineWrapping : []),
      compartments.syntax.of(getSyntaxExtension(presentation.syntaxHighlightingEnabled)),
      compartments.placeholder.of(getPlaceholderExtension(placeholder)),
      compartments.typewriter.of(presentation.typewriterScrollingEnabled ? typewriterScroll() : []),
      compartments.focusDimming.of(getFocusDimmingExtension(presentation.focusDimmingMode)),
      compartments.posHighlighting.of(
        presentation.posHighlightingEnabled ? [posHighlighting(), posHighlightingTheme] : [],
      ),
      compartments.styleCheck.of(getStyleCheckExtension(presentation.styleCheckSettings, onStyleMatchesChange)),
    ],
  });
}

function areCustomPatternsEqual(left: StyleCheckPattern[], right: StyleCheckPattern[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a.text !== b.text || a.category !== b.category || a.replacement !== b.replacement) {
      return false;
    }
  }

  return true;
}

export function Editor(
  {
    initialText = "",
    disabled = false,
    placeholder,
    debounceMs = 500,
    styleSelection = null,
    presentation,
    onChange,
    onSave,
    onCursorMove,
    onSelectionChange,
    onStyleMatchesChange,
    className = "",
  }: EditorProps,
) {
  const defaults = useEditorPresentationState();
  const theme = presentation?.theme ?? defaults.theme;
  const showLineNumbers = presentation?.showLineNumbers ?? defaults.showLineNumbers;
  const textWrappingEnabled = presentation?.textWrappingEnabled ?? defaults.textWrappingEnabled;
  const syntaxHighlightingEnabled = presentation?.syntaxHighlightingEnabled ?? defaults.syntaxHighlightingEnabled;
  const fontSize = presentation?.fontSize ?? defaults.fontSize;
  const fontFamily = presentation?.fontFamily ?? defaults.fontFamily;
  const typewriterScrollingEnabled = presentation?.typewriterScrollingEnabled ?? defaults.typewriterScrollingEnabled;
  const focusDimmingMode = presentation?.focusDimmingMode ?? defaults.focusDimmingMode;
  const posHighlightingEnabled = presentation?.posHighlightingEnabled ?? defaults.posHighlightingEnabled;
  const styleCheckSettings = presentation?.styleCheckSettings ?? defaults.styleCheckSettings;

  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const callbacksRef = useRef<EditorCallbacks>({
    onChange,
    onSave,
    onCursorMove,
    onSelectionChange,
    onStyleMatchesChange,
  });
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
    typewriterScrollingEnabled,
    focusDimmingMode,
    posHighlightingEnabled,
    styleCheckSettings,
  });
  const compartmentsRef = useRef<EditorCompartments>({
    theme: new Compartment(),
    editable: new Compartment(),
    lineNumbers: new Compartment(),
    wrapping: new Compartment(),
    syntax: new Compartment(),
    placeholder: new Compartment(),
    typewriter: new Compartment(),
    focusDimming: new Compartment(),
    posHighlighting: new Compartment(),
    styleCheck: new Compartment(),
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onChange, onSave, onCursorMove, onSelectionChange, onStyleMatchesChange };
  }, [onChange, onSave, onCursorMove, onSelectionChange, onStyleMatchesChange]);

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
      presentation: currentPresentation,
      placeholder: currentPresentation.placeholder,
      updateListener: createUpdateListener(),
      onSave: () => callbacksRef.current.onSave?.(),
      onStyleMatchesChange: (matches) => callbacksRef.current.onStyleMatchesChange?.(matches),
      compartments: compartmentsRef.current,
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
      && previousPresentation.typewriterScrollingEnabled === typewriterScrollingEnabled
      && previousPresentation.focusDimmingMode === focusDimmingMode
      && previousPresentation.posHighlightingEnabled === posHighlightingEnabled
      && previousPresentation.styleCheckSettings.enabled === styleCheckSettings.enabled
      && previousPresentation.styleCheckSettings.categories.filler === styleCheckSettings.categories.filler
      && previousPresentation.styleCheckSettings.categories.redundancy === styleCheckSettings.categories.redundancy
      && previousPresentation.styleCheckSettings.categories.cliche === styleCheckSettings.categories.cliche
      && previousPresentation.styleCheckSettings.markerStyle === styleCheckSettings.markerStyle
      && areCustomPatternsEqual(
        previousPresentation.styleCheckSettings.customPatterns,
        styleCheckSettings.customPatterns,
      )
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
      typewriterScrollingEnabled,
      focusDimmingMode,
      posHighlightingEnabled,
      styleCheckSettings,
    };

    const view = viewRef.current;
    if (!view) {
      return;
    }
    const effects = [];
    const compartments = compartmentsRef.current;

    if (previousPresentation.theme !== theme) {
      effects.push(compartments.theme.reconfigure(getThemeExtension(theme)));
    }
    if (previousPresentation.disabled !== disabled) {
      effects.push(compartments.editable.reconfigure(EditorView.editable.of(!disabled)));
    }
    if (previousPresentation.showLineNumbers !== showLineNumbers) {
      effects.push(compartments.lineNumbers.reconfigure(showLineNumbers ? lineNumbers() : []));
    }
    if (previousPresentation.textWrappingEnabled !== textWrappingEnabled) {
      effects.push(compartments.wrapping.reconfigure(textWrappingEnabled ? EditorView.lineWrapping : []));
    }
    if (previousPresentation.syntaxHighlightingEnabled !== syntaxHighlightingEnabled) {
      effects.push(compartments.syntax.reconfigure(getSyntaxExtension(syntaxHighlightingEnabled)));
    }
    if (previousPresentation.placeholder !== placeholder) {
      effects.push(compartments.placeholder.reconfigure(getPlaceholderExtension(placeholder)));
    }
    if (previousPresentation.typewriterScrollingEnabled !== typewriterScrollingEnabled) {
      effects.push(compartments.typewriter.reconfigure(typewriterScrollingEnabled ? typewriterScroll() : []));
    }
    if (previousPresentation.focusDimmingMode !== focusDimmingMode) {
      effects.push(compartments.focusDimming.reconfigure(getFocusDimmingExtension(focusDimmingMode)));
    }
    if (previousPresentation.posHighlightingEnabled !== posHighlightingEnabled) {
      effects.push(
        compartments.posHighlighting.reconfigure(
          posHighlightingEnabled ? [posHighlighting(), posHighlightingTheme] : [],
        ),
      );
    }
    if (
      previousPresentation.styleCheckSettings.enabled !== styleCheckSettings.enabled
      || previousPresentation.styleCheckSettings.categories.filler !== styleCheckSettings.categories.filler
      || previousPresentation.styleCheckSettings.categories.redundancy !== styleCheckSettings.categories.redundancy
      || previousPresentation.styleCheckSettings.categories.cliche !== styleCheckSettings.categories.cliche
      || previousPresentation.styleCheckSettings.markerStyle !== styleCheckSettings.markerStyle
      || !areCustomPatternsEqual(
        previousPresentation.styleCheckSettings.customPatterns,
        styleCheckSettings.customPatterns,
      )
    ) {
      effects.push(
        compartments.styleCheck.reconfigure(getStyleCheckExtension(styleCheckSettings, (matches) =>
          callbacksRef.current.onStyleMatchesChange?.(matches))),
      );
    }

    if (effects.length > 0) {
      view.dispatch({ effects });
    }
  }, [
    disabled,
    placeholder,
    showLineNumbers,
    textWrappingEnabled,
    syntaxHighlightingEnabled,
    theme,
    typewriterScrollingEnabled,
    focusDimmingMode,
    posHighlightingEnabled,
    styleCheckSettings,
  ]);

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

  useEffect(() => {
    const view = viewRef.current;
    const styleSelectionFrom = styleSelection?.from ?? null;
    const styleSelectionTo = styleSelection?.to ?? null;
    if (!view || styleSelectionFrom === null || styleSelectionTo === null) {
      return;
    }

    const docLength = view.state.doc.length;
    const from = Math.max(0, Math.min(docLength, styleSelectionFrom));
    const to = Math.max(from, Math.min(docLength, styleSelectionTo));

    view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true });
    view.focus();
  }, [styleSelection, styleSelection?.requestId]);

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

export const EditorWithContainer = (
  { container, ...props }: EditorProps & { container: { className?: string; style?: CSSProperties } },
) => (
  <div className={`${container.className}`} style={container.style}>
    <Editor {...props} />
  </div>
);

export default Editor;
