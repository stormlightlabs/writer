import { Button } from "$components/Button";
import { ContextMenu, type ContextMenuDivider, type ContextMenuItem, useContextMenu } from "$components/ContextMenu";
import { CHROME_SECTION, NO_MOTION_TRANSITION, QUICK_CAPTURE } from "$constants";
import { ChevronDownIcon, PenIcon, XIcon } from "$icons";
import type { CaptureMode } from "$types";
import { formatShortcut } from "$utils/shortcuts";
import { cn } from "$utils/tw";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type QuickCaptureSaveTarget = { id: string; locationId: number; relPath: string; label: string };

type QuickCaptureFormProps = {
  defaultMode?: CaptureMode;
  onSubmit: (text: string, mode: CaptureMode, destination?: { locationId: number; relPath: string }) => void;
  onClose: () => void;
  isSubmitting: boolean;
  error: string | null;
  reduceMotion?: boolean;
  saveTargets?: QuickCaptureSaveTarget[];
};

type FormTransition = typeof CHROME_SECTION.TRANSITION | typeof NO_MOTION_TRANSITION;

type ModeButtonsProps = {
  currentMode: CaptureMode;
  setMode: (mode: CaptureMode) => void;
  isSubmitting: boolean;
  transition: FormTransition;
};

const MODE_OPTIONS = ["QuickNote", "WritingSession", "Append"] as const satisfies readonly CaptureMode[];
const EMPTY_SAVE_TARGETS: QuickCaptureSaveTarget[] = [];

const getModeLabel = (m: CaptureMode): string => {
  switch (m) {
    case "QuickNote":
      return "Quick Note";
    case "WritingSession":
      return "Writing Session";
    case "Append":
      return "Append";
    default:
      return m;
  }
};

const getModeDescription = (m: CaptureMode): string => {
  switch (m) {
    case "QuickNote":
      return "Capture and save immediately into your inbox.";
    case "WritingSession":
      return "Draft freely and save when you are ready.";
    case "Append":
      return "Append your note to the last configured target.";
    default:
      return "Capture a thought quickly.";
  }
};

const getShortcutHint = (mode: CaptureMode): string => {
  if (mode === "WritingSession") {
    return `${formatShortcut("Cmd+Enter")} to save, Esc to close`;
  }
  return "Enter to save, Shift+Enter for newline, Esc to close";
};

const ModeDescription = ({ mode, transition }: { mode: CaptureMode; transition: FormTransition }) => (
  <AnimatePresence mode="wait" initial={false}>
    <motion.p
      key={mode}
      initial={QUICK_CAPTURE.TEXT.INITIAL}
      animate={QUICK_CAPTURE.TEXT.ANIMATE}
      exit={QUICK_CAPTURE.TEXT.EXIT}
      transition={transition}
      className="text-xs text-text-secondary">
      {getModeDescription(mode)}
    </motion.p>
  </AnimatePresence>
);

const ModeButton = (
  { mode, currentMode, setMode, isSubmitting, transition }: {
    mode: CaptureMode;
    currentMode: CaptureMode;
    setMode: (mode: CaptureMode) => void;
    isSubmitting: boolean;
    transition: FormTransition;
  },
) => {
  const handleClick = useCallback(() => {
    setMode(mode);
  }, [mode, setMode]);

  const classes = useMemo(
    () =>
      cn(
        "relative rounded px-2.5 py-1.5 text-xs font-medium transition-[color,background-color,opacity,border-color] duration-150 sm:text-sm",
        mode === currentMode ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
      ),
    [mode, currentMode],
  );

  return (
    <Button className={classes} onClick={handleClick} disabled={isSubmitting}>
      {mode === currentMode && (
        <motion.span
          layoutId="quick-capture-active-mode"
          className="absolute inset-0 rounded border border-border-strong bg-layer-02 shadow-sm"
          transition={transition} />
      )}
      <span className="relative z-10">{getModeLabel(mode)}</span>
    </Button>
  );
};

const ModeButtons = ({ currentMode, setMode, isSubmitting, transition }: ModeButtonsProps) => (
  <div className="inline-flex w-full flex-wrap gap-1 rounded border border-border-subtle bg-field-02 p-1">
    {MODE_OPTIONS.map((modeOption) => (
      <ModeButton
        key={modeOption}
        mode={modeOption}
        currentMode={currentMode}
        setMode={setMode}
        isSubmitting={isSubmitting}
        transition={transition} />
    ))}
  </div>
);

const CaptureTitle = ({ mode, transition }: { mode: CaptureMode; transition: FormTransition }) => (
  <div className="flex min-w-0 items-start gap-2.5">
    <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded border border-border-strong bg-layer-02 text-text-primary">
      <PenIcon size="sm" />
    </span>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-text-primary">Quick Capture</p>
      <ModeDescription mode={mode} transition={transition} />
    </div>
  </div>
);

