import type { MouseEventHandler } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { SaveStatus } from "../types";
import {
  CheckIcon,
  EyeIcon,
  FocusIcon,
  IconProps,
  type IconSize,
  RefreshIcon,
  SaveIcon,
  SettingsIcon,
  SplitViewIcon,
} from "./icons";
import { Tooltip } from "./Tooltip";

export type ToolbarProps = {
  saveStatus: SaveStatus;
  isSplitView: boolean;
  isFocusMode: boolean;
  isPreviewVisible: boolean;
  onSave: () => void;
  onToggleSplitView: () => void;
  onToggleFocusMode: () => void;
  onTogglePreview: () => void;
  onOpenSettings: () => void;
  onRefresh?: () => void;
};

function ToolbarButton(
  { icon, label, isActive = false, onClick, disabled = false, shortcut }: {
    icon: { Component: React.ComponentType<IconProps>; size: IconSize };
    label: string;
    isActive?: boolean;
    onClick: () => void;
    disabled?: boolean;
    shortcut?: string;
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
  }, []);

  const handleMouseOut: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    if (!isActive) {
      (e.currentTarget as HTMLButtonElement).classList.remove("bg-layer-hover-01", "text-text-primary");
    }
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[0.8125rem] relative transition-all duration-150 ease rounded ${
          isActive
            ? "bg-layer-accent-01 border border-border-strong text-text-primary"
            : "bg-transparent border border-transparent text-text-secondary"
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}>
        <icon.Component size={icon.size} />
        <span>{label}</span>
      </button>
      {shortcut ? <Tooltip anchorRef={buttonRef} visible={showTooltip}>{shortcut}</Tooltip> : null}
    </>
  );
}

const getStatusDisplay = (status: SaveStatus) => {
  switch (status) {
    case "Saving": {
      return { icon: <SaveIcon size="sm" />, text: "Saving...", color: "text-accent-cyan" };
    }
    case "Saved": {
      return { icon: <CheckIcon size="sm" />, text: "Saved", color: "text-accent-green" };
    }
    case "Dirty": {
      return { icon: null, text: "Unsaved", color: "text-accent-yellow" };
    }
    case "Error": {
      return { icon: null, text: "Error", color: "text-support-error" };
    }
    default: {
      return { icon: null, text: "Ready", color: "text-text-placeholder" };
    }
  }
};

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const { icon, text, color } = getStatusDisplay(status);

  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${color} px-2 py-1 bg-layer-01 rounded border border-border-subtle`}>
      {icon && <span className="flex">{icon}</span>}
      <span>{text}</span>
    </div>
  );
}

export function Toolbar(
  {
    saveStatus,
    isSplitView,
    isFocusMode,
    isPreviewVisible,
    onSave,
    onToggleSplitView,
    onToggleFocusMode,
    onTogglePreview,
    onOpenSettings,
    onRefresh,
  }: ToolbarProps,
) {
  const icons: Record<string, { Component: React.ComponentType<IconProps>; size: IconSize }> = useMemo(
    () => ({
      save: { Component: SaveIcon, size: "sm" },
      refresh: { Component: RefreshIcon, size: "sm" },
      splitView: { Component: SplitViewIcon, size: "sm" },
      eye: { Component: EyeIcon, size: "sm" },
      focus: { Component: FocusIcon, size: "sm" },
      settings: { Component: SettingsIcon, size: "sm" },
    }),
    [],
  );

  return (
    <div className="h-[48px] bg-layer-01 border-b border-border-subtle flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-2">
        <ToolbarButton
          icon={icons.save}
          label="Save"
          onClick={onSave}
          disabled={saveStatus === "Saved" || saveStatus === "Saving"}
          shortcut="Ctrl+S" />

        <SaveStatusIndicator status={saveStatus} />

        {onRefresh && <ToolbarButton icon={icons.refresh} label="Refresh" onClick={onRefresh} shortcut="F5" />}
      </div>

      <div className="flex items-center gap-1">
        <ToolbarButton
          icon={icons.splitView}
          label="Split"
          isActive={isSplitView}
          onClick={onToggleSplitView}
          shortcut="Ctrl+\\" />

        <ToolbarButton
          icon={icons.eye}
          label="Preview"
          isActive={isPreviewVisible}
          onClick={onTogglePreview}
          shortcut="Ctrl+P" />

        <ToolbarButton
          icon={icons.focus}
          label="Focus"
          isActive={isFocusMode}
          onClick={onToggleFocusMode}
          shortcut="Ctrl+F" />
      </div>

      <div>
        <ToolbarButton icon={icons.settings} label="Settings" onClick={onOpenSettings} />
      </div>
    </div>
  );
}
