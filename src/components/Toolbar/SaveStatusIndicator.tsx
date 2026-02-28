import { useSkipAnimation } from "$hooks/useMotion";
import { CheckIcon, SaveIcon } from "$icons";
import type { SaveStatus } from "$types";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";

const STATUS_TRANSITION = { duration: 0.15, ease: "easeOut" } as const;

function Status({ status, compact }: { status: SaveStatus; compact: boolean }) {
  switch (status) {
    case "Saving": {
      return (
        <div className="flex items-center gap-1.5 text-xs text-accent-cyan px-2 py-1 bg-layer-01 rounded border border-border-subtle">
          <SaveIcon size="sm" />
          {compact ? null : <span>Saving...</span>}
        </div>
      );
    }
    case "Saved": {
      return (
        <div className="flex items-center gap-1.5 text-xs text-accent-green px-2 py-1 bg-layer-01 rounded border border-border-subtle">
          <CheckIcon size="sm" />
          {compact ? null : <span>Saved</span>}
        </div>
      );
    }
    case "Dirty": {
      return (
        <div className="flex items-center gap-1.5 text-xs text-accent-yellow px-2 py-1 bg-layer-01 rounded border border-border-subtle">
          {compact ? null : <span>Unsaved</span>}
        </div>
      );
    }
    case "Error": {
      return (
        <div className="flex items-center gap-1.5 text-xs text-support-error px-2 py-1 bg-layer-01 rounded border border-border-subtle">
          {compact ? null : <span>Error</span>}
        </div>
      );
    }
    default: {
      return (
        <div className="flex items-center gap-1.5 text-xs text-text-placeholder px-2 py-1 bg-layer-01 rounded border border-border-subtle">
          {compact ? null : <span>Ready</span>}
        </div>
      );
    }
  }
}

function Indicator({ status, compact, animationProps }: { status: SaveStatus; compact: boolean; animationProps: any }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={status} {...animationProps}>
        <Status status={status} compact={compact} />
      </motion.div>
    </AnimatePresence>
  );
}

type SaveStatusIndicatorProps = {
  status: SaveStatus;
  compact?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
};

export function SaveStatusIndicator(
  { status, compact = false, onClick, disabled = false, title }: SaveStatusIndicatorProps,
) {
  const skipAnimation = useSkipAnimation();
  const animationProps = useMemo(() => {
    const transition = skipAnimation ? { duration: 0 } : STATUS_TRANSITION;
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition };
  }, [skipAnimation]);

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className="rounded-md opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={title}>
        <Indicator status={status} compact={compact} animationProps={animationProps} />
      </button>
    );
  }

  return <Indicator status={status} compact={compact} animationProps={animationProps} />;
}
