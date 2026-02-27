import { ContextMenu, ContextMenuDivider, ContextMenuItem, useContextMenu } from "$components/ContextMenu";
import { ClipboardIcon, EditIcon, FileTextIcon, FolderIcon, TrashIcon } from "$icons";
import type { DocMeta } from "$types";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type DialogAnchor, OperationDialog } from "./OperationDialog";
import { TreeItem } from "./TreeItem";

const fileTextIcon = { Component: FileTextIcon, size: "sm" as const };

type DocumentItemProps = {
  doc: DocMeta;
  isSelected: boolean;
  selectedDocPath?: string;
  onSelectDocument: (id: number, path: string) => void;
  onRenameDocument: (locationId: number, relPath: string, newName: string) => Promise<boolean>;
  onMoveDocument: (locationId: number, relPath: string, newRelPath: string) => Promise<boolean>;
  onDeleteDocument: (locationId: number, relPath: string) => Promise<boolean>;
  filenameVisibility: boolean;
  id: number;
};

function RenameDialog(
  { isOpen, onClose, currentName, onRename, anchor }: {
    isOpen: boolean;
    onClose: () => void;
    currentName: string;
    onRename: (newName: string) => Promise<boolean>;
    anchor?: DialogAnchor;
  },
) {
  const [name, setName] = useState(currentName);
  const [isRenaming, setIsRenaming] = useState(false);
  const formId = "rename-document-form";
  const inputId = "rename-document-input";

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name === currentName) {
      onClose();
      return;
    }
    setIsRenaming(true);
    try {
      const renamed = await onRename(name.trim());
      if (renamed) {
        onClose();
      }
    } finally {
      setIsRenaming(false);
    }
  }, [name, currentName, onRename, onClose]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
    }
  }, [isOpen, currentName]);

  return (
    <OperationDialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Rename document"
      title="Rename Document"
      description="Update the filename in the current location."
      anchor={anchor}
      confirmLabel="Rename"
      pendingLabel="Renaming..."
      confirmButtonType="submit"
      confirmFormId={formId}
      confirmDisabled={!name.trim() || name === currentName}
      isPending={isRenaming}>
      <form id={formId} onSubmit={handleSubmit} className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wide text-text-secondary" htmlFor={inputId}>
          New name
        </label>
        <input
          id={inputId}
          type="text"
          value={name}
          onChange={handleInputChange}
          className="w-full rounded-md border border-border-subtle bg-layer-02 px-3 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
          autoFocus
          disabled={isRenaming} />
      </form>
    </OperationDialog>
  );
}

function MoveDialog(
  { isOpen, onClose, currentPath, onMove, anchor }: {
    isOpen: boolean;
    onClose: () => void;
    currentPath: string;
    onMove: (newPath: string) => Promise<boolean>;
    anchor?: DialogAnchor;
  },
) {
  const [path, setPath] = useState(currentPath);
  const [isMoving, setIsMoving] = useState(false);
  const formId = "move-document-form";
  const inputId = "move-document-input";

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!path.trim() || path === currentPath) {
      onClose();
      return;
    }
    setIsMoving(true);
    try {
      const moved = await onMove(path.trim());
      if (moved) {
        onClose();
      }
    } finally {
      setIsMoving(false);
    }
  }, [path, currentPath, onMove, onClose]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPath(e.target.value);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPath(currentPath);
    }
  }, [isOpen, currentPath]);

  return (
    <OperationDialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Move document"
      title="Move Document"
      description="Provide the destination relative path."
      anchor={anchor}
      confirmLabel="Move"
      pendingLabel="Moving..."
      confirmButtonType="submit"
      confirmFormId={formId}
      confirmDisabled={!path.trim() || path === currentPath}
      isPending={isMoving}
      widthClassName="w-[min(94vw,460px)]">
      <form id={formId} onSubmit={handleSubmit} className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wide text-text-secondary" htmlFor={inputId}>
          New path
        </label>
        <input
          id={inputId}
          type="text"
          value={path}
          onChange={handleInputChange}
          className="w-full rounded-md border border-border-subtle bg-layer-02 px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
          autoFocus
          disabled={isMoving} />
        <p className="text-xs text-text-secondary mt-2">Enter the new relative path for the document.</p>
      </form>
    </OperationDialog>
  );
}

