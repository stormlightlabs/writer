import { useViewportTier } from "$hooks/useViewportTier";
import type { IconSize } from "$icons";
import {
  AtSignIcon,
  CheckIcon,
  DocumentIcon,
  EyeIcon,
  FocusIcon,
  IconProps,
  PenIcon,
  PlusIcon,
  RefreshIcon,
  SaveIcon,
  SettingsIcon,
  SplitViewIcon,
} from "$icons";
import { useLayoutSettingsUiState, useToolbarState } from "$state/selectors";
import { AtProtoSession, SaveStatus } from "$types";
import { formatShortcut } from "$utils/shortcuts";
import { useCallback, useMemo } from "react";
import { SaveStatusIndicator } from "./SaveStatusIndicator";
import { ToolbarButton } from "./ToolbarButton";
import { ToolbarDropdown } from "./ToolbarDropdown";

export type ToolbarProps = {
  saveStatus: SaveStatus;
  atProtoSession?: AtProtoSession | null;
  hasActiveDocument?: boolean;
  onSave: () => void;
  onAtProtoAuth?: () => void;
  onNewDocument?: () => void;
  isNewDocumentDisabled?: boolean;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
  isPdfExportDisabled?: boolean;
  onRefresh?: () => void;
};

const CHECK_ICON = <CheckIcon size="sm" />;

export function Toolbar(
  {
    saveStatus,
    atProtoSession = null,
    hasActiveDocument = false,
    onSave,
    onAtProtoAuth = () => {},
    onNewDocument,
    isNewDocumentDisabled = false,
    onExportPdf,
    isExportingPdf = false,
    isPdfExportDisabled = false,
    onRefresh,
  }: ToolbarProps,
) {
  const {
    isSplitView,
    isFocusMode,
    isPreviewVisible,
    setEditorOnlyMode,
    toggleSplitView,
    toggleFocusMode,
    togglePreviewVisible,
  } = useToolbarState();
  const { setOpen: openSettings } = useLayoutSettingsUiState();
  const { viewportWidth, isCompact, isNarrow } = useViewportTier();

  const icons: Record<string, { Component: React.ComponentType<IconProps>; size: IconSize }> = useMemo(
    () => ({
      save: { Component: SaveIcon, size: "sm" },
      newDoc: { Component: PlusIcon, size: "sm" },
      refresh: { Component: RefreshIcon, size: "sm" },
      editor: { Component: PenIcon, size: "sm" },
      splitView: { Component: SplitViewIcon, size: "sm" },
      eye: { Component: EyeIcon, size: "sm" },
      focus: { Component: FocusIcon, size: "sm" },
      export: { Component: DocumentIcon, size: "sm" },
      atproto: { Component: AtSignIcon, size: "sm" },
      settings: { Component: SettingsIcon, size: "sm" },
    }),
    [],
  );

  const hideRefresh = useMemo(() => viewportWidth < 1080, [viewportWidth]);
  const compactStatus = useMemo(() => viewportWidth < 960, [viewportWidth]);
  const isEditorOnly = useMemo(() => !isSplitView && !isPreviewVisible, [isSplitView, isPreviewVisible]);

  const currentViewIcon = useMemo(() => {
    if (isFocusMode) return icons.focus;
    if (isSplitView) return icons.splitView;
    if (isPreviewVisible) return icons.eye;
    return icons.editor;
  }, [isFocusMode, isSplitView, isPreviewVisible, icons]);

  const handleOpenSettings = useCallback(() => openSettings(true), [openSettings]);

  const viewModeItems = useMemo(
    () => [
      { label: "Editor", onClick: setEditorOnlyMode, icon: isEditorOnly && !isFocusMode ? CHECK_ICON : undefined },
      { label: "Split", onClick: toggleSplitView, icon: isSplitView ? CHECK_ICON : undefined },
      { label: "Preview", onClick: togglePreviewVisible, icon: isPreviewVisible ? CHECK_ICON : undefined },
      { divider: true as const },
      { label: "Focus", onClick: toggleFocusMode, icon: isFocusMode ? CHECK_ICON : undefined },
    ],
    [
      isEditorOnly,
      isFocusMode,
      isSplitView,
      isPreviewVisible,
      setEditorOnlyMode,
      toggleSplitView,
      togglePreviewVisible,
      toggleFocusMode,
    ],
  );

  const toolsItems = useMemo(() => {
    const items: Parameters<typeof ToolbarDropdown>[0]["items"] = [{
      label: atProtoSession ? atProtoSession.handle : "Login to AT Proto",
      onClick: onAtProtoAuth,
      icon: <AtSignIcon size="sm" />,
    }];
    if (onExportPdf) {
      items.push({
        label: isExportingPdf ? "Exporting..." : "Export PDF",
        onClick: onExportPdf ?? (() => {}),
        disabled: isExportingPdf || isPdfExportDisabled,
        icon: <DocumentIcon size="sm" />,
      });
    }
    items.push({ divider: true as const });
    items.push({ label: "Settings", onClick: handleOpenSettings, icon: <SettingsIcon size="sm" /> });
    return items;
  }, [atProtoSession, onAtProtoAuth, onExportPdf, isExportingPdf, isPdfExportDisabled, handleOpenSettings]);

  return (
    <div className="h-[48px] bg-layer-01 border-b border-stroke-subtle flex items-center justify-between px-2 sm:px-4 gap-2 overflow-x-auto">
      <div className="flex items-center gap-1.5 shrink-0">
        <ToolbarButton
          icon={icons.save}
          label="Save"
          onClick={onSave}
          disabled={saveStatus === "Saved" || saveStatus === "Saving"}
          shortcut={formatShortcut("Cmd+S")}
          iconOnly={isCompact} />
        {onNewDocument && (
          <ToolbarButton
            icon={icons.newDoc}
            label="New Document"
            onClick={onNewDocument}
            disabled={isNewDocumentDisabled}
            shortcut={formatShortcut("Cmd+N")}
            iconOnly={isCompact} />
        )}
        {hasActiveDocument ? <SaveStatusIndicator status={saveStatus} compact={compactStatus} /> : null}
        {onRefresh && !hideRefresh && (
          <ToolbarButton icon={icons.refresh} label="Refresh" onClick={onRefresh} shortcut="F5" iconOnly={isNarrow} />
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <ToolbarDropdown icon={currentViewIcon} label="View" items={viewModeItems} iconOnly={isNarrow} />
        <ToolbarDropdown icon={icons.settings} label="Tools" items={toolsItems} iconOnly={isNarrow} />
      </div>
    </div>
  );
}
