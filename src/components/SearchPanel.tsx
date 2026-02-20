import { FileTextIcon, SearchIcon, XIcon } from "$icons";
import type { SearchHit } from "$types";
import type { ChangeEventHandler, MouseEventHandler } from "react";
import { useCallback, useMemo, useState } from "react";

export type SearchFilters = { locations?: number[]; fileTypes?: string[]; dateRange?: { from?: Date; to?: Date } };

type SearchPanelProps = {
  query: string;
  results: SearchHit[];
  isSearching: boolean;
  sidebarCollapsed: boolean;
  topOffset: number;
  locations: Array<{ id: number; name: string }>;
  filters: SearchFilters;
  onQueryChange: (query: string) => void;
  onFiltersChange: (filters: SearchFilters) => void;
  onSelectResult: (hit: SearchHit) => void;
  onClose: () => void;
};

type SearchResultProps = { hit: SearchHit; onSelectResult: (hit: SearchHit) => void };

function HighlightedSnippet({ text, matches }: { text: string; matches: Array<{ start: number; end: number }> }) {
  if (!matches || matches.length === 0) {
    return <span>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const [index, match] of matches.entries()) {
    const matchKey = `text-${index}`;
    const markKey = `mark-${index}`;

    if (match.start > lastEnd) {
      parts.push(<span key={matchKey}>{text.slice(lastEnd, match.start)}</span>);
    }
    parts.push(
      <mark key={markKey} className="bg-accent-yellow text-bg-primary rounded px-0.5">
        {text.slice(match.start, match.end)}
      </mark>,
    );
    lastEnd = match.end;
  }

  if (lastEnd < text.length) {
    parts.push(<span key="text-end">{text.slice(lastEnd)}</span>);
  }

  return <div className="text-[0.8125rem] text-text-secondary font-mono leading-relaxed">{parts}</div>;
}

function HighlightLabel({ hit }: { hit: SearchHit }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <FileTextIcon size="sm" className="text-icon-secondary" />
      <span className="text-sm font-medium text-text-primary">{hit.title}</span>
      <span className="text-text-placeholder text-xs" />
      <span className="text-xs text-text-secondary">Line {hit.line}</span>
    </div>
  );
}

function SearchResult({ hit, onSelectResult }: SearchResultProps) {
  {
    const handleClick = useCallback(() => onSelectResult(hit), [onSelectResult, hit]);
    return (
      <button
        onClick={handleClick}
        className="w-full px-4 py-3 bg-layer-01 border border-border-subtle rounded-md text-left cursor-pointer transition-all duration-150 hover:bg-layer-hover-01 hover:border-border-strong">
        <HighlightLabel hit={hit} />
        <HighlightedSnippet text={hit.snippet} matches={hit.matches} />
      </button>
    );
  }
}

type RenderedLocationsProps = {
  locations: Array<{ id: number; name: string }>;
  filters: SearchFilters;
  handleToggleLocation: (locationId: number) => void;
};

const RenderedLocations = ({ locations, filters, handleToggleLocation }: RenderedLocationsProps) => (
  <div className="flex flex-wrap gap-2">
    {locations.map((location) => (
      <FilterLocation
        key={location.id}
        location={location}
        filters={filters}
        handleToggleLocation={handleToggleLocation} />
    ))}
  </div>
);

type ResultsProps = {
  isSearching: boolean;
  results: SearchHit[];
  query: string;
  onSelectResult: (hit: SearchHit) => void;
};

function Results({ isSearching, results, query, onSelectResult }: ResultsProps) {
  if (isSearching) {
    return <div className="flex items-center justify-center h-[200px] text-text-placeholder text-sm">Searching...</div>;
  } else if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-text-placeholder text-center">
        {query
          ? (
            <>
              <SearchIcon size="2xl" className="mb-4 opacity-30" />
              <p className="m-0 text-sm">No results found</p>
              <p className="mt-2 text-[0.8125rem] opacity-70">Try adjusting your search or filters</p>
            </>
          )
          : (
            <>
              <SearchIcon size="2xl" className="mb-4 opacity-30" />
              <p className="m-0 text-sm">Start typing to search</p>
              <p className="mt-2 text-[0.8125rem] opacity-70">Search across all your documents</p>
            </>
          )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {results.map((hit, index) => {
        const k = `${hit.location_id}-${hit.rel_path}-${hit.line}-${index}`;
        return <SearchResult key={k} hit={hit} onSelectResult={onSelectResult} />;
      })}
    </div>
  );
}

