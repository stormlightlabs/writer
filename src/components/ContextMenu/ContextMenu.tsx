import { Button } from "$components/Button";
import { NO_MOTION_TRANSITION } from "$constants";
import { useSkipAnimation } from "$hooks/useMotion";
import { useViewportTier } from "$hooks/useViewportTier";
import { cn } from "$utils/tw";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

const CONTEXT_MENU_INITIAL = { opacity: 0, scale: 0.96 };
const CONTEXT_MENU_ANIMATE = { opacity: 1, scale: 1 };
const CONTEXT_MENU_EXIT = { opacity: 0, scale: 0.96 };
const CONTEXT_MENU_TRANSITION = { duration: 0.12, ease: "easeOut" as const };

export type ContextMenuItem = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
};

export type ContextMenuDivider = { divider: true };

type MenuItem = ContextMenuItem | ContextMenuDivider;

function isDivider(item: MenuItem): item is ContextMenuDivider {
  return "divider" in item && item.divider === true;
}

export type ContextMenuProps = {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  items: MenuItem[];
};

function ContextMenuItem_({ item, onClose }: { item: ContextMenuItem; onClose: () => void }) {
  const handleClick = useCallback(() => {
    if (item.disabled) return;
    item.onClick();
    onClose();
  }, [item, onClose]);

  const classes = cn(
    "w-full px-3 py-2 bg-transparent border-none text-[0.8125rem] cursor-pointer text-left rounded flex items-center gap-2",
    {
      "text-text-primary hover:bg-layer-hover-02": !item.disabled,
      "text-text-disabled cursor-not-allowed": item.disabled,
      "text-support-error hover:bg-layer-hover-02": item.danger,
    },
  );

  return (
    <Button key={item.label} role="menuitem" onClick={handleClick} disabled={item.disabled} className={classes}>
      {item.icon && <span className="shrink-0">{item.icon}</span>}
      <span className="flex-1">{item.label}</span>
    </Button>
  );
}

function ContextMenuContent(
  { position, items, onClose }: { position: { x: number; y: number }; items: MenuItem[]; onClose: () => void },
) {
  const { isNarrow } = useViewportTier();
  const skipAnimation = useSkipAnimation();
  const transition = useMemo(() => skipAnimation ? NO_MOTION_TRANSITION : CONTEXT_MENU_TRANSITION, [skipAnimation]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      menu.style.left = `${viewportWidth - rect.width - 8}px`;
    }
    if (rect.bottom > viewportHeight) {
      menu.style.top = `${viewportHeight - rect.height - 8}px`;
    }
  }, [position]);

  const style = useMemo(() => ({ left: position.x, top: position.y }), [position]);

  return (
    <motion.div
      ref={menuRef}
      initial={CONTEXT_MENU_INITIAL}
      animate={CONTEXT_MENU_ANIMATE}
      exit={CONTEXT_MENU_EXIT}
      transition={transition}
      role="menu"
      aria-label="Context menu"
      className={`fixed bg-layer-02 border border-border-subtle rounded shadow-lg z-1000 py-1 ${
        isNarrow ? "min-w-[140px]" : "min-w-[160px]"
      }`}
      style={style}>
      {items.map((item, index) => {
        if (isDivider(item)) {
          const k = `divider-${index}`;
          return <div key={k} className="h-px bg-border-subtle my-1 mx-2" />;
        }

        return <ContextMenuItem_ key={item.label} item={item} onClose={onClose} />;
      })}
    </motion.div>
  );
}

export function ContextMenu({ isOpen, position, onClose, items }: ContextMenuProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target;
      if (target instanceof HTMLElement && target.closest("[role=\"menu\"]")) return;
      onClose();
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("contextmenu", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && <ContextMenuContent position={position} items={items} onClose={onClose} />}
    </AnimatePresence>
  );
}

export function useContextMenu() {
  const [state, setState] = useState<{ isOpen: boolean; position: { x: number; y: number } }>({
    isOpen: false,
    position: { x: 0, y: 0 },
  });

  const open = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setState({ isOpen: true, position: { x: e.clientX, y: e.clientY } });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return { ...state, open, close };
}
