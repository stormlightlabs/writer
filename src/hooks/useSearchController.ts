import { useAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import { logger } from "../logger";
import { runCmd, searchDocuments, type SearchFiltersPayload } from "../ports";
import { useLayoutActions } from "../state/appStore";
import { isSearchingAtom, searchFiltersAtom, searchQueryAtom, searchResultsAtom } from "../state/searchAtoms";
import type { SearchHit } from "../types";

export function useSearchController(onSelectDocument: (locationId: number, path: string) => void) {
  const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom);
  const [searchResults, setSearchResults] = useAtom(searchResultsAtom);
  const [isSearching, setIsSearching] = useAtom(isSearchingAtom);
  const [searchFilters, setSearchFilters] = useAtom(searchFiltersAtom);
  const { setShowSearch } = useLayoutActions();
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
      const payloadFilters: SearchFiltersPayload = {
        locations: searchFilters.locations,
        fileTypes: searchFilters.fileTypes,
        dateRange: searchFilters.dateRange
          ? { from: searchFilters.dateRange.from?.toISOString(), to: searchFilters.dateRange.to?.toISOString() }
          : undefined,
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
        logger.error("Search failed", { query: normalizedQuery, error });
        setSearchResults([]);
        setIsSearching(false);
      }));
    }, 150);

    return () => globalThis.clearTimeout(timeoutId);
  }, [searchFilters, searchQuery, setIsSearching, setSearchResults]);

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
