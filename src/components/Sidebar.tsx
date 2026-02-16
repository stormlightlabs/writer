import type { ChangeEventHandler, CSSProperties, MouseEventHandler } from "react";
import { useCallback, useMemo, useState } from "react";
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

type TreeItemProps = {
  icon: { Component: (props: { size: number }) => React.ReactNode; size: number };
  label: string;
  isSelected?: boolean;
  isExpanded?: boolean;
  hasChildren?: boolean;
  level?: number;
  onClick?: () => void;
  onToggle?: () => void;
  Actions?: React.ComponentType;
};

function TreeItem(
  { icon, label, isSelected = false, isExpanded = false, hasChildren = false, level = 0, onClick, onToggle, Actions }:
    TreeItemProps,
) {
  const paddingLeft = level * 16 + 12;

  const handleMouseEnter: MouseEventHandler<HTMLDivElement> = useCallback((e) => {
    if (!isSelected) {
      (e.currentTarget as HTMLDivElement).classList.add("bg-layer-hover-01");
    }
  }, []);

  const handleMouseLeave: MouseEventHandler<HTMLDivElement> = useCallback((e) => {
    if (!isSelected) {
      (e.currentTarget as HTMLDivElement).classList.remove("bg-layer-hover-01");
    }
  }, []);

  const handleButtonClick: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    e.stopPropagation();
    onToggle?.();
  }, []);

  const containerStyle: CSSProperties = useMemo(
    () => ({ paddingLeft: `${paddingLeft}px`, paddingRight: "8px", paddingTop: "6px", paddingBottom: "6px" }),
    [paddingLeft],
  );

  const buttonStyle: CSSProperties = useMemo(() => ({ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }), [
    isExpanded,
  ]);

  const labelStyle: CSSProperties = useMemo(() => ({ fontWeight: isSelected ? 500 : 400 }), [isSelected]);

  return (
    <div
      className={`sidebar-item flex items-center gap-2 cursor-pointer rounded mx-2 mb-0.5 text-[0.8125rem] transition-colors duration-150 ${
        isSelected ? "bg-layer-accent-01 text-text-primary" : "bg-transparent text-text-secondary"
      }`}
      style={containerStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      {hasChildren && (
        <button
          onClick={handleButtonClick}
          className="bg-transparent border-none p-0.5 cursor-pointer text-icon-secondary flex items-center justify-center rounded transition-transform duration-150"
          style={buttonStyle}>
          <ChevronRightIcon size={12} />
        </button>
      )}
      {!hasChildren && <span className="w-5" />}
      <span className={`flex items-center shrink-0 ${isSelected ? "text-icon-primary" : "text-icon-secondary"}`}>
        <icon.Component size={icon.size} />
      </span>
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap" style={labelStyle} title={label}>
        {label}
      </span>
      {Actions && <Actions />}
    </div>
  );
}

function DocumentItem(
  { doc, isSelected, selectedDocPath, onSelectDocument, id }: {
    doc: DocMeta;
    isSelected: boolean;
    selectedDocPath?: string;
    onSelectDocument: (id: number, path: string) => void;
    id: number;
  },
) {
  const fileTextIcon = useMemo(() => ({ Component: FileTextIcon, size: 14 }), []);
  const handleClick = useCallback(() => onSelectDocument(id, doc.rel_path), [id, onSelectDocument]);
  return (
    <TreeItem
      key={doc.rel_path}
      icon={fileTextIcon}
      label={doc.title || doc.rel_path.split("/").pop() || "Untitled"}
      isSelected={isSelected && selectedDocPath === doc.rel_path}
      level={1}
      onClick={handleClick} />
  );
}

type SidebarLocationItemProps = {
  location: LocationDescriptor;
  isSelected: boolean;
  selectedDocPath?: string;
  isExpanded: boolean;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onSelectDocument: (id: number, path: string) => void;
  setShowLocationMenu: (id: number | null) => void;
  documents: DocMeta[];
  filterText: string;
  isMenuOpen: boolean;
};

