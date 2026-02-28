import { Button } from "$components/Button";
import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import { useExternalDropHandler } from "$hooks/useExternalDropHandler";
import { CollapseIcon, FileAddIcon, FolderAddIcon, RefreshIcon } from "$icons";
import { useSidebarState } from "$state/selectors";
import type { DocMeta } from "$types";
import { f } from "$utils/serialize";
import { type Edge, extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { announce, cleanup as cleanupLiveRegion } from "@atlaskit/pragmatic-drag-and-drop-live-region";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import * as logger from "@tauri-apps/plugin-log";
import type { ChangeEventHandler, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddButton } from "./AddButton";
import { type DocumentDragData } from "./DocumentItem";
import { EmptyLocations } from "./EmptyLocations";
import { OperationDialog } from "./OperationDialog";
import { SearchInput } from "./SearchInput";
import { SidebarLocationItem } from "./SidebarLocationItem";
import { Title } from "./Title";

const EMPTY_DOCUMENTS: DocMeta[] = [];

type DestinationData = {
  locationId: number;
  relPath?: string;
  folderPath?: string;
  targetType?: "location" | "document" | "folder";
};

type MoveDropDialogState = {
  sourceLocationId: number;
  sourceRelPath: string;
  sourceTitle: string;
  targetLocationId: number;
};

function isDocumentDragData(value: unknown): value is DocumentDragData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybe = value as Partial<DocumentDragData>;
  return maybe.type === "document" && typeof maybe.locationId === "number" && typeof maybe.relPath === "string";
}

function getFilename(relPath: string): string {
  return relPath.split("/").pop() || relPath;
}

function reorderDocumentsInLocation(
  documents: DocMeta[],
  locationId: number,
  sourceRelPath: string,
  destinationRelPath: string,
  edge: Edge | null,
): DocMeta[] {
  if (edge !== "top" && edge !== "bottom") {
    return documents;
  }

  const locationDocuments = documents.filter((doc) => doc.location_id === locationId);
  const sourceIndex = locationDocuments.findIndex((doc) => doc.rel_path === sourceRelPath);
  if (sourceIndex === -1) {
    return documents;
  }

  const [sourceDoc] = locationDocuments.splice(sourceIndex, 1);
  const destinationIndex = locationDocuments.findIndex((doc) => doc.rel_path === destinationRelPath);
  if (destinationIndex === -1) {
    return documents;
  }

  const insertIndex = edge === "top" ? destinationIndex : destinationIndex + 1;
  locationDocuments.splice(insertIndex, 0, sourceDoc);

  let locationCursor = 0;
  return documents.map((doc) => {
    if (doc.location_id !== locationId) {
      return doc;
    }

    const next = locationDocuments[locationCursor];
    locationCursor += 1;
    return next;
  });
}

export type SidebarProps = { onNewDocument?: (locationId?: number) => void };

type SidebarActionsProps = {
  onAddLocation: () => void;
  onAddDocument: () => void;
  onRefresh: () => void;
  isAddDocumentDisabled: boolean;
  isRefreshDisabled: boolean;
  onToggleCollapse: () => void;
};

const HideSidebarButton = ({ onToggleCollapse }: { onToggleCollapse: () => void }) => (
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={onToggleCollapse}
    className="flex items-center gap-1.5"
    title="Hide sidebar (Ctrl+B)">
    <CollapseIcon size="sm" />
    Hide
  </Button>
);

const SidebarActions = (
  { onAddLocation, onAddDocument, onRefresh, isAddDocumentDisabled, isRefreshDisabled, onToggleCollapse }:
    SidebarActionsProps,
) => (
  <div className="flex items-center gap-2">
    <AddButton onClick={onAddLocation} icon={FolderAddIcon} title="New Location" />
    <AddButton onClick={onAddDocument} icon={FileAddIcon} title="New Document" disabled={isAddDocumentDisabled} />
    <AddButton onClick={onRefresh} icon={RefreshIcon} title="Refresh Sidebar" disabled={isRefreshDisabled} />
    <HideSidebarButton onToggleCollapse={onToggleCollapse} />
  </div>
);

