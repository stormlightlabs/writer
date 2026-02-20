import { type SearchFilters, SearchPanel } from "$components/SearchPanel";
import type { LocationDescriptor } from "$types";
import type { SearchHit } from "$types";
import { useMemo } from "react";

type SearchOverlayProps = {
  isVisible: boolean;
  sidebarCollapsed: boolean;
  topOffset: number;
  query: string;
  results: SearchHit[];
  isSearching: boolean;
  locations: LocationDescriptor[];
  filters: SearchFilters;
  onQueryChange: (query: string) => void;
  onFiltersChange: (filters: SearchFilters) => void;
  onSelectResult: (hit: SearchHit) => void;
  onClose: () => void;
};

export function SearchOverlay(
  {
    isVisible,
    sidebarCollapsed,
    topOffset,
    query,
    results,
    isSearching,
    locations,
    filters,
    onQueryChange,
    onFiltersChange,
    onSelectResult,
    onClose,
  }: SearchOverlayProps,
) {
  const locationsToRender = useMemo(() => locations.map((location) => ({ id: location.id, name: location.name })), [
    locations,
  ]);

  if (!isVisible) {
    return null;
  }

  return (
    <SearchPanel
      query={query}
      results={results}
      isSearching={isSearching}
      sidebarCollapsed={sidebarCollapsed}
      topOffset={topOffset}
      locations={locationsToRender}
      filters={filters}
      onQueryChange={onQueryChange}
      onFiltersChange={onFiltersChange}
      onSelectResult={onSelectResult}
      onClose={onClose} />
  );
}
