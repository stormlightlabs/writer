import { XIcon } from "$icons";
import type { CaptureMode } from "$types";
import { useCallback, useEffect, useRef, useState } from "react";

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

  return (
    <button
      className={`px-3 py-1.5 text-sm font-medium border rounded transition-all ${
        mode === currentMode
          ? "bg-accent-blue text-white border-accent-blue"
          : "bg-field-02 text-text-secondary border-border-subtle hover:bg-field-hover-02 hover:text-text-primary"
      }`}
      onClick={handleClick}
      disabled={isSubmitting}>
      {getModeLabel(mode)}
    </button>
  );
};

const ModeButtons = ({ currentMode, setMode, isSubmitting }: ModeButtonsProps) => (
  <div className="flex gap-2">
    {(["QuickNote", "WritingSession", "Append"] as CaptureMode[]).map((m) => (
      <ModeButton key={m} currentMode={currentMode} setMode={setMode} isSubmitting={isSubmitting} mode={m} />
    ))}
  </div>
);

const ErrorMessage = ({ error }: { error: string | null }) => {
  return <div className="flex-1">{error && <span className="text-support-error text-sm">{error}</span>}</div>;
};

const FooterActions = (
  { mode, isSubmitting, handleSubmit, text }: {
    mode: CaptureMode;
    isSubmitting: boolean;
    handleSubmit: () => void;
    text: string;
  },
) => (
  <div className="flex items-center gap-4">
    <span className="text-xs text-text-placeholder">
      {mode === "WritingSession"
        ? "Cmd+Enter to save, Esc to close"
        : "Enter to save, Shift+Enter for newline, Esc to close"}
    </span>

    <button
      className="px-4 py-2 text-sm font-semibold bg-accent-blue text-white rounded hover:bg-link-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={handleSubmit}
      disabled={isSubmitting || !text.trim()}>
      {isSubmitting ? "Saving..." : "Save"}
    </button>
  </div>
);

const QuickCaptureFormHeader = (
  { onClose, currentMode, setMode, isSubmitting }: ModeButtonsProps & { onClose: () => void },
) => (
  <header className="flex justify-between items-center px-4 py-3 border-b border-border-subtle bg-layer-01">
    <ModeButtons currentMode={currentMode} setMode={setMode} isSubmitting={isSubmitting} />

    <button
      className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-all"
      onClick={onClose}
      disabled={isSubmitting}
      aria-label="Close">
      <XIcon size="sm" />
    </button>
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

    if (
      mode !== "WritingSession"
      && e.key === "Enter"
      && !hasMod
      && !e.shiftKey
      && !e.altKey
    ) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, mode, onClose]);

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary font-sans">
      <QuickCaptureFormHeader onClose={onClose} currentMode={mode} setMode={setMode} isSubmitting={isSubmitting} />

      <main className="flex-1 flex flex-col p-4">
        <textarea
          ref={textareaRef}
          className="flex-1 w-full p-3 border border-border-subtle rounded bg-field-02 text-text-primary font-mono text-base leading-relaxed resize-none outline-none focus:border-border-interactive placeholder:text-text-placeholder disabled:opacity-60"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleTextareaKeyDown}
          placeholder="Type your note here..."
          disabled={isSubmitting}
          rows={8} />
      </main>

      <footer className="flex justify-between items-center px-4 py-3 border-t border-border-subtle bg-layer-01">
        <ErrorMessage error={error} />
        <FooterActions mode={mode} isSubmitting={isSubmitting} handleSubmit={handleSubmit} text={text} />
      </footer>
    </div>
  );
}
