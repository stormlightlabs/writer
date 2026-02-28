import { Button } from "$components/Button";
import { EditorWithContainer } from "$components/Editor";
import type { EditorProps } from "$components/Editor";
import { StatusBar } from "$components/StatusBar";
import type { StatusBarProps } from "$components/StatusBar";
import { SaveStatusIndicator } from "$components/Toolbar/SaveStatusIndicator";
import { useSkipAnimation } from "$hooks/useMotion";
import { FocusIcon } from "$icons";
import { useFocusModePanelState, useHelpSheetState } from "$state/selectors";
import type { SaveStatus } from "$types";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo } from "react";

type FocusModePanelProps = {
  editor: Pick<EditorProps, "initialText" | "onChange" | "onSave" | "onCursorMove" | "onSelectionChange">;
  statusBar: Pick<StatusBarProps, "docMeta" | "stats">;
  saveStatus: SaveStatus;
  hasActiveDocument: boolean;
  onSave: () => void;
};

const PANEL_INITIAL = { opacity: 0 } as const;
const PANEL_ANIMATE = { opacity: 1 } as const;
const PANEL_EXIT = { opacity: 0 } as const;
const PANEL_TRANSITION = { duration: 0.25, ease: "easeOut" } as const;
const NO_MOTION_TRANSITION = { duration: 0 } as const;

type FocusHeaderProps = {
  onExit: () => void;
  onOpenHelp: () => void;
  onSave: () => void;
  saveStatus: SaveStatus;
  hasActiveDocument: boolean;
};

function FocusHeader({ onExit, onOpenHelp, onSave, saveStatus, hasActiveDocument }: FocusHeaderProps) {
  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <h1 className="m-0 text-sm font-medium text-text-secondary flex items-center gap-2">
        <FocusIcon size="md" />
        Focus Mode
      </h1>
      <div className="flex items-center gap-2">
        <SaveStatusIndicator
          status={saveStatus}
          compact
          onClick={onSave}
          disabled={!hasActiveDocument || saveStatus === "Saved" || saveStatus === "Saving"}
          title="Save (Cmd+S)" />
        <Button variant="surface" size="lg" onClick={onOpenHelp} className="rounded-md text-[0.8125rem]">
          Help (Cmd+/)
        </Button>
        <Button variant="surface" size="lg" onClick={onExit} className="rounded-md text-[0.8125rem]">
          Exit Focus Mode (Esc)
        </Button>
      </div>
    </div>
  );
}

export function FocusModePanel({ editor, statusBar, saveStatus, hasActiveDocument, onSave }: FocusModePanelProps) {
  const { statusBarCollapsed, setFocusMode } = useFocusModePanelState();
  const { setOpen: setHelpSheetOpen } = useHelpSheetState();
  const skipAnimation = useSkipAnimation();
  const transition = useMemo(() => skipAnimation ? NO_MOTION_TRANSITION : PANEL_TRANSITION, [skipAnimation]);
  const handleExit = useCallback(() => {
    setFocusMode(false);
  }, [setFocusMode]);
  const handleOpenHelp = useCallback(() => {
    setHelpSheetOpen(true);
  }, [setHelpSheetOpen]);
  const container = useMemo(() => ({ className: "flex-1 max-w-3xl mx-auto w-full pt-3", style: {} }), []);

  return (
    <AnimatePresence>
      <motion.div
        initial={PANEL_INITIAL}
        animate={PANEL_ANIMATE}
        exit={PANEL_EXIT}
        transition={transition}
        className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
        <FocusHeader
          onExit={handleExit}
          onOpenHelp={handleOpenHelp}
          onSave={onSave}
          saveStatus={saveStatus}
          hasActiveDocument={hasActiveDocument} />
        <EditorWithContainer {...editor} container={container} />
        {statusBarCollapsed ? null : <StatusBar {...statusBar} />}
      </motion.div>
    </AnimatePresence>
  );
}
