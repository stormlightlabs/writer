import type { EditorMsg } from "$hooks/useEditor";
import { useCallback } from "react";

type UseEditorBridgeArgs = { dispatchEditor: (msg: EditorMsg) => void; syncPreviewLine: (line: number) => void };

export function useEditorBridge({ dispatchEditor, syncPreviewLine }: UseEditorBridgeArgs) {
  const handleEditorChange = useCallback((text: string) => {
    dispatchEditor({ type: "EditorChanged", text });
  }, [dispatchEditor]);

  const handleCursorMove = useCallback((line: number, column: number) => {
    dispatchEditor({ type: "CursorMoved", line, column });
    syncPreviewLine(line);
  }, [dispatchEditor, syncPreviewLine]);

  const handleSelectionChange = useCallback((from: number, to: number | null) => {
    dispatchEditor({ type: "SelectionChanged", from, to });
  }, [dispatchEditor]);

  return { handleEditorChange, handleCursorMove, handleSelectionChange };
}
