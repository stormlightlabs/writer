import { Button } from "$components/Button";
import { Dialog } from "$components/Dialog";
import { Support } from "$components/Support";
import { Version } from "$components/Version";
import { useRoutedSheet } from "$hooks/useRoutedSheet";
import { useViewportTier } from "$hooks/useViewportTier";
import { CheckIcon, ChevronDownIcon, HeartIcon, PenIcon, QuestionIcon, SearchIcon, XIcon } from "$icons";
import { appVersionGet, runCmd } from "$ports";
import { useAppHeaderBarState, useHelpSheetState } from "$state/selectors";
import { formatShortcut } from "$utils/shortcuts";
import { cn } from "$utils/tw";
import { useCallback, useEffect, useMemo, useState } from "react";

const AppTitle = ({ hideTitle, version }: { hideTitle: boolean; version: string }) => (
  <div className="flex items-center gap-3">
    <div className={`h-8 ${hideTitle ? "w-8" : "px-2.5"} flex items-center justify-center`}>
      <PenIcon size="lg" />
    </div>
    {hideTitle ? null : (
      <div className="flex items-center gap-2">
        <h1 className="m-0 text-[0.9375rem] font-semibold text-text-primary">Writer</h1>
        <Version value={version} />
      </div>
    )}
  </div>
);

type SearchRowProps = {
  onOpenSearch: () => void;
  onOpenHelp: () => void;
  onOpenSupport: () => void;
  onToggleSidebar: () => void;
  onToggleTabBar: () => void;
  onToggleStatusBar: () => void;
  onToggleStyleDiagnostics: () => void;
  sidebarCollapsed: boolean;
  tabBarCollapsed: boolean;
  statusBarCollapsed: boolean;
  styleDiagnosticsOpen: boolean;
  iconOnly: boolean;
  showSearchShortcut: boolean;
  showHelpShortcut: boolean;
  compactTabLabel: boolean;
};

function SearchRow(
  {
    onOpenSearch,
    onOpenHelp,
    onOpenSupport,
    onToggleSidebar,
    onToggleTabBar,
    onToggleStatusBar,
    onToggleStyleDiagnostics,
    sidebarCollapsed,
    tabBarCollapsed,
    statusBarCollapsed,
    styleDiagnosticsOpen,
    iconOnly,
    showSearchShortcut,
    showHelpShortcut,
    compactTabLabel,
  }: SearchRowProps,
) {
  const searchShortcut = useMemo(() => formatShortcut("Cmd+Shift+F"), []);
  const helpShortcut = useMemo(() => formatShortcut("Cmd+/"), []);
  const toggleTabBarShortcut = useMemo(() => formatShortcut("Cmd+Shift+B"), []);
  const toggleSidebarShortcut = useMemo(() => formatShortcut("Cmd+B"), []);

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
    const title = `${tabBarCollapsed ? "Show" : "Hide"} tab bar (${toggleTabBarShortcut})`;
    if (compactTabLabel) {
      return { label: tabBarCollapsed ? "Show Tabs" : "Hide Tabs", title };
    }
    return { label: tabBarCollapsed ? "Show Tab Bar" : "Hide Tab Bar", title };
  }, [compactTabLabel, tabBarCollapsed, toggleTabBarShortcut]);

  const sidebarId = useMemo(() => {
    const title = `${sidebarCollapsed ? "Show" : "Hide"} sidebar (${toggleSidebarShortcut})`;
    const label = sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar";
    return { label, title };
  }, [sidebarCollapsed, toggleSidebarShortcut]);

  return (
    <div className="flex items-center gap-2 flex-1 justify-end">
      <Button
        onClick={onOpenSearch}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 bg-field-01 border border-stroke-subtle rounded text-text-secondary text-[0.8125rem] cursor-pointer",
          { "w-8 h-8 px-0 justify-center": iconOnly },
        )}
        title={`Search (${searchShortcut})`}>
        <SearchIcon size="sm" />
        {iconOnly ? null : <span>Search</span>}
        {!iconOnly && showSearchShortcut && (
          <kbd className="px-1.5 py-0.5 bg-layer-02 rounded text-xs font-mono">{searchShortcut}</kbd>
        )}
      </Button>
      <Button
        onClick={onOpenHelp}
        variant="outline"
        size="sm"
        className={cn("flex items-center gap-1.5", { "w-8 h-8 p-0 justify-center": iconOnly })}
        title={`Open help sheet (${helpShortcut})`}
        aria-label={iconOnly ? "Open help sheet" : undefined}>
        <QuestionIcon size="sm" />
        {iconOnly ? null : <span>Help</span>}
        {!iconOnly && showHelpShortcut && (
          <kbd className="px-1.5 py-0.5 bg-layer-02 rounded text-xs font-mono">{helpShortcut}</kbd>
        )}
      </Button>

      <Button
        onClick={onOpenSupport}
        variant="outline"
        size="sm"
        className={cn("flex items-center gap-1.5", { "w-8 h-8 p-0 justify-center": iconOnly })}
        title="Support Writer"
        aria-label="Support Writer">
        <HeartIcon size="sm" />
        {iconOnly ? null : <span className="hidden sm:inline">Support</span>}
      </Button>

      <Button
        onClick={onToggleStyleDiagnostics}
        variant={styleDiagnosticsOpen ? "surface" : "outline"}
        size="sm"
        className={cn("flex items-center gap-1.5", { "w-8 h-8 p-0 justify-center": iconOnly })}
        title={styleDiagnosticsOpen ? "Hide style diagnostics" : "Show style diagnostics"}
        aria-label="Toggle style diagnostics">
        <CheckIcon size="sm" />
        {iconOnly ? null : <span>Style</span>}
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
}

function SupportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Support Writer"
      containerClassName="flex items-center justify-center"
      panelClassName="w-full max-w-md bg-layer-01 rounded-xl shadow-xl border border-stroke-subtle overflow-hidden"
      motionPreset="scale">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stroke-subtle">
        <div className="flex items-center gap-2">
          <HeartIcon size="sm" className="text-accent-primary" />
          <span className="text-base font-semibold text-text-primary">Support Writer</span>
        </div>
        <Button
          type="button"
          onClick={onClose}
          className="ml-2 text-text-secondary hover:text-support-error cursor-pointer bg-transparent border-none p-0">
          <XIcon size="xs" />
        </Button>
      </div>
      <Support />
    </Dialog>
  );
}

export function AppHeaderBar() {
  const [version, setVersion] = useState("");
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const { setOpen: setHelpSheetOpen } = useHelpSheetState();
  const { isOpen: styleDiagnosticsOpen, open: openStyleDiagnostics, close: closeStyleDiagnostics } = useRoutedSheet(
    "/diagnostics",
  );
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
  const showHelpShortcut = useMemo(() => viewportWidth >= 1240, [viewportWidth]);
  const iconOnly = useMemo(() => viewportWidth < 760, [viewportWidth]);

  useEffect(() => {
    let isUnmounted = false;

    void runCmd(appVersionGet((value) => {
      if (isUnmounted || typeof value !== "string") {
        return;
      }

      setVersion(value);
    }, () => {}));

    return () => {
      isUnmounted = true;
    };
  }, []);

  const handleOpenSearch = useCallback(() => {
    setShowSearch(true);
  }, [setShowSearch]);

  const handleOpenHelp = useCallback(() => {
    setHelpSheetOpen(true);
  }, [setHelpSheetOpen]);

  const handleToggleStyleDiagnostics = useCallback(() => {
    if (styleDiagnosticsOpen) {
      closeStyleDiagnostics();
      return;
    }

    openStyleDiagnostics();
  }, [closeStyleDiagnostics, openStyleDiagnostics, styleDiagnosticsOpen]);

  const handleOpenSupport = useCallback(() => {
    setIsSupportModalOpen(true);
  }, []);

  const handleCloseSupport = useCallback(() => {
    setIsSupportModalOpen(false);
  }, []);

  return (
    <>
      <header className="h-[48px] bg-layer-01 border-b border-stroke-subtle flex items-center justify-between px-2.5 sm:px-4 shrink-0 gap-2">
        <AppTitle hideTitle={isCompact} version={version} />
        <SearchRow
          onOpenSearch={handleOpenSearch}
          onOpenHelp={handleOpenHelp}
          onOpenSupport={handleOpenSupport}
          onToggleSidebar={toggleSidebarCollapsed}
          onToggleTabBar={toggleTabBarCollapsed}
          onToggleStatusBar={toggleStatusBarCollapsed}
          onToggleStyleDiagnostics={handleToggleStyleDiagnostics}
          sidebarCollapsed={sidebarCollapsed}
          tabBarCollapsed={tabBarCollapsed}
          statusBarCollapsed={statusBarCollapsed}
          styleDiagnosticsOpen={styleDiagnosticsOpen}
          iconOnly={iconOnly}
          showSearchShortcut={showSearchShortcut}
          showHelpShortcut={showHelpShortcut}
          compactTabLabel={isNarrow} />
      </header>
      <SupportModal isOpen={isSupportModalOpen} onClose={handleCloseSupport} />
    </>
  );
}
