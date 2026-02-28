import { Button } from "$components/Button";
import { XIcon } from "$icons";
import type { CaptureMode } from "$types";
import { cn } from "$utils/tw";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type QuickCaptureFormProps = {
  defaultMode?: CaptureMode;
  onSubmit: (text: string, mode: CaptureMode, destination?: { locationId: number; relPath: string }) => void;
  onClose: () => void;
  isSubmitting: boolean;
  error: string | null;
};

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

type ModeButtonsProps = { currentMode: CaptureMode; setMode: (mode: CaptureMode) => void; isSubmitting: boolean };

type ModeButtonProps = ModeButtonsProps & { mode: CaptureMode };

const ModeButton = ({ currentMode, setMode, isSubmitting, mode }: ModeButtonProps) => {
  const handleClick = useCallback(() => {
    setMode(mode);
  }, [mode, setMode]);

  const modeLabel = useMemo(() => getModeLabel(mode), [mode]);

  const classes = useMemo(
    () =>
      cn(
        "px-2.5 py-1.5 text-xs sm:text-sm font-medium border rounded transition-all",
        mode === currentMode
          ? "bg-accent-blue text-white border-accent-blue"
          : "bg-field-02 text-text-secondary border-border-subtle hover:bg-field-hover-02 hover:text-text-primary",
      ),
    [mode, currentMode],
  );

  return <Button className={classes} onClick={handleClick} disabled={isSubmitting}>{modeLabel}</Button>;
};

const ModeButtons = ({ currentMode, setMode, isSubmitting }: ModeButtonsProps) => (
  <div className="flex flex-wrap gap-2">
    {(["QuickNote", "WritingSession", "Append"] as CaptureMode[]).map((m) => (
      <ModeButton key={m} currentMode={currentMode} setMode={setMode} isSubmitting={isSubmitting} mode={m} />
    ))}
  </div>
);

const ErrorMessage = ({ error }: { error: string | null }) => {
  return <div className="w-full sm:flex-1">{error && <span className="text-support-error text-sm">{error}</span>}</div>;
};

const FooterActions = (
  { mode, isSubmitting, handleSubmit, text }: {
    mode: CaptureMode;
    isSubmitting: boolean;
    handleSubmit: () => void;
    text: string;
  },
) => (
  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
    <span className="text-[0.6875rem] sm:text-xs text-text-placeholder">
      {mode === "WritingSession"
        ? "Cmd+Enter to save, Esc to close"
        : "Enter to save, Shift+Enter for newline, Esc to close"}
    </span>

    <Button
      className="w-full sm:w-auto px-4 py-2 text-sm font-semibold bg-accent-blue text-white rounded hover:bg-link-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={handleSubmit}
      disabled={isSubmitting || !text.trim()}>
      {isSubmitting ? "Saving..." : "Save"}
    </Button>
  </div>
);

const QuickCaptureFormHeader = (
  { onClose, currentMode, setMode, isSubmitting }: ModeButtonsProps & { onClose: () => void },
) => (
  <header className="flex flex-wrap justify-between items-start gap-2 px-3 py-3 sm:px-4 border-b border-border-subtle bg-layer-01">
    <ModeButtons currentMode={currentMode} setMode={setMode} isSubmitting={isSubmitting} />

    <Button
      className="w-7 h-7 shrink-0 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-all"
      onClick={onClose}
      disabled={isSubmitting}
      aria-label="Close">
      <XIcon size="sm" />
    </Button>
  </header>
);

export function QuickCaptureForm(
  { defaultMode = "QuickNote", onSubmit, onClose, isSubmitting, error }: QuickCaptureFormProps,
) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<CaptureMode>(defaultMode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    if (isSubmitting || !text.trim()) return;
    onSubmit(text, mode);
  }, [text, mode, isSubmitting, onSubmit]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);

  const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
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
  }, [handleSubmit, mode, onClose]);

  return (
    <div className="flex flex-col h-dvh min-h-0 bg-bg-primary text-text-primary font-sans">
      <QuickCaptureFormHeader onClose={onClose} currentMode={mode} setMode={setMode} isSubmitting={isSubmitting} />

      <main className="flex-1 min-h-0 flex flex-col p-3 sm:p-4">
        <textarea
          ref={textareaRef}
          className="flex-1 w-full min-h-[120px] p-3 border border-border-subtle rounded bg-field-02 text-text-primary font-mono text-base leading-relaxed resize-none outline-none focus:border-border-interactive placeholder:text-text-placeholder disabled:opacity-60"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleTextareaKeyDown}
          placeholder="Type your note here..."
          disabled={isSubmitting}
          rows={8} />
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center px-3 py-3 sm:px-4 border-t border-border-subtle bg-layer-01">
        <ErrorMessage error={error} />
        <FooterActions mode={mode} isSubmitting={isSubmitting} handleSubmit={handleSubmit} text={text} />
      </footer>
    </div>
  );
}
