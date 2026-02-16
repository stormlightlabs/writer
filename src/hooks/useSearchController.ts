import { useAtom } from "jotai";
import { useCallback, useEffect } from "react";
import type { SearchHit } from "../components/SearchPanel";
import type { DocMeta } from "../ports";
import { useLayoutActions } from "../state/appStore";
import { isSearchingAtom, searchFiltersAtom, searchQueryAtom, searchResultsAtom } from "../state/searchAtoms";

export function useSearchController(
  documents: DocMeta[],
  onSelectDocument: (locationId: number, path: string) => void,
) {
  const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom);
  const [searchResults, setSearchResults] = useAtom(searchResultsAtom);
  const [isSearching, setIsSearching] = useAtom(isSearchingAtom);
  const [searchFilters, setSearchFilters] = useAtom(searchFiltersAtom);
  const { setShowSearch } = useLayoutActions();

  useEffect(() => {
    const normalizedQuery = searchQuery.trim();

    if (!normalizedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timeoutId = globalThis.setTimeout(() => {
      const queryLower = normalizedQuery.toLowerCase();

      const results: SearchHit[] = documents.filter((doc) => {
        if (!searchFilters.locations?.length) {
          return true;
        }

        return searchFilters.locations.includes(doc.location_id);
      }).filter((doc) => doc.title.toLowerCase().includes(queryLower)).map((doc) => ({
        location_id: doc.location_id,
        rel_path: doc.rel_path,
        title: doc.title,
        snippet: `Document matching "${normalizedQuery}"`,
        line: 1,
        column: 1,
        matches: [{ start: 0, end: normalizedQuery.length }],
      }));

      setSearchResults(results);
      setIsSearching(false);
    }, 100);

    return () => globalThis.clearTimeout(timeoutId);
  }, [documents, searchFilters, searchQuery, setIsSearching, setSearchResults]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, [setSearchQuery]);

  const handleSelectSearchResult = useCallback((hit: SearchHit) => {
    onSelectDocument(hit.location_id, hit.rel_path);
    setShowSearch(false);
  }, [onSelectDocument, setShowSearch]);

  return {
    searchQuery,
    searchResults,
    isSearching,
    searchFilters,
    setSearchFilters,
    handleSearch,
    handleSelectSearchResult,
  };
}
