import { Button } from "$components/Button";
import { useSidebarActions } from "$hooks/controllers/useSidebarActions";
import {
  CollapseIcon,
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
import { formatShortcut } from "$utils/shortcuts";
import { useCallback, useMemo, useState } from "react";
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
  onToggleCollapse: () => void;
  addDocumentDisabled: boolean;
  refreshDisabled: boolean;
};

type CountPillProps = { count: number; kind: "location" | "document" | "directory" };

const HideSidebarButton = ({ onToggleCollapse }: { onToggleCollapse: () => void }) => (
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={onToggleCollapse}
    className="flex items-center gap-1.5"
    title={`Hide sidebar (${formatShortcut("Cmd+B")})`}>
    <CollapseIcon size="sm" />
    Hide
  </Button>
);

const SidebarActions = (
  { onAddLocation, onAddDocument, onRefresh, onToggleCollapse, addDocumentDisabled, refreshDisabled }:
    SidebarActionsProps,
) => (
  <div className="flex items-center gap-2">
    <AddButton onClick={onAddLocation} icon={FolderAddIcon} title="New Location" />
    <AddButton onClick={onAddDocument} icon={FileAddIcon} title="New Document" disabled={addDocumentDisabled} />
    <AddButton onClick={onRefresh} icon={RefreshIcon} title="Refresh Sidebar" disabled={refreshDisabled} />
    <HideSidebarButton onToggleCollapse={onToggleCollapse} />
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
    toggleSidebarCollapsed,
    filenameVisibility,
  } = useSidebarState();

  const [expandedLocations, setExpandedLocations] = useState<Set<number>>(() => new Set(locations.map((l) => l.id)));
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
  const locationDirectories = useMemo(() => (selectedLocationId ? directories : []), [directories, selectedLocationId]);

  const toggleLocation = useCallback((locationId: number) => {
    setExpandedLocations((previous) => {
      const next = new Set(previous);
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
        ? locationDocuments.filter((doc) =>
          doc.title.toLowerCase().includes(filterText.toLowerCase())
          || doc.rel_path.toLowerCase().includes(filterText.toLowerCase())
        )
        : locationDocuments,
    [locationDocuments, filterText],
  );
  const filteredDirectories = useMemo(
    () =>
      filterText
        ? locationDirectories.filter((directoryPath) => directoryPath.toLowerCase().includes(filterText.toLowerCase()))
        : locationDirectories,
    [locationDirectories, filterText],
  );

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
      const locationDocs = isSelectedLocation ? filteredDocuments : EMPTY_DOCUMENTS;
      const locationDirs = isSelectedLocation ? filteredDirectories : EMPTY_DIRECTORIES;
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
        selectedDocPath,
        isExpanded: expandedLocations.has(location.id),
        documents: locationDocs,
        directories: locationDirs,
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
      };
    }), [
    activeDropTarget,
    expandedLocations,
    filterText,
    folderSortOrderByLocation,
    filteredDirectories,
    filteredDocuments,
    internalDnd.isDraggingInternal,
    internalDnd.activeDragDocumentLocationId,
    internalDnd.activeDragDocumentPath,
    internalDnd.suppressActiveDragSourceOpacity,
    locations,
    refreshingLocationId,
    selectedDocPath,
    selectedLocationId,
    sidebarRefreshReason,
  ]);

  return (
    <aside className="w-full bg-layer-01 border-r border-stroke-subtle flex h-full flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-stroke-subtle flex items-center justify-between">
        <Title isLoading={isLoading} />
        <SidebarActions
          onAddLocation={handleAddLocation}
          onAddDocument={handleAddDocument}
          onRefresh={handleRefresh}
          onToggleCollapse={toggleSidebarCollapsed}
          addDocumentDisabled={!selectedLocationId}
          refreshDisabled={!selectedLocationId || refreshingLocationId === selectedLocationId} />
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

      <div className="flex min-h-10 items-center justify-between gap-2 border-t border-stroke-subtle px-4 py-2">
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
