import { Button } from "$components/Button";
import { XIcon } from "$icons";
import type { SearchFilters } from "$state/types";
import type { MouseEventHandler } from "react";
import { useCallback, useMemo } from "react";

type ToggleButtonProps = {
  toggleFilters: MouseEventHandler<HTMLButtonElement>;
  showFilters: boolean;
  activeFilterCount: number;
  compact?: boolean;
};

type FilterLocationProps = {
  location: { id: number; name: string };
  filters: SearchFilters;
  handleToggleLocation: (locationId: number) => void;
};

export function ToggleButton({ toggleFilters, showFilters, activeFilterCount, compact = false }: ToggleButtonProps) {
  const classes = useMemo(() => {
    const base = [
      compact ? "px-3 py-2" : "px-4 py-2.5",
      "border border-border-subtle rounded-md",
      "text-sm cursor-pointer flex items-center gap-1.5 transition-all duration-150",
    ];

    if (showFilters) {
      base.push("bg-layer-accent-01");
    } else {
      base.push("bg-layer-01");
    }

    if (activeFilterCount > 0) {
      base.push("text-accent-blue");
    } else {
      base.push("text-text-secondary");
    }

    return base.join(" ");
  }, [showFilters, activeFilterCount, compact]);
  return (
    <Button onClick={toggleFilters} className={classes}>
      Filters
      {activeFilterCount > 0 && (
        <span className="bg-accent-blue text-white text-xs px-1.5 py-0.5 rounded-[10px] font-semibold">
          {activeFilterCount}
        </span>
      )}
    </Button>
  );
}

export function CloseButton({ onClose, compact = false }: { onClose: () => void; compact?: boolean }) {
  return (
    <Button
      onClick={onClose}
      className={`bg-transparent border-none text-icon-secondary cursor-pointer rounded-md ${
        compact ? "p-2" : "p-2.5"
      }`}>
      <XIcon size="xl" />
    </Button>
  );
}

export function ClearAllFiltersButton({ handleClearFilters }: { handleClearFilters: () => void }) {
  return (
    <Button
      onClick={handleClearFilters}
      className="self-start px-3 py-1.5 bg-transparent border-none text-link-primary text-[0.8125rem] cursor-pointer underline underline-offset-2">
      Clear all filters
    </Button>
  );
}

export function FilterLocationButton({ location, filters, handleToggleLocation }: FilterLocationProps) {
  const handleClick = useCallback(() => handleToggleLocation(location.id), [handleToggleLocation, location.id]);
  const classes = useMemo(() => {
    const base = [
      "px-3 py-1.5",
      "border border-border-subtle rounded",
      "text-[0.8125rem] cursor-pointer transition-all duration-150",
    ];

    if (filters.locations?.includes(location.id)) {
      base.push("bg-accent-blue text-white");
    } else {
      base.push("bg-layer-02 text-text-primary");
    }

    return base.join(" ");
  }, [filters.locations, location.id]);
  return <Button onClick={handleClick} className={classes}>{location.name}</Button>;
}
