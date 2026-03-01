import { ContextMenu, ContextMenuDivider, ContextMenuItem, useContextMenu } from "$components/ContextMenu";
import { draggable, type Edge } from "$dnd";
import { useSkipAnimation } from "$hooks/useMotion";
import { ClipboardIcon, EditIcon, FileTextIcon, FolderIcon, TrashIcon } from "$icons";
import type { DocMeta } from "$types";
import { f } from "$utils/serialize";
import { cn } from "$utils/tw";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type DocumentOperationType } from "./DocumentOperationDialog";
import type { DialogAnchor } from "./OperationDialog";
import { TreeItem } from "./TreeItem";

export type DocumentDragData = { type: "document"; locationId: number; relPath: string; title: string };

const FILE_TEXT_ICON = { Component: FileTextIcon, size: "sm" as const };

type DocumentItemProps = {
  doc: DocMeta;
  isSelected: boolean;
  level?: number;
  onSelectDocument: (locationId: number, path: string) => void;
  onOpenDocumentOperation: (type: DocumentOperationType, doc: DocMeta, anchor?: DialogAnchor) => void;
  filenameVisibility: boolean;
  activeDropDocumentPath?: string;
  activeDropDocumentEdge?: Edge | null;
};

export function DocumentItem(
  {
    doc,
    isSelected,
    level = 1,
    onSelectDocument,
    onOpenDocumentOperation,
    filenameVisibility,
    activeDropDocumentPath,
    activeDropDocumentEdge,
  }: DocumentItemProps,
) {
  const { isOpen, position, open, close } = useContextMenu();
  const treeItemRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<"idle" | "dragging">("idle");
  const skipAnimation = useSkipAnimation();
  const locationId = doc.location_id;

  useEffect(() => {
    const element = treeItemRef.current;
    if (!element) {
      return;
    }

    return draggable({
      element,
      getInitialData: (): DocumentDragData => ({
        type: "document",
        locationId,
        relPath: doc.rel_path,
        title: doc.title || doc.rel_path.split("/").pop() || "Untitled",
      }),
      onDragStart: () => setDragState("dragging"),
      onDrop: () => setDragState("idle"),
    });
  }, [locationId, doc.rel_path, doc.title]);

  const displayLabel = useMemo(() => {
    if (filenameVisibility) {
      return doc.rel_path.split("/").pop() || "Untitled";
    }

    return doc.title || doc.rel_path.split("/").pop() || "Untitled";
  }, [doc.title, doc.rel_path, filenameVisibility]);

  const handleClick = useCallback(() => {
    onSelectDocument(locationId, doc.rel_path);
  }, [doc.rel_path, locationId, onSelectDocument]);

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    open(event);
  }, [open]);

  const handleOpen = useCallback(() => {
    onSelectDocument(locationId, doc.rel_path);
  }, [locationId, doc.rel_path, onSelectDocument]);

  const handleCopyPath = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(doc.rel_path);
    } catch (error) {
      logger.error(f("Failed to copy path to clipboard", { error }));
    }
  }, [doc.rel_path]);

  const openOperation = useCallback((type: DocumentOperationType) => {
    onOpenDocumentOperation(type, doc, { x: position.x, y: position.y });
    close();
  }, [close, doc, onOpenDocumentOperation, position.x, position.y]);

  const handleRename = useCallback(() => openOperation("rename"), [openOperation]);
  const handleMove = useCallback(() => openOperation("move"), [openOperation]);
  const handleDeleteClick = useCallback(() => openOperation("delete"), [openOperation]);

  const contextMenuItems = useMemo<(ContextMenuItem | ContextMenuDivider)[]>(
    () => [
      { label: "Open", onClick: handleOpen, icon: <FileTextIcon size="sm" /> },
      { label: "Copy Path", onClick: handleCopyPath, icon: <ClipboardIcon size="sm" /> },
      { divider: true },
      { label: "Rename", onClick: handleRename, icon: <EditIcon size="sm" /> },
      { label: "Move", onClick: handleMove, icon: <FolderIcon size="sm" /> },
      { divider: true },
      { label: "Delete", onClick: handleDeleteClick, icon: <TrashIcon size="sm" />, danger: true },
    ],
    [handleCopyPath, handleDeleteClick, handleMove, handleOpen, handleRename],
  );

  const isActiveDropDocument = activeDropDocumentPath === doc.rel_path;
  const closestEdge = isActiveDropDocument ? activeDropDocumentEdge ?? null : null;
  const edgeStyle = useMemo(() => {
    if (!closestEdge) {
      return {};
    }
    return { [closestEdge === "top" ? "top" : "bottom"]: "-1px" };
  }, [closestEdge]);

  return (
    <>
      <div
        ref={treeItemRef}
        className="relative mb-0.5"
        data-drop-document-row="true"
        data-document-path={doc.rel_path}
        data-location-id={locationId}>
        <TreeItem
          key={doc.rel_path}
          icon={FILE_TEXT_ICON}
          label={displayLabel}
          isSelected={isSelected}
          level={level}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          isDragging={dragState === "dragging"}
          isDropTarget={isActiveDropDocument} />
        {closestEdge && (
          <div
            className={cn(
              "absolute left-1 right-1 h-0.5 rounded-full bg-accent-cyan z-10 pointer-events-none sidebar-drop-edge-pulse",
              { "transition-[top,bottom] duration-150": !skipAnimation },
            )}
            style={edgeStyle} />
        )}
      </div>
      <ContextMenu isOpen={isOpen} position={position} onClose={close} items={contextMenuItems} />
    </>
  );
}
