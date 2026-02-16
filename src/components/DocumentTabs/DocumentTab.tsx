import { DragEventHandler, MouseEventHandler, useCallback, useMemo } from "react";
import { Tab } from "../../types";
import { CloseTabButton } from "./CloseTabButton";

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

export const DocumentTab = (
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
      "group flex items-center gap-1.5 px-3 min-w-[120px] max-w-[200px] shrink-0 cursor-pointer border-r border-border-subtle select-none transition-all duration-150",
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

  const titleClasses = useMemo(() => {
    const base = ["flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem]"];

    if (isActive) {
      base.push("text-text-primary font-medium");
    } else {
      base.push("text-text-secondary font-normal");
    }

    if (tab.title === "Untitled") {
      base.push("italic");
    } else {
      base.push("not-italic");
    }

    return base.join(" ");
  }, [isActive, tab.title]);

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
      <span className={titleClasses} title={`${tab.title}${tab.isModified ? " (modified)" : ""}`}>{tab.title}</span>
      <CloseTabButton handleCloseTabClick={handleCloseTabClick} />
    </div>
  );
};
