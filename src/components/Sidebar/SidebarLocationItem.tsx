import { Button } from "$components/Button";
import { ContextMenu, ContextMenuDivider, ContextMenuItem, useContextMenu } from "$components/ContextMenu";
import { draggable, type Edge } from "$dnd";
import type { FolderDragData } from "$dnd/sidebar";
import { useSkipAnimation } from "$hooks/useMotion";
import { FolderIcon, MoreVerticalIcon, RefreshIcon, TrashIcon } from "$icons";
import type { SidebarRefreshReason } from "$state/types";
import type { DocMeta, LocationDescriptor } from "$types";
import { cn } from "$utils/tw";
import type { MouseEventHandler, ReactNode } from "react";
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildDocumentTree, type DirectoryTreeNode, parentDirectoryPaths } from "./buildDocumentTree";
import { DocumentItem } from "./DocumentItem";
import type { DocumentOperationType } from "./DocumentOperationDialog";
import { EmptyDocuments } from "./EmptyDocuments";
import type { DialogAnchor } from "./OperationDialog";
import { TreeItem } from "./TreeItem";

const folderIcon = { Component: FolderIcon, size: "md" as const };
const nestedFolderIcon = { Component: FolderIcon, size: "sm" as const };

export { canDropDocumentIntoFolder, canDropFolderIntoFolder } from "$dnd/sidebar";

export type SidebarDocumentActions = {
  onSelectDocument: (id: number, path: string) => void;
  onRenameDocument: (locationId: number, relPath: string, newName: string) => Promise<boolean>;
  onMoveDocument: (locationId: number, relPath: string, newRelPath: string) => Promise<boolean>;
  onDeleteDocument: (locationId: number, relPath: string) => Promise<boolean>;
};

type SidebarLocationItemProps = {
  location: LocationDescriptor;
  isSelected: boolean;
  selectedDocPath?: string;
  isExpanded: boolean;
  documents: DocMeta[];
  directories: string[];
  filterText: string;
  isRefreshing: boolean;
  refreshReason: SidebarRefreshReason | null;
  isExternalDropTarget?: boolean;
  isInternalDropTarget?: boolean;
  activeDropFolderPath?: string;
  activeDropDocumentPath?: string;
  activeDropDocumentEdge?: Edge | null;
  onRemoveLocation: (locationId: number) => void;
  onSelectLocation: (locationId: number) => void;
  onRefreshLocation: (locationId: number) => void;
};

type SidebarLocationContextValue = {
  filenameVisibility: boolean;
  documentActions: SidebarDocumentActions;
  onToggleLocation: (locationId: number) => void;
  openDocumentOperation: (type: DocumentOperationType, doc: DocMeta, anchor?: DialogAnchor) => void;
};

type LocationActionProps = { handleMenuClick: MouseEventHandler<HTMLButtonElement> };

type FolderItemProps = {
  name: string;
  isSelected: boolean;
  selectedDocPath?: string;
  isExpanded: boolean;
  isDropTarget?: boolean;
  isRefreshing: boolean;
  onItemClick: () => void;
  onToggleClick: () => void;
  onRefresh: () => void;
  onRemove: () => void;
};

type SidebarTreeContextValue = {
  locationId: number;
  selectedDocPath?: string;
  filenameVisibility: boolean;
  documentActions: SidebarDocumentActions;
  onOpenDocumentOperation: (type: DocumentOperationType, doc: DocMeta, anchor?: DialogAnchor) => void;
  dropIndicators: {
    activeDropFolderPath?: string;
    activeDropDocumentPath?: string;
    activeDropDocumentEdge?: Edge | null;
  };
};

type NestedDirectoryItemProps = {
  node: DirectoryTreeNode;
  level: number;
  expandedDirectories: Set<string>;
  onToggleDirectory: (path: string) => void;
};

const SidebarTreeContext = createContext<SidebarTreeContextValue | null>(null);
const SidebarLocationContext = createContext<SidebarLocationContextValue | null>(null);

function useSidebarTreeContext(): SidebarTreeContextValue {
  const context = useContext(SidebarTreeContext);
  if (!context) {
    throw new Error("SidebarTreeContext is required");
  }

  return context;
}

function useSidebarLocationContext(): SidebarLocationContextValue {
  const context = useContext(SidebarLocationContext);
  if (!context) {
    throw new Error("SidebarLocationContext is required");
  }

  return context;
}

export function SidebarLocationProvider(
  { value, children }: { value: SidebarLocationContextValue; children: ReactNode },
) {
  return <SidebarLocationContext.Provider value={value}>{children}</SidebarLocationContext.Provider>;
}

