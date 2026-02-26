import { Button } from "$components/Button";
import { Dialog } from "$components/Dialog";
import { useSkipAnimation } from "$hooks/useMotion";
import { useViewportTier } from "$hooks/useViewportTier";
import { FileTextIcon, SearchIcon, XIcon } from "$icons";
import type { SearchFilters } from "$state/types";
import type { SearchHit } from "$types";
import { cn } from "$utils/tw";
import { AnimatePresence, motion } from "motion/react";
import type { ChangeEventHandler, MouseEventHandler } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClearAllFiltersButton, CloseButton, FilterLocationButton, ToggleButton } from "./Buttons";

type VisibleFiltersProps = {
  showFilters: boolean;
  locations: Array<{ id: number; name: string }>;
  filters: SearchFilters;
  handleToggleLocation: (locationId: number) => void;
  activeFilterCount: number;
  handleClearFilters: () => void;
  skipAnimation: boolean;
};

type SearchInputProps = {
  query: string;
  handleQueryChange: ChangeEventHandler<HTMLInputElement>;
  clearQuery: MouseEventHandler<HTMLButtonElement>;
  compact?: boolean;
};

type ResultsProps = {
  isSearching: boolean;
  results: SearchHit[];
  query: string;
  onSelectResult: (hit: SearchHit) => void;
};

type LocationListProps = {
  locations: Array<{ id: number; name: string }>;
  filters: SearchFilters;
  toggler: (locationId: number) => void;
};

type SearchResultsHeaderProps = {
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
  compact: boolean;
  skipAnimation: boolean;
};

type SearchPanelProps = {
  isOpen: boolean;
  query: string;
  results: SearchHit[];
  isSearching: boolean;
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
    <div className="flex min-w-0 items-center gap-2 mb-1">
      <FileTextIcon size="sm" className="text-icon-secondary" />
      <span className="min-w-0 truncate text-sm font-medium text-text-primary">{hit.title}</span>
      <span className="text-text-placeholder text-xs" />
      <span className="text-xs text-text-secondary">Line {hit.line}</span>
    </div>
  );
}

function SearchResult({ hit, onSelectResult }: SearchResultProps) {
  const handleClick = useCallback(() => onSelectResult(hit), [onSelectResult, hit]);
  return (
    <Button
      onClick={handleClick}
      className="w-full px-4 py-3 bg-layer-01 border border-border-subtle rounded-md text-left cursor-pointer transition-all duration-150 hover:bg-layer-hover-01 hover:border-border-strong">
      <HighlightLabel hit={hit} />
      <HighlightedSnippet text={hit.snippet} matches={hit.matches} />
    </Button>
  );
}

function LocationList({ locations, filters, toggler }: LocationListProps) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">Locations</label>
      <div className="flex flex-wrap gap-2">
        {locations.map((location) => (
          <FilterLocationButton
            key={location.id}
            location={location}
            filters={filters}
            handleToggleLocation={toggler} />
        ))}
      </div>
    </div>
  );
}

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

function SearchInput({ query, handleQueryChange, clearQuery, compact = false }: SearchInputProps) {
  return (
    <div className="min-w-0 flex-1 basis-[16rem] relative">
      <SearchIcon
        size="xl"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-icon-secondary pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={handleQueryChange}
        placeholder="Search across all documents..."
        autoFocus
        className={`w-full pl-10 pr-3 text-base bg-field-01 border border-border-subtle rounded-md text-text-primary outline-none transition-all duration-150 focus:border-border-interactive focus:shadow-[0_0_0_3px_rgba(69,137,255,0.2)] ${
          compact ? "py-2" : "py-2.5"
        }`} />
      {query && (
        <Button
          onClick={clearQuery}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded">
          <XIcon size="sm" />
        </Button>
      )}
    </div>
  );
}

function getAnimationProps(skipAnimation: boolean) {
  const filters = { duration: 0.2, ease: "easeOut" } as const;
  const noMotion = { duration: 0 } as const;
  return {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: skipAnimation ? noMotion : filters,
  };
}

