import { SWITCH } from "$constants";
import { useSkipAnimation } from "$hooks/useMotion";
import { cn } from "$utils/tw";
import { motion } from "motion/react";
import { type ChangeEvent, useCallback, useId, useMemo } from "react";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
};

export const Switch = ({ checked, onCheckedChange, ariaLabel, id, disabled = false, className }: SwitchProps) => {
  const generatedId = useId();
  const inputId = useMemo(() => id ?? generatedId, [id, generatedId]);
  const skipAnimation = useSkipAnimation();
  const thumbAnimate = useMemo(() => checked ? SWITCH.THUMB_ON : SWITCH.THUMB_OFF, [checked]);
  const thumbTransition = useMemo(() => skipAnimation ? SWITCH.THUMB_NO_MOTION : SWITCH.THUMB_MOTION, [skipAnimation]);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    onCheckedChange(event.target.checked);
  }, [onCheckedChange]);

  return (
    <label htmlFor={inputId} className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer", className)}>
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        className="peer sr-only" />
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 rounded-full border border-stroke-subtle bg-layer-02 transition-colors duration-150",
          "peer-checked:border-accent-cyan peer-checked:bg-accent-cyan",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
          "peer-focus-visible:outline-accent-cyan peer-disabled:opacity-50",
        )} />
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute left-[2px] top-[2px] h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.24)]"
        animate={thumbAnimate}
        transition={thumbTransition} />
    </label>
  );
};
