import { Button } from "$components/Button";
import { useSidebarActions } from "$hooks/controllers/useSidebarActions";
import {
  FileAddIcon,
  FileTextIcon,
  FolderAddIcon,
  FolderIcon,
  GithubIcon,
  RefreshIcon,
  StandardSiteIcon,
  Tangled,
} from "$icons";
import { useSidebarState } from "$state/selectors";
import type { DocMeta } from "$types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddButton } from "./AddButton";
import {
  DocumentOperationDialog,
  type DocumentOperationRequest,
  type DocumentOperationType,
} from "./DocumentOperationDialog";
import { DragGhost } from "./DragGhost";
import { EmptyLocations } from "./EmptyLocations";
import { SearchInput } from "./SearchInput";
import { SidebarLocationItem, SidebarLocationProvider } from "./SidebarLocationItem";
import { Title } from "./Title";
import { useSidebarInternalDnD } from "./useSidebarInternalDnD";

const EMPTY_DOCUMENTS: DocMeta[] = [];
const EMPTY_DIRECTORIES: string[] = [];

export type SidebarProps = {
  onNewDocument?: (locationId?: number) => void;
  onOpenImportSheet?: () => void;
  onOpenStandardSiteImportSheet?: () => void;
};

type SidebarActionsProps = {
  onAddLocation: () => void;
  onAddDocument: () => void;
  onRefresh: () => void;
  addDocumentDisabled: boolean;
  refreshDisabled: boolean;
};

type CountPillProps = { count: number; kind: "location" | "document" | "directory" };

const SidebarActions = (
  { onAddLocation, onAddDocument, onRefresh, addDocumentDisabled, refreshDisabled }: SidebarActionsProps,
) => (
  <div className="flex items-center gap-2">
    <AddButton onClick={onAddLocation} icon={FolderAddIcon} title="New Location" />
    <AddButton onClick={onAddDocument} icon={FileAddIcon} title="New Document" disabled={addDocumentDisabled} />
    <AddButton onClick={onRefresh} icon={RefreshIcon} title="Refresh Sidebar" disabled={refreshDisabled} />
  </div>
);

const CountPillIcon = ({ kind }: { kind: "location" | "document" | "directory" }) => {
  switch (kind) {
    case "location":
      return <FolderIcon size="sm" />;
    case "document":
      return <FileTextIcon size="sm" />;
    case "directory":
      return <FolderIcon size="sm" />;
  }
};

const CountPill = ({ count, kind }: CountPillProps) => (
  <span className="inline-flex h-6 items-center rounded-md border border-stroke-subtle bg-layer-02 px-2.5 text-[0.6875rem] leading-none tabular-nums text-text-primary gap-2">
    <span>{count.toLocaleString()}</span>
    <CountPillIcon kind={kind} />
  </span>
);

type ImportButtonProps = { onClick: () => void; label: string; icon: "tangled" | "github" | "standardSite" };

const ImportButton = ({ onClick, label, icon }: ImportButtonProps) => (
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={onClick}
    title={label}
    aria-label={label}
    className="flex items-center gap-1.5 hover:bg-surface-active">
    {icon === "github" && <GithubIcon size="sm" />}
    {icon === "standardSite" && <StandardSiteIcon />}
    {icon === "tangled" && <Tangled className="h-4 w-4 shrink-0" />}
    <span className="sr-only">{label}</span>
  </Button>
);

