import { useState } from "react";
import { CheckIcon, EyeIcon, FocusIcon, RefreshIcon, SaveIcon, SettingsIcon, SplitViewIcon } from "./icons";

type SaveStatus = "Idle" | "Dirty" | "Saving" | "Saved" | "Error";

type ToolbarProps = {
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
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick: () => void;
    disabled?: boolean;
    shortcut?: string;
  },
) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[0.8125rem] relative transition-all duration-150 ease rounded ${
        isActive
          ? "bg-layer-accent-01 border border-border-strong text-text-primary"
          : "bg-transparent border border-transparent text-text-secondary"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      onMouseOver={(e) => {
        if (!disabled && !isActive) {
          (e.currentTarget as HTMLButtonElement).classList.add("bg-layer-hover-01", "text-text-primary");
        }
      }}
      onMouseOut={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).classList.remove("bg-layer-hover-01", "text-text-primary");
        }
      }}>
      <span className="flex items-center">{icon}</span>
      <span>{label}</span>

      {showTooltip && shortcut && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-layer-02 border border-border-subtle rounded text-xs text-text-secondary whitespace-nowrap z-100 shadow-lg">
          {shortcut}
        </div>
      )}
    </button>
  );
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const getStatusDisplay = () => {
    switch (status) {
      case "Saving":
        return { icon: <SaveIcon size={14} />, text: "Saving...", color: "text-accent-cyan" };
      case "Saved":
        return { icon: <CheckIcon size={14} />, text: "Saved", color: "text-accent-green" };
      case "Dirty":
        return { icon: null, text: "Unsaved", color: "text-accent-yellow" };
      case "Error":
        return { icon: null, text: "Error", color: "text-support-error" };
      default:
        return { icon: null, text: "Ready", color: "text-text-placeholder" };
    }
  };

  const { icon, text, color } = getStatusDisplay();

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
  return (
    <div className="h-[48px] bg-layer-01 border-b border-border-subtle flex items-center justify-between px-4 gap-4">
      {/* Left section - Document actions */}
      <div className="flex items-center gap-2">
        <ToolbarButton
          icon={<SaveIcon size={14} />}
          label="Save"
          onClick={onSave}
          disabled={saveStatus === "Saved" || saveStatus === "Saving"}
          shortcut="Ctrl+S" />

        <SaveStatusIndicator status={saveStatus} />

        {onRefresh && (
          <ToolbarButton icon={<RefreshIcon size={14} />} label="Refresh" onClick={onRefresh} shortcut="F5" />
        )}
      </div>

      {/* Center section - View modes */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          icon={<SplitViewIcon size={14} />}
          label="Split"
          isActive={isSplitView}
          onClick={onToggleSplitView}
          shortcut="Ctrl+\\" />

        <ToolbarButton
          icon={<EyeIcon size={14} />}
          label="Preview"
          isActive={isPreviewVisible}
          onClick={onTogglePreview}
          shortcut="Ctrl+P" />

        <ToolbarButton
          icon={<FocusIcon size={14} />}
          label="Focus"
          isActive={isFocusMode}
          onClick={onToggleFocusMode}
          shortcut="Ctrl+Shift+F" />
      </div>

      {/* Right section - Settings */}
      <div>
        <ToolbarButton icon={<SettingsIcon size={14} />} label="Settings" onClick={onOpenSettings} />
      </div>
    </div>
  );
}
