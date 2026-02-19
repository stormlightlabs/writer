import type { MouseEventHandler } from "react";
import { PlusIcon } from "../icons";

export const AddButton = (
  { onAddLocation, handleMouseEnter, handleMouseLeave }: {
    onAddLocation: () => void;
    handleMouseEnter: MouseEventHandler<HTMLButtonElement>;
    handleMouseLeave: MouseEventHandler<HTMLButtonElement>;
  },
) => (
  <button
    onClick={onAddLocation}
    className="w-6 h-6 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded transition-all duration-150"
    onMouseEnter={handleMouseEnter}
    onMouseLeave={handleMouseLeave}
    title="Add Location">
    <PlusIcon size="md" />
  </button>
);
