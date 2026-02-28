import { Button } from "$components/Button";
import type { StyleCheckSettings } from "$types";
import { useCallback, useMemo } from "react";

type ToggleCustomProps = { showCustom: boolean; setShowCustom: (value: boolean) => void; settings: StyleCheckSettings };

export const ToggleCustom = ({ showCustom, setShowCustom, settings }: ToggleCustomProps) => {
  const handleClick = useCallback(() => setShowCustom(!showCustom), [showCustom, setShowCustom]);
  const label = useMemo(() => {
    const count = settings.customPatterns.length;
    const tag = showCustom ? "Hide" : "Show";
    return `${tag} Custom Patterns (${count})`;
  }, [showCustom, settings.customPatterns.length]);
  return (
    <Button
      type="button"
      onClick={handleClick}
      className="text-xs text-text-secondary hover:text-text-primary cursor-pointer bg-transparent border-none p-0">
      {label}
    </Button>
  );
};
