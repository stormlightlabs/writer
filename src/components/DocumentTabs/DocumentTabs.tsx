import type { Tab } from "$types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DocumentTab } from "./DocumentTab";

export type DocumentTabsProps = {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onReorderTabs?: (tabs: Tab[]) => void;
};

export function DocumentTabs({ tabs, activeTabId, onSelectTab, onCloseTab, onReorderTabs }: DocumentTabsProps) {
  const [draggingTab, setDraggingTab] = useState<string | null>(null);
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

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
    if (draggingTab && draggingTab !== targetTabId && onReorderTabs) {
      const newTabs = [...tabs];
      const fromIndex = newTabs.findIndex((t) => t.id === draggingTab);
      const toIndex = newTabs.findIndex((t) => t.id === targetTabId);
      if (fromIndex !== -1 && toIndex !== -1) {
        const [movedTab] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, movedTab);
        onReorderTabs(newTabs);
      }
    }
    setDraggingTab(null);
    setDragOverTab(null);
  }, [draggingTab, onReorderTabs, tabs]);

  const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    if (contextMenu) {
      onCloseTab(contextMenu.tabId);
      setContextMenu(null);
    }
  }, [contextMenu]);

  const closeOthers = useCallback(() => {
    if (contextMenu) {
      for (const t of tabs) {
        if (t.id !== contextMenu.tabId) {
          onCloseTab(t.id);
        }
      }
      setContextMenu(null);
    }
  }, [contextMenu]);

  const closeAll = useCallback(() => {
    for (const t of tabs) {
      onCloseTab(t.id);
    }
    setContextMenu(null);
  }, [tabs]);

  const contextMenuStyle = useMemo(() => contextMenu ? ({ left: contextMenu.x, top: contextMenu.y }) : {}, [
    contextMenu,
  ]);

  if (tabs.length === 0) {
    return (
      <div className="h-tab bg-bg-primary border-b border-border-subtle flex items-center pl-4 text-text-placeholder text-[0.8125rem]">
        No documents open
      </div>
    );
  }

  return (
    <div
      ref={tabsRef}
      className="h-tab bg-bg-primary border-b border-border-subtle flex overflow-x-auto overflow-y-hidden">
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
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab} />
      ))}

      {contextMenu && (
        <div
          className="fixed bg-layer-02 border border-border-subtle rounded shadow-lg z-1000 min-w-[160px] p-1"
          style={contextMenuStyle}>
          <button
            onClick={closeContextMenu}
            className="w-full px-3 py-2 bg-transparent border-none text-text-primary text-[0.8125rem] cursor-pointer text-left rounded hover:bg-layer-hover-02">
            Close
          </button>
          <button
            onClick={closeOthers}
            className="w-full px-3 py-2 bg-transparent border-none text-text-primary text-[0.8125rem] cursor-pointer text-left rounded hover:bg-layer-hover-02">
            Close Others
          </button>
          <button
            onClick={closeAll}
            className="w-full px-3 py-2 bg-transparent border-none text-text-primary text-[0.8125rem] cursor-pointer text-left rounded hover:bg-layer-hover-02">
            Close All
          </button>
        </div>
      )}
    </div>
  );
}
