import { Button } from "$components/Button";
import { ContextMenu, ContextMenuDivider, ContextMenuItem, useContextMenu } from "$components/ContextMenu";
import { draggable, type Edge } from "$dnd";
import { useSkipAnimation } from "$hooks/useMotion";
import { FolderIcon, MoreVerticalIcon, RefreshIcon, TrashIcon } from "$icons";
import type { SidebarRefreshReason } from "$state/types";
import { DocMeta, LocationDescriptor } from "$types";
import { cn } from "$utils/tw";
import type { Dispatch, MouseEventHandler, SetStateAction } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type DocumentDragData, DocumentItem } from "./DocumentItem";
import { EmptyDocuments } from "./EmptyDocuments";
import { RemoveButton } from "./RemoveButton";
import { TreeItem } from "./TreeItem";

const folderIcon = { Component: FolderIcon, size: "md" as const };
const nestedFolderIcon = { Component: FolderIcon, size: "sm" as const };

type DirectoryTreeNode = { type: "directory"; name: string; path: string; children: TreeNode[] };

type FileTreeNode = { type: "file"; name: string; path: string; doc: DocMeta };

type TreeNode = DirectoryTreeNode | FileTreeNode;

function splitPathSegments(relPath: string): string[] {
  return relPath.split(/[\\/]+/).filter(Boolean);
}

function parentDirectoryPath(relPath: string): string {
  const segments = splitPathSegments(relPath);
  return segments.length > 1 ? segments.slice(0, -1).join("/") : "";
}

export type FolderDragData = { type: "folder"; locationId: number; relPath: string; title: string };

export function canDropDocumentIntoFolder(sourceData: unknown, locationId: number, folderPath: string): boolean {
  if (!sourceData || typeof sourceData !== "object") {
    return false;
  }

  const data = sourceData as Partial<DocumentDragData>;
  if (data.type !== "document" || typeof data.locationId !== "number" || typeof data.relPath !== "string") {
    return false;
  }

  if (data.locationId !== locationId) {
    return true;
  }

  return parentDirectoryPath(data.relPath) !== folderPath;
}

function isFolderDragData(sourceData: unknown): sourceData is FolderDragData {
  if (!sourceData || typeof sourceData !== "object") {
    return false;
  }

  const data = sourceData as Partial<FolderDragData>;
  return data.type === "folder" && typeof data.locationId === "number" && typeof data.relPath === "string";
}

function isFolderDropNoop(sourcePath: string, destinationParentPath: string): boolean {
  return parentDirectoryPath(sourcePath) === destinationParentPath;
}

export function canDropFolderIntoFolder(sourceData: unknown, locationId: number, folderPath: string): boolean {
  if (!isFolderDragData(sourceData)) {
    return false;
  }

  if (sourceData.locationId !== locationId) {
    return false;
  }

  if (sourceData.relPath === folderPath) {
    return false;
  }

  if (folderPath.startsWith(`${sourceData.relPath}/`)) {
    return false;
  }

  return !isFolderDropNoop(sourceData.relPath, folderPath);
}

function ensureDirectoryNode(parent: DirectoryTreeNode, name: string, path: string): DirectoryTreeNode {
  const existing = parent.children.find((node) => node.type === "directory" && node.path === path);
  if (existing && existing.type === "directory") {
    return existing;
  }

  const directoryNode: DirectoryTreeNode = { type: "directory", name, path, children: [] };
  parent.children.push(directoryNode);
  return directoryNode;
}

function sortTreeNodes(children: TreeNode[]): TreeNode[] {
  return children.toSorted((left, right) => {
    if (left.type !== right.type) {
      return left.type === "directory" ? -1 : 1;
    }

    return left.name.localeCompare(right.name, void 0, { sensitivity: "base" });
  });
}

function normalizeTree(node: DirectoryTreeNode): DirectoryTreeNode {
  const normalizedChildren = sortTreeNodes(node.children).map((child) =>
    child.type === "directory" ? normalizeTree(child) : child
  );
  return { ...node, children: normalizedChildren };
}

function buildDocumentTree(documents: DocMeta[], directories: string[]): DirectoryTreeNode {
  const root: DirectoryTreeNode = { type: "directory", name: "", path: "", children: [] };

  for (const directoryPath of directories) {
    const segments = splitPathSegments(directoryPath);
    if (segments.length === 0) {
      continue;
    }

    let currentParent = root;
    let currentPath = "";
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      currentParent = ensureDirectoryNode(currentParent, segment, currentPath);
    }
  }

  for (const doc of documents) {
    const segments = splitPathSegments(doc.rel_path);
    if (segments.length === 0) {
      continue;
    }

    const fileName = segments.at(-1) ?? doc.rel_path;
    const parentSegments = segments.slice(0, -1);

    let currentParent = root;
    let currentPath = "";

    for (const segment of parentSegments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      currentParent = ensureDirectoryNode(currentParent, segment, currentPath);
    }

    currentParent.children.push({ type: "file", name: fileName, path: doc.rel_path, doc });
  }

  return normalizeTree(root);
}

