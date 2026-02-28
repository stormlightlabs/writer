import { Button } from "$components/Button";
import { ContextMenu, ContextMenuDivider, ContextMenuItem, useContextMenu } from "$components/ContextMenu";
import { useSkipAnimation } from "$hooks/useMotion";
import { FolderIcon, MoreVerticalIcon, RefreshIcon, TrashIcon } from "$icons";
import type { SidebarRefreshReason } from "$state/types";
import { DocMeta, LocationDescriptor } from "$types";
import { cn } from "$utils/tw";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
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

function buildDocumentTree(documents: DocMeta[]): DirectoryTreeNode {
  const root: DirectoryTreeNode = { type: "directory", name: "", path: "", children: [] };

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
  isRefreshing: boolean;
  onItemClick: () => void;
  onToggleClick: () => void;
  onRefresh: () => void;
  actionProps: LocationActionProps;
};

function FolderItem(
  { name, isSelected, selectedDocPath, isExpanded, isRefreshing, onItemClick, onToggleClick, onRefresh, actionProps }:
    FolderItemProps,
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
      <div className="relative">
        <TreeItem
          icon={folderIcon}
          label={name}
          isSelected={isSelected && !selectedDocPath}
          isExpanded={isExpanded}
          hasChildItems
          level={0}
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
  isRefreshing: boolean;
  refreshReason: SidebarRefreshReason | null;
  filterText: string;
  isMenuOpen: boolean;
  filenameVisibility: boolean;
  isExternalDropTarget?: boolean;
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
  }: NestedDirectoryItemProps,
) {
  const isExpanded = expandedDirectories.has(node.path);
  const folderRef = useRef<HTMLDivElement>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const skipAnimation = useSkipAnimation();

  useEffect(() => {
    const element = folderRef.current;
    if (!element) return;

    return combine(
      dropTargetForElements({
        element,
        getData: () => ({ locationId, folderPath: node.path, targetType: "folder" as const }),
        canDrop: ({ source }) => {
          const data = source.data as DocumentDragData;
          return data.type === "document" && data.locationId === locationId
            && !data.relPath.startsWith(node.path + "/");
        },
        onDragEnter: () => setIsDropTarget(true),
        onDragLeave: () => setIsDropTarget(false),
        onDrop: () => setIsDropTarget(false),
      }),
    );
  }, [locationId, node.path]);

  const handleToggle = useCallback(() => {
    onToggleDirectory(node.path);
  }, [node.path, onToggleDirectory]);

  return (
    <div
      ref={folderRef}
      data-folder-path={node.path}
      data-location-id={locationId}
      className={cn(
        isDropTarget ? "ring-2 ring-border-interactive rounded" : "",
        skipAnimation ? "" : "transition-all duration-150",
      )}>
      <TreeItem
        icon={nestedFolderIcon}
        label={node.name}
        isExpanded={isExpanded}
        hasChildItems
        level={level}
        onClick={handleToggle}
        onToggle={handleToggle} />
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
                    locationId={locationId} />
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
                    level={level + 1} />
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
    isRefreshing,
    refreshReason,
    filterText,
    isMenuOpen,
    filenameVisibility,
    isExternalDropTarget = false,
  }: SidebarLocationItemProps,
) {
  const [expandedDirectories, setExpandedDirectories] = useState<Set<string>>(new Set());
  const locationRef = useRef<HTMLDivElement>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const skipAnimation = useSkipAnimation();
  const showHighlight = isDropTarget || isExternalDropTarget;

  useEffect(() => {
    const element = locationRef.current;
    if (!element) return;

    return combine(
      dropTargetForElements({
        element,
        getData: () => ({ locationId: location.id, targetType: "location" as const }),
        canDrop: ({ source }) => {
          const data = source.data as DocumentDragData;
          return data.type === "document";
        },
        onDragEnter: () => setIsDropTarget(true),
        onDragLeave: () => setIsDropTarget(false),
        onDrop: () => setIsDropTarget(false),
      }),
    );
  }, [location.id]);

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
  const documentTree = useMemo(() => buildDocumentTree(documents), [documents]);

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
      ref={locationRef}
      data-location-id={location.id}
      className={`${showHighlight ? "ring-2 ring-border-interactive rounded" : ""} ${
        skipAnimation ? "" : "transition-all duration-150"
      }`}>
      <FolderItem
        name={location.name}
        isSelected={isSelected && !selectedDocPath}
        selectedDocPath={selectedDocPath}
        isExpanded={isExpanded}
        isRefreshing={isRefreshing}
        onItemClick={onItemClick}
        onToggleClick={onToggleClick}
        onRefresh={handleRefresh}
        actionProps={actionProps} />

      {isExpanded && isSelected && (
        <div>
          {isRefreshing ? <RefreshStatus reason={refreshReason} /> : null}
          {documents.length === 0
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
                        locationId={location.id} />
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
                        level={1} />
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
