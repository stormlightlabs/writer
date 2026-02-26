import { cn } from "$utils/tw";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

export type DialogMotionPreset = "scale" | "slideUp" | "slideRight";

type DialogProps = {
  isOpen: boolean;
  children: ReactNode;
  onClose?: () => void;
  ariaLabel?: string;
  showBackdrop?: boolean;
  closeOnBackdrop?: boolean;
  backdropClassName?: string;
  containerClassName?: string;
  containerStyle?: CSSProperties;
  panelClassName?: string;
  panelStyle?: CSSProperties;
  motionPreset?: DialogMotionPreset;
};

const DIALOG_MOTION_PRESETS: Record<
  DialogMotionPreset,
  { initial: Record<string, number>; animate: Record<string, number>; exit: Record<string, number> }
> = {
  scale: {
    initial: { opacity: 0, scale: 0.97, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.97, y: 6 },
  },
  slideUp: { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 18 } },
  slideRight: { initial: { opacity: 0, x: 18 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 12 } },
};

const BACKDROP_FADE_MOTION = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as const;
const BACKDROP_FADE_TRANSITION = { duration: 0.16, ease: "easeOut" } as const;
const DIALOG_SURFACE_TRANSITION = { duration: 0.2, ease: "easeOut" } as const;
const FOCUSABLE_SELECTOR =
  "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) =>
    !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
  );
}

export function Dialog(
  {
    isOpen,
    children,
    onClose,
    ariaLabel,
    showBackdrop = true,
    closeOnBackdrop = true,
    backdropClassName,
    containerClassName,
    containerStyle,
    panelClassName,
    panelStyle,
    motionPreset = "scale",
  }: DialogProps,
) {
  const motionConfig = DIALOG_MOTION_PRESETS[motionPreset];
  const panelRef = useRef<HTMLDivElement | null>(null);

  const handleBackdropClick = closeOnBackdrop ? onClose : undefined;

  useEffect(() => {
    if (!isOpen || typeof globalThis.addEventListener !== "function") {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = getFocusableElements(panel);
    const firstFocusable = focusable[0];
    const fallbackFocusable = panel;
    (firstFocusable ?? fallbackFocusable).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onClose) {
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const activePanel = panelRef.current;
      if (!activePanel) {
        return;
      }

      const cycleTargets = getFocusableElements(activePanel);
      if (cycleTargets.length === 0) {
        event.preventDefault();
        activePanel.focus();
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
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={cn("fixed inset-0 z-50 pointer-events-none", containerClassName)}
          style={containerStyle}
          role="presentation">
          {showBackdrop && (
            <motion.button
              type="button"
              aria-label="Close dialog"
              className={cn("absolute inset-0 border-none bg-black/45 p-0 m-0 pointer-events-auto", backdropClassName)}
              onClick={handleBackdropClick}
              initial={BACKDROP_FADE_MOTION.initial}
              animate={BACKDROP_FADE_MOTION.animate}
              exit={BACKDROP_FADE_MOTION.exit}
              transition={BACKDROP_FADE_TRANSITION} />
          )}

          <motion.div
            role="dialog"
            aria-label={ariaLabel}
            aria-modal={showBackdrop}
            tabIndex={-1}
            ref={panelRef}
            className={cn("pointer-events-auto", panelClassName)}
            style={panelStyle}
            initial={motionConfig.initial}
            animate={motionConfig.animate}
            exit={motionConfig.exit}
            transition={DIALOG_SURFACE_TRANSITION}>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