function parentDirectoryPaths(relPath: string): string[] {
  const parts = splitPathSegments(relPath);
  const directories = parts.slice(0, -1);
  const paths: string[] = [];
  let currentPath = "";

  for (const directory of directories) {
    currentPath = currentPath ? `${currentPath}/${directory}` : directory;
    paths.push(currentPath);
  }

  return paths;
}

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
  actionProps: LocationActionProps;
};

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
    actionProps,
  }: FolderItemProps,
) {
  const { isOpen, position, open, close } = useContextMenu();

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    open(e);
  }, [open]);

  const contextMenuItems = useMemo<(ContextMenuItem | ContextMenuDivider)[]>(
    () => [{ label: "Refresh", onClick: onRefresh, icon: <RefreshIcon size="sm" />, disabled: isRefreshing }, {
      divider: true,
    }, {
      label: "Remove Location",
      onClick: actionProps.handleRemoveClick,
      icon: <TrashIcon size="sm" />,
      danger: true,
    }],
    [onRefresh, isRefreshing, actionProps.handleRemoveClick],
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
          <LocationActions {...actionProps} />
        </TreeItem>
      </div>
      <ContextMenu isOpen={isOpen} position={position} onClose={close} items={contextMenuItems} />
    </>
  );
}

type LocationActionProps = {
  isMenuOpen: boolean;
  handleMenuClick: MouseEventHandler<HTMLButtonElement>;
  handleRemoveClick: () => void;
};

const LocationActions = ({ isMenuOpen, handleMenuClick, handleRemoveClick }: LocationActionProps) => (
  <div className="relative" data-location-menu-root>
    <Button
      onClick={handleMenuClick}
      data-location-menu-button
      className="location-actions-btn w-5 h-5 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      <MoreVerticalIcon size="sm" />
    </Button>
    <RemoveButton isMenuOpen={isMenuOpen} handleRemoveClick={handleRemoveClick} />
  </div>
);

const RefreshStatus = ({ reason }: { reason: SidebarRefreshReason | null }) => (
  <div className="px-6 py-2 text-text-placeholder text-[11px] flex items-center gap-1.5">
    <RefreshIcon size="xs" className="animate-spin" />
    <span>{reason === "external" ? "Applying external file changes..." : "Refreshing files..."}</span>
  </div>
);

type SidebarLocationItemProps = {
  location: LocationDescriptor;
  isSelected: boolean;
  selectedDocPath?: string;
  isExpanded: boolean;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onRefresh: (id: number) => void;
  onSelectDocument: (id: number, path: string) => void;
  onRenameDocument: (locationId: number, relPath: string, newName: string) => Promise<boolean>;
  onMoveDocument: (locationId: number, relPath: string, newRelPath: string) => Promise<boolean>;
  onDeleteDocument: (locationId: number, relPath: string) => Promise<boolean>;
  setShowLocationMenu: Dispatch<SetStateAction<number | null>>;
  documents: DocMeta[];
  directories: string[];
  isRefreshing: boolean;
  refreshReason: SidebarRefreshReason | null;
  filterText: string;
  isMenuOpen: boolean;
  filenameVisibility: boolean;
  isExternalDropTarget?: boolean;
  isInternalDropTarget?: boolean;
  activeDropFolderPath?: string;
  activeDropDocumentPath?: string;
  activeDropDocumentEdge?: Edge | null;
};

type NestedDirectoryItemProps = {
  node: DirectoryTreeNode;
  level: number;
  selectedDocPath?: string;
  expandedDirectories: Set<string>;
  onToggleDirectory: (path: string) => void;
  onSelectDocument: (id: number, path: string) => void;
  onRenameDocument: (locationId: number, relPath: string, newName: string) => Promise<boolean>;
  onMoveDocument: (locationId: number, relPath: string, newRelPath: string) => Promise<boolean>;
  onDeleteDocument: (locationId: number, relPath: string) => Promise<boolean>;
  filenameVisibility: boolean;
  locationId: number;
  activeDropFolderPath?: string;
  activeDropDocumentPath?: string;
  activeDropDocumentEdge?: Edge | null;
};

