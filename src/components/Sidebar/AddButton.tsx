import { Button } from "$components/Button";
import { PlusIcon } from "$icons";
import type { MouseEventHandler } from "react";

export const AddButton = (
  { onAddLocation, handleMouseEnter, handleMouseLeave }: {
    onAddLocation: () => void;
    handleMouseEnter: MouseEventHandler<HTMLButtonElement>;
    handleMouseLeave: MouseEventHandler<HTMLButtonElement>;
  },
) => (
  <Button
    variant="iconGhost"
    size="iconMd"
    onClick={onAddLocation}
    className="transition-all duration-150"
    onMouseEnter={handleMouseEnter}
    onMouseLeave={handleMouseLeave}
    title="Add Location">
    <PlusIcon size="md" />
  </Button>
);
