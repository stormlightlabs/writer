import { cn } from "$utils/tw";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
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

  const handleBackdropClick = closeOnBackdrop ? onClose : undefined;

  useEffect(() => {
    if (!isOpen || !onClose || typeof globalThis.addEventListener !== "function") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    globalThis.addEventListener("keydown", handleEscape);
    return () => globalThis.removeEventListener("keydown", handleEscape);
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
