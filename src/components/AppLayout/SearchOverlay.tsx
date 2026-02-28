import { SearchPanel } from "$components/SearchPanel";
import { useSearchController } from "$hooks/controllers/useSearchController";
import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import { useSearchOverlayState } from "$state/selectors";
import { useWorkspaceLocationsState } from "$state/selectors";
import { useCallback, useMemo } from "react";

export function SearchOverlay() {
  const { isVisible, setShowSearch } = useSearchOverlayState();
  const { locations } = useWorkspaceLocationsState();
  const { handleSelectDocument } = useWorkspaceController();
  const { searchQuery, searchResults, isSearching, filters, setFilters, handleSearch, handleSelectSearchResult } =
    useSearchController(handleSelectDocument);

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
