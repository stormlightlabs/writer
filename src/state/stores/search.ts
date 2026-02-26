import type { SearchActions, SearchState } from "$state/types";
import { create } from "zustand";

export type SearchStore = SearchState & SearchActions;

export const getInitialSearchState = (): SearchState => ({
  searchQuery: "",
  searchResults: [],
  isSearching: false,
  searchFilters: {},
});

export const useSearchStore = create<SearchStore>()((set) => ({
  ...getInitialSearchState(),

  setSearchQuery: (value) => set({ searchQuery: value }),
  setSearchResults: (value) => set({ searchResults: value }),
  setIsSearching: (value) => set({ isSearching: value }),
  setSearchFilters: (value) => set({ searchFilters: value }),
  resetSearch: () => set(getInitialSearchState()),
}));

export function resetSearchStore(): void {
  useSearchStore.setState(getInitialSearchState());
}
