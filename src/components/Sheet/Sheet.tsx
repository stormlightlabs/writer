import { useSkipAnimation } from "$hooks/useMotion";
import { DragIcon } from "$icons";
import { cn } from "$utils/tw";
import { AnimatePresence, motion, useMotionValue } from "motion/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

export type SheetPosition = "l" | "r" | "t" | "b";
export type SheetSize = "sm" | "md" | "lg" | "xl" | "full";

type SheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  position?: SheetPosition;
  size?: SheetSize;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
  backdropClassName?: string;
  containerClassName?: string;
  backdropAriaLabel?: string;
  closeOnBackdrop?: boolean;
  showBackdrop?: boolean;
  dragToDismiss?: boolean;
};

type DragConfig = { axis: "x" | "y"; closeDirection: -1 | 1 };

const BACKDROP_MOTION = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as const;
const TRANSITION = { type: "spring", damping: 30, stiffness: 300 } as const;
const NO_MOTION_TRANSITION = { duration: 0 } as const;
const FOCUSABLE_SELECTOR =
  "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) =>
    !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
  );
}

function getPositionClassName(position: SheetPosition): string {
  switch (position) {
    case "l":
      return "absolute inset-y-0 left-0 border-r rounded-r-xl";
    case "r":
      return "absolute inset-y-0 right-0 border-l rounded-l-xl";
    case "t":
      return "absolute left-0 right-0 top-0 border-b rounded-b-xl";
    default:
      return "absolute bottom-0 left-0 right-0 border-t rounded-t-xl";
  }
}

function getSizeClassName(position: SheetPosition, size: SheetSize): string {
  if (position === "l" || position === "r") {
    switch (size) {
      case "sm":
        return "w-[min(88vw,320px)]";
      case "lg":
        return "w-[min(94vw,520px)]";
      case "xl":
        return "w-[min(96vw,640px)]";
      case "full":
        return "w-screen";
      default:
        return "w-[min(92vw,420px)]";
    }
  }

  switch (size) {
    case "sm":
      return "max-h-[40vh]";
    case "lg":
      return "max-h-[75vh]";
    case "xl":
      return "max-h-[88vh]";
    case "full":
      return "max-h-dvh";
    default:
      return "max-h-[60vh]";
  }
}

function getMotionConfig(position: SheetPosition) {
  switch (position) {
    case "l":
      return { initial: { x: "-100%" }, animate: { x: 0 }, exit: { x: "-100%" } } as const;
    case "r":
      return { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" } } as const;
    case "t":
      return { initial: { y: "-100%" }, animate: { y: 0 }, exit: { y: "-100%" } } as const;
    default:
      return { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } } as const;
  }
}

function getDragConfig(position: SheetPosition): DragConfig {
  switch (position) {
    case "l":
      return { axis: "x", closeDirection: -1 };
    case "r":
      return { axis: "x", closeDirection: 1 };
    case "t":
      return { axis: "y", closeDirection: -1 };
    default:
      return { axis: "y", closeDirection: 1 };
  }
}

function getPointerCoordinate(event: PointerEvent | ReactPointerEvent<HTMLDivElement>, axis: "x" | "y"): number {
  return axis === "x" ? event.clientX : event.clientY;
}

function DragHandle(
  { onPointerDown, vertical }: { onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void; vertical: boolean },
) {
  return (
    <div
      role="presentation"
      onPointerDown={onPointerDown}
      className={cn(
        "flex justify-center px-3 py-2 cursor-grab active:cursor-grabbing touch-none",
        vertical && "justify-start",
      )}>
      <DragIcon size="lg" className={cn("text-border-subtle", vertical && "rotate-90")} />
    </div>
  );
}

