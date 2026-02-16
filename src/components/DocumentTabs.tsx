import { useEffect, useRef, useState } from "react";
import type { DocRef } from "../ports";
import { XIcon } from "./icons";

export type Tab = { id: string; docRef: DocRef; title: string; isModified: boolean; isPinned?: boolean };

type DocumentTabsProps = {
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

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggingTab(tabId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    if (draggingTab && draggingTab !== tabId) {
      setDragOverTab(tabId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
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
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  if (tabs.length === 0) {
    return (
      <div className="h-[40px] bg-bg-primary border-b border-border-subtle flex items-center pl-4 text-text-placeholder text-[0.8125rem]">
        No documents open
      </div>
    );
  }

  return (
    <div
      ref={tabsRef}
      className="h-[40px] bg-bg-primary border-b border-border-subtle flex overflow-x-auto overflow-y-hidden">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isDragOver = tab.id === dragOverTab;

        return (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={(e) => handleDragOver(e, tab.id)}
            onDrop={(e) => handleDrop(e, tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 min-w-[120px] max-w-[200px] shrink-0 cursor-pointer border-r border-border-subtle select-none transition-all duration-150 ${
              isActive
                ? "bg-layer-01 border-b-2 border-b-accent-blue"
                : isDragOver
                ? "bg-layer-hover-01 border-b-2 border-b-transparent"
                : "bg-transparent border-b-2 border-b-transparent"
            } ${draggingTab === tab.id ? "opacity-50" : "opacity-100"}`}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLDivElement).classList.add("bg-layer-hover-01");
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLDivElement).classList.remove("bg-layer-hover-01");
              }
            }}>
            {/* Modified indicator */}
            {tab.isModified && <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan shrink-0" />}

            {/* Tab title */}
            <span
              className={`flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] ${
                isActive ? "text-text-primary font-medium" : "text-text-secondary font-normal"
              } ${tab.title === "Untitled" ? "italic" : "not-italic"}`}
              title={`${tab.title}${tab.isModified ? " (modified)" : ""}`}>
              {tab.title}
            </span>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className="tab-close-btn w-4 h-4 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded shrink-0 opacity-0 transition-all duration-150"
              title="Close tab">
              <XIcon size={12} />
            </button>
          </div>
        );
      })}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-layer-02 border border-border-subtle rounded shadow-lg z-[1000] min-w-[160px] p-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button
            onClick={() => {
              onCloseTab(contextMenu.tabId);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 bg-transparent border-none text-text-primary text-[0.8125rem] cursor-pointer text-left rounded hover:bg-layer-hover-02">
            Close
          </button>
          <button
            onClick={() => {
              tabs.forEach((t) => {
                if (t.id !== contextMenu.tabId) onCloseTab(t.id);
              });
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 bg-transparent border-none text-text-primary text-[0.8125rem] cursor-pointer text-left rounded hover:bg-layer-hover-02">
            Close Others
          </button>
          <button
            onClick={() => {
              tabs.forEach((t) => onCloseTab(t.id));
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 bg-transparent border-none text-text-primary text-[0.8125rem] cursor-pointer text-left rounded hover:bg-layer-hover-02">
            Close All
          </button>
        </div>
      )}

      {/* Show close button on hover */}
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
