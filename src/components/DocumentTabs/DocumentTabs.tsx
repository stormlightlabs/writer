import { Button } from "$components/Button";
import { EMPTY_NEW_DOC_TRANSITION, NO_MOTION_TRANSITION } from "$constants";
import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import { useSkipAnimation } from "$hooks/useMotion";
import { useViewportTier } from "$hooks/useViewportTier";
import { useTabsState, useWorkspaceLocationsState } from "$state/selectors";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DocumentTab } from "./DocumentTab";
import { NewButton } from "./NewButton";

const CONTEXT_MENU_INITIAL = { opacity: 0, scale: 0.96 };
const CONTEXT_MENU_ANIMATE = { opacity: 1, scale: 1 };
const CONTEXT_MENU_EXIT = { opacity: 0, scale: 0.96 };
const CONTEXT_MENU_TRANSITION = { duration: 0.12, ease: "easeOut" as const };

type ContextMenuProps = {
  style: React.CSSProperties;
  close: () => void;
  closeOthers: () => void;
  closeAll: () => void;
};

function ContextMenu({ style, close, closeOthers, closeAll }: ContextMenuProps) {
  const { isNarrow } = useViewportTier();
  const skipAnimation = useSkipAnimation();
  const transition = useMemo(() => skipAnimation ? NO_MOTION_TRANSITION : CONTEXT_MENU_TRANSITION, [skipAnimation]);
  return (
    <motion.div
      initial={CONTEXT_MENU_INITIAL}
      animate={CONTEXT_MENU_ANIMATE}
      exit={CONTEXT_MENU_EXIT}
      transition={transition}
      className={`fixed bg-layer-02 border border-border-subtle rounded shadow-lg z-1000 p-1 ${
        isNarrow ? "min-w-[140px]" : "min-w-[160px]"
      }`}
      style={style}>
      <Button
        onClick={close}
        className="w-full px-3 py-2 bg-transparent border-none text-text-primary text-[0.8125rem] cursor-pointer text-left rounded hover:bg-layer-hover-02">
        Close
      </Button>
      <Button
        onClick={closeOthers}
        className="w-full px-3 py-2 bg-transparent border-none text-text-primary text-[0.8125rem] cursor-pointer text-left rounded hover:bg-layer-hover-02">
        Close Others
      </Button>
      <Button
        onClick={closeAll}
        className="w-full px-3 py-2 bg-transparent border-none text-text-primary text-[0.8125rem] cursor-pointer text-left rounded hover:bg-layer-hover-02">
        Close All
      </Button>
    </motion.div>
  );
}

export type DocumentTabsProps = { onNewDocument?: () => void };

export function DocumentTabs({ onNewDocument }: DocumentTabsProps) {
  const { tabs, activeTabId } = useTabsState();
  const { locations } = useWorkspaceLocationsState();
  const { handleSelectTab, handleCloseTab, handleReorderTabs, handleCreateNewDocument } = useWorkspaceController();
  const { viewportWidth, isCompact } = useViewportTier();
  const skipAnimation = useSkipAnimation();
  const [draggingTab, setDraggingTab] = useState<string | null>(null);
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const transition = useMemo(() => skipAnimation ? NO_MOTION_TRANSITION : EMPTY_NEW_DOC_TRANSITION, [skipAnimation]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu]);

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
    e.preventDefault();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    if (contextMenu) {
      handleCloseTab(contextMenu.tabId);
      setContextMenu(null);
    }
  }, [contextMenu, handleCloseTab]);

  const closeOthers = useCallback(() => {
    if (contextMenu) {
      for (const t of tabs) {
        if (t.id !== contextMenu.tabId) {
          handleCloseTab(t.id);
        }
      }
      setContextMenu(null);
    }
  }, [contextMenu, handleCloseTab, tabs]);

  const closeAll = useCallback(() => {
    for (const t of tabs) {
      handleCloseTab(t.id);
    }
    setContextMenu(null);
  }, [tabs, handleCloseTab]);

  const contextMenuStyle = useMemo(() => contextMenu ? ({ left: contextMenu.x, top: contextMenu.y }) : {}, [
    contextMenu,
  ]);

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

      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            style={contextMenuStyle}
            close={closeContextMenu}
            closeOthers={closeOthers}
            closeAll={closeAll} />
        )}
      </AnimatePresence>
    </div>
  );
}
