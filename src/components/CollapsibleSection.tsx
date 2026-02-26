import { Button } from "$components/Button";
import { useSkipAnimation } from "$hooks/useMotion";
import { cn } from "$utils/tw";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useCallback, useId, useMemo, useState } from "react";

type CollapsibleSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  contentClassName?: string;
};

const CHEVRON_OPEN = { rotate: 0 } as const;
const CHEVRON_CLOSED = { rotate: -90 } as const;
const NO_MOTION_TRANSITION = { duration: 0 } as const;
const CHEVRON_TRANSITION = { duration: 0.16, ease: "easeOut" } as const;
const PANEL_INITIAL = { height: 0, opacity: 0 } as const;
const PANEL_EXPANDED = { height: "auto", opacity: 1 } as const;
const PANEL_COLLAPSED = { height: 0, opacity: 0 } as const;
const PANEL_TRANSITION = { duration: 0.2, ease: "easeOut" } as const;

function getPanelAnimationProps(skipAnimation: boolean = false) {
  return {
    initial: skipAnimation ? { height: "auto", opacity: 1 } : PANEL_INITIAL,
    animate: skipAnimation ? { height: "auto", opacity: 1 } : PANEL_EXPANDED,
    exit: skipAnimation ? { height: "auto", opacity: 1 } : PANEL_COLLAPSED,
    transition: skipAnimation ? NO_MOTION_TRANSITION : PANEL_TRANSITION,
  };
}

function getChevronAnimationProps(skipAnimation: boolean = false, isOpen: boolean = false) {
  return {
    animate: isOpen ? CHEVRON_OPEN : CHEVRON_CLOSED,
    transition: skipAnimation ? NO_MOTION_TRANSITION : CHEVRON_TRANSITION,
  };
}

const SectionHeader = ({ title, description }: { title: string; description?: string }) => (
  <span className="min-w-0 flex-1">
    <span className="block text-[0.8125rem] text-text-primary">{title}</span>
    {description && <span className="mt-0.5 block text-xs text-text-secondary">{description}</span>}
  </span>
);

export const CollapsibleSection = (
  { title, description, children, defaultOpen = false, open, onOpenChange, className, contentClassName }:
    CollapsibleSectionProps,
) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const sectionId = useId();
  const skipAnimation = useSkipAnimation();
  const buttonId = useMemo(() => `${sectionId}-trigger`, [sectionId]);
  const panelId = useMemo(() => `${sectionId}-panel`, [sectionId]);
  const isControlled = useMemo(() => typeof open === "boolean", [open]);
  const isOpen = useMemo(() => isControlled ? open : internalOpen, [isControlled, internalOpen, open]);

  const handleToggle = useCallback(() => {
    const next = !isOpen;
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  }, [isControlled, isOpen, onOpenChange]);

  return (
    <section className={cn("border-t border-border-subtle first:border-t-0", className)}>
      <Button
        id={buttonId}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={handleToggle}
        className="group flex w-full items-start justify-between gap-3 rounded px-0.5 py-2 text-left hover:bg-layer-02/60">
        <SectionHeader title={title} description={description} />
        <motion.i
          aria-hidden="true"
          className="i-ri-arrow-down-s-line mt-0.5 shrink-0 text-sm text-icon-secondary"
          {...getChevronAnimationProps(skipAnimation, isOpen)} />
      </Button>
      <AnimatePresence initial={false}>
        {isOpen
          ? (
            <motion.div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn("overflow-hidden pb-1", contentClassName)}
              {...getPanelAnimationProps(skipAnimation)}>
              {children}
            </motion.div>
          )
          : null}
      </AnimatePresence>
    </section>
  );
};