export function Sheet(
  {
    isOpen,
    onClose,
    children,
    position = "b",
    size = "md",
    ariaLabel,
    ariaLabelledBy,
    className,
    backdropClassName,
    containerClassName,
    backdropAriaLabel = "Dismiss sheet",
    closeOnBackdrop = true,
    showBackdrop = true,
    dragToDismiss = true,
  }: SheetProps,
) {
  const skipAnimation = useSkipAnimation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartCoordRef = useRef(0);
  const lastCoordRef = useRef(0);
  const lastMoveTsRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const translate = useMotionValue(0);
  const dragConfig = useMemo(() => getDragConfig(position), [position]);
  const motionConfig = useMemo(() => getMotionConfig(position), [position]);
  const positionClassName = useMemo(() => getPositionClassName(position), [position]);
  const sizeClassName = useMemo(() => getSizeClassName(position, size), [position, size]);
  const transition = useMemo(() => skipAnimation ? NO_MOTION_TRANSITION : TRANSITION, [skipAnimation]);
  const backdropTransition = useMemo(() => skipAnimation ? NO_MOTION_TRANSITION : { duration: 0.15 }, [skipAnimation]);
  const sheetStyle = useMemo(() => {
    if (dragConfig.axis === "x") {
      return { x: translate };
    }
    return { y: translate };
  }, [dragConfig.axis, translate]);

  const clearDragState = useCallback(() => {
    dragOffsetRef.current = 0;
    dragStartCoordRef.current = 0;
    lastCoordRef.current = 0;
    lastMoveTsRef.current = 0;
  }, []);

  const handleDragMove = useCallback((event: PointerEvent) => {
    const coord = getPointerCoordinate(event, dragConfig.axis);
    const delta = (coord - dragStartCoordRef.current) * dragConfig.closeDirection;
    const offset = Math.max(0, delta);

    dragOffsetRef.current = offset;
    lastCoordRef.current = coord;
    lastMoveTsRef.current = event.timeStamp;
    translate.set(offset * dragConfig.closeDirection);
  }, [dragConfig.axis, dragConfig.closeDirection, translate]);

  const handleDragEnd = useCallback((event: PointerEvent) => {
    const coord = getPointerCoordinate(event, dragConfig.axis);
    const delta = (coord - lastCoordRef.current) * dragConfig.closeDirection;
    const deltaT = Math.max(1, event.timeStamp - lastMoveTsRef.current);
    const velocity = (Math.max(0, delta) / deltaT) * 1000;
    const shouldClose = dragOffsetRef.current > 100 || velocity > 500;

    globalThis.removeEventListener("pointermove", handleDragMove);
    globalThis.removeEventListener("pointerup", handleDragEnd);
    globalThis.removeEventListener("pointercancel", handleDragEnd);
    clearDragState();

    if (shouldClose) {
      onClose();
      return;
    }

    translate.set(0);
  }, [clearDragState, dragConfig.axis, dragConfig.closeDirection, handleDragMove, onClose, translate]);

  const handleDragStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const coord = getPointerCoordinate(event, dragConfig.axis);
    dragStartCoordRef.current = coord;
    lastCoordRef.current = coord;
    lastMoveTsRef.current = event.timeStamp;
    dragOffsetRef.current = 0;

    globalThis.addEventListener("pointermove", handleDragMove);
    globalThis.addEventListener("pointerup", handleDragEnd);
    globalThis.addEventListener("pointercancel", handleDragEnd);
  }, [dragConfig.axis, handleDragEnd, handleDragMove]);

  useEffect(() => {
    if (!isOpen || typeof globalThis.addEventListener !== "function") {
      return;
    }

    const sheet = sheetRef.current;
    if (!sheet) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = getFocusableElements(sheet);
    const firstFocusable = focusable[0];
    (firstFocusable ?? sheet).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const activeSheet = sheetRef.current;
      if (!activeSheet) {
        return;
      }

      const cycleTargets = getFocusableElements(activeSheet);
      if (cycleTargets.length === 0) {
        event.preventDefault();
        activeSheet.focus();
        return;
      }

      const first = cycleTargets[0];
      const last = cycleTargets.at(-1);
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      translate.set(0);
      clearDragState();
    }
  }, [clearDragState, isOpen, translate]);

  useEffect(() => {
    return () => {
      globalThis.removeEventListener("pointermove", handleDragMove);
      globalThis.removeEventListener("pointerup", handleDragEnd);
      globalThis.removeEventListener("pointercancel", handleDragEnd);
    };
  }, [handleDragEnd, handleDragMove]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={cn("fixed inset-0 z-50 pointer-events-none", containerClassName)} role="presentation">
          {showBackdrop && (
            <motion.button
              type="button"
              aria-label={backdropAriaLabel}
              className={cn("absolute inset-0 bg-black/40 pointer-events-auto border-none p-0 m-0", backdropClassName)}
              onClick={closeOnBackdrop ? onClose : undefined}
              initial={BACKDROP_MOTION.initial}
              animate={BACKDROP_MOTION.animate}
              exit={BACKDROP_MOTION.exit}
              transition={backdropTransition} />
          )}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-modal={showBackdrop}
            tabIndex={-1}
            className={cn(
              "pointer-events-auto bg-layer-01 border-border-subtle shadow-2xl min-h-0 overflow-hidden flex flex-col",
              positionClassName,
              sizeClassName,
              className,
            )}
            initial={motionConfig.initial}
            animate={motionConfig.animate}
            exit={motionConfig.exit}
            transition={transition}
            style={sheetStyle}>
            {dragToDismiss && <DragHandle onPointerDown={handleDragStart} vertical={dragConfig.axis === "x"} />}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
