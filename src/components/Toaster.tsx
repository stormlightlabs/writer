import { CheckIcon, QuestionIcon, WarningIcon, XIcon } from "$components/icons";
import { ToastType, useToastStore } from "$state/stores/toasts";
import { cn } from "$utils/tw";
import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "./Button";

function ToastIcon({ type }: { type: ToastType }) {
  switch (type) {
    case "success":
      return (
        <span className="shrink-0" aria-hidden="true">
          <CheckIcon size="sm" />
        </span>
      );
    case "error":
      return (
        <span className="shrink-0" aria-hidden="true">
          <XIcon size="sm" />
        </span>
      );
    case "info":
      return (
        <span className="shrink-0" aria-hidden="true">
          <QuestionIcon size="sm" />
        </span>
      );
    case "warn":
      return (
        <span className="shrink-0" aria-hidden="true">
          <WarningIcon size="sm" />
        </span>
      );
  }
}

type ToastItemProps = { id: string; type: ToastType; message: string; onDismiss: (id: string) => void };

function ToastItem({ id, type, message, onDismiss }: ToastItemProps) {
  const handleDismiss = useCallback(() => {
    onDismiss(id);
  }, [id, onDismiss]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-3 px-4 py-3",
        "rounded-lg shadow-lg min-w-sidebar animate-in fade-in slide-in-from-right-4 duration-200",
        {
          "bg-support-success text-white": type === "success",
          "bg-support-error text-white": type === "error",
          "bg-accent-cyan text-text-primary border border-border-subtle": type === "info",
          "bg-accent-yellow text-text-primary border border-border-subtle": type === "warn",
        },
      )}
      role="alert"
      aria-live="polite">
      <ToastIcon type={type} />
      <p className="text-sm flex-1">{message}</p>
      <Button
        type="button"
        variant="iconGhost"
        onClick={handleDismiss}
        className="flex items-center shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification">
        <XIcon size="xs" />
      </Button>
    </div>
  );
}

export function Toaster() {
  const { toasts, removeToast } = useToastStore(
    useShallow((state) => ({ toasts: state.toasts, removeToast: state.removeToast })),
  );

  if (toasts.length > 0) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} id={toast.id} type={toast.type} message={toast.message} onDismiss={removeToast} />
        ))}
      </div>
    );
  }

  return null;
}
