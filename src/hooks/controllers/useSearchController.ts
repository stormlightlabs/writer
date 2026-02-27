import { runCmd, searchDocuments, type SearchFiltersPayload } from "$ports";
import { useLayoutChromeActions, useSearchActions, useSearchState } from "$state/selectors";
import type { SearchHit } from "$types";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useEffect, useMemo, useRef } from "react";

export function useSearchController(onSelectDocument: (locationId: number, path: string) => void) {
  const { searchQuery, searchResults, isSearching, filters } = useSearchState();
  const { setSearchQuery, setSearchResults, setIsSearching, setFilters } = useSearchActions();
  const { setShowSearch } = useLayoutChromeActions();
  const requestIdRef = useRef(0);

  useEffect(() => {
    const normalizedQuery = searchQuery.trim();

    if (!normalizedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timeoutId = globalThis.setTimeout(() => {
      const requestId = ++requestIdRef.current;
      const dateRange = filters.dateRange
        ? { from: filters.dateRange.from?.toISOString(), to: filters.dateRange.to?.toISOString() }
        : undefined;

      const payloadFilters: SearchFiltersPayload = {
        locations: filters.locations,
        fileTypes: filters.fileTypes,
        dateRange,
      };

      void runCmd(searchDocuments(normalizedQuery, payloadFilters, 50, (results: SearchHit[]) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setSearchResults(results);
        setIsSearching(false);
      }, (error) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        logger.error(f("Search failed", { query: normalizedQuery, error }));
        setSearchResults([]);
        setIsSearching(false);
      }));
    }, 150);

    return () => globalThis.clearTimeout(timeoutId);
  }, [filters, searchQuery, setIsSearching, setSearchResults]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, [setSearchQuery]);

  const handleSelectSearchResult = useCallback((hit: SearchHit) => {
    onSelectDocument(hit.location_id, hit.rel_path);
    setShowSearch(false);
  }, [onSelectDocument, setShowSearch]);

  return useMemo(
    () => ({ searchQuery, searchResults, isSearching, filters, setFilters, handleSearch, handleSelectSearchResult }),
    [searchQuery, searchResults, isSearching, filters, setFilters, handleSearch, handleSelectSearchResult],
  );
}
