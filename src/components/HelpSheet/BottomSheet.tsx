import { Sheet } from "$components/Sheet";
import { cn } from "$utils/tw";
import type { ReactNode } from "react";

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
};

export function BottomSheet({ isOpen, onClose, children, ariaLabel, ariaLabelledBy, className }: BottomSheetProps) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      position="b"
      size="xl"
      ariaLabel={ariaLabel}
      ariaLabelledBy={ariaLabelledBy}
      backdropAriaLabel="Dismiss help sheet"
      className={cn("min-h-[50vh]", className)}>
      {children}
    </Sheet>
  );
}
