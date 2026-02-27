import { BottomSheet } from "$components/HelpSheet/BottomSheet";
import { MarkdownHelpContent } from "$components/HelpSheet/MarkdownHelpContent";
import { ShortcutsTabContent } from "$components/HelpSheet/ShortcutsTabContent";
import { XIcon } from "$icons";
import { cn } from "$utils/tw";
import { useCallback, useEffect, useId, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

type TabId = "shortcuts" | "markdown";

type Tab = { id: TabId; label: string };

const TABS: Tab[] = [{ id: "shortcuts", label: "Keyboard Shortcuts" }, { id: "markdown", label: "Markdown Help" }];
const TAB_ORDER: TabId[] = ["shortcuts", "markdown"];

type HelpSheetProps = { isOpen: boolean; onClose: () => void };

function getTabDomId(tabId: TabId): string {
  return `help-sheet-tab-${tabId}`;
}

function getTabPanelDomId(tabId: TabId): string {
  return `help-sheet-panel-${tabId}`;
}

function TabButton(
  { tab, activeTab, setActiveTab }: { tab: Tab; activeTab: TabId; setActiveTab: (tabId: TabId) => void },
) {
  const handleClick = useCallback(() => setActiveTab(tab.id), [tab.id, setActiveTab]);
  const isActive = activeTab === tab.id;
  return (
    <button
      key={tab.id}
      type="button"
      role="tab"
      id={getTabDomId(tab.id)}
      aria-selected={isActive}
      aria-controls={getTabPanelDomId(tab.id)}
      tabIndex={isActive ? 0 : -1}
      onClick={handleClick}
      className={cn(
        "px-4 py-2 text-sm font-medium transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50",
        isActive ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
      )}>
      {tab.label}
      {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary" />}
    </button>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="p-1 hover:bg-layer-02 rounded transition-colors flex items-center"
      aria-label="Close help sheet">
      <XIcon size="sm" />
    </button>
  );
}

export function HelpSheet({ isOpen, onClose }: HelpSheetProps) {
  const [activeTab, setActiveTab] = useState<TabId>("shortcuts");
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      setActiveTab("shortcuts");
    }
  }, [isOpen]);

  const handleTabListKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
      return;
    }

    event.preventDefault();

    const currentIndex = TAB_ORDER.indexOf(activeTab);
    if (event.key === "Home") {
      setActiveTab(TAB_ORDER[0]);
      return;
    }

    if (event.key === "End") {
      setActiveTab(TAB_ORDER.at(-1) ?? TAB_ORDER[0]);
      return;
    }

    if (event.key === "ArrowRight") {
      setActiveTab(TAB_ORDER[(currentIndex + 1) % TAB_ORDER.length]);
      return;
    }

    setActiveTab(TAB_ORDER[(currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length]);
  }, [activeTab]);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Help Sheet"
      ariaLabelledBy={titleId}
      className="min-h-[50vh]">
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
          <h2 id={titleId} className="text-lg font-semibold text-text-primary">Help</h2>
          <CloseButton onClose={onClose} />
        </div>

        <div
          role="tablist"
          aria-label="Help sections"
          onKeyDown={handleTabListKeyDown}
          className="flex border-b border-border-subtle">
          {TABS.map((tab) => <TabButton key={tab.id} tab={tab} activeTab={activeTab} setActiveTab={setActiveTab} />)}
        </div>

        <div
          role="tabpanel"
          id={getTabPanelDomId(activeTab)}
          aria-labelledby={getTabDomId(activeTab)}
          className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === "shortcuts" && <ShortcutsTabContent />}
          {activeTab === "markdown" && <MarkdownHelpContent />}
        </div>
      </div>
    </BottomSheet>
  );
}
