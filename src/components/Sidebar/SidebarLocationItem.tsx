import { Button } from "$components/Button";
import { FolderIcon, MoreVerticalIcon, RefreshIcon } from "$icons";
import type { SidebarRefreshReason } from "$state/types";
import { DocMeta, LocationDescriptor } from "$types";
import type { Dispatch, MouseEventHandler, SetStateAction } from "react";
import { memo, useCallback, useMemo } from "react";
import { DocumentItem } from "./DocumentItem";
import { EmptyDocuments } from "./EmptyDocuments";
import { RemoveButton } from "./RemoveButton";
import { TreeItem } from "./TreeItem";

const folderIcon = { Component: FolderIcon, size: "md" as const };

const FolderItem = (
  { name, isSelected, selectedDocPath, isExpanded, onItemClick, onToggleClick, actionProps }: {
    name: string;
    isSelected: boolean;
    selectedDocPath?: string;
    isExpanded: boolean;
    onItemClick: () => void;
    onToggleClick: () => void;
    actionProps: LocationActionProps;
  },
) => (
  <div className="relative">
    <TreeItem
      icon={folderIcon}
      label={name}
      isSelected={isSelected && !selectedDocPath}
      isExpanded={isExpanded}
      hasChildren
      level={0}
      onClick={onItemClick}
      onToggle={onToggleClick}>
      <LocationActions {...actionProps} />
    </TreeItem>
  </div>
);

type LocationActionProps = {
  isMenuOpen: boolean;
  handleMenuClick: MouseEventHandler<HTMLButtonElement>;
  handleRemoveClick: () => void;
  handleMouseEnter: MouseEventHandler<HTMLButtonElement>;
  handleMouseLeave: MouseEventHandler<HTMLButtonElement>;
};

const LocationActions = (
  { isMenuOpen, handleMenuClick, handleRemoveClick, handleMouseEnter, handleMouseLeave }: LocationActionProps,
) => (
  <div className="relative" data-location-menu-root>
    <Button
      onClick={handleMenuClick}
      data-location-menu-button
      className="location-actions-btn w-5 h-5 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      <MoreVerticalIcon size="sm" />
    </Button>
    <RemoveButton
      isMenuOpen={isMenuOpen}
      handleRemoveClick={handleRemoveClick}
      handleMouseEnter={handleMouseEnter}
      handleMouseLeave={handleMouseLeave} />
  </div>
);

const RefreshStatus = ({ reason }: { reason: SidebarRefreshReason | null }) => (
  <div className="px-6 py-2 text-text-placeholder text-[11px] flex items-center gap-1.5">
    <RefreshIcon size="xs" className="animate-spin" />
    <span>{reason === "save" ? "Updating after save..." : "Refreshing files..."}</span>
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
  onSelectDocument: (id: number, path: string) => void;
  setShowLocationMenu: Dispatch<SetStateAction<number | null>>;
  documents: DocMeta[];
  isRefreshing: boolean;
  refreshReason: SidebarRefreshReason | null;
  filterText: string;
  isMenuOpen: boolean;
};

function SidebarLocationItemComponent(
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
    isRefreshing,
    refreshReason,
    filterText,
    isMenuOpen,
  }: SidebarLocationItemProps,
) {
  const handleRemoveClick = useCallback(() => {
    onRemove(location.id);
    setShowLocationMenu(null);
  }, [location.id, onRemove, setShowLocationMenu]);

  const handleMenuClick: MouseEventHandler<HTMLButtonElement> = useCallback((event) => {
    event.stopPropagation();
    setShowLocationMenu((current) => current === location.id ? null : location.id);
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

  const actionProps = useMemo(
    () => ({ isMenuOpen, handleMenuClick, handleRemoveClick, handleMouseEnter, handleMouseLeave }),
    [isMenuOpen, handleMenuClick, handleRemoveClick, handleMouseEnter, handleMouseLeave],
  );

  return (
    <div>
      <FolderItem
        name={location.name}
        isSelected={isSelected && !selectedDocPath}
        selectedDocPath={selectedDocPath}
        isExpanded={isExpanded}
        onItemClick={onItemClick}
        onToggleClick={onToggleClick}
        actionProps={actionProps} />

      {isExpanded && isSelected && (
        <div>
          {isRefreshing ? <RefreshStatus reason={refreshReason} /> : null}
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

export const SidebarLocationItem = memo(SidebarLocationItemComponent);
