import { Button } from "$components/Button";
import { useViewportTier } from "$hooks/useViewportTier";
import { ChevronDownIcon, LibraryIcon, SearchIcon } from "$icons";
import { useAppHeaderBarState } from "$state/selectors";
import { useCallback, useMemo } from "react";

const AppTitle = ({ hideTitle }: { hideTitle: boolean }) => (
  <div className="flex items-center gap-3">
    <div className={`h-8 ${hideTitle ? "w-8" : "px-2.5"} flex items-center justify-center`}>
      <LibraryIcon size="lg" />
    </div>
    {hideTitle ? null : <h1 className="m-0 text-[0.9375rem] font-semibold text-text-primary">Writer</h1>}
  </div>
);

const SearchRow = (
  {
    onOpenSearch,
    onToggleSidebar,
    onToggleTabBar,
    onToggleStatusBar,
    sidebarCollapsed,
    tabBarCollapsed,
    statusBarCollapsed,
    iconOnly,
    showSearchShortcut,
    compactTabLabel,
  }: {
    onOpenSearch: () => void;
    onToggleSidebar: () => void;
    onToggleTabBar: () => void;
    onToggleStatusBar: () => void;
    sidebarCollapsed: boolean;
    tabBarCollapsed: boolean;
    statusBarCollapsed: boolean;
    iconOnly: boolean;
    showSearchShortcut: boolean;
    compactTabLabel: boolean;
  },
) => {
  const statusbarId = useMemo(() => {
    if (compactTabLabel) {
      return {
        label: statusBarCollapsed ? "Show Status" : "Hide Status",
        title: statusBarCollapsed ? "Show Status" : "Hide Status",
      };
    }
    return {
      label: statusBarCollapsed ? "Show Status Bar" : "Hide Status Bar",
      title: statusBarCollapsed ? "Show Status Bar" : "Hide Status Bar",
    };
  }, [compactTabLabel, statusBarCollapsed]);

  const tabbarId = useMemo(() => {
    const title = `${tabBarCollapsed ? "Show" : "Hide"} tab bar (Ctrl+Shift+B)`;
    if (compactTabLabel) {
      return { label: tabBarCollapsed ? "Show Tabs" : "Hide Tabs", title };
    }
    return { label: tabBarCollapsed ? "Show Tab Bar" : "Hide Tab Bar", title };
  }, [compactTabLabel, tabBarCollapsed]);

  const sidebarId = useMemo(() => {
    const title = `${sidebarCollapsed ? "Show" : "Hide"} sidebar (Ctrl+B)`;
    const label = sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar";
    return { label, title };
  }, [sidebarCollapsed]);

  return (
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
        onClick={onToggleSidebar}
        variant="outline"
        size="sm"
        className={`flex items-center gap-1.5 ${iconOnly ? "w-8 h-8 p-0 justify-center" : ""}`}
        title={sidebarId.title}>
        <ChevronDownIcon size="sm" />
        {iconOnly ? null : <span>{sidebarId.label}</span>}
      </Button>

      <Button
        onClick={onToggleTabBar}
        variant="outline"
        size="sm"
        className={`flex items-center gap-1.5 ${iconOnly ? "w-8 h-8 p-0 justify-center" : ""}`}
        title={tabbarId.title}>
        <ChevronDownIcon size="sm" />
        {iconOnly ? null : <span>{tabbarId.label}</span>}
      </Button>

      <Button
        onClick={onToggleStatusBar}
        variant="outline"
        size="sm"
        className={`flex items-center gap-1.5 ${iconOnly ? "w-8 h-8 p-0 justify-center" : ""}`}
        title={statusbarId.title}>
        <ChevronDownIcon size="sm" />
        {iconOnly ? null : <span>{statusbarId.label}</span>}
      </Button>
    </div>
  );
};

export const AppHeaderBar = () => {
  const {
    sidebarCollapsed,
    tabBarCollapsed,
    statusBarCollapsed,
    toggleSidebarCollapsed,
    toggleTabBarCollapsed,
    toggleStatusBarCollapsed,
    setShowSearch,
  } = useAppHeaderBarState();
  const { viewportWidth, isCompact, isNarrow } = useViewportTier();
  const showSearchShortcut = useMemo(() => viewportWidth >= 1240, [viewportWidth]);
  const iconOnly = useMemo(() => viewportWidth < 760, [viewportWidth]);

  const handleOpenSearch = useCallback(() => {
    setShowSearch(true);
  }, [setShowSearch]);

  return (
    <header className="h-[48px] bg-layer-01 border-b border-border-subtle flex items-center justify-between px-2.5 sm:px-4 shrink-0 gap-2">
      <AppTitle hideTitle={isCompact} />
      <SearchRow
        onOpenSearch={handleOpenSearch}
        onToggleSidebar={toggleSidebarCollapsed}
        onToggleTabBar={toggleTabBarCollapsed}
        onToggleStatusBar={toggleStatusBarCollapsed}
        sidebarCollapsed={sidebarCollapsed}
        tabBarCollapsed={tabBarCollapsed}
        statusBarCollapsed={statusBarCollapsed}
        iconOnly={iconOnly}
        showSearchShortcut={showSearchShortcut}
        compactTabLabel={isNarrow} />
    </header>
  );
};
