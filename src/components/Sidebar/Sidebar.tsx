import type { ChangeEventHandler, MouseEventHandler } from "react";
import { useCallback, useMemo, useState } from "react";
import type { DocMeta, LocationDescriptor } from "../../types";
import { LibraryIcon } from "../icons";
import { AddButton } from "./AddButton";
import { EmptyLocations } from "./EmptyLocations";
import { SearchInput } from "./SearchInput";
import { SidebarLocationItem } from "./SidebarLocationItem";
import { Title } from "./Title";

export type SidebarProps = {
  locations: LocationDescriptor[];
  selectedLocationId?: number;
  selectedDocPath?: string;
  documents: DocMeta[];
  isCollapsed?: boolean;
  isLoading?: boolean;
  onAddLocation: () => void;
  onRemoveLocation: (locationId: number) => void;
  onSelectLocation: (locationId: number) => void;
  onSelectDocument: (locationId: number, path: string) => void;
  filterText?: string;
  onFilterChange?: (text: string) => void;
};

export function Sidebar(
  {
    locations,
    selectedLocationId,
    selectedDocPath,
    documents,
    isCollapsed = false,
    isLoading = false,
    onAddLocation,
    onRemoveLocation,
    onSelectLocation,
    onSelectDocument,
    filterText = "",
    onFilterChange,
  }: SidebarProps,
) {
  const [expandedLocations, setExpandedLocations] = useState<Set<number>>(() => new Set(locations.map((l) => l.id)));
  const [showLocationMenu, setShowLocationMenu] = useState<number | null>(null);

  const toggleLocation = useCallback((locationId: number) => {
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  }, []);

  const filteredDocuments = useMemo(
    () =>
      filterText
        ? documents.filter((doc) =>
          doc.title.toLowerCase().includes(filterText.toLowerCase())
          || doc.rel_path.toLowerCase().includes(filterText.toLowerCase())
        )
        : documents,
    [documents, filterText],
  );

  const handleMouseEnter: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    (e.currentTarget as HTMLButtonElement).classList.add("bg-layer-hover-01", "text-icon-primary");
  }, []);

  const handleMouseLeave: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    (e.currentTarget as HTMLButtonElement).classList.remove("bg-layer-hover-01", "text-icon-primary");
  }, []);

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    onFilterChange?.(e.currentTarget.value);
  }, []);

  if (isCollapsed) {
    return (
      <aside className="w-12 bg-layer-01 border-r border-border-subtle flex flex-col items-center pt-4 shrink-0">
        <button
          className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded"
          title="Library">
          <LibraryIcon size="lg" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-sidebar bg-layer-01 border-r border-border-subtle flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <Title isLoading={isLoading} />
        <AddButton
          onAddLocation={onAddLocation}
          handleMouseEnter={handleMouseEnter}
          handleMouseLeave={handleMouseLeave} />
      </div>
      <SearchInput filterText={filterText} handleInputChange={handleInputChange} />
      <div className="flex-1 overflow-y-auto pt-2 pb-2">
        {locations.length === 0
          ? <EmptyLocations onAddLocation={onAddLocation} />
          : (locations.map((location) => (
            <SidebarLocationItem
              key={location.id}
              location={location}
              isSelected={selectedLocationId === location.id}
              selectedDocPath={selectedDocPath}
              isExpanded={expandedLocations.has(location.id)}
              onSelect={onSelectLocation}
              onToggle={toggleLocation}
              onRemove={onRemoveLocation}
              onSelectDocument={onSelectDocument}
              setShowLocationMenu={setShowLocationMenu}
              isMenuOpen={showLocationMenu === location.id}
              documents={filteredDocuments}
              filterText={filterText} />
          )))}
      </div>

      <div className="px-4 py-3 border-t border-border-subtle text-xs text-text-placeholder flex items-center justify-between">
        <span>{locations.length} location{locations.length === 1 ? "" : "s"}</span>
        <span>{selectedLocationId ? `${documents.length} document${documents.length === 1 ? "" : "s"}` : ""}</span>
      </div>
    </aside>
  );
}
