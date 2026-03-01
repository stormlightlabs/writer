import { clamp } from "$utils/math";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import type { CSSProperties, RefObject } from "react";

export type AnchorPoint = { x: number; y: number };

type UseAnchoredPositionArgs = {
  isOpen: boolean;
  anchor?: AnchorPoint;
  panelRef: RefObject<HTMLElement | null>;
  onRequestClose: () => void;
  dismissDisabled?: boolean;
};

type AnchoredPositionState = { panelStyle: CSSProperties; isPositioned: boolean };

const VIEWPORT_GUTTER_PX = 10;
const ANCHOR_OFFSET_PX = 12;

function getPinnedPosition(
  panelWidth: number,
  panelHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  anchor?: AnchorPoint,
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

export function useAnchoredPosition(
  { isOpen, anchor, panelRef, onRequestClose, dismissDisabled = false }: UseAnchoredPositionArgs,
): AnchoredPositionState {
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [isPositioned, setIsPositioned] = useState(false);

  const positionPanel = useCallback(() => {
    const panel = panelRef.current;
    if (!panel || typeof globalThis.innerWidth !== "number") {
      return;
    }

    const rect = panel.getBoundingClientRect();
    const position = getPinnedPosition(rect.width, rect.height, globalThis.innerWidth, globalThis.innerHeight, anchor);
    setPanelStyle({ left: `${position.left}px`, top: `${position.top}px` });
    setIsPositioned(true);
  }, [anchor, panelRef]);

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
  }, [isOpen, panelRef, positionPanel]);

  useEffect(() => {
    if (!isOpen || typeof document.addEventListener !== "function") {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (dismissDisabled) {
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      if (event.target instanceof Node && !panel.contains(event.target)) {
        onRequestClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [dismissDisabled, isOpen, onRequestClose, panelRef]);

  return { panelStyle, isPositioned };
}