export function Sidebar({ onNewDocument, onOpenImportSheet, onOpenStandardSiteImportSheet }: SidebarProps) {
  const {
    handleAddLocation,
    handleRemoveLocation,
    handleSelectDocument,
    handleCreateNewDocument,
    handleRefreshSidebar,
    handleRenameDocument,
    handleMoveDocument,
    handleMoveDirectory,
    handleDeleteDocument,
  } = useSidebarActions();
  const {
    locations,
    selectedLocationId,
    selectedDocPath,
    documents,
    directories,
    documentsByLocation,
    directoriesByLocation,
    expandedLocationIds,
    expandedDirectoriesByLocation,
    isLoading,
    refreshingLocationId,
    sidebarRefreshReason,
    filterText,
    setDocuments,
    activeDropTarget,
    folderSortOrderByLocation,
    setActiveDropTarget,
    reorderFolderSortOrder,
    selectLocation,
    toggleExpandedLocation,
    toggleExpandedDirectory,
    expandDirectories,
    collapseDirectories,
    filenameVisibility,
  } = useSidebarState();

  const [documentOperation, setDocumentOperation] = useState<DocumentOperationRequest | null>(null);

  const internalDnd = useSidebarInternalDnD({
    locations,
    documents,
    setDocuments,
    setActiveDropTarget,
    reorderFolderSortOrder,
    handleMoveDocument,
    handleMoveDirectory,
    handleRefreshSidebar,
  });

  const locationDocuments = useMemo(
    () => (selectedLocationId ? documents.filter((doc) => doc.location_id === selectedLocationId) : []),
    [documents, selectedLocationId],
  );
  const expandedLocationSet = useMemo(() => new Set(expandedLocationIds), [expandedLocationIds]);

  useEffect(() => {
    for (const location of locations) {
      if (!expandedLocationSet.has(location.id) || refreshingLocationId === location.id) {
        continue;
      }

      const hasDocuments = Object.prototype.hasOwnProperty.call(documentsByLocation, location.id);
      const hasDirectories = Object.prototype.hasOwnProperty.call(directoriesByLocation, location.id);
      if (!hasDocuments || !hasDirectories) {
        handleRefreshSidebar(location.id);
      }
    }
  }, [
    directoriesByLocation,
    documentsByLocation,
    expandedLocationSet,
    handleRefreshSidebar,
    locations,
    refreshingLocationId,
  ]);

  const toggleLocation = useCallback((locationId: number) => {
    toggleExpandedLocation(locationId);
  }, [toggleExpandedLocation]);

  const handleAddDocument = useCallback(() => {
    if (!selectedLocationId) {
      return;
    }

    const createNewDocument = onNewDocument ?? handleCreateNewDocument;
    createNewDocument(selectedLocationId);
  }, [handleCreateNewDocument, onNewDocument, selectedLocationId]);

  const handleRefresh = useCallback(() => {
    handleRefreshSidebar(selectedLocationId);
  }, [handleRefreshSidebar, selectedLocationId]);

  const documentActions = useMemo(
    () => ({
      onSelectDocument: handleSelectDocument,
      onRenameDocument: handleRenameDocument,
      onMoveDocument: handleMoveDocument,
      onDeleteDocument: handleDeleteDocument,
    }),
    [handleDeleteDocument, handleMoveDocument, handleRenameDocument, handleSelectDocument],
  );

  const openDocumentOperation = useCallback(
    (type: DocumentOperationType, doc: DocMeta, anchor?: { x: number; y: number }) => {
      setDocumentOperation({ type, doc, anchor });
    },
    [],
  );

  const closeDocumentOperation = useCallback(() => {
    setDocumentOperation(null);
  }, []);

  const locationSharedContext = useMemo(
    () => ({ filenameVisibility, documentActions, onToggleLocation: toggleLocation, openDocumentOperation }),
    [documentActions, filenameVisibility, openDocumentOperation, toggleLocation],
  );

  const locationItemViewModels = useMemo(() =>
    locations.map((location) => {
      const isSelectedLocation = selectedLocationId === location.id;
      const isRefreshingLocation = refreshingLocationId === location.id;
      const locationDocs = documentsByLocation[location.id] ?? (isSelectedLocation ? documents : EMPTY_DOCUMENTS);
      const locationDirs = directoriesByLocation[location.id] ?? (isSelectedLocation ? directories : EMPTY_DIRECTORIES);
      const filteredLocationDocs = filterText
        ? locationDocs.filter((doc) =>
          doc.title.toLowerCase().includes(filterText.toLowerCase())
          || doc.rel_path.toLowerCase().includes(filterText.toLowerCase())
        )
        : locationDocs;
      const filteredLocationDirs = filterText
        ? locationDirs.filter((directoryPath) => directoryPath.toLowerCase().includes(filterText.toLowerCase()))
        : locationDirs;
      const isActiveDropLocation = activeDropTarget?.locationId === location.id;
      const activeDropDocumentPath = isActiveDropLocation && activeDropTarget?.targetType === "document"
        ? activeDropTarget.relPath
        : undefined;
      const activeDropDocumentEdge = isActiveDropLocation && activeDropTarget?.targetType === "document"
        ? (activeDropTarget.edge ?? null)
        : null;
      const activeDropFolderPath = isActiveDropLocation && activeDropTarget?.targetType === "folder"
        ? activeDropTarget.folderPath
        : undefined;
      const activeDropFolderEdge = isActiveDropLocation && activeDropTarget?.targetType === "folder"
        ? (activeDropTarget.edge ?? null)
        : null;
      const activeDragDocumentPath = internalDnd.activeDragDocumentLocationId === location.id
        ? internalDnd.activeDragDocumentPath
        : null;

      return {
        location,
        isSelected: isSelectedLocation,
        selectedLocationId,
        selectedDocPath,
        isExpanded: expandedLocationSet.has(location.id),
        documents: filteredLocationDocs,
        directories: filteredLocationDirs,
        expandedDirectories: expandedDirectoriesByLocation[location.id] ?? [],
        filterText,
        isRefreshing: isRefreshingLocation,
        refreshReason: sidebarRefreshReason,
        isExternalDropTarget: isActiveDropLocation && activeDropTarget?.source === "external",
        isInternalDropTarget: isActiveDropLocation && activeDropTarget?.source === "internal"
          && activeDropTarget.targetType === "location",
        isDragInProgress: internalDnd.isDraggingInternal
          || (isActiveDropLocation && activeDropTarget?.source === "external"),
        activeDropFolderPath,
        activeDropFolderEdge,
        activeDropFolderIntent: activeDropTarget?.targetType === "folder" ? activeDropTarget.intent : undefined,
        activeDropDocumentPath,
        activeDropDocumentEdge,
        activeDropDocumentIsReorder: isActiveDropLocation
          && activeDropTarget?.targetType === "document"
          && activeDropTarget.intent === "between",
        activeDragDocumentPath,
        suppressActiveDragSourceOpacity: internalDnd.suppressActiveDragSourceOpacity,
        folderSortOrder: folderSortOrderByLocation[location.id] ?? [],
        onToggleDirectory: (path: string) => toggleExpandedDirectory(location.id, path),
        onExpandDirectories: (paths: string[]) => expandDirectories(location.id, paths),
        onCollapseDirectories: (paths: string[]) => collapseDirectories(location.id, paths),
      };
    }), [
    activeDropTarget,
    collapseDirectories,
    filterText,
    folderSortOrderByLocation,
    directories,
    directoriesByLocation,
    documents,
    documentsByLocation,
    expandedDirectoriesByLocation,
    expandedLocationSet,
    expandDirectories,
    internalDnd.isDraggingInternal,
    internalDnd.activeDragDocumentLocationId,
    internalDnd.activeDragDocumentPath,
    internalDnd.suppressActiveDragSourceOpacity,
    locations,
    refreshingLocationId,
    selectedDocPath,
    selectedLocationId,
    sidebarRefreshReason,
    toggleExpandedDirectory,
  ]);

  return (
    <aside className="w-full bg-layer-01 border-r border-stroke-subtle/10 flex h-full flex-col shrink-0 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-stroke-subtle/10">
        <div className="flex items-center justify-between mb-2">
          <Title isLoading={isLoading} />
          <SidebarActions
            onAddLocation={handleAddLocation}
            onAddDocument={handleAddDocument}
            onRefresh={handleRefresh}
            addDocumentDisabled={!selectedLocationId}
            refreshDisabled={!selectedLocationId || refreshingLocationId === selectedLocationId} />
        </div>
        <button
          type="button"
          onClick={handleAddDocument}
          disabled={!selectedLocationId}
          className="w-full text-xs border border-accent-blue/20 text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/15 rounded-sm py-1.5 cursor-pointer transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed">
          + New Document
        </button>
      </div>

      <SearchInput />

      <div
        ref={internalDnd.dropZoneRef}
        className="flex-1 overflow-y-auto pt-2 pb-2"
        onDragOver={internalDnd.handleDragOver}
        onDragLeave={internalDnd.handleDragLeave}>
        {locations.length === 0
          ? <EmptyLocations onAddLocation={handleAddLocation} />
          : (
            <SidebarLocationProvider value={locationSharedContext}>
              {locationItemViewModels.map((item) => (
                <SidebarLocationItem
                  key={item.location.id}
                  {...item}
                  onRemoveLocation={handleRemoveLocation}
                  onSelectLocation={selectLocation}
                  onRefreshLocation={handleRefreshSidebar} />
              ))}
            </SidebarLocationProvider>
          )}
      </div>

      <div className="flex min-h-10 items-center justify-between gap-2 border-t border-stroke-subtle/10 px-4 py-2">
        <div className="flex items-center gap-2">
          <CountPill count={locations.length} kind="location" />
          <CountPill count={selectedLocationId ? locationDocuments.length : 0} kind="document" />
        </div>
        <div className="flex items-center gap-2">
          {onOpenStandardSiteImportSheet && (
            <ImportButton
              onClick={onOpenStandardSiteImportSheet}
              label="Import Standard.Site posts"
              icon="standardSite" />
          )}
          {onOpenImportSheet && (
            <ImportButton onClick={onOpenImportSheet} label="Import Tangled strings" icon="tangled" />
          )}
        </div>
      </div>

      <DocumentOperationDialog
        operation={documentOperation}
        onClose={closeDocumentOperation}
        onRenameDocument={handleRenameDocument}
        onMoveDocument={handleMoveDocument}
        onDeleteDocument={handleDeleteDocument}
        onRefreshSidebar={handleRefreshSidebar} />
      <DragGhost label={internalDnd.dragGhostLabel} />
      {internalDnd.moveDialog}
    </aside>
  );
}