function SidebarLocationItem(
  {
    location,
    isSelected,
    selectedDocPath,
    isExpanded,
    onSelect,
    onToggle,
    onRemove,
    onSelectDocument,
    setShowLocationMenu,
    documents,
    filterText,
    isMenuOpen,
  }: SidebarLocationItemProps,
) {
  const handleRemoveClick = useCallback(() => {
    onRemove(location.id);
    setShowLocationMenu(null);
  }, [location.id, setShowLocationMenu]);

  const handleMenuClick = useCallback(() => {
    setShowLocationMenu(location.id);
  }, [location.id, setShowLocationMenu]);

  const handleMouseEnter: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    (e.currentTarget as HTMLButtonElement).classList.add("bg-support-error", "text-white");
    (e.currentTarget as HTMLButtonElement).classList.remove("text-support-error");
  }, []);

  const handleMouseLeave: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    (e.currentTarget as HTMLButtonElement).classList.remove("bg-support-error", "text-white");
    (e.currentTarget as HTMLButtonElement).classList.add("text-support-error");
  }, []);

  const RemoveButton = useCallback(
    () =>
      isMenuOpen
        ? (
          <div className="absolute right-0 top-full mt-1 bg-layer-02 border border-border-subtle rounded shadow-lg z-1000 min-w-[140px]">
            <button
              onClick={handleRemoveClick}
              className="w-full px-3 py-2 flex items-center gap-2 bg-transparent border-none text-support-error text-[0.8125rem] cursor-pointer text-left rounded"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}>
              <TrashIcon size={14} />
              Remove
            </button>
          </div>
        )
        : null,
    [isMenuOpen, handleRemoveClick, handleMouseEnter, handleMouseLeave],
  );

  const LocationActions = useCallback(() => (
    <div className="relative">
      <button
        onClick={handleMenuClick}
        className="location-actions-btn w-5 h-5 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded opacity-0 transition-opacity duration-150">
        <MoreVerticalIcon size={14} />
      </button>
      <RemoveButton />
    </div>
  ), [setShowLocationMenu, onRemove]);

  const onItemClick = useCallback(() => {
    onSelect(location.id);
  }, [location.id, onSelect]);

  const onToggleClick = useCallback(() => {
    onToggle(location.id);
  }, [location.id, onToggle]);

  const folderIcon = useMemo(() => ({ Component: FolderIcon, size: 16 }), []);

  return (
    <div>
      <div className="relative">
        <TreeItem
          icon={folderIcon}
          label={location.name}
          isSelected={isSelected && !selectedDocPath}
          isExpanded={isExpanded}
          hasChildren
          level={0}
          onClick={onItemClick}
          onToggle={onToggleClick}
          Actions={LocationActions} />
        <style>
          {`
            .sidebar-item:hover .location-actions-btn {
              opacity: 1 !important;
            }
          `}
        </style>
      </div>

      {isExpanded && isSelected && (
        <div>
          {documents.length === 0
            ? (
              <div className="px-6 py-3 text-text-placeholder text-xs italic">
                {filterText ? "No matching documents" : "No documents found"}
              </div>
            )
            : (documents.map((doc) => (
              <DocumentItem
                key={doc.rel_path}
                doc={doc}
                isSelected={isSelected && selectedDocPath === doc.rel_path}
                onSelectDocument={onSelectDocument}
                id={location.id} />
            )))}
        </div>
      )}
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

  const Title = useCallback(
    () => (
      <h2 className="m-0 text-xs font-semibold uppercase tracking-wider text-text-secondary">
        Library
        {isLoading && <span className="ml-2 opacity-60">(loading...)</span>}
      </h2>
    ),
    [isLoading],
  );

  const AddButton = useCallback(
    () => (
      <button
        onClick={onAddLocation}
        className="w-6 h-6 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded transition-all duration-150"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="Add Location">
        <PlusIcon size={16} />
      </button>
    ),
    [onAddLocation, handleMouseEnter, handleMouseLeave],
  );

  const SearchInput = useCallback(() => (
    <div className="px-4 py-3 border-b border-border-subtle">
      <div className="relative flex items-center">
        <SearchIcon
          size={14}
          className="filter-search-icon absolute left-2.5 text-icon-secondary pointer-events-none" />
        <input
          type="text"
          placeholder="Filter documents..."
          value={filterText}
          onChange={handleInputChange}
          className="w-full pl-8 pr-2.5 py-1.5 text-[0.8125rem] bg-field-01 border border-border-subtle rounded text-text-primary outline-none transition-all duration-150 focus:border-border-interactive focus:shadow-[0_0_0_2px_rgba(69,137,255,0.2)]" />
      </div>
    </div>
  ), [filterText, handleInputChange]);

  const EmptyLocations = useCallback(
    () => (
      <div className="px-4 py-6 text-center text-text-placeholder text-[0.8125rem]">
        <LibraryIcon size={32} className="mb-3 opacity-50 mx-auto" />
        <p className="m-0 mb-2">No locations added</p>
        <button
          onClick={onAddLocation}
          className="text-xs text-link-primary bg-transparent border-none cursor-pointer underline underline-offset-2">
          Add your first location
        </button>
      </div>
    ),
    [onAddLocation],
  );

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
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <Title />
        <AddButton />
      </div>

      <SearchInput />

      <div className="flex-1 overflow-y-auto pt-2 pb-2">
        {locations.length === 0
          ? <EmptyLocations />
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
