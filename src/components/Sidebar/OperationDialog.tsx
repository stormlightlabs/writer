import { Button } from "$components/Button";
import { Dialog } from "$components/Dialog";
import { XIcon } from "$icons";
import { clamp } from "$utils/math";
import { cn } from "$utils/tw";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type DialogAnchor = { x: number; y: number };

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
  confirmButtonType?: "button" | "submit";
  confirmFormId?: string;
  confirmDisabled?: boolean;
  isPending?: boolean;
  onConfirm?: () => void;
  tone?: "default" | "danger";
  widthClassName?: string;
};

type OperationHeaderProps = { title: string; description?: ReactNode; onClose: () => void; isPending: boolean };

type OperationFooterProps = {
  cancelLabel: string;
  onClose: () => void;
  isPending: boolean;
  confirmButtonType: "button" | "submit";
  confirmFormId?: string;
  onConfirm?: () => void;
  tone: "default" | "danger";
  confirmClassName: string;
  confirmDisabled: boolean;
  confirmText: string;
};

const VIEWPORT_GUTTER_PX = 10;
const ANCHOR_OFFSET_PX = 12;

function getPinnedPosition(
  panelWidth: number,
  panelHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  anchor?: DialogAnchor,
) {
  if (!anchor) {
    return {
      left: Math.max(VIEWPORT_GUTTER_PX, (viewportWidth - panelWidth) / 2),
      top: Math.max(VIEWPORT_GUTTER_PX, (viewportHeight - panelHeight) / 2),
    };
  }

  const rightSideLeft = anchor.x + ANCHOR_OFFSET_PX;
  const leftSideLeft = anchor.x - panelWidth - ANCHOR_OFFSET_PX;
  const bottomTop = anchor.y + ANCHOR_OFFSET_PX;
  const topTop = anchor.y - panelHeight - ANCHOR_OFFSET_PX;

  const left = rightSideLeft + panelWidth <= viewportWidth - VIEWPORT_GUTTER_PX
    ? rightSideLeft
    : (leftSideLeft >= VIEWPORT_GUTTER_PX
      ? leftSideLeft
      : clamp(rightSideLeft, VIEWPORT_GUTTER_PX, viewportWidth - panelWidth - VIEWPORT_GUTTER_PX));

  const top = bottomTop + panelHeight <= viewportHeight - VIEWPORT_GUTTER_PX
    ? bottomTop
    : (topTop >= VIEWPORT_GUTTER_PX
      ? topTop
      : clamp(bottomTop, VIEWPORT_GUTTER_PX, viewportHeight - panelHeight - VIEWPORT_GUTTER_PX));

  return { left, top };
}

function OperationDialogHeader({ title, description, onClose, isPending }: OperationHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-2 border-b border-border-subtle px-4 py-3">
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

function OperationDialogFooter(
  {
    cancelLabel,
    onClose,
    isPending,
    confirmButtonType,
    confirmFormId,
    onConfirm,
    tone,
    confirmClassName,
    confirmDisabled,
    confirmText,
  }: OperationFooterProps,
) {
  return (
    <footer className="flex items-center justify-end gap-2 border-t border-border-subtle bg-layer-01/80 px-4 py-3">
      <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>{cancelLabel}</Button>
      <Button
        type={confirmButtonType}
        form={confirmFormId}
        variant={tone === "danger" ? "outline" : "primary"}
        className={confirmClassName}
        size="sm"
        onClick={onConfirm}
        disabled={isPending || confirmDisabled}>
        {confirmText}
      </Button>
    </footer>
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
    confirmButtonType = "button",
    confirmFormId,
    confirmDisabled = false,
    isPending = false,
    onConfirm,
    tone = "default",
    widthClassName = "w-[min(92vw,380px)]",
  }: OperationDialogProps,
) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [isPositioned, setIsPositioned] = useState(false);

  const handleRequestClose = useCallback(() => {
    if (!isPending) {
      onClose();
    }
  }, [isPending, onClose]);

  const positionPanel = useCallback(() => {
    const panel = panelRef.current;
    if (!panel || typeof globalThis.innerWidth !== "number") {
      return;
    }

    const rect = panel.getBoundingClientRect();
    const position = getPinnedPosition(rect.width, rect.height, globalThis.innerWidth, globalThis.innerHeight, anchor);
    setPanelStyle({ left: `${position.left}px`, top: `${position.top}px` });
    setIsPositioned(true);
  }, [anchor]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    setIsPositioned(false);
    const frame = globalThis.requestAnimationFrame(positionPanel);
    const handleResize = () => positionPanel();
    globalThis.addEventListener("resize", handleResize);

    return () => {
      globalThis.cancelAnimationFrame(frame);
      globalThis.removeEventListener("resize", handleResize);
    };
  }, [isOpen, positionPanel]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const panel = panelRef.current;
    if (!panel || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(positionPanel);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [isOpen, positionPanel]);

  useEffect(() => {
    if (!isOpen || typeof document.addEventListener !== "function") {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isPending) {
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      if (event.target instanceof Node && !panel.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, isPending, onClose]);

  const confirmText = isPending ? (pendingLabel ?? confirmLabel) : confirmLabel;
  const confirmClassName = tone === "danger"
    ? "border-support-error text-support-error hover:bg-support-error hover:text-white"
    : "";

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleRequestClose}
      ariaLabel={ariaLabel}
      showBackdrop={false}
      closeOnBackdrop={false}
      containerClassName="z-1100 pointer-events-none"
      panelClassName={cn(
        "pointer-events-auto absolute rounded-xl border border-border-subtle bg-layer-01 shadow-2xl ring-1 ring-black/5",
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
        <OperationDialogFooter
          cancelLabel={cancelLabel}
          onClose={handleRequestClose}
          isPending={isPending}
          confirmButtonType={confirmButtonType}
          confirmFormId={confirmFormId}
          onConfirm={onConfirm}
          tone={tone}
          confirmClassName={confirmClassName}
          confirmDisabled={confirmDisabled}
          confirmText={confirmText} />
      </section>
    </Dialog>
  );
}

export type { DialogAnchor, OperationDialogProps };
