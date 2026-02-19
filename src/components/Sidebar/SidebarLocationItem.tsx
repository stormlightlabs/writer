import { FolderIcon, MoreVerticalIcon } from "$icons";
import { DocMeta, LocationDescriptor } from "$types";
import { MouseEventHandler, useCallback, useMemo } from "react";
import { DocumentItem } from "./DocumentItem";
import { EmptyDocuments } from "./EmptyDocuments";
import { RemoveButton } from "./RemoveButton";
import { TreeItem } from "./TreeItem";

type SidebarLocationItemProps = {
  location: LocationDescriptor;
  isSelected: boolean;
  selectedDocPath?: string;
  isExpanded: boolean;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onSelectDocument: (id: number, path: string) => void;
  setShowLocationMenu: (id: number | null) => void;
  documents: DocMeta[];
  filterText: string;
  isMenuOpen: boolean;
};

export function SidebarLocationItem(
  {
    location,
    isSelected,
    selectedDocPath,
    isExpanded,
    onSelect,
    onToggle,
    onRemove,
    onSelectDocument,
    setShowLocationMenu,
    documents,
    filterText,
    isMenuOpen,
  }: SidebarLocationItemProps,
) {
  const handleRemoveClick = useCallback(() => {
    onRemove(location.id);
    setShowLocationMenu(null);
  }, [location.id, setShowLocationMenu]);

  const handleMenuClick = useCallback(() => {
    setShowLocationMenu(location.id);
  }, [location.id, setShowLocationMenu]);

  const handleMouseEnter: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    (e.currentTarget as HTMLButtonElement).classList.add("bg-support-error", "text-white");
    (e.currentTarget as HTMLButtonElement).classList.remove("text-support-error");
  }, []);

  const handleMouseLeave: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    (e.currentTarget as HTMLButtonElement).classList.remove("bg-support-error", "text-white");
    (e.currentTarget as HTMLButtonElement).classList.add("text-support-error");
  }, []);

  const onItemClick = useCallback(() => {
    onSelect(location.id);
  }, [location.id, onSelect]);

  const onToggleClick = useCallback(() => {
    onToggle(location.id);
  }, [location.id, onToggle]);

  const folderIcon = useMemo(() => ({ Component: FolderIcon, size: "md" as const }), []);

  const LocationActions = useCallback(() => (
    <div className="relative">
      <button
        onClick={handleMenuClick}
        className="location-actions-btn w-5 h-5 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <MoreVerticalIcon size="sm" />
      </button>
      <RemoveButton
        isMenuOpen={isMenuOpen}
        handleRemoveClick={handleRemoveClick}
        handleMouseEnter={handleMouseEnter}
        handleMouseLeave={handleMouseLeave} />
    </div>
  ), [isMenuOpen, handleMenuClick, handleRemoveClick, handleMouseEnter, handleMouseLeave]);

  return (
    <div>
      <div className="relative">
        <TreeItem
          icon={folderIcon}
          label={location.name}
          isSelected={isSelected && !selectedDocPath}
          isExpanded={isExpanded}
          hasChildren
          level={0}
          onClick={onItemClick}
          onToggle={onToggleClick}
          Actions={LocationActions} />
      </div>

      {isExpanded && isSelected && (
        <div>
          {documents.length === 0
            ? <EmptyDocuments filterText={filterText} />
            : (documents.map((doc) => (
              <DocumentItem
                key={doc.rel_path}
                doc={doc}
                isSelected={isSelected && selectedDocPath === doc.rel_path}
                onSelectDocument={onSelectDocument}
                id={location.id} />
            )))}
        </div>
      )}
    </div>
  );
}
