import { SearchIcon } from "$icons";
import { useSidebarState } from "$state/selectors";
import type { ChangeEvent } from "react";
import { useCallback } from "react";

export const SearchInput = () => {
  const { filterText, setFilterText } = useSidebarState();

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFilterText(event.currentTarget.value);
  }, [setFilterText]);

  return (
    <div className="px-4 py-3 border-b border-stroke-subtle">
      <div className="relative flex items-center">
        <SearchIcon
          size="sm"
          className="filter-search-icon absolute left-2.5 text-icon-secondary pointer-events-none" />
        <input
          type="text"
          placeholder="Filter documents..."
          value={filterText}
          onChange={handleInputChange}
          className="w-full pl-8 pr-2.5 py-1.5 text-[0.8125rem] bg-field-01 border border-stroke-subtle rounded text-text-primary outline-none transition-[border-color,box-shadow] duration-150 focus:border-stroke-interactive focus:shadow-[0_0_0_2px_rgba(69,137,255,0.2)]" />
      </div>
    </div>
  );
};