function DeleteConfirmDialog(
  { isOpen, onClose, documentName, onDelete, anchor }: {
    isOpen: boolean;
    onClose: () => void;
    documentName: string;
    onDelete: () => Promise<boolean>;
    anchor?: DialogAnchor;
  },
) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const deleted = await onDelete();
      if (deleted) {
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete, onClose]);

  return (
    <OperationDialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Delete document"
      title="Delete Document"
      description="This cannot be undone."
      anchor={anchor}
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      isPending={isDeleting}
      onConfirm={handleDelete}
      tone="danger">
      <p className="m-0 text-sm text-text-secondary">
        Are you sure you want to delete{" "}
        <span className="text-text-primary font-medium">{documentName}</span>? This action cannot be undone.
      </p>
    </OperationDialog>
  );
}

export function DocumentItem(
  {
    doc,
    isSelected,
    selectedDocPath,
    onSelectDocument,
    onRenameDocument,
    onMoveDocument,
    onDeleteDocument,
    filenameVisibility: filenameVisibility,
    id,
  }: DocumentItemProps,
) {
  const { isOpen, position, open, close } = useContextMenu();
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [operationAnchor, setOperationAnchor] = useState<DialogAnchor | undefined>();

  const displayLabel = useMemo(() => {
    if (filenameVisibility) {
      return doc.rel_path.split("/").pop() || "Untitled";
    }
    return doc.title || doc.rel_path.split("/").pop() || "Untitled";
  }, [doc.title, doc.rel_path, filenameVisibility]);

  const handleClick = useCallback(() => onSelectDocument(id, doc.rel_path), [id, onSelectDocument, doc.rel_path]);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    open(e);
  }, [open]);

  const handleOpen = useCallback(() => {
    onSelectDocument(id, doc.rel_path);
  }, [id, doc.rel_path, onSelectDocument]);

  const handleCopyPath = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(doc.rel_path);
    } catch (error) {
      logger.error(f("Failed to copy path to clipboard", { error }));
    }
  }, [doc.rel_path]);

  const handleRename = useCallback(() => {
    setOperationAnchor({ x: position.x, y: position.y });
    close();
    setShowRenameDialog(true);
  }, [close, position.x, position.y]);

  const handleMove = useCallback(() => {
    setOperationAnchor({ x: position.x, y: position.y });
    close();
    setShowMoveDialog(true);
  }, [close, position.x, position.y]);

  const handleDeleteClick = useCallback(() => {
    setOperationAnchor({ x: position.x, y: position.y });
    close();
    setShowDeleteDialog(true);
  }, [close, position.x, position.y]);

  const performRename = useCallback((newName: string) => {
    return onRenameDocument(id, doc.rel_path, newName);
  }, [id, doc.rel_path, onRenameDocument]);

  const performMove = useCallback((newRelPath: string) => {
    return onMoveDocument(id, doc.rel_path, newRelPath);
  }, [id, doc.rel_path, onMoveDocument]);

  const performDelete = useCallback(() => {
    return onDeleteDocument(id, doc.rel_path);
  }, [id, doc.rel_path, onDeleteDocument]);

  const closeRenameDialog = useCallback(() => {
    setShowRenameDialog(false);
    setOperationAnchor(undefined);
  }, []);

  const closeMoveDialog = useCallback(() => {
    setShowMoveDialog(false);
    setOperationAnchor(undefined);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setShowDeleteDialog(false);
    setOperationAnchor(undefined);
  }, []);

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
    [handleOpen, handleCopyPath, handleRename, handleMove, handleDeleteClick],
  );

  const currentFilename = doc.rel_path.split("/").pop() || "";

  return (
    <>
      <TreeItem
        key={doc.rel_path}
        icon={fileTextIcon}
        label={displayLabel}
        isSelected={isSelected && selectedDocPath === doc.rel_path}
        level={1}
        onClick={handleClick}
        onContextMenu={handleContextMenu} />
      <ContextMenu isOpen={isOpen} position={position} onClose={close} items={contextMenuItems} />
      <RenameDialog
        isOpen={showRenameDialog}
        onClose={closeRenameDialog}
        currentName={currentFilename}
        onRename={performRename}
        anchor={operationAnchor} />
      <MoveDialog
        isOpen={showMoveDialog}
        onClose={closeMoveDialog}
        currentPath={doc.rel_path}
        onMove={performMove}
        anchor={operationAnchor} />
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={closeDeleteDialog}
        documentName={displayLabel}
        onDelete={performDelete}
        anchor={operationAnchor} />
    </>
  );
}
