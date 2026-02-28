import { Button } from "$components/Button";
import { XIcon } from "$icons";
import type { SettingsScope } from "$types";
import { cn } from "$utils/tw";

type SettingsHeaderProps = {
  title: string;
  scope: SettingsScope;
  onClose: () => void;
  closeAriaLabel: string;
  onViewMore?: () => void;
};

export function SettingsHeader({ title, scope, onClose, closeAriaLabel, onViewMore }: SettingsHeaderProps) {
  const isFull = scope === "full";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        isFull ? "mb-4 border-b border-border-subtle pb-3" : "mb-2",
      )}>
      <div>
        <h2 className={cn("m-0 text-text-primary", isFull ? "text-base font-semibold" : "text-sm font-medium")}>
          {title}
        </h2>
        {isFull && (
          <p className="m-0 mt-1 text-xs text-text-secondary">Expanded controls for layout and writing tools.</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onViewMore && <Button type="button" variant="outline" size="sm" onClick={onViewMore}>View more</Button>}
        <Button type="button" variant="iconSubtle" size="iconLg" onClick={onClose} aria-label={closeAriaLabel}>
          <XIcon size="sm" />
        </Button>
      </div>
    </div>
  );
}
