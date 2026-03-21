import { Button } from "$components/Button";
import { Dialog } from "$components/Dialog";
import { Support } from "$components/Support";
import { Version } from "$components/Version";
import { HeartIcon, PenIcon, QuestionIcon, SearchIcon, SettingsIcon, XIcon } from "$icons";
import { appVersionGet, runCmd } from "$ports";
import { useAppHeaderBarState, useHelpSheetState, useLayoutSettingsUiState } from "$state/selectors";
import { formatShortcut } from "$utils/shortcuts";
import { useCallback, useEffect, useMemo, useState } from "react";

const AppTitle = ({ version }: { version: string }) => (
  <div className="flex items-center gap-2.5 shrink-0">
    <PenIcon size="md" className="text-accent-blue" />
    <h1 className="m-0 text-lg font-bold tracking-tighter text-text-primary font-headline">Writer</h1>
    <Version value={version} />
  </div>
);

function SearchTrigger({ onOpenSearch }: { onOpenSearch: () => void }) {
  const searchShortcut = useMemo(() => formatShortcut("Cmd+Shift+F"), []);

  return (
    <Button
      type="button"
      onClick={onOpenSearch}
      title={`Search (${searchShortcut})`}
      className="min-w-0 flex-1 max-w-xl h-10 px-3 bg-field-01 border border-stroke-subtle/20 rounded-lg text-text-secondary cursor-pointer transition-colors duration-200 hover:bg-field-hover-01 hover:text-text-primary">
      <div className="flex items-center gap-2 w-full min-w-0">
        <SearchIcon size="sm" />
        <span className="min-w-0 flex-1 truncate text-left text-sm">Search across documents</span>
        <kbd className="shrink-0 px-1.5 py-0.5 bg-layer-02 rounded text-[10px] font-mono text-text-secondary">
          {searchShortcut}
        </kbd>
      </div>
    </Button>
  );
}

type HeaderActionsProps = { onOpenHelp: () => void; onOpenSupport: () => void; onOpenSettings: () => void };

function HeaderActions({ onOpenHelp, onOpenSupport, onOpenSettings }: HeaderActionsProps) {
  const helpShortcut = useMemo(() => formatShortcut("Cmd+/"), []);

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <Button
        variant="iconGhost"
        size="iconMd"
        onClick={onOpenHelp}
        title={`Open help sheet (${helpShortcut})`}
        aria-label="Open help sheet">
        <QuestionIcon size="sm" />
      </Button>
      <Button
        variant="iconGhost"
        size="iconMd"
        onClick={onOpenSupport}
        title="Support Writer"
        aria-label="Support Writer">
        <HeartIcon size="sm" />
      </Button>
      <Button variant="iconGhost" size="iconMd" onClick={onOpenSettings} title="Settings" aria-label="Settings">
        <SettingsIcon size="sm" />
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
      panelClassName="w-full max-w-md bg-layer-01 rounded-xl shadow-xl border border-stroke-subtle/10 overflow-hidden"
      motionPreset="scale">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stroke-subtle/10">
        <div className="flex items-center gap-2">
          <HeartIcon size="sm" className="text-accent-blue" />
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
  const { setOpen: openSettings } = useLayoutSettingsUiState();
  const { setShowSearch } = useAppHeaderBarState();

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

  const handleOpenSettings = useCallback(() => {
    openSettings(true);
  }, [openSettings]);

  const handleOpenSupport = useCallback(() => {
    setIsSupportModalOpen(true);
  }, []);

  const handleCloseSupport = useCallback(() => {
    setIsSupportModalOpen(false);
  }, []);

  return (
    <>
      <header className="h-header bg-surface-primary shrink-0 flex items-center justify-between px-2.5 sm:px-4 gap-4">
        <AppTitle version={version} />
        <SearchTrigger onOpenSearch={handleOpenSearch} />
        <HeaderActions
          onOpenHelp={handleOpenHelp}
          onOpenSupport={handleOpenSupport}
          onOpenSettings={handleOpenSettings} />
      </header>
      <SupportModal isOpen={isSupportModalOpen} onClose={handleCloseSupport} />
    </>
  );
}
