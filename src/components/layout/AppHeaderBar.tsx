import { Button } from "$components/Button";
import { useViewportTier } from "$hooks/useViewportTier";
import { ChevronDownIcon, LibraryIcon, SearchIcon } from "$icons";
import { useAppHeaderBarState } from "$state/selectors";
import { useCallback, useMemo } from "react";

const AppTitle = ({ onToggleSidebar, hideTitle }: { onToggleSidebar: () => void; hideTitle: boolean }) => (
  <div className="flex items-center gap-3">
    <Button variant="iconGhost" onClick={onToggleSidebar} className="w-8 h-8" title="Toggle sidebar (Ctrl+B)">
      <LibraryIcon size="lg" />
    </Button>
    {hideTitle ? null : <h1 className="m-0 text-[0.9375rem] font-semibold text-text-primary">Writer</h1>}
  </div>
);

const SearchRow = (
  {
    onOpenSearch,
    onToggleTabBar,
    onToggleStatusBar,
    tabBarCollapsed,
    statusBarCollapsed,
    iconOnly,
    showSearchShortcut,
    compactTabLabel,
  }: {
    onOpenSearch: () => void;
    onToggleTabBar: () => void;
    onToggleStatusBar: () => void;
    tabBarCollapsed: boolean;
    statusBarCollapsed: boolean;
    iconOnly: boolean;
    showSearchShortcut: boolean;
    compactTabLabel: boolean;
  },
) => (
  <div className="flex items-center gap-2">
    <Button
      onClick={onOpenSearch}
      className={`flex items-center gap-1.5 px-3 py-1.5 bg-field-01 border border-border-subtle rounded text-text-secondary text-[0.8125rem] cursor-pointer ${
        iconOnly ? "w-8 h-8 px-0 justify-center" : ""
      }`}
      title="Search (Ctrl+Shift+F)">
      <SearchIcon size="sm" />
      {iconOnly ? null : <span>Search</span>}
      {!iconOnly && showSearchShortcut && (
        <kbd className="px-1.5 py-0.5 bg-layer-02 rounded text-xs font-mono">Ctrl+Shift+F</kbd>
      )}
    </Button>

    <Button
      onClick={onToggleTabBar}
      variant="outline"
      size="sm"
      className={`flex items-center gap-1.5 ${iconOnly ? "w-8 h-8 p-0 justify-center" : ""}`}
      title={`${tabBarCollapsed ? "Show" : "Hide"} tab bar (Ctrl+Shift+B)`}>
      <ChevronDownIcon size="sm" />
      {iconOnly
        ? null
        : (
          <span>
            {compactTabLabel
              ? (tabBarCollapsed ? "Show Tabs" : "Hide Tabs")
              : tabBarCollapsed
              ? "Show Tab Bar"
              : "Hide Tab Bar"}
          </span>
        )}
    </Button>

    <Button
      onClick={onToggleStatusBar}
      variant="outline"
      size="sm"
      className={`flex items-center gap-1.5 ${iconOnly ? "w-8 h-8 p-0 justify-center" : ""}`}
      title={`${statusBarCollapsed ? "Show" : "Hide"} status bar`}>
      <ChevronDownIcon size="sm" />
      {iconOnly
        ? null
        : (
          <span>
            {compactTabLabel
              ? (statusBarCollapsed ? "Show Status" : "Hide Status")
              : statusBarCollapsed
              ? "Show Status Bar"
              : "Hide Status Bar"}
          </span>
        )}
    </Button>
  </div>
);

export const AppHeaderBar = () => {
  const {
    tabBarCollapsed,
    statusBarCollapsed,
    toggleSidebarCollapsed,
    toggleTabBarCollapsed,
    toggleStatusBarCollapsed,
    setShowSearch,
  } = useAppHeaderBarState();
  const { viewportWidth, isCompact, isNarrow } = useViewportTier();

  const handleOpenSearch = useCallback(() => {
    setShowSearch(true);
  }, [setShowSearch]);

  const showSearchShortcut = useMemo(() => viewportWidth >= 1240, [viewportWidth]);
  const iconOnly = useMemo(() => viewportWidth < 760, [viewportWidth]);

  return (
    <header className="h-[48px] bg-layer-01 border-b border-border-subtle flex items-center justify-between px-2.5 sm:px-4 shrink-0 gap-2">
      <AppTitle onToggleSidebar={toggleSidebarCollapsed} hideTitle={isCompact} />
      <SearchRow
        onOpenSearch={handleOpenSearch}
        onToggleTabBar={toggleTabBarCollapsed}
        onToggleStatusBar={toggleStatusBarCollapsed}
        tabBarCollapsed={tabBarCollapsed}
        statusBarCollapsed={statusBarCollapsed}
        iconOnly={iconOnly}
        showSearchShortcut={showSearchShortcut}
        compactTabLabel={isNarrow} />
    </header>
  );
};