function FolderItem(
  {
    name,
    isSelected,
    selectedDocPath,
    isExpanded,
    isDropTarget = false,
    isRefreshing,
    onItemClick,
    onToggleClick,
    onRefresh,
    onRemove,
  }: FolderItemProps,
) {
  const { isOpen, position, open, openAt, close } = useContextMenu();

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    open(event);
  }, [open]);

  const handleMenuClick: MouseEventHandler<HTMLButtonElement> = useCallback((event) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    openAt(rect.right, rect.bottom + 4);
  }, [openAt]);

  const contextMenuItems = useMemo<(ContextMenuItem | ContextMenuDivider)[]>(
    () => [{ label: "Refresh", onClick: onRefresh, icon: <RefreshIcon size="sm" />, disabled: isRefreshing }, {
      divider: true,
    }, { label: "Remove Location", onClick: onRemove, icon: <TrashIcon size="sm" />, danger: true }],
    [onRefresh, isRefreshing, onRemove],
  );

  return (
    <>
      <div className="relative mb-0.5">
        <TreeItem
          icon={folderIcon}
          label={name}
          isSelected={isSelected && !selectedDocPath}
          isExpanded={isExpanded}
          hasChildItems
          level={0}
          isDropTarget={isDropTarget}
          onClick={onItemClick}
          onToggle={onToggleClick}
          onContextMenu={handleContextMenu}>
          <LocationActions handleMenuClick={handleMenuClick} />
        </TreeItem>
      </div>
      <ContextMenu isOpen={isOpen} position={position} onClose={close} items={contextMenuItems} />
    </>
  );
}

const LocationActions = ({ handleMenuClick }: LocationActionProps) => (
  <div className="relative" data-location-menu-root>
    <Button
      onClick={handleMenuClick}
      data-location-menu-button
      className="location-actions-btn w-5 h-5 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      <MoreVerticalIcon size="sm" />
    </Button>
  </div>
);

const RefreshStatus = ({ reason }: { reason: SidebarRefreshReason | null }) => (
  <div className="px-6 py-2 text-text-placeholder text-[11px] flex items-center gap-1.5">
    <RefreshIcon size="xs" className="animate-spin" />
    <span>{reason === "external" ? "Applying external file changes..." : "Refreshing files..."}</span>
  </div>
);

function TreeDocumentNode({ doc, level }: { doc: DocMeta; level: number }) {
  const { selectedDocPath, filenameVisibility, documentActions, onOpenDocumentOperation, dropIndicators } =
    useSidebarTreeContext();

  return (
    <DocumentItem
      key={doc.rel_path}
      doc={doc}
      isSelected={selectedDocPath === doc.rel_path}
      onSelectDocument={documentActions.onSelectDocument}
      onOpenDocumentOperation={onOpenDocumentOperation}
      filenameVisibility={filenameVisibility}
      level={level}
      activeDropDocumentPath={dropIndicators.activeDropDocumentPath}
      activeDropDocumentEdge={dropIndicators.activeDropDocumentEdge} />
  );
}

function NestedDirectoryItem({ node, level, expandedDirectories, onToggleDirectory }: NestedDirectoryItemProps) {
  const { locationId, dropIndicators } = useSidebarTreeContext();
  const isExpanded = expandedDirectories.has(node.path);
  const folderRowRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<"idle" | "dragging">("idle");
  const skipAnimation = useSkipAnimation();
  const showDropTarget = dropIndicators.activeDropFolderPath === node.path;

  useEffect(() => {
    const rowElement = folderRowRef.current;
    if (!rowElement) {
      return;
    }

    return draggable({
      element: rowElement,
      getInitialData: (): FolderDragData => ({ type: "folder", locationId, relPath: node.path, title: node.name }),
      onDragStart: () => setDragState("dragging"),
      onDrop: () => setDragState("idle"),
    });
  }, [locationId, node.name, node.path]);

  const handleToggle = useCallback(() => {
    onToggleDirectory(node.path);
  }, [node.path, onToggleDirectory]);

  return (
    <div
      data-drop-folder-zone="true"
      data-folder-path={node.path}
      data-location-id={locationId}
      data-folder-depth={level}>
      <div
        ref={folderRowRef}
        data-drop-folder-row="true"
        data-folder-path={node.path}
        data-location-id={locationId}
        data-folder-depth={level}
        className={cn(
          "pb-0.5",
          showDropTarget ? "ring-2 ring-border-interactive rounded bg-layer-hover-01" : "",
          skipAnimation ? "" : "transition-[box-shadow,background-color] duration-150",
        )}>
        <TreeItem
          icon={nestedFolderIcon}
          label={node.name}
          isExpanded={isExpanded}
          hasChildItems
          level={level}
          isDragging={dragState === "dragging"}
          isDropTarget={showDropTarget}
          onClick={handleToggle}
          onToggle={handleToggle} />
      </div>

      {isExpanded
        ? (
          <div>
            {node.children.map((child) =>
              child.type === "directory"
                ? (
                  <NestedDirectoryItem
                    key={child.path}
                    node={child}
                    level={level + 1}
                    expandedDirectories={expandedDirectories}
                    onToggleDirectory={onToggleDirectory} />
                )
                : <TreeDocumentNode key={child.path} doc={child.doc} level={level + 1} />
            )}
          </div>
        )
        : null}
    </div>
  );
}

