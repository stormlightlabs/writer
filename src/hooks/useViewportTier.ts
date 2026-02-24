import { useEffect, useMemo, useState } from "react";

export const VIEWPORT_BREAKPOINTS = { compactMax: 719, narrowMax: 1023, standardMax: 1439 } as const;

export type ViewportTier = "compact" | "narrow" | "standard" | "wide";

const DEFAULT_FALLBACK_WIDTH = 1280;

const getSafeViewportWidth = (fallbackWidth: number): number => {
  if (typeof globalThis === "undefined" || typeof globalThis.innerWidth !== "number") {
    return fallbackWidth;
  }

  return Math.max(320, globalThis.innerWidth);
};

export const getViewportTier = (viewportWidth: number): ViewportTier => {
  if (viewportWidth <= VIEWPORT_BREAKPOINTS.compactMax) {
    return "compact";
  }

  if (viewportWidth <= VIEWPORT_BREAKPOINTS.narrowMax) {
    return "narrow";
  }

  if (viewportWidth <= VIEWPORT_BREAKPOINTS.standardMax) {
    return "standard";
  }

  return "wide";
};

export function useViewportTier(fallbackWidth = DEFAULT_FALLBACK_WIDTH) {
  const [viewportWidth, setViewportWidth] = useState(() => getSafeViewportWidth(fallbackWidth));

  useEffect(() => {
    if (typeof globalThis.addEventListener !== "function") {
      return;
    }

    const updateViewportWidth = () => {
      setViewportWidth(getSafeViewportWidth(fallbackWidth));
    };

    updateViewportWidth();
    globalThis.addEventListener("resize", updateViewportWidth);
    return () => {
      globalThis.removeEventListener("resize", updateViewportWidth);
    };
  }, [fallbackWidth]);

  const tier = useMemo(() => getViewportTier(viewportWidth), [viewportWidth]);

  return useMemo(
    () => ({
      viewportWidth,
      tier,
      isCompact: tier === "compact",
      isNarrow: tier === "compact" || tier === "narrow",
      isStandardUp: tier === "standard" || tier === "wide",
      isWide: tier === "wide",
    }),
    [tier, viewportWidth],
  );
}
