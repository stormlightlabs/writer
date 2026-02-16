import { useCallback, useState } from "react";
import { FileTextIcon, SearchIcon, XIcon } from "./icons";

export type SearchFilters = { locations?: number[]; fileTypes?: string[]; dateRange?: { from?: Date; to?: Date } };

type SearchPanelProps = {
  query: string;
  results: SearchHit[];
  isSearching: boolean;
  locations: Array<{ id: number; name: string }>;
  filters: SearchFilters;
  onQueryChange: (query: string) => void;
  onFiltersChange: (filters: SearchFilters) => void;
  onSelectResult: (hit: SearchHit) => void;
  onClose: () => void;
};

export type SearchHit = {
  location_id: number;
  rel_path: string;
  title: string;
  snippet: string;
  line: number;
  column: number;
  matches: Array<{ start: number; end: number }>;
};

function HighlightedSnippet({ text, matches }: { text: string; matches: Array<{ start: number; end: number }> }) {
  if (!matches || matches.length === 0) {
    return <span>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  matches.forEach((match, index) => {
    if (match.start > lastEnd) {
      parts.push(<span key={`text-${index}`}>{text.slice(lastEnd, match.start)}</span>);
    }
    parts.push(
      <mark key={`mark-${index}`} className="bg-accent-yellow text-bg-primary rounded px-0.5">
        {text.slice(match.start, match.end)}
      </mark>,
    );
    lastEnd = match.end;
  });

  if (lastEnd < text.length) {
    parts.push(<span key="text-end">{text.slice(lastEnd)}</span>);
  }

  return <>{parts}</>;
}

export function SearchPanel(
  { query, results, isSearching, locations, filters, onQueryChange, onFiltersChange, onSelectResult, onClose }:
    SearchPanelProps,
) {
  const [showFilters, setShowFilters] = useState(false);

  const handleToggleLocation = useCallback((locationId: number) => {
    const currentLocations = filters.locations || [];
    const newLocations = currentLocations.includes(locationId)
      ? currentLocations.filter((id) => id !== locationId)
      : [...currentLocations, locationId];
    onFiltersChange({ ...filters, locations: newLocations });
  }, [filters, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  const activeFilterCount = (filters.locations?.length || 0) + (filters.fileTypes?.length || 0)
    + (filters.dateRange ? 1 : 0);

  return (
    <div className="fixed top-[48px] left-sidebar right-0 bottom-0 bg-bg-primary z-100 flex flex-col">
      <div className="px-6 py-4 border-b border-border-subtle flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <SearchIcon
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-icon-secondary pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search across all documents..."
              autoFocus
              className="w-full pl-10 pr-3 py-2.5 text-base bg-field-01 border border-border-subtle rounded-md text-text-primary outline-none transition-all duration-150 focus:border-border-interactive focus:shadow-[0_0_0_3px_rgba(69,137,255,0.2)]" />
            {query && (
              <button
                onClick={() => onQueryChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded">
                <XIcon size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 border border-border-subtle rounded-md text-sm cursor-pointer flex items-center gap-1.5 transition-all duration-150 ${
              showFilters ? "bg-layer-accent-01" : "bg-layer-01"
            } ${activeFilterCount > 0 ? "text-accent-blue" : "text-text-secondary"}`}>
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-accent-blue text-white text-xs px-1.5 py-0.5 rounded-[10px] font-semibold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={onClose}
            className="p-2.5 bg-transparent border-none text-icon-secondary cursor-pointer rounded-md">
            <XIcon size={18} />
          </button>
        </div>

        {showFilters && (
          <div className="p-4 bg-layer-01 rounded-md border border-border-subtle flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Locations
              </label>
              <div className="flex flex-wrap gap-2">
                {locations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => handleToggleLocation(location.id)}
                    className={`px-3 py-1.5 border border-border-subtle rounded text-[0.8125rem] cursor-pointer transition-all duration-150 ${
                      filters.locations?.includes(location.id)
                        ? "bg-accent-blue text-white"
                        : "bg-layer-02 text-text-primary"
                    }`}>
                    {location.name}
                  </button>
                ))}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="self-start px-3 py-1.5 bg-transparent border-none text-link-primary text-[0.8125rem] cursor-pointer underline underline-offset-2">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {query && !isSearching && (
          <div className="text-[0.8125rem] text-text-secondary">
            {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isSearching
          ? <div className="flex items-center justify-center h-[200px] text-text-placeholder text-sm">Searching...</div>
          : results.length === 0
          ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-text-placeholder text-center">
              {query
                ? (
                  <>
                    <SearchIcon size={48} className="mb-4 opacity-30" />
                    <p className="m-0 text-sm">No results found</p>
                    <p className="mt-2 text-[0.8125rem] opacity-70">Try adjusting your search or filters</p>
                  </>
                )
                : (
                  <>
                    <SearchIcon size={48} className="mb-4 opacity-30" />
                    <p className="m-0 text-sm">Start typing to search</p>
                    <p className="mt-2 text-[0.8125rem] opacity-70">Search across all your documents</p>
                  </>
                )}
            </div>
          )
          : (
            <div className="flex flex-col gap-2">
              {results.map((hit, index) => (
                <button
                  key={`${hit.location_id}-${hit.rel_path}-${hit.line}-${index}`}
                  onClick={() => onSelectResult(hit)}
                  className="w-full px-4 py-3 bg-layer-01 border border-border-subtle rounded-md text-left cursor-pointer transition-all duration-150 hover:bg-layer-hover-01 hover:border-border-strong">
                  <div className="flex items-center gap-2 mb-1">
                    <FileTextIcon size={14} className="text-icon-secondary" />
                    <span className="text-sm font-medium text-text-primary">{hit.title}</span>
                    <span className="text-text-placeholder text-xs" />
                    <span className="text-xs text-text-secondary">Line {hit.line}</span>
                  </div>
                  <div className="text-[0.8125rem] text-text-secondary font-mono leading-relaxed">
                    <HighlightedSnippet text={hit.snippet} matches={hit.matches} />
                  </div>
                </button>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