function SidebarLocationItemComponent(
  {
    location,
    isSelected,
    selectedDocPath,
    isExpanded,
    documents,
    directories,
    filterText,
    isRefreshing,
    refreshReason,
    isExternalDropTarget,
    isInternalDropTarget,
    activeDropFolderPath,
    activeDropDocumentPath,
    activeDropDocumentEdge,
    onRemoveLocation,
    onSelectLocation,
    onRefreshLocation,
  }: SidebarLocationItemProps,
) {
  const { filenameVisibility, documentActions, onToggleLocation, openDocumentOperation } = useSidebarLocationContext();
  const [expandedDirectories, setExpandedDirectories] = useState<Set<string>>(new Set());
  const skipAnimation = useSkipAnimation();
  const showHighlight = Boolean(isExternalDropTarget) || Boolean(isInternalDropTarget);
  const showRootDropIndicator = Boolean(isInternalDropTarget) && !activeDropFolderPath && !activeDropDocumentPath;

  const handleRemoveClick = useCallback(() => {
    onRemoveLocation(location.id);
  }, [location.id, onRemoveLocation]);

  const handleRefresh = useCallback(() => {
    onRefreshLocation(location.id);
  }, [location.id, onRefreshLocation]);

  const onItemClick = useCallback(() => {
    onSelectLocation(location.id);
  }, [location.id, onSelectLocation]);

  const onToggleClick = useCallback(() => {
    onToggleLocation(location.id);
  }, [location.id, onToggleLocation]);

  const documentTree = useMemo(() => buildDocumentTree(documents, directories), [documents, directories]);

  useEffect(() => {
    if (!selectedDocPath) {
      return;
    }

    const parentPaths = parentDirectoryPaths(selectedDocPath);
    if (parentPaths.length === 0) {
      return;
    }

    setExpandedDirectories((previous) => {
      const next = new Set(previous);
      let changed = false;
      for (const path of parentPaths) {
        if (!next.has(path)) {
          next.add(path);
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [selectedDocPath]);

  const handleToggleDirectory = useCallback((path: string) => {
    setExpandedDirectories((previous) => {
      const next = new Set(previous);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const treeContextValue = useMemo<SidebarTreeContextValue>(
    () => ({
      locationId: location.id,
      selectedDocPath,
      filenameVisibility,
      documentActions: {
        onSelectDocument: documentActions.onSelectDocument,
        onRenameDocument: documentActions.onRenameDocument,
        onMoveDocument: documentActions.onMoveDocument,
        onDeleteDocument: documentActions.onDeleteDocument,
      },
      onOpenDocumentOperation: openDocumentOperation,
      dropIndicators: { activeDropFolderPath, activeDropDocumentPath, activeDropDocumentEdge },
    }),
    [
      activeDropDocumentEdge,
      activeDropDocumentPath,
      activeDropFolderPath,
      documentActions,
      filenameVisibility,
      location.id,
      openDocumentOperation,
      selectedDocPath,
    ],
  );

  const renderedTreeNodes = useMemo(
    () =>
      documentTree.children.map((node) =>
        node.type === "directory"
          ? (
            <NestedDirectoryItem
              key={node.path}
              node={node}
              level={1}
              expandedDirectories={expandedDirectories}
              onToggleDirectory={handleToggleDirectory} />
          )
          : <TreeDocumentNode key={node.path} doc={node.doc} level={1} />
      ),
    [documentTree.children, expandedDirectories, handleToggleDirectory],
  );

  return (
    <div
      data-location-id={location.id}
      className={`${showHighlight ? "ring-2 ring-border-interactive rounded" : ""} ${
        skipAnimation ? "" : "transition-[box-shadow,background-color] duration-150"
      }`}>
      <FolderItem
        name={location.name}
        isSelected={isSelected && !selectedDocPath}
        selectedDocPath={selectedDocPath}
        isExpanded={isExpanded}
        isDropTarget={showHighlight}
        isRefreshing={isRefreshing}
        onItemClick={onItemClick}
        onToggleClick={onToggleClick}
        onRefresh={handleRefresh}
        onRemove={handleRemoveClick} />

      {isExpanded && isSelected && (
        <div>
          <div
            data-drop-location-root="true"
            data-location-id={location.id}
            className={cn(
              "mx-3 rounded border",
              showRootDropIndicator
                ? "mb-1 mt-0.5 h-1.5 border-border-interactive bg-layer-hover-01 sidebar-drop-edge-pulse"
                : "mb-0 mt-0 h-0 border-transparent bg-transparent",
              skipAnimation ? "" : "transition-colors duration-150",
            )} />

          {isRefreshing ? <RefreshStatus reason={refreshReason} /> : null}

          {documentTree.children.length === 0
            ? <EmptyDocuments filterText={filterText} />
            : (
              <SidebarTreeContext.Provider value={treeContextValue}>
                <div>{renderedTreeNodes}</div>
              </SidebarTreeContext.Provider>
            )}
        </div>
      )}
    </div>
  );
}

export const SidebarLocationItem = memo(SidebarLocationItemComponent);
