import { Button } from "$components/Button";
import { EditorWithContainer } from "$components/Editor";
import type { EditorProps } from "$components/Editor";
import { StatusBar } from "$components/StatusBar";
import type { StatusBarProps } from "$components/StatusBar";
import { useSkipAnimation } from "$hooks/useMotion";
import { FocusIcon } from "$icons";
import { useFocusModePanelState, useHelpSheetState } from "$state/selectors";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo } from "react";

type FocusModePanelProps = {
  editor: Pick<EditorProps, "initialText" | "onChange" | "onSave" | "onCursorMove" | "onSelectionChange">;
  statusBar: Pick<StatusBarProps, "docMeta" | "stats">;
};

const PANEL_INITIAL = { opacity: 0 } as const;
const PANEL_ANIMATE = { opacity: 1 } as const;
const PANEL_EXIT = { opacity: 0 } as const;
const PANEL_TRANSITION = { duration: 0.25, ease: "easeOut" } as const;
const NO_MOTION_TRANSITION = { duration: 0 } as const;

const FocusHeader = ({ onExit, onOpenHelp }: { onExit: () => void; onOpenHelp: () => void }) => (
  <div className="px-6 py-4 flex items-center justify-between">
    <h1 className="m-0 text-sm font-medium text-text-secondary flex items-center gap-2">
      <FocusIcon size="md" />
      Focus Mode
    </h1>
    <div className="flex items-center gap-2">
      <Button variant="surface" size="lg" onClick={onOpenHelp} className="rounded-md text-[0.8125rem]">
        Help (Cmd+/)
      </Button>
      <Button variant="surface" size="lg" onClick={onExit} className="rounded-md text-[0.8125rem]">
        Exit Focus Mode (Esc)
      </Button>
    </div>
  </div>
);

export const FocusModePanel = ({ editor, statusBar }: FocusModePanelProps) => {
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
  const container = useMemo(() => ({ className: "flex-1 max-w-3xl mx-auto w-full", style: {} }), []);

  return (
    <AnimatePresence>
      <motion.div
        initial={PANEL_INITIAL}
        animate={PANEL_ANIMATE}
        exit={PANEL_EXIT}
        transition={transition}
        className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
        <FocusHeader onExit={handleExit} onOpenHelp={handleOpenHelp} />
        <EditorWithContainer {...editor} container={container} />
        {statusBarCollapsed ? null : <StatusBar {...statusBar} />}
      </motion.div>
    </AnimatePresence>
  );
};
