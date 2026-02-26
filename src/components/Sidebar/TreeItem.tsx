import { Button } from "$components/Button";
import { ChevronRightIcon, IconProps, type IconSize } from "$icons";
import type { CSSProperties, MouseEventHandler } from "react";
import { useCallback, useMemo } from "react";

type IconMemo = { Component: React.ComponentType<IconProps>; size: IconSize };

type TreeItemProps = {
  icon: IconMemo;
  label: string;
  isSelected?: boolean;
  isExpanded?: boolean;
  hasChildItems?: boolean;
  level?: number;
  onClick?: () => void;
  onToggle?: () => void;
  children?: React.ReactNode;
};

export function TreeItem(
  {
    icon,
    label,
    isSelected = false,
    isExpanded = false,
    hasChildItems = false,
    level = 0,
    onClick,
    onToggle,
    children,
  }: TreeItemProps,
) {
  const paddingLeft = level * 16 + 12;

  const handleMouseEnter: MouseEventHandler<HTMLDivElement> = useCallback((e) => {
    if (!isSelected) {
      (e.currentTarget as HTMLDivElement).classList.add("bg-layer-hover-01");
    }
  }, [isSelected]);

  const handleMouseLeave: MouseEventHandler<HTMLDivElement> = useCallback((e) => {
    if (!isSelected) {
      (e.currentTarget as HTMLDivElement).classList.remove("bg-layer-hover-01");
    }
  }, [isSelected]);

  const handleButtonClick: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    e.stopPropagation();
    onToggle?.();
  }, [onToggle]);

  const containerStyle: CSSProperties = useMemo(
    () => ({ paddingLeft: `${paddingLeft}px`, paddingRight: "8px", paddingTop: "6px", paddingBottom: "6px" }),
    [paddingLeft],
  );

  const containerClasses = useMemo(() => {
    const base = [
      "sidebar-item group flex items-center gap-2",
      "cursor-pointer rounded mx-2 mb-0.5 text-[0.8125rem]",
      "transition-colors duration-150",
    ];

    if (isSelected) {
      base.push("bg-layer-accent-01 text-text-primary");
    } else {
      base.push("bg-transparent text-text-secondary");
    }

    return base.join(" ");
  }, [isSelected]);

  const buttonStyle: CSSProperties = useMemo(() => ({ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }), [
    isExpanded,
  ]);

  const labelStyle: CSSProperties = useMemo(() => ({ fontWeight: isSelected ? 500 : 400 }), [isSelected]);

  return (
    <div
      className={containerClasses}
      style={containerStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      {hasChildItems
        ? (
          <Button
            onClick={handleButtonClick}
            className="bg-transparent border-none p-0.5 cursor-pointer text-icon-secondary flex items-center justify-center rounded transition-transform duration-150"
            style={buttonStyle}>
            <ChevronRightIcon size="xs" />
          </Button>
        )
        : <span className="w-5" />}
      <span className={`flex items-center shrink-0 ${isSelected ? "text-icon-primary" : "text-icon-secondary"}`}>
        <icon.Component size={icon.size} />
      </span>
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap" style={labelStyle} title={label}>
        {label}
      </span>
      {children}
    </div>
  );
}
