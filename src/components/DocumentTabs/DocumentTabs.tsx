import { ContextMenu, useContextMenu } from "$components/ContextMenu";
import { EMPTY_NEW_DOC_TRANSITION, NO_MOTION_TRANSITION } from "$constants";
import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import { useSkipAnimation } from "$hooks/useMotion";
import { useViewportTier } from "$hooks/useViewportTier";
import { useTabsState, useWorkspaceLocationsState } from "$state/selectors";
import { useCallback, useMemo, useRef, useState } from "react";
import { DocumentTab } from "./DocumentTab";
import { NewButton } from "./NewButton";

export type DocumentTabsProps = { onNewDocument?: () => void };

export function DocumentTabs({ onNewDocument }: DocumentTabsProps) {
  const { tabs, activeTabId } = useTabsState();
  const { locations } = useWorkspaceLocationsState();
  const { handleSelectTab, handleCloseTab, handleReorderTabs, handleCreateNewDocument } = useWorkspaceController();
  const { viewportWidth, isCompact } = useViewportTier();
  const skipAnimation = useSkipAnimation();
  const [draggingTab, setDraggingTab] = useState<string | null>(null);
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);
  const [contextMenuTabId, setContextMenuTabId] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const { isOpen: isContextMenuOpen, position: contextMenuPosition, open: openContextMenu, close: closeContextMenu } =
    useContextMenu();

  const transition = useMemo(() => skipAnimation ? NO_MOTION_TRANSITION : EMPTY_NEW_DOC_TRANSITION, [skipAnimation]);

  const handleDragStart = useCallback((e: React.DragEvent, tabId: string) => {
    setDraggingTab(tabId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    if (draggingTab && draggingTab !== tabId) {
      setDragOverTab(tabId);
    }
  }, [draggingTab]);

  const handleDrop = useCallback((e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (draggingTab && draggingTab !== targetTabId && handleReorderTabs) {
      const newTabs = [...tabs];
      const fromIndex = newTabs.findIndex((t) => t.id === draggingTab);
      const toIndex = newTabs.findIndex((t) => t.id === targetTabId);
      if (fromIndex !== -1 && toIndex !== -1) {
        const [movedTab] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, movedTab);
        handleReorderTabs(newTabs);
      }
    }
    setDraggingTab(null);
    setDragOverTab(null);
  }, [draggingTab, handleReorderTabs, tabs]);

  const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    setContextMenuTabId(tabId);
    openContextMenu(e);
  }, [openContextMenu]);

  const closeCurrentTab = useCallback(() => {
    if (contextMenuTabId) {
      handleCloseTab(contextMenuTabId);
    }
  }, [contextMenuTabId, handleCloseTab]);

  const closeOtherTabs = useCallback(() => {
    if (contextMenuTabId) {
      for (const t of tabs) {
        if (t.id !== contextMenuTabId) {
          handleCloseTab(t.id);
        }
      }
    }
  }, [contextMenuTabId, handleCloseTab, tabs]);

  const closeAllTabs = useCallback(() => {
    for (const t of tabs) {
      handleCloseTab(t.id);
    }
  }, [tabs, handleCloseTab]);

  const contextMenuItems = useMemo(
    () => [{ label: "Close", onClick: closeCurrentTab }, { label: "Close Others", onClick: closeOtherTabs }, {
      label: "Close All",
      onClick: closeAllTabs,
    }],
    [closeCurrentTab, closeOtherTabs, closeAllTabs],
  );

  const compactTabs = useMemo(() => isCompact || viewportWidth < 860, [isCompact, viewportWidth]);

  const handleNewDocument = useMemo(
    () => (locations.length > 0 ? onNewDocument ?? (() => handleCreateNewDocument()) : void 0),
    [locations.length, onNewDocument, handleCreateNewDocument],
  );

  if (tabs.length === 0) {
    return (
      <div className="h-tab bg-bg-primary border-b border-border-subtle flex items-center justify-between pl-4 pr-3 text-text-placeholder text-[0.8125rem]">
        <span>No documents open</span>
        <NewButton onNewDocument={handleNewDocument} hasTabs={false} transition={transition} />
      </div>
    );
  }

  return (
    <div
      ref={tabsRef}
      className="h-tab bg-bg-primary border-b border-border-subtle flex overflow-x-auto overflow-y-hidden"
      data-compact-tabs={compactTabs}>
      {tabs.map((tab) => (
        <DocumentTab
          key={tab.id}
          tab={tab}
          activeTabId={activeTabId}
          dragOverTab={dragOverTab}
          draggingTab={draggingTab}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          handleContextMenu={handleContextMenu}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          compact={compactTabs} />
      ))}
      <NewButton onNewDocument={handleNewDocument} hasTabs transition={transition} />

      <ContextMenu
        isOpen={isContextMenuOpen}
        position={contextMenuPosition}
        onClose={closeContextMenu}
        items={contextMenuItems} />
    </div>
  );
}
