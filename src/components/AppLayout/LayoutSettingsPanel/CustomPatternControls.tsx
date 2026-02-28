import { StyleCheckSettings } from "$types";
import { type AddPatternFn, AddPatternForm } from "./AddPatternForm";
import { CustomPattern } from "./CustomPattern";
import { ToggleCustom } from "./ToggleCustom";

type CustomPanelControlProps = {
  showCustom: boolean;
  setShowCustom: (value: boolean) => void;
  settings: StyleCheckSettings;
  onRemovePattern: (index: number) => void;
  onAddPattern: AddPatternFn;
};

export const CustomPatternControls = (
  { showCustom, setShowCustom, settings, onRemovePattern, onAddPattern }: CustomPanelControlProps,
) => {
  if (!showCustom) {
    return <ToggleCustom showCustom={showCustom} setShowCustom={setShowCustom} settings={settings} />;
  }

  return (
    <div className="mt-3">
      <ToggleCustom showCustom={showCustom} setShowCustom={setShowCustom} settings={settings} />
      <div className="mt-2 space-y-2">
        {settings.customPatterns.length > 0
          ? <CustomPattern settings={settings} onRemovePattern={onRemovePattern} />
          : null}
        <AddPatternForm onAddPattern={onAddPattern} />
      </div>
    </div>
  );
};
