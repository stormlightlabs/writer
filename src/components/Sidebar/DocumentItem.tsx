import { ContextMenu, ContextMenuDivider, ContextMenuItem, useContextMenu } from "$components/ContextMenu";
import { ClipboardIcon, FileTextIcon, TrashIcon } from "$icons";
import { logger } from "$logger";
import type { DocMeta } from "$types";
import { useCallback, useMemo } from "react";
import { TreeItem } from "./TreeItem";

const fileTextIcon = { Component: FileTextIcon, size: "sm" as const };

export function DocumentItem(
  { doc, isSelected, selectedDocPath, onSelectDocument, id }: {
    doc: DocMeta;
    isSelected: boolean;
    selectedDocPath?: string;
    onSelectDocument: (id: number, path: string) => void;
    id: number;
  },
) {
  const { isOpen, position, open, close } = useContextMenu();

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
      logger.error("Failed to copy path to clipboard", { error });
    }
  }, [doc.rel_path]);

  const handleDelete = useCallback(() => {
    logger.info("Delete document requested", { locationId: id, path: doc.rel_path });
  }, [id, doc.rel_path]);

  const contextMenuItems = useMemo<(ContextMenuItem | ContextMenuDivider)[]>(
    () => [
      { label: "Open", onClick: handleOpen, icon: <FileTextIcon size="sm" /> },
      { label: "Copy Path", onClick: handleCopyPath, icon: <ClipboardIcon size="sm" /> },
      { divider: true },
      { label: "Delete", onClick: handleDelete, icon: <TrashIcon size="sm" />, danger: true },
    ],
    [handleOpen, handleCopyPath, handleDelete],
  );

  return (
    <>
      <TreeItem
        key={doc.rel_path}
        icon={fileTextIcon}
        label={doc.title || doc.rel_path.split("/").pop() || "Untitled"}
        isSelected={isSelected && selectedDocPath === doc.rel_path}
        level={1}
        onClick={handleClick}
        onContextMenu={handleContextMenu} />
      <ContextMenu isOpen={isOpen} position={position} onClose={close} items={contextMenuItems} />
    </>
  );
}
