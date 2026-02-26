import { Button } from "$components/Button";
import { IconProps } from "$icons";
import type { ComponentType, MouseEventHandler } from "react";

export const AddButton = (
  { onClick, icon: Icon, title, disabled = false, handleMouseEnter, handleMouseLeave }: {
    onClick: () => void;
    icon: ComponentType<IconProps>;
    title: string;
    disabled?: boolean;
    handleMouseEnter: MouseEventHandler<HTMLButtonElement>;
    handleMouseLeave: MouseEventHandler<HTMLButtonElement>;
  },
) => (
  <Button
    variant="iconGhost"
    size="iconMd"
    onClick={onClick}
    disabled={disabled}
    className="transition-all duration-150"
    onMouseEnter={handleMouseEnter}
    onMouseLeave={handleMouseLeave}
    title={title}>
    <Icon size="md" />
  </Button>
);
