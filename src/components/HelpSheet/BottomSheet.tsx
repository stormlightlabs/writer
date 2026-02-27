import { useSkipAnimation } from "$hooks/useMotion";
import { DragIcon } from "$icons";
import { cn } from "$utils/tw";
import { AnimatePresence, motion, useMotionValue } from "motion/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
};

const BACKDROP_MOTION = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as const;
const SHEET_MOTION = { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } } as const;
const TRANSITION = { type: "spring", damping: 30, stiffness: 300 } as const;
const NO_MOTION_TRANSITION = { duration: 0 } as const;
const FOCUSABLE_SELECTOR =
  "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) =>
    !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
  );
}

type DragToDismissHandleProps = { onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void };

const DragToDismissHandle = ({ onPointerDown }: DragToDismissHandleProps) => (
  <div
    role="presentation"
    onPointerDown={onPointerDown}
    className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none">
    <DragIcon size="lg" className="text-border-subtle" />
  </div>
);

export function BottomSheet({ isOpen, onClose, children, ariaLabel, ariaLabelledBy, className }: BottomSheetProps) {
  const skipAnimation = useSkipAnimation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef(0);
  const lastClientYRef = useRef(0);
  const lastMoveTsRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const y = useMotionValue(0);
  const sheetStyle = useMemo(() => ({ y }), [y]);
  const transition = useMemo(() => skipAnimation ? NO_MOTION_TRANSITION : TRANSITION, [skipAnimation]);
  const backdropTransition = useMemo(() => skipAnimation ? NO_MOTION_TRANSITION : { duration: 0.15 }, [skipAnimation]);

  const clearDragState = useCallback(() => {
    dragOffsetRef.current = 0;
    dragStartYRef.current = 0;
    lastClientYRef.current = 0;
    lastMoveTsRef.current = 0;
  }, []);

  const handleDragMove = useCallback((event: PointerEvent) => {
    const offset = Math.max(0, event.clientY - dragStartYRef.current);
    dragOffsetRef.current = offset;
    lastClientYRef.current = event.clientY;
    lastMoveTsRef.current = event.timeStamp;
    y.set(offset);
  }, [y]);

  const handleDragEnd = useCallback((event: PointerEvent) => {
    const deltaY = Math.max(0, event.clientY - lastClientYRef.current);
    const deltaT = Math.max(1, event.timeStamp - lastMoveTsRef.current);
    const velocityY = (deltaY / deltaT) * 1000;
    const shouldClose = dragOffsetRef.current > 100 || velocityY > 500;

    globalThis.removeEventListener("pointermove", handleDragMove);
    globalThis.removeEventListener("pointerup", handleDragEnd);
    globalThis.removeEventListener("pointercancel", handleDragEnd);
    clearDragState();

    if (shouldClose) {
      onClose();
      return;
    }

    y.set(0);
  }, [clearDragState, handleDragMove, onClose, y]);

  const handleDragStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    dragStartYRef.current = event.clientY;
    lastClientYRef.current = event.clientY;
    lastMoveTsRef.current = event.timeStamp;
    dragOffsetRef.current = 0;

    globalThis.addEventListener("pointermove", handleDragMove);
    globalThis.addEventListener("pointerup", handleDragEnd);
    globalThis.addEventListener("pointercancel", handleDragEnd);
  }, [handleDragEnd, handleDragMove]);

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
      y.set(0);
      clearDragState();
    }
  }, [clearDragState, isOpen, y]);

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
        <div className="fixed inset-0 z-50 pointer-events-none" role="presentation">
          <motion.button
            type="button"
            aria-label="Dismiss help sheet"
            className="absolute inset-0 bg-black/40 pointer-events-auto border-none p-0 m-0"
            onClick={onClose}
            initial={BACKDROP_MOTION.initial}
            animate={BACKDROP_MOTION.animate}
            exit={BACKDROP_MOTION.exit}
            transition={backdropTransition} />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-modal
            tabIndex={-1}
            className={cn(
              "absolute bottom-0 left-0 right-0 pointer-events-auto",
              "bg-layer-01 border-t border-border-subtle",
              "rounded-t-xl shadow-2xl",
              "max-h-[80vh] min-h-0 overflow-hidden flex flex-col",
              className,
            )}
            initial={SHEET_MOTION.initial}
            animate={SHEET_MOTION.animate}
            exit={SHEET_MOTION.exit}
            transition={transition}
            style={sheetStyle}>
            <DragToDismissHandle onPointerDown={handleDragStart} />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
