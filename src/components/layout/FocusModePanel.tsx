import { FocusIcon } from "$icons";
import type { DocMeta, EditorFontFamily } from "$types";
import { Editor, type EditorTheme } from "../Editor";
import { StatusBar } from "../StatusBar";

type FocusModePanelProps = {
  theme: EditorTheme;
  text: string;
  docMeta: DocMeta | null;
  cursorLine: number;
  cursorColumn: number;
  wordCount: number;
  charCount: number;
  selectionCount?: number;
  lineNumbersVisible: boolean;
  textWrappingEnabled: boolean;
  syntaxHighlightingEnabled: boolean;
  editorFontSize: number;
  editorFontFamily: EditorFontFamily;
  statusBarCollapsed: boolean;
  onExit: () => void;
  onEditorChange: (text: string) => void;
  onSave: () => void;
  onCursorMove: (line: number, column: number) => void;
  onSelectionChange: (from: number, to: number | null) => void;
};

const FocusHeader = ({ onExit }: { onExit: () => void }) => (
  <div className="px-6 py-4 flex items-center justify-between">
    <h1 className="m-0 text-sm font-medium text-text-secondary flex items-center gap-2">
      <FocusIcon size="md" />
      Focus Mode
    </h1>
    <button
      onClick={onExit}
      className="px-4 py-2 bg-layer-01 border border-border-subtle rounded-md text-text-secondary text-[0.8125rem] cursor-pointer">
      Exit Focus Mode (Esc)
    </button>
  </div>
);

export const FocusModePanel = (
  {
    theme,
    text,
    docMeta,
    cursorLine,
    cursorColumn,
    wordCount,
    charCount,
    selectionCount,
    lineNumbersVisible,
    textWrappingEnabled,
    syntaxHighlightingEnabled,
    editorFontSize,
    editorFontFamily,
    statusBarCollapsed,
    onExit,
    onEditorChange,
    onSave,
    onCursorMove,
    onSelectionChange,
  }: FocusModePanelProps,
) => (
  <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
    <FocusHeader onExit={onExit} />

    <div className="flex-1 max-w-3xl mx-auto w-full">
      <Editor
        initialText={text}
        theme={theme}
        showLineNumbers={lineNumbersVisible}
        textWrappingEnabled={textWrappingEnabled}
        syntaxHighlightingEnabled={syntaxHighlightingEnabled}
        fontSize={editorFontSize}
        fontFamily={editorFontFamily}
        onChange={onEditorChange}
        onSave={onSave}
        onCursorMove={onCursorMove}
        onSelectionChange={onSelectionChange} />
    </div>

    {statusBarCollapsed
      ? null
      : (
        <StatusBar
          docMeta={docMeta}
          cursorLine={cursorLine}
          cursorColumn={cursorColumn}
          wordCount={wordCount}
          charCount={charCount}
          selectionCount={selectionCount} />
      )}
  </div>
);
