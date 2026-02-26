import { Button } from "$components/Button";
import { IconProps } from "$icons";
import type { ComponentType } from "react";

export const AddButton = (
  { onClick, icon: Icon, title, disabled = false }: {
    onClick: () => void;
    icon: ComponentType<IconProps>;
    title: string;
    disabled?: boolean;
  },
) => (
  <Button
    variant="iconGhost"
    size="iconMd"
    onClick={onClick}
    disabled={disabled}
    className="transition-all duration-150 hover:bg-layer-hover-01 hover:text-icon-primary"
    title={title}>
    <Icon size="md" />
  </Button>
);
