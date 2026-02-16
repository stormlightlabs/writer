import type { DocMeta } from "../../ports";
import { Editor, type EditorTheme } from "../Editor";
import { FocusIcon } from "../icons";
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
  onExit: () => void;
  onEditorChange: (text: string) => void;
  onSave: () => void;
  onCursorMove: (line: number, column: number) => void;
  onSelectionChange: (from: number, to: number | null) => void;
};

function FocusHeader({ onExit }: { onExit: () => void }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <h1 className="m-0 text-sm font-medium text-text-secondary flex items-center gap-2">
        <FocusIcon size={16} />
        Focus Mode
      </h1>
      <button
        onClick={onExit}
        className="px-4 py-2 bg-layer-01 border border-border-subtle rounded-md text-text-secondary text-[0.8125rem] cursor-pointer">
        Exit Focus Mode (Esc)
      </button>
    </div>
  );
}

export function FocusModePanel(
  {
    theme,
    text,
    docMeta,
    cursorLine,
    cursorColumn,
    wordCount,
    charCount,
    selectionCount,
    onExit,
    onEditorChange,
    onSave,
    onCursorMove,
    onSelectionChange,
  }: FocusModePanelProps,
) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
      <FocusHeader onExit={onExit} />

      <div className="flex-1 max-w-3xl mx-auto w-full">
        <Editor
          initialText={text}
          theme={theme}
          onChange={onEditorChange}
          onSave={onSave}
          onCursorMove={onCursorMove}
          onSelectionChange={onSelectionChange} />
      </div>

      <StatusBar
        docMeta={docMeta}
        cursorLine={cursorLine}
        cursorColumn={cursorColumn}
        wordCount={wordCount}
        charCount={charCount}
        selectionCount={selectionCount} />
    </div>
  );
}
