import type { ChangeEventHandler, FormEvent } from "react";
import { useMemo } from "react";
import { OperationDialog } from "./OperationDialog";

type DnDMoveDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  entityLabel: "document" | "folder";
  formId: string;
  path: string;
  onPathChange: ChangeEventHandler<HTMLInputElement>;
  onSubmit: (event: FormEvent) => Promise<void>;
  isPending: boolean;
  confirmDisabled: boolean;
};

export function DnDMoveDialog(
  { isOpen, onClose, entityLabel, formId, path, onPathChange, onSubmit, isPending, confirmDisabled }:
    DnDMoveDialogProps,
) {
  const confirmAction = useMemo(() => ({ type: "submit" as const, formId }), [formId]);

  return (
    <OperationDialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={`Move ${entityLabel}`}
      title={`Move ${entityLabel === "folder" ? "Folder" : "Document"}`}
      description={`Update the destination path for this ${entityLabel}. Use slashes to create nested folders automatically.`}
      confirmLabel="Move"
      pendingLabel="Moving..."
      confirm={confirmAction}
      confirmDisabled={confirmDisabled}
      isPending={isPending}
      widthClassName="w-[min(94vw,460px)]">
      <form id={formId} onSubmit={onSubmit} className="space-y-2">
        <label
          htmlFor="sidebar-drop-move-input"
          className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          Destination path
        </label>
        <input
          id="sidebar-drop-move-input"
          type="text"
          value={path}
          onChange={onPathChange}
          className="w-full rounded-md border border-border-subtle bg-layer-02 px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
          autoFocus
          disabled={isPending} />
      </form>
    </OperationDialog>
  );
}
