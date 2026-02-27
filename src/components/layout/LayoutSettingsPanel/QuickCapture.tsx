import { useGlobalCaptureSettingsState } from "$state/selectors";
import { useCallback } from "react";
import { ToggleRow } from "./ToggleRow";

export const QuickCaptureSection = () => {
  const { settings, setQuickCaptureEnabled } = useGlobalCaptureSettingsState();
  const quickCaptureEnabled = settings.enabled;

  const handleQuickCaptureEnabledChange = useCallback((enabled: boolean) => {
    setQuickCaptureEnabled(enabled);
  }, [setQuickCaptureEnabled]);

  return (
    <ToggleRow
      label="Enable Quick Capture"
      description="Turn global quick-note capture on or off."
      isVisible={quickCaptureEnabled}
      onToggle={handleQuickCaptureEnabledChange} />
  );
};
