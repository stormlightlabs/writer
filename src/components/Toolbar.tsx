import { Button } from "$components/Button";
import { useViewportTier } from "$hooks/useViewportTier";
import {
  CheckIcon,
  DocumentIcon,
  EyeIcon,
  FocusIcon,
  IconProps,
  type IconSize,
  RefreshIcon,
  SaveIcon,
  SettingsIcon,
  SplitViewIcon,
} from "$icons";
import { useToolbarState } from "$state/panel-selectors";
import { SaveStatus } from "$types";
import type { MouseEventHandler } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Tooltip } from "./Tooltip";

export type ToolbarProps = {
  saveStatus: SaveStatus;
  onSave: () => void;
  onOpenSettings: () => void;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
  isPdfExportDisabled?: boolean;
  onRefresh?: () => void;
};

function ToolbarButton(
  { icon, label, isActive = false, onClick, disabled = false, shortcut, iconOnly = false }: {
    icon: { Component: React.ComponentType<IconProps>; size: IconSize };
    label: string;
    isActive?: boolean;
    onClick: () => void;
    disabled?: boolean;
    shortcut?: string;
    iconOnly?: boolean;
  },
) {
  const [showTooltip, setShowTooltip] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const handleMouseOver: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    if (!disabled && !isActive) {
      (e.currentTarget as HTMLButtonElement).classList.add("bg-layer-hover-01", "text-text-primary");
    }
  }, [isActive, disabled]);

  const handleMouseOut: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    if (!isActive) {
      (e.currentTarget as HTMLButtonElement).classList.remove("bg-layer-hover-01", "text-text-primary");
    }
  }, [isActive]);

  return (
    <>
      <Button
        ref={buttonRef}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[0.8125rem] relative transition-all duration-150 ease rounded ${
          isActive
            ? "bg-layer-accent-01 border border-border-strong text-text-primary"
            : "bg-transparent border border-transparent text-text-secondary"
        } ${iconOnly ? "w-8 h-8 px-0 justify-center" : ""} ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}>
        <icon.Component size={icon.size} />
        {iconOnly ? null : <span>{label}</span>}
      </Button>
      {shortcut ? <Tooltip anchorRef={buttonRef} visible={showTooltip}>{shortcut}</Tooltip> : null}
    </>
  );
}

const getStatusDisplay = (status: SaveStatus) => {
  switch (status) {
    case "Saving": {
      return { Icon: SaveIcon, text: "Saving...", color: "text-accent-cyan" };
    }
    case "Saved": {
      return { Icon: CheckIcon, text: "Saved", color: "text-accent-green" };
    }
    case "Dirty": {
      return { Icon: null, text: "Unsaved", color: "text-accent-yellow" };
    }
    case "Error": {
      return { Icon: null, text: "Error", color: "text-support-error" };
    }
    default: {
      return { Icon: null, text: "Ready", color: "text-text-placeholder" };
    }
  }
};

function SaveStatusIndicator({ status, compact = false }: { status: SaveStatus; compact?: boolean }) {
  const { Icon, text, color } = getStatusDisplay(status);

  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${color} px-2 py-1 bg-layer-01 rounded border border-border-subtle`}>
      {Icon && <Icon size="sm" />}
      {compact ? null : <span>{text}</span>}
    </div>
  );
}

export function Toolbar(
  { saveStatus, onSave, onOpenSettings, onExportPdf, isExportingPdf = false, isPdfExportDisabled = false, onRefresh }:
    ToolbarProps,
) {
  const { isSplitView, isFocusMode, isPreviewVisible, toggleSplitView, toggleFocusMode, togglePreviewVisible } =
    useToolbarState();
  const { viewportWidth, isCompact, isNarrow } = useViewportTier();
  const icons: Record<string, { Component: React.ComponentType<IconProps>; size: IconSize }> = useMemo(
    () => ({
      save: { Component: SaveIcon, size: "sm" },
      refresh: { Component: RefreshIcon, size: "sm" },
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
        <SaveStatusIndicator status={saveStatus} compact={compactStatus} />
        {onRefresh && !hideRefresh && (
          <ToolbarButton icon={icons.refresh} label="Refresh" onClick={onRefresh} shortcut="F5" iconOnly={iconOnly} />
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
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
        <ToolbarButton icon={icons.settings} label="Settings" onClick={onOpenSettings} iconOnly={iconOnly} />
      </div>
    </div>
  );
}
