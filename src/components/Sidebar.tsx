import { useCallback, useState } from "react";
import type { DocMeta, LocationDescriptor } from "../ports";
import {
  ChevronRightIcon,
  FileTextIcon,
  FolderIcon,
  LibraryIcon,
  MoreVerticalIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "./icons";

type SidebarProps = {
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

type TreeItemProps = {
  icon: React.ReactNode;
  label: string;
  isSelected?: boolean;
  isExpanded?: boolean;
  hasChildren?: boolean;
  level?: number;
  onClick?: () => void;
  onToggle?: () => void;
  actions?: React.ReactNode;
};

function TreeItem(
  { icon, label, isSelected = false, isExpanded = false, hasChildren = false, level = 0, onClick, onToggle, actions }:
    TreeItemProps,
) {
  const paddingLeft = level * 16 + 12;

  return (
    <div
      className={`sidebar-item flex items-center gap-2 cursor-pointer rounded mx-2 mb-0.5 text-[0.8125rem] transition-colors duration-150 ${
        isSelected ? "bg-layer-accent-01 text-text-primary" : "bg-transparent text-text-secondary"
      }`}
      style={{ paddingLeft: `${paddingLeft}px`, paddingRight: "8px", paddingTop: "6px", paddingBottom: "6px" }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).classList.add("bg-layer-hover-01");
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).classList.remove("bg-layer-hover-01");
        }
      }}>
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          className="bg-transparent border-none p-0.5 cursor-pointer text-icon-secondary flex items-center justify-center rounded transition-transform duration-150"
          style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
          <ChevronRightIcon size={12} />
        </button>
      )}
      {!hasChildren && <span className="w-5" />}
      <span className={`flex items-center shrink-0 ${isSelected ? "text-icon-primary" : "text-icon-secondary"}`}>
        {icon}
      </span>
      <span
        className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ fontWeight: isSelected ? 500 : 400 }}
        title={label}>
        {label}
      </span>
      {actions}
    </div>
  );
}

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

  const filteredDocuments = filterText
    ? documents.filter((doc) =>
      doc.title.toLowerCase().includes(filterText.toLowerCase())
      || doc.rel_path.toLowerCase().includes(filterText.toLowerCase())
    )
    : documents;

  if (isCollapsed) {
    return (
      <aside className="w-12 bg-layer-01 border-r border-border-subtle flex flex-col items-center pt-4 shrink-0">
        <button
          className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded"
          title="Library">
          <LibraryIcon size={20} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-sidebar bg-layer-01 border-r border-border-subtle flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <h2 className="m-0 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Library
          {isLoading && <span className="ml-2 opacity-60">(loading...)</span>}
        </h2>
        <button
          onClick={onAddLocation}
          className="w-6 h-6 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded transition-all duration-150"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).classList.add("bg-layer-hover-01", "text-icon-primary");
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).classList.remove("bg-layer-hover-01", "text-icon-primary");
          }}
          title="Add Location">
          <PlusIcon size={16} />
        </button>
      </div>

      {/* Filter */}
      <div className="px-4 py-3 border-b border-border-subtle">
        <div className="relative flex items-center">
          <SearchIcon
            size={14}
            className="filter-search-icon absolute left-2.5 text-icon-secondary pointer-events-none" />
          <input
            type="text"
            placeholder="Filter documents..."
            value={filterText}
            onChange={(e) => onFilterChange?.(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 text-[0.8125rem] bg-field-01 border border-border-subtle rounded text-text-primary outline-none transition-all duration-150 focus:border-border-interactive focus:shadow-[0_0_0_2px_rgba(69,137,255,0.2)]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-2 pb-2">
        {locations.length === 0
          ? (
            <div className="px-4 py-6 text-center text-text-placeholder text-[0.8125rem]">
              <LibraryIcon size={32} className="mb-3 opacity-50 mx-auto" />
              <p className="m-0 mb-2">No locations added</p>
              <button
                onClick={onAddLocation}
                className="text-xs text-link-primary bg-transparent border-none cursor-pointer underline underline-offset-2">
                Add your first location
              </button>
            </div>
          )
          : (locations.map((location) => (
            <div key={location.id}>
              <div className="relative">
                <TreeItem
                  icon={<FolderIcon size={16} />}
                  label={location.name}
                  isSelected={selectedLocationId === location.id && !selectedDocPath}
                  isExpanded={expandedLocations.has(location.id)}
                  hasChildren={true}
                  level={0}
                  onClick={() => onSelectLocation(location.id)}
                  onToggle={() => toggleLocation(location.id)}
                  actions={
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowLocationMenu(showLocationMenu === location.id ? null : location.id);
                        }}
                        className="location-actions-btn w-5 h-5 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded opacity-0 transition-opacity duration-150">
                        <MoreVerticalIcon size={14} />
                      </button>
                      {showLocationMenu === location.id && (
                        <div className="absolute right-0 top-full mt-1 bg-layer-02 border border-border-subtle rounded shadow-lg z-1000 min-w-[140px]">
                          <button
                            onClick={() => {
                              onRemoveLocation(location.id);
                              setShowLocationMenu(null);
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2 bg-transparent border-none text-support-error text-[0.8125rem] cursor-pointer text-left rounded"
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).classList.add("bg-support-error", "text-white");
                              (e.currentTarget as HTMLButtonElement).classList.remove("text-support-error");
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).classList.remove("bg-support-error", "text-white");
                              (e.currentTarget as HTMLButtonElement).classList.add("text-support-error");
                            }}>
                            <TrashIcon size={14} />
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  } />
                <style>
                  {`
                  .sidebar-item:hover .location-actions-btn {
                    opacity: 1 !important;
                  }
                `}
                </style>
              </div>

              {expandedLocations.has(location.id) && selectedLocationId === location.id && (
                <div>
                  {filteredDocuments.length === 0
                    ? (
                      <div className="px-6 py-3 text-text-placeholder text-xs italic">
                        {filterText ? "No matching documents" : "No documents found"}
                      </div>
                    )
                    : (filteredDocuments.map((doc) => (
                      <TreeItem
                        key={doc.rel_path}
                        icon={<FileTextIcon size={14} />}
                        label={doc.title || doc.rel_path.split("/").pop() || "Untitled"}
                        isSelected={selectedLocationId === location.id && selectedDocPath === doc.rel_path}
                        level={1}
                        onClick={() => onSelectDocument(location.id, doc.rel_path)} />
                    )))}
                </div>
              )}
            </div>
          )))}
      </div>

      <div className="px-4 py-3 border-t border-border-subtle text-xs text-text-placeholder flex items-center justify-between">
        <span>{locations.length} location{locations.length !== 1 ? "s" : ""}</span>
        <span>{selectedLocationId ? `${documents.length} document${documents.length !== 1 ? "s" : ""}` : ""}</span>
      </div>
    </aside>
  );
}