export function Sidebar({ onNewDocument }: SidebarProps) {
  const {
    handleAddLocation,
    handleRemoveLocation,
    handleSelectDocument,
    handleCreateNewDocument,
    handleRefreshSidebar,
    handleRenameDocument,
    handleMoveDocument,
    handleDeleteDocument,
  } = useWorkspaceController();
  const {
    locations,
    selectedLocationId,
    selectedDocPath,
    documents,
    isLoading,
    refreshingLocationId,
    sidebarRefreshReason,
    filterText,
    setFilterText,
    setDocuments,
    selectLocation,
    toggleSidebarCollapsed,
    filenameVisibility,
    externalDropTargetId,
    setExternalDropTarget,
  } = useSidebarState();
  const [expandedLocations, setExpandedLocations] = useState<Set<number>>(() => new Set(locations.map((l) => l.id)));
  const [showLocationMenu, setShowLocationMenu] = useState<number | null>(null);
  const [moveDropDialog, setMoveDropDialog] = useState<MoveDropDialogState | null>(null);
  const [moveDropPath, setMoveDropPath] = useState("");
  const [isMovingDrop, setIsMovingDrop] = useState(false);

  useExternalDropHandler(selectedLocationId, documents, setExternalDropTarget, handleRefreshSidebar);

  useEffect(() => {
    if (showLocationMenu === null) {
      return;
    }

    const handleOutsideMenuClick = (event: PointerEvent) => {
      if (!(event.target instanceof HTMLElement)) {
        setShowLocationMenu(null);
        return;
      }

      if (event.target.closest("[data-location-menu-root]")) {
        return;
      }

      setShowLocationMenu(null);
    };

    document.addEventListener("pointerdown", handleOutsideMenuClick);
    return () => document.removeEventListener("pointerdown", handleOutsideMenuClick);
  }, [showLocationMenu]);

  useEffect(() => {
    const getLocationName = (locationId: number): string =>
      locations.find((location) => location.id === locationId)?.name ?? "location";

    const stop = monitorForElements({
      canMonitor: ({ source }) => isDocumentDragData(source.data),
      onDragStart: ({ source }) => {
        if (!isDocumentDragData(source.data)) {
          return;
        }
        announce(`Picked up ${source.data.title}`);
      },
      onDropTargetChange: ({ source, location }) => {
        if (!isDocumentDragData(source.data)) {
          return;
        }

        const destination = location.current.dropTargets[0];
        if (!destination) {
          return;
        }

        const destinationData = destination.data as DestinationData;
        if (destinationData.folderPath) {
          announce(`Over ${destinationData.folderPath} in ${getLocationName(destinationData.locationId)}`);
          return;
        }

        if (destinationData.targetType === "document" && destinationData.relPath) {
          announce(`Over ${getFilename(destinationData.relPath)}`);
          return;
        }

        announce(`Over ${getLocationName(destinationData.locationId)}`);
      },
      onDrop: ({ source, location }) => {
        if (!isDocumentDragData(source.data)) {
          return;
        }

        const destination = location.current.dropTargets[0];
        if (!destination) {
          announce(`Dropped ${source.data.title}`);
          return;
        }

        const sourceData = source.data;
        const destinationData = destination.data as DestinationData;
        const destinationEdge = extractClosestEdge(destinationData);
        const sourceFilename = getFilename(sourceData.relPath);
        const modifierDrop = location.current.input.altKey;
        const resolvedTargetLocationId = destinationData.locationId;

        if (modifierDrop && resolvedTargetLocationId) {
          const initialPath = destinationData.folderPath
            ? `${destinationData.folderPath}/${sourceFilename}`
            : (resolvedTargetLocationId === sourceData.locationId ? sourceData.relPath : sourceFilename);

          setMoveDropDialog({
            sourceLocationId: sourceData.locationId,
            sourceRelPath: sourceData.relPath,
            sourceTitle: sourceData.title,
            targetLocationId: resolvedTargetLocationId,
          });
          setMoveDropPath(initialPath);
          announce(`Choose destination path for ${sourceData.title}`);
          return;
        }

        const refreshDocumentLists = () => {
          handleRefreshSidebar(sourceData.locationId);
          if (resolvedTargetLocationId && resolvedTargetLocationId !== sourceData.locationId) {
            handleRefreshSidebar(resolvedTargetLocationId);
          }
        };

        if (destinationData.folderPath) {
          const newRelPath = `${destinationData.folderPath}/${sourceFilename}`;
          void handleMoveDocument(sourceData.locationId, sourceData.relPath, newRelPath, resolvedTargetLocationId).then(
            (moved) => {
              if (!moved) {
                announce(`Could not move ${sourceData.title}`);
                return;
              }

              refreshDocumentLists();
              announce(`Moved ${sourceData.title} to ${getLocationName(resolvedTargetLocationId)}`);
            },
          ).catch((error: unknown) => {
            logger.error(
              f("Failed to move document into folder", { source: sourceData, dest: destinationData, error }),
            );
          });
          return;
        }

        if (resolvedTargetLocationId !== sourceData.locationId) {
          void handleMoveDocument(sourceData.locationId, sourceData.relPath, sourceFilename, resolvedTargetLocationId)
            .then((moved) => {
              if (!moved) {
                announce(`Could not move ${sourceData.title}`);
                return;
              }

              refreshDocumentLists();
              announce(`Moved ${sourceData.title} to ${getLocationName(resolvedTargetLocationId)}`);
            }).catch((error: unknown) => {
              logger.error(f("Failed to move document", { source: sourceData, dest: destinationData, error }));
            });
          return;
        }

        if (destinationData.relPath && (destinationEdge === "top" || destinationEdge === "bottom")) {
          setDocuments(
            reorderDocumentsInLocation(
              documents,
              sourceData.locationId,
              sourceData.relPath,
              destinationData.relPath,
              destinationEdge,
            ),
          );
          announce(
            `Moved ${sourceData.title} ${destinationEdge === "top" ? "before" : "after"} ${
              getFilename(destinationData.relPath)
            }`,
          );
        }
      },
    });

    return () => {
      stop();
      cleanupLiveRegion();
    };
  }, [documents, handleMoveDocument, handleRefreshSidebar, locations, setDocuments]);

  const locationDocuments = useMemo(
    () => (selectedLocationId ? documents.filter((doc) => doc.location_id === selectedLocationId) : []),
    [documents, selectedLocationId],
  );

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
        ? locationDocuments.filter((doc) =>
          doc.title.toLowerCase().includes(filterText.toLowerCase())
          || doc.rel_path.toLowerCase().includes(filterText.toLowerCase())
        )
        : locationDocuments,
    [locationDocuments, filterText],
  );

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setFilterText(e.currentTarget.value);
  }, [setFilterText]);
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

  const closeMoveDropDialog = useCallback(() => {
    if (isMovingDrop) {
      return;
    }
    setMoveDropDialog(null);
    setMoveDropPath("");
  }, [isMovingDrop]);

  const handleMoveDropPathChange: ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
    setMoveDropPath(event.currentTarget.value);
  }, []);

  const handleMoveDropSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!moveDropDialog) {
      return;
    }

    const nextPath = moveDropPath.trim();
    if (!nextPath) {
      return;
    }

    setIsMovingDrop(true);
    try {
      const moved = await handleMoveDocument(
        moveDropDialog.sourceLocationId,
        moveDropDialog.sourceRelPath,
        nextPath,
        moveDropDialog.targetLocationId,
      );

      if (!moved) {
        announce(`Could not move ${moveDropDialog.sourceTitle}`);
        return;
      }

      handleRefreshSidebar(moveDropDialog.sourceLocationId);
      if (moveDropDialog.targetLocationId !== moveDropDialog.sourceLocationId) {
        handleRefreshSidebar(moveDropDialog.targetLocationId);
      }
      announce(`Moved ${moveDropDialog.sourceTitle}`);
      setMoveDropDialog(null);
      setMoveDropPath("");
    } finally {
      setIsMovingDrop(false);
    }
  }, [handleMoveDocument, handleRefreshSidebar, moveDropDialog, moveDropPath]);
  const moveDropPathTrimmed = moveDropPath.trim();
  const isMoveDropUnchanged = moveDropDialog
    ? moveDropDialog.sourceLocationId === moveDropDialog.targetLocationId
      && moveDropDialog.sourceRelPath === moveDropPathTrimmed
    : false;
  const moveDropFormId = "sidebar-drop-move-form";

  return (
    <aside className="w-full bg-layer-01 border-r border-border-subtle flex h-full flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <Title isLoading={isLoading} />
        <SidebarActions
          onAddLocation={handleAddLocation}
          onAddDocument={handleAddDocument}
          onRefresh={handleRefresh}
          isAddDocumentDisabled={!selectedLocationId}
          isRefreshDisabled={!selectedLocationId || refreshingLocationId === selectedLocationId}
          onToggleCollapse={toggleSidebarCollapsed} />
      </div>
      <SearchInput filterText={filterText} handleInputChange={handleInputChange} />
      <div className="flex-1 overflow-y-auto pt-2 pb-2">
        {locations.length === 0 ? <EmptyLocations onAddLocation={handleAddLocation} /> : locations.map((location) => {
          const isSelectedLocation = selectedLocationId === location.id;
          const isRefreshingLocation = refreshingLocationId === location.id;
          const locationDocs = isSelectedLocation ? filteredDocuments : EMPTY_DOCUMENTS;

          return (
            <SidebarLocationItem
              key={location.id}
              location={location}
              isSelected={isSelectedLocation}
              selectedDocPath={selectedDocPath}
              isExpanded={expandedLocations.has(location.id)}
              onSelect={selectLocation}
              onToggle={toggleLocation}
              onRemove={handleRemoveLocation}
              onRefresh={handleRefreshSidebar}
              onSelectDocument={handleSelectDocument}
              onRenameDocument={handleRenameDocument}
              onMoveDocument={handleMoveDocument}
              onDeleteDocument={handleDeleteDocument}
              setShowLocationMenu={setShowLocationMenu}
              isMenuOpen={showLocationMenu === location.id}
              documents={locationDocs}
              isRefreshing={isRefreshingLocation}
              refreshReason={sidebarRefreshReason}
              filterText={filterText}
              filenameVisibility={filenameVisibility}
              isExternalDropTarget={externalDropTargetId === location.id} />
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-border-subtle text-xs text-text-placeholder flex items-center justify-between">
        <span>{locations.length} location{locations.length === 1 ? "" : "s"}</span>
        <span>
          {selectedLocationId ? `${locationDocuments.length} document${locationDocuments.length === 1 ? "" : "s"}` : ""}
        </span>
      </div>
      <OperationDialog
        isOpen={moveDropDialog !== null}
        onClose={closeMoveDropDialog}
        ariaLabel="Move document"
        title="Move Document"
        description="Update the destination path. Use slashes to create nested folders automatically."
        confirmLabel="Move"
        pendingLabel="Moving..."
        confirmButtonType="submit"
        confirmFormId={moveDropFormId}
        confirmDisabled={!moveDropPathTrimmed || isMoveDropUnchanged}
        isPending={isMovingDrop}
        widthClassName="w-[min(94vw,460px)]">
        <form id={moveDropFormId} onSubmit={handleMoveDropSubmit} className="space-y-2">
          <label
            htmlFor="sidebar-drop-move-input"
            className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Destination path
          </label>
          <input
            id="sidebar-drop-move-input"
            type="text"
            value={moveDropPath}
            onChange={handleMoveDropPathChange}
            className="w-full rounded-md border border-border-subtle bg-layer-02 px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
            autoFocus
            disabled={isMovingDrop} />
        </form>
      </OperationDialog>
    </aside>
  );
}
