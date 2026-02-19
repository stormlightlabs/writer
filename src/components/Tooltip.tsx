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

export function Tooltip(
  { anchorRef, visible, children, placement = "bottom", offset = 6, className = "" }: TooltipProps,
) {
  const [position, setPosition] = useState<TooltipPosition | null>(null);

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

  if (!visible || !position || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={`fixed ${placementClasses} px-2 py-1 bg-layer-02 border border-border-subtle rounded text-xs text-text-secondary whitespace-nowrap z-1100 shadow-lg pointer-events-none ${className}`}
      style={style}>
      {children}
    </div>,
    document.body,
  );
}
