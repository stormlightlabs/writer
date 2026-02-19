import { MouseEventHandler } from "react";
import { XIcon } from "../icons";

export const CloseTabButton = (
  { handleCloseTabClick }: { handleCloseTabClick: MouseEventHandler<HTMLButtonElement> },
) => (
  <button
    onClick={handleCloseTabClick}
    className="tab-close-btn w-4 h-4 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded shrink-0 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:text-icon-primary hover:bg-layer-hover-01"
    title="Close tab">
    <XIcon size="xs" />
  </button>
);
