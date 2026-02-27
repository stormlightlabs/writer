import { Button } from "$components/Button";
import { ContextMenu, ContextMenuDivider, ContextMenuItem, useContextMenu } from "$components/ContextMenu";
import { Dialog } from "$components/Dialog";
import { ClipboardIcon, EditIcon, FileTextIcon, FolderIcon, TrashIcon } from "$icons";
import type { DocMeta } from "$types";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useMemo, useState } from "react";
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
  { isOpen, onClose, currentName, onRename }: {
    isOpen: boolean;
    onClose: () => void;
    currentName: string;
    onRename: (newName: string) => Promise<void>;
  },
) {
  const [name, setName] = useState(currentName);
  const [isRenaming, setIsRenaming] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name === currentName) {
      onClose();
      return;
    }
    setIsRenaming(true);
    await onRename(name.trim());
    setIsRenaming(false);
    onClose();
  }, [name, currentName, onRename, onClose]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  useMemo(() => {
    if (isOpen) {
      setName(currentName);
    }
  }, [isOpen, currentName]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} ariaLabel="Rename document">
      <form onSubmit={handleSubmit} className="p-4 min-w-[300px]">
        <h3 className="text-sm font-medium text-text-primary mb-3">Rename Document</h3>
        <input
          type="text"
          value={name}
          onChange={handleInputChange}
          className="w-full px-3 py-2 bg-layer-02 border border-border-subtle rounded text-sm text-text-primary focus:outline-none focus:border-border-focus"
          autoFocus
          disabled={isRenaming} />
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isRenaming}>Cancel</Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isRenaming || !name.trim() || name === currentName}>
            Rename
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function MoveDialog(
  { isOpen, onClose, currentPath, onMove }: {
    isOpen: boolean;
    onClose: () => void;
    currentPath: string;
    onMove: (newPath: string) => Promise<void>;
  },
) {
  const [path, setPath] = useState(currentPath);
  const [isMoving, setIsMoving] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!path.trim() || path === currentPath) {
      onClose();
      return;
    }
    setIsMoving(true);
    await onMove(path.trim());
    setIsMoving(false);
    onClose();
  }, [path, currentPath, onMove, onClose]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPath(e.target.value);
  }, []);

  useMemo(() => {
    if (isOpen) {
      setPath(currentPath);
    }
  }, [isOpen, currentPath]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} ariaLabel="Move document">
      <form onSubmit={handleSubmit} className="p-4 min-w-[400px]">
        <h3 className="text-sm font-medium text-text-primary mb-3">Move Document</h3>
        <input
          type="text"
          value={path}
          onChange={handleInputChange}
          className="w-full px-3 py-2 bg-layer-02 border border-border-subtle rounded text-sm text-text-primary focus:outline-none focus:border-border-focus font-mono"
          autoFocus
          disabled={isMoving} />
        <p className="text-xs text-text-secondary mt-2">Enter the new relative path for the document.</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isMoving}>Cancel</Button>
          <Button type="submit" variant="primary" size="sm" disabled={isMoving || !path.trim() || path === currentPath}>
            Move
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteConfirmDialog(
  { isOpen, onClose, documentName, onDelete }: {
    isOpen: boolean;
    onClose: () => void;
    documentName: string;
    onDelete: () => Promise<void>;
  },
) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
    onClose();
  }, [onDelete, onClose]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} ariaLabel="Delete document">
      <div className="p-4 min-w-[300px]">
        <h3 className="text-sm font-medium text-text-primary mb-3">Delete Document</h3>
        <p className="text-sm text-text-secondary mb-4">
          Are you sure you want to delete{" "}
          <span className="text-text-primary font-medium">{documentName}</span>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>Cancel</Button>
          <Button type="button" variant="dangerGhost" size="sm" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </Dialog>
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
    close();
    setShowRenameDialog(true);
  }, [close]);

  const handleMove = useCallback(() => {
    close();
    setShowMoveDialog(true);
  }, [close]);

  const handleDeleteClick = useCallback(() => {
    close();
    setShowDeleteDialog(true);
  }, [close]);

  const performRename = useCallback(async (newName: string) => {
    await onRenameDocument(id, doc.rel_path, newName);
  }, [id, doc.rel_path, onRenameDocument]);

  const performMove = useCallback(async (newRelPath: string) => {
    await onMoveDocument(id, doc.rel_path, newRelPath);
  }, [id, doc.rel_path, onMoveDocument]);

  const performDelete = useCallback(async () => {
    await onDeleteDocument(id, doc.rel_path);
  }, [id, doc.rel_path, onDeleteDocument]);

  const closeRenameDialog = useCallback(() => setShowRenameDialog(false), []);
  const closeMoveDialog = useCallback(() => setShowMoveDialog(false), []);
  const closeDeleteDialog = useCallback(() => setShowDeleteDialog(false), []);

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
        onRename={performRename} />
      <MoveDialog isOpen={showMoveDialog} onClose={closeMoveDialog} currentPath={doc.rel_path} onMove={performMove} />
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={closeDeleteDialog}
        documentName={displayLabel}
        onDelete={performDelete} />
    </>
  );
}
