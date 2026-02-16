import type { DragEventHandler, MouseEventHandler } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DocRef } from "../ports";
import { XIcon } from "./icons";

export type Tab = { id: string; docRef: DocRef; title: string; isModified: boolean; isPinned?: boolean };

export type DocumentTabsProps = {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onReorderTabs?: (tabs: Tab[]) => void;
};

type DocumentTabProps = {
  tab: Tab;
  activeTabId: string | null;
  dragOverTab: string | null;
  draggingTab: string | null;
  handleDragStart: (e: React.DragEvent, tabId: string) => void;
  handleDragOver: (e: React.DragEvent, tabId: string) => void;
  handleDrop: (e: React.DragEvent, tabId: string) => void;
  handleContextMenu: (e: React.MouseEvent, tabId: string) => void;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
};

const DocumentTab = (
  {
    tab,
    activeTabId,
    dragOverTab,
    draggingTab,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleContextMenu,
    onSelectTab,
    onCloseTab,
  }: DocumentTabProps,
) => {
  const isActive = tab.id === activeTabId;
  const isDragOver = tab.id === dragOverTab;
  const onDragStart: DragEventHandler<HTMLDivElement> = useCallback((e) => {
    handleDragStart(e, tab.id);
  }, [tab.id]);

  const onDragOver: DragEventHandler<HTMLDivElement> = useCallback((e) => {
    handleDragOver(e, tab.id);
  }, [tab.id]);

  const onDrop: DragEventHandler<HTMLDivElement> = useCallback((e) => {
    handleDrop(e, tab.id);
  }, [tab.id]);

  const onContextMenu: MouseEventHandler<HTMLDivElement> = useCallback((e) => {
    handleContextMenu(e, tab.id);
  }, [tab.id]);

  const onClick: MouseEventHandler<HTMLDivElement> = useCallback(() => {
    onSelectTab(tab.id);
  }, [tab.id]);

  const handleMouseEnter: MouseEventHandler<HTMLDivElement> = useCallback((e) => {
    if (!isActive) {
      (e.currentTarget as HTMLDivElement).classList.add("bg-layer-hover-01");
    }
  }, [isActive]);

  const handleMouseLeave: MouseEventHandler<HTMLDivElement> = useCallback((e) => {
    if (!isActive) {
      (e.currentTarget as HTMLDivElement).classList.remove("bg-layer-hover-01");
    }
  }, [isActive]);

  const handleCloseTabClick: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    e.stopPropagation();
    onCloseTab(tab.id);
  }, [tab.id]);

  const classes = useMemo(() => {
    const base = [
      "flex items-center gap-1.5 px-3 min-w-[120px] max-w-[200px] shrink-0 cursor-pointer border-r border-border-subtle select-none transition-all duration-150",
    ];

    if (isActive) {
      base.push("bg-layer-01 border-b-2 border-b-accent-blue");
    }
    if (isDragOver) {
      base.push("bg-layer-hover-01 border-b-2 border-b-transparent");
    } else {
      base.push("bg-transparent border-b-2 border-b-transparent");
    }

    if (draggingTab === tab.id) {
      base.push("opacity-50");
    } else {
      base.push("opacity-100");
    }

    return base.join(" ");
  }, [isActive, isDragOver, draggingTab, tab.id]);

  const CloseTabButton = useCallback(
    () => (
      <button
        onClick={handleCloseTabClick}
        className="tab-close-btn w-4 h-4 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded shrink-0 opacity-0 transition-all duration-150"
        title="Close tab">
        <XIcon size={12} />
      </button>
    ),
    [handleCloseTabClick],
  );

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={onContextMenu}
      onClick={onClick}
      className={classes}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      {tab.isModified && <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan shrink-0" />}

      <span
        className={`flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] ${
          isActive ? "text-text-primary font-medium" : "text-text-secondary font-normal"
        } ${tab.title === "Untitled" ? "italic" : "not-italic"}`}
        title={`${tab.title}${tab.isModified ? " (modified)" : ""}`}>
        {tab.title}
      </span>

      <CloseTabButton />
    </div>
  );
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
    tabs.forEach((t) => onCloseTab(t.id));
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

      <style>
        {`
        div[draggable]:hover .tab-close-btn {
          opacity: 1 !important;
        }
        div[draggable] .tab-close-btn:hover {
          color: var(--color-icon-primary) !important;
          background-color: var(--color-layer-hover-01);
        }
      `}
      </style>
    </div>
  );
}
