import { resetAppStore, useAppStore } from "$state/stores/app";
import { beforeEach, describe, expect, it } from "vitest";

describe("search store", () => {
  beforeEach(() => {
    resetAppStore();
  });

  it("computes active filter count from store state", () => {
    useAppStore.getState().setSearchFilters({
      locations: [1, 2],
      fileTypes: ["md"],
      dateRange: { from: new Date("2024-01-01") },
    });

    const filters = useAppStore.getState().searchFilters;
    const count = (filters.locations?.length ?? 0) + (filters.fileTypes?.length ?? 0) + (filters.dateRange ? 1 : 0);

    expect(count).toBe(4);
  });

  it("resets search state", () => {
    const state = useAppStore.getState();

    state.setSearchQuery("chapter");
    state.setSearchResults([{
      location_id: 1,
      rel_path: "docs/chapter.md",
      title: "Chapter",
      snippet: "...",
      line: 1,
      column: 1,
      matches: [{ start: 0, end: 7 }],
    }]);
    state.setIsSearching(true);
    state.setSearchFilters({ locations: [1] });

    state.resetSearch();

    expect(useAppStore.getState().searchQuery).toBe("");
    expect(useAppStore.getState().searchResults).toStrictEqual([]);
    expect(useAppStore.getState().isSearching).toBeFalsy();
    expect(useAppStore.getState().searchFilters).toStrictEqual({});
  });
});
