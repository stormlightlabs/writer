import { useLayoutStore } from "$state/stores/layout";
import { useReducedMotion } from "motion/react";

export function useSkipAnimation(): boolean {
  const osReduced = useReducedMotion() ?? false;
  const appReduced = useLayoutStore((s) => s.reduceMotion);
  return osReduced || appReduced;
}