const QuickCaptureFormHeader = (
  { onClose, currentMode, setMode, isSubmitting, transition }: ModeButtonsProps & { onClose: () => void },
) => (
  <header className="border-b border-border-subtle bg-layer-01 px-3 py-3 sm:px-4">
    <div className="mb-3 flex items-start justify-between gap-3">
      <CaptureTitle mode={currentMode} transition={transition} />
      <Button
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded text-text-secondary",
          "hover:bg-support-error/10 hover:text-support-error transition-colors duration-200",
        )}
        onClick={onClose}
        disabled={isSubmitting}
        aria-label="Close">
        <XIcon size="sm" />
      </Button>
    </div>
    <ModeButtons currentMode={currentMode} setMode={setMode} isSubmitting={isSubmitting} transition={transition} />
  </header>
);

const CaptureMetaRow = ({ mode, noteStats }: { mode: CaptureMode; noteStats: string }) => (
  <div className="flex items-center justify-between gap-2 px-0.5 text-xs text-text-placeholder">
    <span>{getModeLabel(mode)} mode</span>
    <span>{noteStats}</span>
  </div>
);

const CaptureTextarea = (
  { textareaRef, text, isSubmitting, onChange, onKeyDown }: {
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    text: string;
    isSubmitting: boolean;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  },
) => (
  <div className="mt-2 flex min-h-0 flex-1 overflow-hidden rounded border border-border-subtle bg-field-02 transition-colors focus-within:border-border-interactive">
    <textarea
      ref={textareaRef}
      className="h-full min-h-0 w-full resize-none overflow-y-auto rounded bg-transparent px-3 py-2.5 font-mono text-base leading-relaxed text-text-primary outline-none placeholder:text-text-placeholder disabled:opacity-60"
      value={text}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder="Type your note here..."
      disabled={isSubmitting}
      rows={1} />
  </div>
);

const ComposePane = (
  { mode, noteStats, text, isSubmitting, textareaRef, onTextChange, onTextareaKeyDown, transition }: {
    mode: CaptureMode;
    noteStats: string;
    text: string;
    isSubmitting: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    onTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onTextareaKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    transition: FormTransition;
  },
) => (
  <motion.section
    layout
    transition={transition}
    className="flex min-h-0 flex-1 flex-col rounded border border-border-subtle bg-field-01 p-2.5 sm:p-3">
    <CaptureMetaRow mode={mode} noteStats={noteStats} />
    <CaptureTextarea
      textareaRef={textareaRef}
      text={text}
      isSubmitting={isSubmitting}
      onChange={onTextChange}
      onKeyDown={onTextareaKeyDown} />
  </motion.section>
);

function FooterStatus(
  { error, mode, transition, selectedSaveTargetLabel }: {
    error: string | null;
    mode: CaptureMode;
    transition: FormTransition;
    selectedSaveTargetLabel: string | null;
  },
) {
  const message = useMemo(
    () => error ?? (selectedSaveTargetLabel ? `Save To: ${selectedSaveTargetLabel}` : getShortcutHint(mode)),
    [error, selectedSaveTargetLabel, mode],
  );
  const statusClass = useMemo(() => error ? "text-support-error" : "text-text-placeholder", [error]);
  const statusKey = useMemo(() => error ?? selectedSaveTargetLabel ?? mode, [error, selectedSaveTargetLabel, mode]);

  return (
    <div className="min-h-5 text-sm">
      <AnimatePresence initial={false} mode="wait">
        <motion.p
          key={statusKey}
          initial={QUICK_CAPTURE.TEXT.INITIAL}
          animate={QUICK_CAPTURE.TEXT.ANIMATE}
          exit={QUICK_CAPTURE.TEXT.EXIT}
          transition={transition}
          className={statusClass}>
          {message}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function FooterActions(
  { mode, isSubmitting, canSubmit, onSubmit, onClose, saveTargets, selectedSaveTargetId, onSaveTargetSelect }: {
    mode: CaptureMode;
    isSubmitting: boolean;
    canSubmit: boolean;
    onSubmit: () => void;
    onClose: () => void;
    saveTargets: QuickCaptureSaveTarget[];
    selectedSaveTargetId: string | null;
    onSaveTargetSelect: (targetId: string | null) => void;
  },
) {
  const { isOpen, position, openAt, close } = useContextMenu();
  const isAppendMode = mode === "Append";
  const canChooseSaveTarget = !isAppendMode && saveTargets.length > 0;

  const menuItems = useMemo<(ContextMenuItem | ContextMenuDivider)[]>(() => {
    if (isAppendMode) {
      return [{ label: "Append mode uses append target", onClick: () => {}, disabled: true }];
    }

    if (saveTargets.length === 0) {
      return [{ label: "No directories found", onClick: () => {}, disabled: true }];
    }

    return [
      { label: "Save (Auto)", onClick: () => onSaveTargetSelect(null) },
      { divider: true },
      ...saveTargets.map((target) => ({
        label: `Save to ${target.label}`,
        onClick: () => onSaveTargetSelect(target.id),
      })),
    ];
  }, [isAppendMode, onSaveTargetSelect, saveTargets]);

  const handleOpenSaveTo = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    openAt(rect.left, rect.bottom + 6);
  }, [openAt]);

  const saveLabel = selectedSaveTargetId ? "Save To" : "Save Capture";
  const saveButtonLabel = isSubmitting ? "Saving..." : saveLabel;

  return (
    <>
      <div className="flex w-full items-center gap-2">
        <Button variant="outline" size="lg" onClick={onClose} disabled={isSubmitting} className="min-w-0 flex-1">
          Cancel
        </Button>
        <div className="flex min-w-0 flex-1">
          <Button
            variant="primaryBlue"
            size="lg"
            className="min-w-0 flex-1 gap-1.5 rounded-r-none border-r border-white/25"
            onClick={onSubmit}
            disabled={isSubmitting || !canSubmit}>
            {saveButtonLabel}
          </Button>
          <SaveToMenuButton onOpen={handleOpenSaveTo} disabled={isSubmitting || !canChooseSaveTarget} />
        </div>
      </div>
      <ContextMenu isOpen={isOpen} position={position} onClose={close} items={menuItems} />
    </>
  );
}

