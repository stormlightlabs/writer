import { SearchIcon } from "$icons";

export const SearchInput = (
  { filterText, handleInputChange }: {
    filterText: string;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  },
) => (
  <div className="px-4 py-3 border-b border-border-subtle">
    <div className="relative flex items-center">
      <SearchIcon size="sm" className="filter-search-icon absolute left-2.5 text-icon-secondary pointer-events-none" />
      <input
        type="text"
        placeholder="Filter documents..."
        value={filterText}
        onChange={handleInputChange}
        className="w-full pl-8 pr-2.5 py-1.5 text-[0.8125rem] bg-field-01 border border-border-subtle rounded text-text-primary outline-none transition-all duration-150 focus:border-border-interactive focus:shadow-[0_0_0_2px_rgba(69,137,255,0.2)]" />
    </div>
  </div>
);
