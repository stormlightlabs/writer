import { useReduceMotionState } from "$state/selectors";
import { ToggleRow } from "./ToggleRow";

export function AccessibilitySection() {
  const { reduceMotion, setReduceMotion } = useReduceMotionState();

  return (
    <ToggleRow
      label="Reduce Animations"
      description="Minimize motion for accessibility and reduced distraction."
      isVisible={reduceMotion}
      onToggle={setReduceMotion} />
  );
}
