import { Switch } from "$components/Switch";

type ToggleRowProps = {
  label: string;
  description: string;
  isVisible: boolean;
  onToggle: (isVisible: boolean) => void;
};

export const ToggleRow = ({ label, description, isVisible, onToggle }: ToggleRowProps) => {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[0.8125rem] text-text-primary">{label}</p>
        <p className="m-0 wrap-break-word text-xs text-text-secondary">{description}</p>
      </div>
      <Switch checked={isVisible} onCheckedChange={onToggle} ariaLabel={label} className="mt-0.5" />
    </div>
  );
};
