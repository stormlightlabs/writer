import { useViewportTier } from "$hooks/useViewportTier";
import type { IconSize } from "$icons";
import {
  DocumentIcon,
  EyeIcon,
  FileTextIcon,
  FocusIcon,
  IconProps,
  PlusIcon,
  RefreshIcon,
  SaveIcon,
  SettingsIcon,
  SplitViewIcon,
} from "$icons";
import { useLayoutSettingsUiState, useToolbarState } from "$state/selectors";
import { SaveStatus } from "$types";
import { useCallback, useMemo } from "react";
import { SaveStatusIndicator } from "./SaveStatusIndicator";
import { ToolbarButton } from "./ToolbarButton";

export type ToolbarProps = {
  saveStatus: SaveStatus;
  hasActiveDocument?: boolean;
  onSave: () => void;
  onNewDocument?: () => void;
  isNewDocumentDisabled?: boolean;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
  isPdfExportDisabled?: boolean;
  onRefresh?: () => void;
};

function SettingsToolbarButton(
  { icon, iconOnly }: { icon: { Component: React.ComponentType<IconProps>; size: IconSize }; iconOnly: boolean },
) {
  const { setOpen } = useLayoutSettingsUiState();

  const handleOpenSettings = useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  return <ToolbarButton icon={icon} label="Settings" onClick={handleOpenSettings} iconOnly={iconOnly} />;
}

export function Toolbar(
  {
    saveStatus,
    hasActiveDocument = false,
    onSave,
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
  const { viewportWidth, isCompact, isNarrow } = useViewportTier();
  const icons: Record<string, { Component: React.ComponentType<IconProps>; size: IconSize }> = useMemo(
    () => ({
      save: { Component: SaveIcon, size: "sm" },
      newDoc: { Component: PlusIcon, size: "sm" },
      refresh: { Component: RefreshIcon, size: "sm" },
      editor: { Component: FileTextIcon, size: "sm" },
      splitView: { Component: SplitViewIcon, size: "sm" },
      eye: { Component: EyeIcon, size: "sm" },
      focus: { Component: FocusIcon, size: "sm" },
      export: { Component: DocumentIcon, size: "sm" },
      settings: { Component: SettingsIcon, size: "sm" },
    }),
    [],
  );

  const iconOnly = useMemo(() => isNarrow, [isNarrow]);
  const hideRefresh = useMemo(() => viewportWidth < 1080, [viewportWidth]);
  const compactStatus = useMemo(() => viewportWidth < 960, [viewportWidth]);
  const isEditorOnly = useMemo(() => !isSplitView && !isPreviewVisible, [isSplitView, isPreviewVisible]);

  return (
    <div className="h-[48px] bg-layer-01 border-b border-border-subtle flex items-center justify-between px-2 sm:px-4 gap-2 overflow-x-auto">
      <div className="flex items-center gap-1.5 shrink-0">
        <ToolbarButton
          icon={icons.save}
          label="Save"
          onClick={onSave}
          disabled={saveStatus === "Saved" || saveStatus === "Saving"}
          shortcut="Ctrl+S"
          iconOnly={isCompact} />
        {onNewDocument && (
          <ToolbarButton
            icon={icons.newDoc}
            label="New Document"
            onClick={onNewDocument}
            disabled={isNewDocumentDisabled}
            shortcut="Ctrl+N"
            iconOnly={isCompact} />
        )}
        {hasActiveDocument ? <SaveStatusIndicator status={saveStatus} compact={compactStatus} /> : null}
        {onRefresh && !hideRefresh && (
          <ToolbarButton icon={icons.refresh} label="Refresh" onClick={onRefresh} shortcut="F5" iconOnly={iconOnly} />
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <ToolbarButton
          icon={icons.editor}
          label="Editor"
          isActive={isEditorOnly}
          onClick={setEditorOnlyMode}
          iconOnly={iconOnly} />

        <ToolbarButton
          icon={icons.splitView}
          label="Split"
          isActive={isSplitView}
          onClick={toggleSplitView}
          shortcut="Ctrl+\\"
          iconOnly={iconOnly} />

        <ToolbarButton
          icon={icons.eye}
          label="Preview"
          isActive={isPreviewVisible}
          onClick={togglePreviewVisible}
          shortcut="Ctrl+P"
          iconOnly={iconOnly} />

        <ToolbarButton
          icon={icons.focus}
          label="Focus"
          isActive={isFocusMode}
          onClick={toggleFocusMode}
          shortcut="Ctrl+F"
          iconOnly={iconOnly} />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onExportPdf && (
          <ToolbarButton
            icon={icons.export}
            label={isExportingPdf ? "Exporting" : "Export PDF"}
            onClick={onExportPdf}
            disabled={isExportingPdf || isPdfExportDisabled}
            iconOnly={iconOnly} />
        )}
        <SettingsToolbarButton icon={icons.settings} iconOnly={iconOnly} />
      </div>
    </div>
  );
}
