import { Button } from "$components/Button";
import { ContextMenu, ContextMenuDivider, ContextMenuItem, useContextMenu } from "$components/ContextMenu";
import { FolderIcon, MoreVerticalIcon, RefreshIcon, TrashIcon } from "$icons";
import type { SidebarRefreshReason } from "$state/types";
import { DocMeta, LocationDescriptor } from "$types";
import type { Dispatch, MouseEventHandler, SetStateAction } from "react";
import { memo, useCallback, useMemo } from "react";
import { DocumentItem } from "./DocumentItem";
import { EmptyDocuments } from "./EmptyDocuments";
import { RemoveButton } from "./RemoveButton";
import { TreeItem } from "./TreeItem";

const folderIcon = { Component: FolderIcon, size: "md" as const };

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
  showFilenamesInsteadOfTitles: boolean;
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
    showFilenamesInsteadOfTitles,
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

  return (
    <div>
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
            : (documents.map((doc) => (
              <DocumentItem
                key={doc.rel_path}
                doc={doc}
                isSelected={isSelected && selectedDocPath === doc.rel_path}
                onSelectDocument={onSelectDocument}
                onRenameDocument={onRenameDocument}
                onMoveDocument={onMoveDocument}
                onDeleteDocument={onDeleteDocument}
                showFilenamesInsteadOfTitles={showFilenamesInsteadOfTitles}
                id={location.id} />
            )))}
        </div>
      )}
    </div>
  );
}

export const SidebarLocationItem = memo(SidebarLocationItemComponent);
