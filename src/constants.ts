import { DialogMotionPreset } from "$types";

export const NO_MOTION_TRANSITION = { duration: 0 } as const;

export const EMPTY_NEW_DOC_TRANSITION = { duration: 0.18 };
export const EMPTY_NEW_DOC_INITIAL = { opacity: 0, y: -4 };
export const EMPTY_NEW_DOC_ANIMATE = { opacity: 1, y: 0 };

export const CHEVRON = {
  OPEN: { rotate: 0 },
  CLOSED: { rotate: -90 },
  TRANSITION: { duration: 0.16, ease: "easeOut" },
} as const;

export const PANEL = {
  INITIAL: { height: 0, opacity: 0 },
  EXPANDED: { height: "auto", opacity: 1 },
  COLLAPSED: { height: 0, opacity: 0 },
  TRANSITION: { duration: 0.2, ease: "easeOut" },
} as const;

export const MENU = {
  INITIAL: { opacity: 0, y: -6, scale: 0.98 },
  ANIMATE: { opacity: 1, y: 0, scale: 1 },
  EXIT: { opacity: 0, y: -6, scale: 0.98 },
  TRANSITION: { duration: 0.14, ease: "easeOut" },
} as const;

export const STATUS = { TRANSITION: { duration: 0.15, ease: "easeOut" } } as const;

export const SHEET = {
  BACKDROP: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as const,
  TRANSITION: { type: "spring", damping: 30, stiffness: 300 } as const,
} as const;

export const CHROME_SECTION = { TRANSITION: { duration: 0.2, ease: "easeOut" as const } } as const;

export const FOCUS = {
  INITIAL: { opacity: 0 } as const,
  ANIMATE: { opacity: 1 } as const,
  EXIT: { opacity: 0 } as const,
  TRANSITION: { duration: 0.25, ease: "easeOut" } as const,
} as const;

export const ALERT = {
  INITIAL: { opacity: 0, y: 12 } as const,
  ANIMATE: { opacity: 1, y: 0 } as const,
  EXIT: { opacity: 0, y: 8 } as const,
  TRANSITION: { duration: 0.18, ease: "easeOut" } as const,
} as const;

export type AlertTransition = typeof ALERT.TRANSITION | typeof NO_MOTION_TRANSITION;

export const TOOLTIP = {
  INITIAL: { opacity: 0, y: 4 } as const,
  ANIMATE: { opacity: 1, y: 0 } as const,
  EXIT: { opacity: 0, y: 2 } as const,
  TRANSITION: { duration: 0.12, ease: "easeOut" } as const,
} as const;

export const SWITCH = {
  THUMB_OFF: { x: 0 } as const,
  THUMB_ON: { x: 20 } as const,
  THUMB_NO_MOTION: { duration: 0 } as const,
  THUMB_MOTION: { type: "spring", stiffness: 580, damping: 38, mass: 0.65 } as const,
} as const;

export const DIALOG = {
  BACKDROP: {
    FADE_MOTION: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as const,
    FADE_TRANSITION: { duration: 0.16, ease: "easeOut" } as const,
  },
  SURFACE: { TRANSITION: { duration: 0.2, ease: "easeOut" } as const },
} as const;

export const DIALOG_MOTION_PRESETS: Record<
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

export const QUICK_CAPTURE = {
  FORM: { INITIAL: { opacity: 0, y: 8 } as const, ANIMATE: { opacity: 1, y: 0 } as const },
  TEXT: {
    INITIAL: { opacity: 0, y: 4 } as const,
    ANIMATE: { opacity: 1, y: 0 } as const,
    EXIT: { opacity: 0, y: 2 } as const,
  },
};
