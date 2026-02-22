import { useCallback } from "react";

type ToggleRowProps = {
  label: string;
  description: string;
  isVisible: boolean;
  onToggle: (isVisible: boolean) => void;
};

export const ToggleRow = ({ label, description, isVisible, onToggle }: ToggleRowProps) => {
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
