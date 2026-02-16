import type { MouseEventHandler } from "react";
import { useCallback, useMemo, useState } from "react";
import type { SaveStatus } from "../ports";
import { CheckIcon, EyeIcon, FocusIcon, RefreshIcon, SaveIcon, SettingsIcon, SplitViewIcon } from "./icons";

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
    icon: { Component: React.ComponentType<{ size: number }>; size: number };
    label: string;
    isActive?: boolean;
    onClick: () => void;
    disabled?: boolean;
    shortcut?: string;
  },
) {
  const [showTooltip, setShowTooltip] = useState(false);

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
    <button
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
      <span className="flex items-center">
        <icon.Component size={icon.size} />
      </span>
      <span>{label}</span>

      {showTooltip && shortcut && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-layer-02 border border-border-subtle rounded text-xs text-text-secondary whitespace-nowrap z-100 shadow-lg">
          {shortcut}
        </div>
      )}
    </button>
  );
}

const getStatusDisplay = (status: SaveStatus) => {
  switch (status) {
    case "Saving": {
      return { icon: <SaveIcon size={14} />, text: "Saving...", color: "text-accent-cyan" };
    }
    case "Saved": {
      return { icon: <CheckIcon size={14} />, text: "Saved", color: "text-accent-green" };
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
  const icons = useMemo(
    () => ({
      save: { Component: SaveIcon, size: 14 },
      refresh: { Component: RefreshIcon, size: 14 },
      splitView: { Component: SplitViewIcon, size: 14 },
      eye: { Component: EyeIcon, size: 14 },
      focus: { Component: FocusIcon, size: 14 },
      settings: { Component: SettingsIcon, size: 14 },
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
