import { Button } from "$components/Button";
import { TrashIcon } from "$icons";
import type { MouseEventHandler } from "react";

export function RemoveButton(
  { isMenuOpen, handleRemoveClick, handleMouseEnter, handleMouseLeave }: {
    isMenuOpen: boolean;
    handleRemoveClick: () => void;
    handleMouseEnter: MouseEventHandler<HTMLButtonElement>;
    handleMouseLeave: MouseEventHandler<HTMLButtonElement>;
  },
) {
  if (isMenuOpen) {
    return (
      <div className="absolute right-0 top-full mt-1 bg-layer-02 border border-border-subtle rounded shadow-lg z-1000 min-w-[140px]">
        <Button
          onClick={handleRemoveClick}
          className="w-full px-3 py-2 flex items-center gap-2 bg-transparent border-none text-support-error text-[0.8125rem] cursor-pointer text-left rounded"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}>
          <TrashIcon size="sm" />
          Remove
        </Button>
      </div>
    );
  }

  return null;
}
