import { useSkipAnimation } from "$hooks/useMotion";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode, RefObject } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type TooltipPlacement = "top" | "bottom";

export type TooltipProps = {
  anchorRef: RefObject<HTMLElement | null>;
  visible: boolean;
  children: ReactNode;
  placement?: TooltipPlacement;
  offset?: number;
  className?: string;
};

type TooltipPosition = { left: number; top: number };

const TOOLTIP_INITIAL = { opacity: 0, y: 4 } as const;
const TOOLTIP_ANIMATE = { opacity: 1, y: 0 } as const;
const TOOLTIP_EXIT = { opacity: 0, y: 2 } as const;
const TOOLTIP_TRANSITION = { duration: 0.12, ease: "easeOut" } as const;
const NO_MOTION_TRANSITION = { duration: 0 } as const;

export function Tooltip(
  { anchorRef, visible, children, placement = "bottom", offset = 6, className = "" }: TooltipProps,
) {
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const skipAnimation = useSkipAnimation();
  const transition = useMemo(() => skipAnimation ? NO_MOTION_TRANSITION : TOOLTIP_TRANSITION, [skipAnimation]);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const top = placement === "top" ? rect.top - offset : rect.bottom + offset;
    setPosition({ left: rect.left + rect.width / 2, top });
  }, [anchorRef, offset, placement]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    updatePosition();

    const handleViewportChange = () => updatePosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [updatePosition, visible]);

  const placementClasses = useMemo(
    () => placement === "top" ? "-translate-x-1/2 -translate-y-full" : "-translate-x-1/2",
    [placement],
  );

  const style = useMemo(() => position ? { left: position.left, top: position.top } : undefined, [position]);

  if (!position || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={TOOLTIP_INITIAL}
          animate={TOOLTIP_ANIMATE}
          exit={TOOLTIP_EXIT}
          transition={transition}
          className={`fixed ${placementClasses} px-2 py-1 bg-layer-02 border border-border-subtle rounded text-xs text-text-secondary whitespace-nowrap z-1100 shadow-lg pointer-events-none ${className}`}
          style={style}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
