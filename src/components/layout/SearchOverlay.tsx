import { type SearchFilters, SearchPanel } from "$components/SearchPanel";
import { useSearchOverlayState } from "$state/panel-selectors";
import type { LocationDescriptor } from "$types";
import type { SearchHit } from "$types";
import { useCallback, useMemo } from "react";

type SearchOverlayProps = {
  searchQuery: string;
  searchResults: SearchHit[];
  isSearching: boolean;
  locations: LocationDescriptor[];
  filters: SearchFilters;
  handleSearch: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  handleSelectSearchResult: (hit: SearchHit) => void;
};

export function SearchOverlay(
  { searchQuery, searchResults, isSearching, locations, filters, handleSearch, setFilters, handleSelectSearchResult }:
    SearchOverlayProps,
) {
  const { isVisible, setShowSearch } = useSearchOverlayState();
  const handleClose = useCallback(() => {
    setShowSearch(false);
  }, [setShowSearch]);
  const locationsToRender = useMemo(() => locations.map((location) => ({ id: location.id, name: location.name })), [
    locations,
  ]);

  return (
    <SearchPanel
      isOpen={isVisible}
      query={searchQuery}
      results={searchResults}
      isSearching={isSearching}
      topOffset={48}
      locations={locationsToRender}
      filters={filters}
      onQueryChange={handleSearch}
      onFiltersChange={setFilters}
      onSelectResult={handleSelectSearchResult}
      onClose={handleClose} />
  );
}
