import { Button } from "$components/Button";
import { Tooltip } from "$components/Tooltip";
import { IconProps, IconSize } from "$icons";
import { type MouseEventHandler, useCallback, useRef, useState } from "react";

export function ToolbarButton(
  { icon, label, isActive = false, onClick, disabled = false, shortcut, iconOnly = false }: {
    icon: { Component: React.ComponentType<IconProps>; size: IconSize };
    label: string;
    isActive?: boolean;
    onClick: () => void;
    disabled?: boolean;
    shortcut?: string;
    iconOnly?: boolean;
  },
) {
  const [showTooltip, setShowTooltip] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const handleMouseOver: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    if (!disabled && !isActive) {
      (e.currentTarget as HTMLButtonElement).classList.add("bg-layer-hover-01", "text-text-primary");
    }
  }, [isActive, disabled]);

  const handleMouseOut: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    if (!isActive) {
      (e.currentTarget as HTMLButtonElement).classList.remove("bg-layer-hover-01", "text-text-primary");
    }
  }, [isActive]);

  return (
    <>
      <Button
        ref={buttonRef}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[0.8125rem] relative transition-all duration-150 ease rounded ${
          isActive
            ? "bg-layer-accent-01 border border-border-strong text-text-primary"
            : "bg-transparent border border-transparent text-text-secondary"
        } ${iconOnly ? "w-8 h-8 px-0 justify-center" : ""} ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}>
        <icon.Component size={icon.size} />
        {iconOnly ? null : <span>{label}</span>}
      </Button>
      {shortcut ? <Tooltip anchorRef={buttonRef} visible={showTooltip}>{shortcut}</Tooltip> : null}
    </>
  );
}
