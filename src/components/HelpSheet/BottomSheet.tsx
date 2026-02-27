import { useSkipAnimation } from "$hooks/useMotion";
import { DragIcon } from "$icons";
import { cn } from "$utils/tw";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

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

type DragToDismissHandleProps = {
  dragProps?: {
    drag: "y";
    dragConstraints: { top: 0 };
    dragElastic: number;
    onDragEnd: (
      event: MouseEvent | TouchEvent | PointerEvent,
      info: { offset: { y: number }; velocity: { y: number } },
    ) => void;
    dragSnapToOrigin?: boolean;
  };
};

const DragToDismissHandle = ({ dragProps }: DragToDismissHandleProps) => (
  <motion.div {...dragProps} className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none">
    <DragIcon size="lg" className="text-border-subtle" />
  </motion.div>
);

export function BottomSheet({ isOpen, onClose, children, ariaLabel, ariaLabelledBy, className }: BottomSheetProps) {
  const skipAnimation = useSkipAnimation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const transition = useMemo(() => skipAnimation ? NO_MOTION_TRANSITION : TRANSITION, [skipAnimation]);
  const backdropTransition = useMemo(() => skipAnimation ? NO_MOTION_TRANSITION : { duration: 0.15 }, [skipAnimation]);

  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: { offset: { y: number }; velocity: { y: number } }) => {
      if (info.offset.y > 100 || info.velocity.y > 500) {
        onClose();
      }
    },
    [onClose],
  );

  const dragProps = useMemo(
    () =>
      skipAnimation
        ? {
          drag: "y" as const,
          dragConstraints: { top: 0 } as const,
          dragElastic: 0.05,
          onDragEnd: handleDragEnd,
          dragSnapToOrigin: true,
        }
        : { drag: "y" as const, dragConstraints: { top: 0 } as const, dragElastic: 0.05, onDragEnd: handleDragEnd },
    [skipAnimation, handleDragEnd],
  );

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
              "max-h-[80vh] overflow-hidden flex flex-col",
              className,
            )}
            initial={SHEET_MOTION.initial}
            animate={SHEET_MOTION.animate}
            exit={SHEET_MOTION.exit}
            transition={transition}
            {...dragProps}>
            <DragToDismissHandle dragProps={dragProps} />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