type SearchInputProps = {
  query: string;
  handleQueryChange: ChangeEventHandler<HTMLInputElement>;
  clearQuery: MouseEventHandler<HTMLButtonElement>;
};

const SearchInput = ({ query, handleQueryChange, clearQuery }: SearchInputProps) => (
  <div className="flex-1 relative">
    <SearchIcon
      size="xl"
      className="absolute left-3 top-1/2 -translate-y-1/2 text-icon-secondary pointer-events-none" />
    <input
      type="text"
      value={query}
      onChange={handleQueryChange}
      placeholder="Search across all documents..."
      autoFocus
      className="w-full pl-10 pr-3 py-2.5 text-base bg-field-01 border border-border-subtle rounded-md text-text-primary outline-none transition-all duration-150 focus:border-border-interactive focus:shadow-[0_0_0_3px_rgba(69,137,255,0.2)]" />
    {query && (
      <button
        onClick={clearQuery}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded">
        <XIcon size="sm" />
      </button>
    )}
  </div>
);

type FilterLocationProps = {
  location: { id: number; name: string };
  filters: SearchFilters;
  handleToggleLocation: (locationId: number) => void;
};

function FilterLocation({ location, filters, handleToggleLocation }: FilterLocationProps) {
  const handleClick = useCallback(() => handleToggleLocation(location.id), [handleToggleLocation, location.id]);
  const classes = useMemo(() => {
    const base = [
      "px-3 py-1.5",
      "border border-border-subtle rounded",
      "text-[0.8125rem] cursor-pointer transition-all duration-150",
    ];

    if (filters.locations?.includes(location.id)) {
      base.push("bg-accent-blue text-white");
    } else {
      base.push("bg-layer-02 text-text-primary");
    }

    return base.join(" ");
  }, [filters.locations]);
  return <button onClick={handleClick} className={classes}>{location.name}</button>;
}

const CloseButton = ({ onClose }: { onClose: () => void }) => (
  <button onClick={onClose} className="p-2.5 bg-transparent border-none text-icon-secondary cursor-pointer rounded-md">
    <XIcon size="xl" />
  </button>
);

const ClearAllFilters = ({ handleClearFilters }: { handleClearFilters: () => void }) => (
  <button
    onClick={handleClearFilters}
    className="self-start px-3 py-1.5 bg-transparent border-none text-link-primary text-[0.8125rem] cursor-pointer underline underline-offset-2">
    Clear all filters
  </button>
);

type ToggleButtonProps = {
  toggleFilters: MouseEventHandler<HTMLButtonElement>;
  showFilters: boolean;
  activeFilterCount: number;
};

function ToggleButton({ toggleFilters, showFilters, activeFilterCount }: ToggleButtonProps) {
  const classes = useMemo(() => {
    const base = [
      "px-4 py-2.5",
      "border border-border-subtle rounded-md",
      "text-sm cursor-pointer flex items-center gap-1.5 transition-all duration-150",
    ];

    if (showFilters) {
      base.push("bg-layer-accent-01");
    } else {
      base.push("bg-layer-01");
    }

    if (activeFilterCount > 0) {
      base.push("text-accent-blue");
    } else {
      base.push("text-text-secondary");
    }

    return base.join(" ");
  }, [showFilters, activeFilterCount]);
  return (
    <button onClick={toggleFilters} className={classes}>
      Filters
      {activeFilterCount > 0 && (
        <span className="bg-accent-blue text-white text-xs px-1.5 py-0.5 rounded-[10px] font-semibold">
          {activeFilterCount}
        </span>
      )}
    </button>
  );
}

