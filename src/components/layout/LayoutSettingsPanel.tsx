import { useCallback } from "react";
import { XIcon } from "../icons";

type LayoutSettingsPanelProps = {
  isVisible: boolean;
  sidebarCollapsed: boolean;
  topBarsCollapsed: boolean;
  statusBarCollapsed: boolean;
  lineNumbersVisible: boolean;
  onSetSidebarCollapsed: (value: boolean) => void;
  onSetTopBarsCollapsed: (value: boolean) => void;
  onSetStatusBarCollapsed: (value: boolean) => void;
  onSetLineNumbersVisible: (value: boolean) => void;
  onClose: () => void;
};

type ToggleRowProps = {
  label: string;
  description: string;
  isVisible: boolean;
  onToggle: (isVisible: boolean) => void;
};

const ToggleRow = ({ label, description, isVisible, onToggle }: ToggleRowProps) => {
  const handleClick = useCallback(() => {
    onToggle(!isVisible);
  }, [isVisible, onToggle]);

  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="m-0 text-[0.8125rem] text-text-primary">{label}</p>
        <p className="m-0 text-xs text-text-secondary">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isVisible}
        onClick={handleClick}
        className={`relative w-11 h-6 rounded-full border transition-colors duration-150 cursor-pointer ${
          isVisible ? "bg-accent-cyan border-accent-cyan" : "bg-layer-02 border-border-subtle"
        }`}>
        <span
          className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white transition-transform duration-150 ${
            isVisible ? "translate-x-[20px]" : ""
          }`} />
      </button>
    </div>
  );
};

const SettingsHeader = ({ onClose }: { onClose: () => void }) => (
  <div className="flex items-center justify-between mb-2">
    <h2 className="m-0 text-sm font-medium text-text-primary">Layout Settings</h2>
    <button
      type="button"
      onClick={onClose}
      className="w-7 h-7 flex items-center justify-center bg-transparent border border-border-subtle rounded text-icon-secondary hover:text-icon-primary cursor-pointer"
      aria-label="Close layout settings">
      <XIcon size="sm" />
    </button>
  </div>
);

export function LayoutSettingsPanel(
  {
    isVisible,
    sidebarCollapsed,
    topBarsCollapsed,
    statusBarCollapsed,
    lineNumbersVisible,
    onSetSidebarCollapsed,
    onSetTopBarsCollapsed,
    onSetStatusBarCollapsed,
    onSetLineNumbersVisible,
    onClose,
  }: LayoutSettingsPanelProps,
) {
  const toggleSidebar = useCallback(() => {
    onSetSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, onSetSidebarCollapsed]);

  const toggleTopBars = useCallback(() => {
    onSetTopBarsCollapsed(!topBarsCollapsed);
  }, [topBarsCollapsed, onSetTopBarsCollapsed]);

  const toggleStatusBar = useCallback(() => {
    onSetStatusBarCollapsed(!statusBarCollapsed);
  }, [statusBarCollapsed, onSetStatusBarCollapsed]);

  const toggleLineNumbers = useCallback(() => {
    onSetLineNumbersVisible(!lineNumbersVisible);
  }, [lineNumbersVisible, onSetLineNumbersVisible]);

  if (isVisible) {
    return (
      <div className="fixed inset-0 z-50">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close layout settings"
          className="absolute inset-0 bg-black/30 border-none p-0 m-0" />

        <section className="absolute right-4 top-14 w-[320px] bg-layer-01 border border-border-subtle rounded-lg shadow-xl p-4">
          <SettingsHeader onClose={onClose} />
          <ToggleRow
            label="Sidebar"
            description="Show or hide the left navigation panel."
            isVisible={!sidebarCollapsed}
            onToggle={toggleSidebar} />
          <ToggleRow
            label="Tab Bar"
            description="Show or hide the document tabs."
            isVisible={!topBarsCollapsed}
            onToggle={toggleTopBars} />
          <ToggleRow
            label="Status Bar"
            description="Show or hide the editor status row."
            isVisible={!statusBarCollapsed}
            onToggle={toggleStatusBar} />
          <ToggleRow
            label="Line Numbers"
            description="Show or hide line numbers in the editor gutter."
            isVisible={lineNumbersVisible}
            onToggle={toggleLineNumbers} />
        </section>
      </div>
    );
  }

  return null;
}
