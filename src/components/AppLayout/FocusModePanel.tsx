import { Button } from "$components/Button";
import { EditorWithContainer } from "$components/Editor";
import type { EditorProps } from "$components/Editor";
import { StatusBar } from "$components/StatusBar";
import type { StatusBarProps } from "$components/StatusBar";
import { SaveStatusIndicator } from "$components/Toolbar/SaveStatusIndicator";
import { FOCUS, NO_MOTION_TRANSITION } from "$constants";
import { useSkipAnimation } from "$hooks/useMotion";
import { FocusIcon } from "$icons";
import { useFocusModePanelState, useHelpSheetState } from "$state/selectors";
import type { SaveStatus } from "$types";
import { formatShortcut } from "$utils/shortcuts";
import * as logger from "@tauri-apps/plugin-log";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo } from "react";

type FocusModePanelProps = {
  editor: Pick<EditorProps, "initialText" | "onChange" | "onSave" | "onCursorMove" | "onSelectionChange">;
  statusBar: Pick<StatusBarProps, "docMeta" | "stats">;
  saveStatus: SaveStatus;
  hasActiveDocument: boolean;
  onSave: () => void;
};

type FocusHeaderProps = {
  onExit: () => void;
  onOpenHelp: () => void;
  onSave: () => void;
  saveStatus: SaveStatus;
  hasActiveDocument: boolean;
};

function FocusHeader({ onExit, onOpenHelp, onSave, saveStatus, hasActiveDocument }: FocusHeaderProps) {
  const saveShortcut = formatShortcut("Cmd+S");
  const helpShortcut = formatShortcut("Cmd+/");

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
          title={`Save (${saveShortcut})`} />
        <Button variant="surface" size="lg" onClick={onOpenHelp} className="rounded-md text-[0.8125rem]">
          Help ({helpShortcut})
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
  const transition = useMemo(() => skipAnimation ? NO_MOTION_TRANSITION : FOCUS.TRANSITION, [skipAnimation]);
  const handleExit = useCallback(() => {
    setFocusMode(false);
  }, [setFocusMode]);
  const handleOpenHelp = useCallback(() => {
    setHelpSheetOpen(true);
  }, [setHelpSheetOpen]);
  const container = useMemo(
    () => ({ className: "flex min-h-0 flex-1 max-w-3xl mx-auto w-full overflow-hidden pt-3", style: {} }),
    [],
  );

  useEffect(() => {
    void logger.debug(
      `Focus mode layout ready: hasActiveDocument=${String(hasActiveDocument)}, statusBarCollapsed=${
        String(statusBarCollapsed)
      }`,
    );
  }, [hasActiveDocument, statusBarCollapsed]);

  return (
    <AnimatePresence>
      <motion.div
        initial={FOCUS.INITIAL}
        animate={FOCUS.ANIMATE}
        exit={FOCUS.EXIT}
        transition={transition}
        className="fixed inset-0 z-50 flex min-h-0 flex-col bg-surface-primary">
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
