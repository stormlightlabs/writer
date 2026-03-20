import { Button } from "$components/Button";
import { ContextMenu, type ContextMenuDivider, type ContextMenuItem } from "$components/ContextMenu/ContextMenu";
import type { IconProps, IconSize } from "$icons";
import { useCallback, useRef, useState } from "react";

type MenuItem = ContextMenuItem | ContextMenuDivider;

export function ToolbarDropdown(
  { icon, label, items, iconOnly = false }: {
    icon: { Component: React.ComponentType<IconProps>; size: IconSize };
    label: string;
    items: MenuItem[];
    iconOnly?: boolean;
  },
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleClick = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setPosition({ x: rect.left, y: rect.bottom + 4 });
    setIsOpen((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => setIsOpen(false), []);

  return (
    <div ref={wrapperRef}>
      <Button
        onClick={handleClick}
        aria-label={iconOnly ? label : undefined}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[0.8125rem] relative transition-colors duration-150 ease rounded border ${
          isOpen
            ? "bg-layer-accent-01 border-stroke-strong text-text-primary"
            : "bg-transparent border-transparent text-text-secondary hover:bg-layer-hover-01 hover:text-text-primary"
        } ${iconOnly ? "w-8 h-8 px-0 justify-center" : ""}`}>
        <icon.Component size={icon.size} />
        {iconOnly ? null : <span>{label}</span>}
      </Button>
      <ContextMenu isOpen={isOpen} position={position} onClose={handleClose} items={items} anchorRef={wrapperRef} />
    </div>
  );
}
