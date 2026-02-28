import { Button } from "$components/Button";
import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import { CollapseIcon, FileAddIcon, FolderAddIcon, RefreshIcon } from "$icons";
import { useSidebarState } from "$state/selectors";
import type { DocMeta } from "$types";
import { f } from "$utils/serialize";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import * as logger from "@tauri-apps/plugin-log";
import type { ChangeEventHandler } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddButton } from "./AddButton";
import { type DocumentDragData } from "./DocumentItem";
import { EmptyLocations } from "./EmptyLocations";
import { SearchInput } from "./SearchInput";
import { SidebarLocationItem } from "./SidebarLocationItem";
import { Title } from "./Title";

const EMPTY_DOCUMENTS: DocMeta[] = [];

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
    selectLocation,
    toggleSidebarCollapsed,
    filenameVisibility: filenameVisibility,
  } = useSidebarState();
  const [expandedLocations, setExpandedLocations] = useState<Set<number>>(() => new Set(locations.map((l) => l.id)));
  const [showLocationMenu, setShowLocationMenu] = useState<number | null>(null);

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
    return monitorForElements({
      onDrop: ({ source, location }) => {
        const dest = location.current.dropTargets[0];
        if (!dest) return;

        const sourceData = source.data as DocumentDragData;
        const destData = dest.data as { locationId: number; relPath?: string };
        const edge = extractClosestEdge(destData);

        if (destData.locationId !== sourceData.locationId) {
          const sourceFilename = sourceData.relPath.split("/").pop() || sourceData.relPath;
          handleMoveDocument(sourceData.locationId, sourceData.relPath, sourceFilename).catch((error: unknown) => {
            logger.error(f("Failed to move document", { source: sourceData, dest: destData, error }));
          });
        } else if (edge && destData.relPath) {
          logger.info(
            f("Document reorder requested", {
              locationId: sourceData.locationId,
              sourcePath: sourceData.relPath,
              destPath: destData.relPath,
              edge,
            }),
          );
        }
      },
    });
  }, [handleMoveDocument]);

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
              filenameVisibility={filenameVisibility} />
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-border-subtle text-xs text-text-placeholder flex items-center justify-between">
        <span>{locations.length} location{locations.length === 1 ? "" : "s"}</span>
        <span>
          {selectedLocationId ? `${locationDocuments.length} document${locationDocuments.length === 1 ? "" : "s"}` : ""}
        </span>
      </div>
    </aside>
  );
}