type VisibleFiltersProps = {
  showFilters: boolean;
  locations: Array<{ id: number; name: string }>;
  filters: SearchFilters;
  handleToggleLocation: (locationId: number) => void;
  activeFilterCount: number;
  handleClearFilters: () => void;
};

function VisibleFilters(
  { showFilters, locations, filters, handleToggleLocation, activeFilterCount, handleClearFilters }: VisibleFiltersProps,
) {
  if (showFilters) {
    return (
      <div className="p-4 bg-layer-01 rounded-md border border-border-subtle flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
            Locations
          </label>
          <RenderedLocations locations={locations} filters={filters} handleToggleLocation={handleToggleLocation} />
        </div>
        {activeFilterCount > 0 && <ClearAllFilters handleClearFilters={handleClearFilters} />}
      </div>
    );
  }
  return null;
}

function SearchResultsHeader(
  {
    query,
    isSearching,
    results,
    showFilters,
    locations,
    filters,
    handleToggleLocation,
    activeFilterCount,
    handleClearFilters,
    onClose,
    handleQueryChange,
    clearQuery,
    toggleFilters,
  }: {
    query: string;
    isSearching: boolean;
    results: SearchHit[];
    showFilters: boolean;
    locations: Array<{ id: number; name: string }>;
    filters: SearchFilters;
    handleToggleLocation: (locationId: number) => void;
    activeFilterCount: number;
    handleClearFilters: () => void;
    onClose: () => void;
    handleQueryChange: ChangeEventHandler<HTMLInputElement>;
    clearQuery: MouseEventHandler<HTMLButtonElement>;
    toggleFilters: MouseEventHandler<HTMLButtonElement>;
  },
) {
  return (
    <div className="px-6 py-4 border-b border-border-subtle flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <SearchInput query={query} handleQueryChange={handleQueryChange} clearQuery={clearQuery} />
        <ToggleButton toggleFilters={toggleFilters} showFilters={showFilters} activeFilterCount={activeFilterCount} />
        <CloseButton onClose={onClose} />
      </div>

      <VisibleFilters
        showFilters={showFilters}
        locations={locations}
        filters={filters}
        handleToggleLocation={handleToggleLocation}
        activeFilterCount={activeFilterCount}
        handleClearFilters={handleClearFilters} />

      {query && !isSearching && (
        <div className="text-[0.8125rem] text-text-secondary">
          {results.length} result{results.length === 1 ? "" : "s"} for "{query}"
        </div>
      )}
    </div>
  );
}

export function SearchPanel(
  {
    query,
    results,
    isSearching,
    sidebarCollapsed,
    topOffset,
    locations,
    filters,
    onQueryChange,
    onFiltersChange,
    onSelectResult,
    onClose,
  }: SearchPanelProps,
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

  const handleQueryChange: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    onQueryChange(e.target.value);
  }, [onQueryChange]);

  const clearQuery: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    onQueryChange("");
  }, [onQueryChange]);

  const toggleFilters: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters]);

  const activeFilterCount = useMemo(
    () => (filters.locations?.length ?? 0) + (filters.fileTypes?.length ?? 0) + (filters.dateRange ? 1 : 0),
    [filters],
  );

  const containerStyle = useMemo(() => ({ top: topOffset }), [topOffset]);

  const leftClass = useMemo(() => sidebarCollapsed ? "left-0" : "left-sidebar", [sidebarCollapsed]);

  return (
    <div className={`fixed ${leftClass} right-0 bottom-0 bg-bg-primary z-100 flex flex-col`} style={containerStyle}>
      <SearchResultsHeader
        query={query}
        isSearching={isSearching}
        results={results}
        showFilters={showFilters}
        locations={locations}
        filters={filters}
        handleToggleLocation={handleToggleLocation}
        activeFilterCount={activeFilterCount}
        handleClearFilters={handleClearFilters}
        onClose={onClose}
        handleQueryChange={handleQueryChange}
        clearQuery={clearQuery}
        toggleFilters={toggleFilters} />

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <Results isSearching={isSearching} results={results} query={query} onSelectResult={onSelectResult} />
      </div>
    </div>
  );
}
