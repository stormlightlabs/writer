import { useCallback, useMemo } from "react";
import type { DocMeta } from "../../types";
import { FileTextIcon } from "../icons";
import { TreeItem } from "./TreeItem";

export function DocumentItem(
  { doc, isSelected, selectedDocPath, onSelectDocument, id }: {
    doc: DocMeta;
    isSelected: boolean;
    selectedDocPath?: string;
    onSelectDocument: (id: number, path: string) => void;
    id: number;
  },
) {
  const fileTextIcon = useMemo(() => ({ Component: FileTextIcon, size: 14 }), []);
  const handleClick = useCallback(() => onSelectDocument(id, doc.rel_path), [id, onSelectDocument]);
  return (
    <TreeItem
      key={doc.rel_path}
      icon={fileTextIcon}
      label={doc.title || doc.rel_path.split("/").pop() || "Untitled"}
      isSelected={isSelected && selectedDocPath === doc.rel_path}
      level={1}
      onClick={handleClick} />
  );
}
