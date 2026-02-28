import { useLayoutSettingsFocusState } from "$state/selectors";
import { DimmingModeRow } from "./DimmingModeRow";
import { ToggleRow } from "./ToggleRow";

export function FocusModeSection() {
  const { focusModeSettings, setTypewriterScrollingEnabled, setFocusDimmingMode, setAutoEnterFocusMode } =
    useLayoutSettingsFocusState();

  return (
    <>
      <ToggleRow
        label="Auto-enter Focus Mode"
        description="Enter Focus mode when opening a document."
        isVisible={focusModeSettings.autoEnterFocusMode}
        onToggle={setAutoEnterFocusMode} />
      <ToggleRow
        label="Typewriter Scrolling"
        description="Keep the active line centered in the viewport."
        isVisible={focusModeSettings.typewriterScrollingEnabled}
        onToggle={setTypewriterScrollingEnabled} />

      <DimmingModeRow value={focusModeSettings.dimmingMode} setter={setFocusDimmingMode} />
    </>
  );
}
