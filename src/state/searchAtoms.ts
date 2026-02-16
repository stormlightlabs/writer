import { atom } from "jotai";
import type { SearchFilters, SearchHit } from "../components/SearchPanel";

export const searchQueryAtom = atom("");
export const searchResultsAtom = atom<SearchHit[]>([]);
export const isSearchingAtom = atom(false);
export const searchFiltersAtom = atom<SearchFilters>({});

export const activeSearchFilterCountAtom = atom((get) => {
  const filters = get(searchFiltersAtom);
  return (filters.locations?.length ?? 0) + (filters.fileTypes?.length ?? 0) + (filters.dateRange ? 1 : 0);
});

export const resetSearchAtom = atom(null, (_get, set) => {
  set(searchQueryAtom, "");
  set(searchResultsAtom, []);
  set(isSearchingAtom, false);
  set(searchFiltersAtom, {});
});