function VisibleFilters(
  { showFilters, locations, filters, handleToggleLocation, activeFilterCount, handleClearFilters, skipAnimation }:
    VisibleFiltersProps,
) {
  return (
    <AnimatePresence initial={false}>
      {showFilters && (
        <motion.div
          {...getAnimationProps(skipAnimation)}
          className="p-4 bg-layer-01 rounded-md border border-border-subtle flex flex-col gap-4">
          <LocationList locations={locations} filters={filters} toggler={handleToggleLocation} />
          {activeFilterCount > 0 && <ClearAllFiltersButton handleClearFilters={handleClearFilters} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
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
    compact,
    skipAnimation,
  }: SearchResultsHeaderProps,
) {
  return (
    <div className={`border-b border-border-subtle flex flex-col gap-3 ${compact ? "px-3 py-3" : "px-6 py-4"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput query={query} handleQueryChange={handleQueryChange} clearQuery={clearQuery} compact={compact} />
        <ToggleButton
          toggleFilters={toggleFilters}
          showFilters={showFilters}
          activeFilterCount={activeFilterCount}
          compact={compact} />
        <CloseButton onClose={onClose} compact={compact} />
      </div>

      <VisibleFilters
        showFilters={showFilters}
        locations={locations}
        filters={filters}
        handleToggleLocation={handleToggleLocation}
        activeFilterCount={activeFilterCount}
        handleClearFilters={handleClearFilters}
        skipAnimation={skipAnimation} />

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
    isOpen,
    query,
    results,
    isSearching,
    topOffset,
    locations,
    filters,
    onQueryChange,
    onFiltersChange,
    onSelectResult,
    onClose,
  }: SearchPanelProps,
) {
  const { viewportWidth, isCompact } = useViewportTier();
  const [showFilters, setShowFilters] = useState(false);
  const skipAnimation = useSkipAnimation();

  useEffect(() => {
    if (!isOpen) {
      setShowFilters(false);
    }
  }, [isOpen]);

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
    setShowFilters((previous) => !previous);
  }, []);

  const activeFilterCount = useMemo(
    () => (filters.locations?.length ?? 0) + (filters.fileTypes?.length ?? 0) + (filters.dateRange ? 1 : 0),
    [filters],
  );

  const panelTopOffset = useMemo(() => Math.max(0, topOffset), [topOffset]);
  const containerStyle = useMemo(() => ({ top: panelTopOffset, left: 0, right: 0, bottom: 0 }), [panelTopOffset]);
  const panelClassName = useMemo(
    () =>
      cn(
        "flex h-full flex-col overflow-hidden bg-bg-primary border border-border-subtle",
        isCompact ? "w-full rounded-none" : "mx-auto w-full max-w-5xl rounded-lg shadow-2xl",
      ),
    [isCompact],
  );
  const panelBodyClassName = useMemo(
    () => (isCompact ? "flex-1 overflow-y-auto px-3 py-3" : "flex-1 overflow-y-auto px-6 py-4"),
    [isCompact],
  );
  const backdropClassName = useMemo(() => (isCompact ? "bg-black/35" : "bg-black/20"), [isCompact]);
  const containerClassName = useMemo(
    () =>
      cn(
        "z-[var(--z-modal)] flex",
        isCompact ? "items-stretch justify-stretch" : "items-end justify-center px-3 pb-3",
        "pointer-events-none",
      ),
    [isCompact],
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Search documents"
      showBackdrop
      closeOnBackdrop
      motionPreset="slideUp"
      backdropClassName={backdropClassName}
      containerClassName={containerClassName}
      containerStyle={containerStyle}
      panelClassName={panelClassName}>
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
        toggleFilters={toggleFilters}
        compact={isCompact || viewportWidth < 900}
        skipAnimation={skipAnimation} />

      <div className={panelBodyClassName}>
        <Results isSearching={isSearching} results={results} query={query} onSelectResult={onSelectResult} />
      </div>
    </Dialog>
  );
}
