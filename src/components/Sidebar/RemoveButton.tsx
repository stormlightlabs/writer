import { Button } from "$components/Button";
import { TrashIcon } from "$icons";
import { AnimatePresence, motion } from "motion/react";
import { type MouseEventHandler, useCallback } from "react";

const MENU_INITIAL = { opacity: 0, y: -6, scale: 0.98 };
const MENU_ANIMATE = { opacity: 1, y: 0, scale: 1 };
const MENU_EXIT = { opacity: 0, y: -6, scale: 0.98 };
const MENU_TRANSITION = { duration: 0.14, ease: "easeOut" as const };

export function RemoveButton(
  { isMenuOpen, handleRemoveClick, handleMouseEnter, handleMouseLeave }: {
    isMenuOpen: boolean;
    handleRemoveClick: () => void;
    handleMouseEnter: MouseEventHandler<HTMLButtonElement>;
    handleMouseLeave: MouseEventHandler<HTMLButtonElement>;
  },
) {
  const Inner = useCallback(
    () => (
      <Button
        onClick={handleRemoveClick}
        className="w-full px-3 py-2 flex items-center gap-2 bg-transparent border-none text-support-error text-[0.8125rem] cursor-pointer text-left rounded"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}>
        <TrashIcon size="sm" />
        Remove
      </Button>
    ),
    [handleRemoveClick, handleMouseEnter, handleMouseLeave],
  );

  return (
    <AnimatePresence initial={false}>
      {isMenuOpen && (
        <motion.div
          initial={MENU_INITIAL}
          animate={MENU_ANIMATE}
          exit={MENU_EXIT}
          transition={MENU_TRANSITION}
          className="absolute right-0 top-full mt-1 bg-layer-02 border border-border-subtle rounded shadow-lg z-1000 min-w-[140px]">
          <Inner />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
