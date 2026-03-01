import type { DocMeta } from "$types";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type DialogAnchor, OperationDialog } from "./OperationDialog";

export type DocumentOperationType = "rename" | "move" | "delete";

export type DocumentOperationRequest = { type: DocumentOperationType; doc: DocMeta; anchor?: DialogAnchor };

type DocumentOperationDialogProps = {
  operation: DocumentOperationRequest | null;
  onClose: () => void;
  onRenameDocument: (locationId: number, relPath: string, newName: string) => Promise<boolean>;
  onMoveDocument: (locationId: number, relPath: string, newRelPath: string) => Promise<boolean>;
  onDeleteDocument: (locationId: number, relPath: string) => Promise<boolean>;
  onRefreshSidebar: (locationId?: number) => void;
};

export function DocumentOperationDialog(
  { operation, onClose, onRenameDocument, onMoveDocument, onDeleteDocument, onRefreshSidebar }:
    DocumentOperationDialogProps,
) {
  const [renameName, setRenameName] = useState("");
  const [movePath, setMovePath] = useState("");
  const [isPending, setIsPending] = useState(false);

  const activeDoc = operation?.doc ?? null;
  const operationType = operation?.type;
  const currentFilename = useMemo(() => activeDoc?.rel_path.split("/").pop() || "", [activeDoc?.rel_path]);
  const currentPath = activeDoc?.rel_path ?? "";
  const displayLabel = useMemo(() => {
    if (!activeDoc) {
      return "";
    }
    return activeDoc.title || activeDoc.rel_path.split("/").pop() || "Untitled";
  }, [activeDoc]);
  const renameConfirm = useMemo(() => ({ type: "submit" as const, formId: "rename-document-form" }), []);
  const moveConfirm = useMemo(() => ({ type: "submit" as const, formId: "move-document-form" }), []);

  useEffect(() => {
    if (!operation) {
      return;
    }

    setRenameName(operation.doc.rel_path.split("/").pop() || "");
    setMovePath(operation.doc.rel_path);
    setIsPending(false);
  }, [operation]);

  const closeDialog = useCallback(() => {
    if (!isPending) {
      onClose();
    }
  }, [isPending, onClose]);

  const handleRenameSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!activeDoc) {
      return;
    }

    const nextName = renameName.trim();
    if (!nextName || nextName === currentFilename) {
      closeDialog();
      return;
    }

    setIsPending(true);
    try {
      const renamed = await onRenameDocument(activeDoc.location_id, activeDoc.rel_path, nextName);
      if (!renamed) {
        return;
      }

      onRefreshSidebar(activeDoc.location_id);
      onClose();
    } finally {
      setIsPending(false);
    }
  }, [activeDoc, closeDialog, currentFilename, onClose, onRefreshSidebar, onRenameDocument, renameName]);

  const handleMoveSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!activeDoc) {
      return;
    }

    const nextPath = movePath.trim();
    if (!nextPath || nextPath === currentPath) {
      closeDialog();
      return;
    }

    setIsPending(true);
    try {
      const moved = await onMoveDocument(activeDoc.location_id, activeDoc.rel_path, nextPath);
      if (!moved) {
        return;
      }

      onRefreshSidebar(activeDoc.location_id);
      onClose();
    } finally {
      setIsPending(false);
    }
  }, [activeDoc, closeDialog, currentPath, movePath, onClose, onMoveDocument, onRefreshSidebar]);

  const handleDelete = useCallback(async () => {
    if (!activeDoc) {
      return;
    }

    setIsPending(true);
    try {
      const deleted = await onDeleteDocument(activeDoc.location_id, activeDoc.rel_path);
      if (!deleted) {
        return;
      }

      onRefreshSidebar(activeDoc.location_id);
      onClose();
    } finally {
      setIsPending(false);
    }
  }, [activeDoc, onClose, onDeleteDocument, onRefreshSidebar]);

  const deleteConfirm = useMemo(() => ({ type: "action" as const, onConfirm: handleDelete }), [handleDelete]);

  const handleRenameNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setRenameName(event.target.value);
  }, []);

  const handleMovePathChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setMovePath(event.target.value);
  }, []);

  if (!operation || !activeDoc || !operationType) {
    return null;
  }

  if (operationType === "rename") {
    return (
      <OperationDialog
        isOpen
        onClose={closeDialog}
        ariaLabel="Rename document"
        title="Rename Document"
        description="Update the filename in the current location."
        anchor={operation.anchor}
        confirmLabel="Rename"
        pendingLabel="Renaming..."
        confirm={renameConfirm}
        confirmDisabled={!renameName.trim() || renameName === currentFilename}
        isPending={isPending}>
        <form id="rename-document-form" onSubmit={handleRenameSubmit} className="space-y-1.5">
          <label
            className="text-xs font-medium uppercase tracking-wide text-text-secondary"
            htmlFor="rename-document-input">
            New name
          </label>
          <input
            id="rename-document-input"
            type="text"
            value={renameName}
            onChange={handleRenameNameChange}
            className="w-full rounded-md border border-border-subtle bg-layer-02 px-3 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
            autoFocus
            disabled={isPending} />
        </form>
      </OperationDialog>
    );
  }

  if (operationType === "move") {
    return (
      <OperationDialog
        isOpen
        onClose={closeDialog}
        ariaLabel="Move document"
        title="Move Document"
        description="Provide the destination relative path."
        anchor={operation.anchor}
        confirmLabel="Move"
        pendingLabel="Moving..."
        confirm={moveConfirm}
        confirmDisabled={!movePath.trim() || movePath === currentPath}
        isPending={isPending}
        widthClassName="w-[min(94vw,460px)]">
        <form id="move-document-form" onSubmit={handleMoveSubmit} className="space-y-1.5">
          <label
            className="text-xs font-medium uppercase tracking-wide text-text-secondary"
            htmlFor="move-document-input">
            New path
          </label>
          <input
            id="move-document-input"
            type="text"
            value={movePath}
            onChange={handleMovePathChange}
            className="w-full rounded-md border border-border-subtle bg-layer-02 px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
            autoFocus
            disabled={isPending} />
          <p className="text-xs text-text-secondary mt-2">Enter the new relative path for the document.</p>
        </form>
      </OperationDialog>
    );
  }

  return (
    <OperationDialog
      isOpen
      onClose={closeDialog}
      ariaLabel="Delete document"
      title="Delete Document"
      description="This cannot be undone."
      anchor={operation.anchor}
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      confirm={deleteConfirm}
      isPending={isPending}
      tone="danger">
      <p className="m-0 text-sm text-text-secondary">
        Are you sure you want to delete{" "}
        <span className="text-text-primary font-medium">{displayLabel}</span>? This action cannot be undone.
      </p>
    </OperationDialog>
  );
}
