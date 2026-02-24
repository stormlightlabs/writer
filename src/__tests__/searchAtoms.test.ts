import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import {
  activeSearchFilterCountAtom,
  isSearchingAtom,
  resetSearchAtom,
  searchFiltersAtom,
  searchQueryAtom,
  searchResultsAtom,
} from "../state/atoms/search";

describe("searchAtoms", () => {
  it("computes active filter count", () => {
    const store = createStore();

    store.set(searchFiltersAtom, { locations: [1, 2], fileTypes: ["md"], dateRange: { from: new Date("2024-01-01") } });

    expect(store.get(activeSearchFilterCountAtom)).toBe(4);
  });

  it("resets search state", () => {
    const store = createStore();

    store.set(searchQueryAtom, "chapter");
    store.set(searchResultsAtom, [{
      location_id: 1,
      rel_path: "docs/chapter.md",
      title: "Chapter",
      snippet: "...",
      line: 1,
      column: 1,
      matches: [{ start: 0, end: 7 }],
    }]);
    store.set(isSearchingAtom, true);
    store.set(searchFiltersAtom, { locations: [1] });

    store.set(resetSearchAtom);

    expect(store.get(searchQueryAtom)).toBe("");
    expect(store.get(searchResultsAtom)).toStrictEqual([]);
    expect(store.get(isSearchingAtom)).toBeFalsy();
    expect(store.get(searchFiltersAtom)).toStrictEqual({});
  });
});