function NestedDirectoryItem(
  {
    node,
    level,
    selectedDocPath,
    expandedDirectories,
    onToggleDirectory,
    onSelectDocument,
    onRenameDocument,
    onMoveDocument,
    onDeleteDocument,
    filenameVisibility,
    locationId,
    activeDropFolderPath,
    activeDropDocumentPath,
    activeDropDocumentEdge,
  }: NestedDirectoryItemProps,
) {
  const isExpanded = expandedDirectories.has(node.path);
  const folderRowRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<"idle" | "dragging">("idle");
  const skipAnimation = useSkipAnimation();
  const isActiveDropFolder = activeDropFolderPath === node.path;
  const showDropTarget = isActiveDropFolder;

  useEffect(() => {
    const rowElement = folderRowRef.current;
    if (!rowElement) return;

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
          skipAnimation ? "" : "transition-all duration-150",
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
                    selectedDocPath={selectedDocPath}
                    expandedDirectories={expandedDirectories}
                    onToggleDirectory={onToggleDirectory}
                    onSelectDocument={onSelectDocument}
                    onRenameDocument={onRenameDocument}
                    onMoveDocument={onMoveDocument}
                    onDeleteDocument={onDeleteDocument}
                    filenameVisibility={filenameVisibility}
                    locationId={locationId}
                    activeDropFolderPath={activeDropFolderPath}
                    activeDropDocumentPath={activeDropDocumentPath}
                    activeDropDocumentEdge={activeDropDocumentEdge} />
                )
                : (
                  <DocumentItem
                    key={child.path}
                    doc={child.doc}
                    isSelected={selectedDocPath === child.doc.rel_path}
                    selectedDocPath={selectedDocPath}
                    onSelectDocument={onSelectDocument}
                    onRenameDocument={onRenameDocument}
                    onMoveDocument={onMoveDocument}
                    onDeleteDocument={onDeleteDocument}
                    filenameVisibility={filenameVisibility}
                    id={locationId}
                    level={level + 1}
                    activeDropDocumentPath={activeDropDocumentPath}
                    activeDropDocumentEdge={activeDropDocumentEdge} />
                )
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
    onSelect,
    onToggle,
    onRemove,
    onRefresh,
    onSelectDocument,
    onRenameDocument,
    onMoveDocument,
    onDeleteDocument,
    setShowLocationMenu,
    documents,
    directories,
    isRefreshing,
    refreshReason,
    filterText,
    isMenuOpen,
    filenameVisibility,
    isExternalDropTarget = false,
    isInternalDropTarget = false,
    activeDropFolderPath,
    activeDropDocumentPath,
    activeDropDocumentEdge,
  }: SidebarLocationItemProps,
) {
  const [expandedDirectories, setExpandedDirectories] = useState<Set<string>>(new Set());
  const skipAnimation = useSkipAnimation();
  const showHighlight = isExternalDropTarget || isInternalDropTarget;
  const showRootDropIndicator = isInternalDropTarget && !activeDropFolderPath && !activeDropDocumentPath;

  const handleRemoveClick = useCallback(() => {
    onRemove(location.id);
    setShowLocationMenu(null);
  }, [location.id, onRemove, setShowLocationMenu]);

  const handleMenuClick: MouseEventHandler<HTMLButtonElement> = useCallback((event) => {
    event.stopPropagation();
    setShowLocationMenu((current) => current === location.id ? null : location.id);
  }, [location.id, setShowLocationMenu]);

  const handleRefresh = useCallback(() => {
    onRefresh(location.id);
  }, [location.id, onRefresh]);

  const onItemClick = useCallback(() => {
    onSelect(location.id);
  }, [location.id, onSelect]);

  const onToggleClick = useCallback(() => {
    onToggle(location.id);
  }, [location.id, onToggle]);

  const actionProps = useMemo(() => ({ isMenuOpen, handleMenuClick, handleRemoveClick }), [
    isMenuOpen,
    handleMenuClick,
    handleRemoveClick,
  ]);
  const documentTree = useMemo(() => buildDocumentTree(documents, directories), [directories, documents]);

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

  return (
    <div
      data-location-id={location.id}
      className={`${showHighlight ? "ring-2 ring-border-interactive rounded" : ""} ${
        skipAnimation ? "" : "transition-all duration-150"
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
        actionProps={actionProps} />

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
              <div>
                {documentTree.children.map((node) =>
                  node.type === "directory"
                    ? (
                      <NestedDirectoryItem
                        key={node.path}
                        node={node}
                        level={1}
                        selectedDocPath={selectedDocPath}
                        expandedDirectories={expandedDirectories}
                        onToggleDirectory={handleToggleDirectory}
                        onSelectDocument={onSelectDocument}
                        onRenameDocument={onRenameDocument}
                        onMoveDocument={onMoveDocument}
                        onDeleteDocument={onDeleteDocument}
                        filenameVisibility={filenameVisibility}
                        locationId={location.id}
                        activeDropFolderPath={activeDropFolderPath}
                        activeDropDocumentPath={activeDropDocumentPath}
                        activeDropDocumentEdge={activeDropDocumentEdge} />
                    )
                    : (
                      <DocumentItem
                        key={node.path}
                        doc={node.doc}
                        isSelected={selectedDocPath === node.doc.rel_path}
                        selectedDocPath={selectedDocPath}
                        onSelectDocument={onSelectDocument}
                        onRenameDocument={onRenameDocument}
                        onMoveDocument={onMoveDocument}
                        onDeleteDocument={onDeleteDocument}
                        filenameVisibility={filenameVisibility}
                        id={location.id}
                        level={1}
                        activeDropDocumentPath={activeDropDocumentPath}
                        activeDropDocumentEdge={activeDropDocumentEdge} />
                    )
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

export const SidebarLocationItem = memo(SidebarLocationItemComponent);
