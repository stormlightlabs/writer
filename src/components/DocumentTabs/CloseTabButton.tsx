import { Button } from "$components/Button";
import { XIcon } from "$icons";
import { MouseEventHandler } from "react";

export const CloseTabButton = (
  { handleCloseTabClick }: { handleCloseTabClick: MouseEventHandler<HTMLButtonElement> },
) => (
  <Button
    variant="iconGhost"
    size="iconXs"
    onClick={handleCloseTabClick}
    className="tab-close-btn shrink-0 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:text-icon-primary hover:bg-layer-hover-01"
    title="Close tab">
    <XIcon size="xs" />
  </Button>
);
