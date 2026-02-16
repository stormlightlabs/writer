import { useMemo } from "react";
import type { LocationDescriptor } from "../../types";
import { type SearchFilters, type SearchHit, SearchPanel } from "../SearchPanel";

type SearchOverlayProps = {
  isVisible: boolean;
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
      locations={locationsToRender}
      filters={filters}
      onQueryChange={onQueryChange}
      onFiltersChange={onFiltersChange}
      onSelectResult={onSelectResult}
      onClose={onClose} />
  );
}
