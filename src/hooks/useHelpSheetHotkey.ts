import { useHelpSheetState } from "$state/selectors";
import { useShortcutsStore } from "$state/stores/shortcuts";
import { useEffect } from "react";

const HELP_SHORTCUT = {
  id: "toggle-help-sheet",
  category: "Help",
  label: "Toggle Help Sheet",
  keys: ["Cmd", "Shift", "/"],
  description: "Show or hide the help sheet with keyboard shortcuts and markdown reference",
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable || target.closest("[contenteditable='true']")) {
    return true;
  }

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useHelpSheetHotkey(): void {
  const { toggle } = useHelpSheetState();
  const registerShortcut = useShortcutsStore((state) => state.registerShortcut);
  const unregisterShortcut = useShortcutsStore((state) => state.unregisterShortcut);

  useEffect(() => {
    registerShortcut(HELP_SHORTCUT);
    return () => {
      unregisterShortcut(HELP_SHORTCUT.id);
    };
  }, [registerShortcut, unregisterShortcut]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey) {
        return;
      }

      const hasMod = event.ctrlKey || event.metaKey;
      const isQuestionMark = event.key === "?" || (event.shiftKey && event.key.toLowerCase() === "/");

      if (hasMod && isQuestionMark && !isEditableTarget(event.target)) {
        event.preventDefault();
        toggle();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggle]);
}
