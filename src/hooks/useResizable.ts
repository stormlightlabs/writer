import { useCallback, useEffect, useRef, useState } from "react";

type ResizeAxis = "x" | "y";

type UseResizableOptions = {
  initialSize: number;
  minSize: number;
  maxSize: number;
  axis?: ResizeAxis;
  direction?: 1 | -1;
};

type DragState = { pointerStart: number; sizeStart: number };

type UseResizableResult = {
  size: number;
  isResizing: boolean;
  startResizing: (pointerPosition: number) => void;
  setSize: (nextSize: number) => void;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function useResizable(
  { initialSize, minSize, maxSize, axis = "x", direction = 1 }: UseResizableOptions,
): UseResizableResult {
  const [size, setSizeState] = useState(() => clamp(initialSize, minSize, maxSize));
  const [isResizing, setIsResizing] = useState(false);

  const dragStateRef = useRef<DragState | null>(null);
  const sizeRef = useRef(size);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const setSize = useCallback((nextSize: number) => {
    setSizeState(clamp(nextSize, minSize, maxSize));
  }, [minSize, maxSize]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }

    const pointerValue = axis === "x" ? event.clientX : event.clientY;
    const delta = (pointerValue - dragState.pointerStart) * direction;
    setSize(dragState.sizeStart + delta);
  }, [axis, direction, setSize]);

  const handlePointerUp = useCallback(() => {
    dragStateRef.current = null;
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    globalThis.addEventListener("pointermove", handlePointerMove);
    globalThis.addEventListener("pointerup", handlePointerUp);
    return () => {
      globalThis.removeEventListener("pointermove", handlePointerMove);
      globalThis.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizing, handlePointerMove, handlePointerUp]);

  const startResizing = useCallback((pointerPosition: number) => {
    dragStateRef.current = { pointerStart: pointerPosition, sizeStart: sizeRef.current };
    setIsResizing(true);
  }, []);

  return { size, isResizing, startResizing, setSize };
}