function SaveToMenuButton(
  { onOpen, disabled }: { onOpen: (event: React.MouseEvent<HTMLButtonElement>) => void; disabled: boolean },
) {
  return (
    <Button
      variant="primaryBlue"
      size="lg"
      className="w-10 shrink-0 rounded-l-none px-0"
      aria-label="Choose save destination"
      title="Save To"
      onClick={onOpen}
      disabled={disabled}>
      <ChevronDownIcon size="sm" />
    </Button>
  );
}

export function QuickCaptureForm(
  {
    defaultMode = "QuickNote",
    onSubmit,
    onClose,
    isSubmitting,
    error,
    reduceMotion = false,
    saveTargets = EMPTY_SAVE_TARGETS,
  }: QuickCaptureFormProps,
) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<CaptureMode>(defaultMode);
  const [selectedSaveTargetId, setSelectedSaveTargetId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transition = useMemo(() => reduceMotion ? NO_MOTION_TRANSITION : CHROME_SECTION.TRANSITION, [reduceMotion]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const canSubmit = useMemo(() => text.trim().length > 0, [text]);
  const noteStats = useMemo(() => {
    if (text.length === 0) {
      return "0 lines · 0 chars";
    }

    const lineCount = text.split(/\r\n|\r|\n/).length;
    return `${lineCount} line${lineCount > 1 ? "s" : ""} · ${text.length} chars`;
  }, [text]);

  const selectedSaveTarget = useMemo(() => saveTargets.find((target) => target.id === selectedSaveTargetId) ?? null, [
    saveTargets,
    selectedSaveTargetId,
  ]);

  useEffect(() => {
    if (selectedSaveTargetId === null) {
      return;
    }

    if (!saveTargets.some((target) => target.id === selectedSaveTargetId)) {
      setSelectedSaveTargetId(null);
    }
  }, [saveTargets, selectedSaveTargetId]);

  const handleSubmit = useCallback(() => {
    if (isSubmitting || !canSubmit) {
      return;
    }

    if (mode !== "Append" && selectedSaveTarget) {
      onSubmit(text, mode, { locationId: selectedSaveTarget.locationId, relPath: selectedSaveTarget.relPath });
      return;
    }

    onSubmit(text, mode);
  }, [text, mode, isSubmitting, canSubmit, onSubmit, selectedSaveTarget]);

  const handleSaveTargetSelect = useCallback((targetId: string | null) => {
    setSelectedSaveTargetId(targetId);
  }, []);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);

  const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (!isSubmitting) {
        onClose();
      }
      return;
    }

    const hasMod = e.metaKey || e.ctrlKey;
    if (hasMod && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
      return;
    }

    if (mode !== "WritingSession" && e.key === "Enter" && !hasMod && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, isSubmitting, mode, onClose]);

  return (
    <motion.div
      initial={QUICK_CAPTURE.FORM.INITIAL}
      animate={QUICK_CAPTURE.FORM.ANIMATE}
      transition={transition}
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-bg-primary text-text-primary font-sans">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,var(--color-layer-02)_0%,transparent_60%)] opacity-70" />
      <QuickCaptureFormHeader
        onClose={onClose}
        currentMode={mode}
        setMode={setMode}
        isSubmitting={isSubmitting}
        transition={transition} />
      <main className="relative z-10 flex min-h-0 flex-1 flex-col p-3 sm:p-4">
        <ComposePane
          mode={mode}
          noteStats={noteStats}
          text={text}
          isSubmitting={isSubmitting}
          textareaRef={textareaRef}
          onTextChange={handleTextChange}
          onTextareaKeyDown={handleTextareaKeyDown}
          transition={transition} />
      </main>
      <footer className="relative z-10 border-t border-border-subtle bg-layer-01 px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <FooterStatus
            error={error}
            mode={mode}
            transition={transition}
            selectedSaveTargetLabel={mode === "Append" ? null : selectedSaveTarget?.label ?? null} />
          <FooterActions
            mode={mode}
            isSubmitting={isSubmitting}
            canSubmit={canSubmit}
            onSubmit={handleSubmit}
            onClose={onClose}
            saveTargets={saveTargets}
            selectedSaveTargetId={selectedSaveTargetId}
            onSaveTargetSelect={handleSaveTargetSelect} />
        </div>
      </footer>
    </motion.div>
  );
}
