import { Button } from "$components/Button";
import { Dialog } from "$components/Dialog";
import { XIcon } from "$icons";
import { cn } from "$utils/tw";
import { useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { type AnchorPoint, useAnchoredPosition } from "./useAnchoredPosition";

type DialogAnchor = AnchorPoint;

type OperationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  title: string;
  description?: ReactNode;
  anchor?: DialogAnchor;
  children?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  confirm: { type: "submit"; formId: string } | { type: "action"; onConfirm: () => void };
  confirmDisabled?: boolean;
  isPending?: boolean;
  tone?: "default" | "danger";
  widthClassName?: string;
};

type OperationHeaderProps = { title: string; description?: ReactNode; onClose: () => void; isPending: boolean };

function OperationDialogHeader({ title, description, onClose, isPending }: OperationHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-2 border-b border-stroke-subtle px-4 py-3">
      <div className="min-w-0">
        <h3 className="m-0 text-sm font-semibold text-text-primary">{title}</h3>
        {description ? <p className="m-0 mt-1 text-xs leading-5 text-text-secondary">{description}</p> : null}
      </div>
      <Button
        type="button"
        variant="iconSubtle"
        size="iconMd"
        onClick={onClose}
        disabled={isPending}
        aria-label="Close operation dialog">
        <XIcon size="sm" />
      </Button>
    </header>
  );
}

export function OperationDialog(
  {
    isOpen,
    onClose,
    ariaLabel,
    title,
    description,
    anchor,
    children,
    confirmLabel,
    pendingLabel,
    cancelLabel = "Cancel",
    confirm,
    confirmDisabled = false,
    isPending = false,
    tone = "default",
    widthClassName = "w-[min(92vw,380px)]",
  }: OperationDialogProps,
) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  const handleRequestClose = useCallback(() => {
    if (!isPending) {
      onClose();
    }
  }, [isPending, onClose]);

  const { panelStyle, isPositioned } = useAnchoredPosition({
    isOpen,
    anchor,
    panelRef,
    onRequestClose: onClose,
    dismissDisabled: isPending,
  });

  const confirmText = isPending ? (pendingLabel ?? confirmLabel) : confirmLabel;
  const confirmClassName = tone === "danger"
    ? "border-support-error text-support-error hover:bg-support-error hover:text-white"
    : "";
  const confirmButtonType = confirm.type === "submit" ? "submit" : "button";
  const confirmFormId = confirm.type === "submit" ? confirm.formId : undefined;
  const confirmOnClick = confirm.type === "action" ? confirm.onConfirm : undefined;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleRequestClose}
      ariaLabel={ariaLabel}
      showBackdrop={false}
      closeOnBackdrop={false}
      containerClassName="z-1100 pointer-events-none"
      panelClassName={cn(
        "pointer-events-auto absolute rounded-xl border border-stroke-subtle bg-layer-01 shadow-2xl ring-1 ring-black/5",
        widthClassName,
        !isPositioned && "opacity-0",
      )}
      panelStyle={panelStyle}>
      <section ref={panelRef} className="flex flex-col">
        <OperationDialogHeader
          title={title}
          description={description}
          onClose={handleRequestClose}
          isPending={isPending} />
        <div className="px-4 py-3">{children}</div>
        <footer className="flex items-center justify-end gap-2 border-t border-stroke-subtle bg-layer-01/80 px-4 py-3">
          <Button type="button" variant="outline" size="sm" onClick={handleRequestClose} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            type={confirmButtonType}
            form={confirmFormId}
            variant={tone === "danger" ? "outline" : "primary"}
            className={confirmClassName}
            size="sm"
            onClick={confirmOnClick}
            disabled={isPending || confirmDisabled}>
            {confirmText}
          </Button>
        </footer>
      </section>
    </Dialog>
  );
}

export type { DialogAnchor, OperationDialogProps };
