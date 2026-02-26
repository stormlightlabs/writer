import { Button } from "$components/Button";
import { Editor } from "$components/Editor";
import type { EditorProps } from "$components/Editor";
import { StatusBar } from "$components/StatusBar";
import type { StatusBarProps } from "$components/StatusBar";
import { FocusIcon } from "$icons";
import { useFocusModePanelState } from "$state/selectors";
import { useCallback } from "react";

type FocusModePanelProps = {
  editor: Pick<EditorProps, "initialText" | "onChange" | "onSave" | "onCursorMove" | "onSelectionChange">;
  statusBar: Pick<StatusBarProps, "docMeta" | "stats">;
};

const FocusHeader = ({ onExit }: { onExit: () => void }) => (
  <div className="px-6 py-4 flex items-center justify-between">
    <h1 className="m-0 text-sm font-medium text-text-secondary flex items-center gap-2">
      <FocusIcon size="md" />
      Focus Mode
    </h1>
    <Button variant="surface" size="lg" onClick={onExit} className="rounded-md text-[0.8125rem]">
      Exit Focus Mode (Esc)
    </Button>
  </div>
);

export const FocusModePanel = ({ editor, statusBar }: FocusModePanelProps) => {
  const { statusBarCollapsed, setFocusMode } = useFocusModePanelState();

  const handleExit = useCallback(() => {
    setFocusMode(false);
  }, [setFocusMode]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
      <FocusHeader onExit={handleExit} />

      <div className="flex-1 max-w-3xl mx-auto w-full">
        <Editor {...editor} />
      </div>

      {statusBarCollapsed ? null : <StatusBar {...statusBar} />}
    </div>
  );
};
