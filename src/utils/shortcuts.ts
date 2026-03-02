export function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

export function formatKey(key: string): string {
  switch (key.toLowerCase()) {
    case "cmd":
    case "command":
    case "meta":
      return isMac() ? "⌘" : "Ctrl";
    case "ctrl":
    case "control":
      return isMac() ? "⌃" : "Ctrl";
    case "alt":
    case "option":
      return isMac() ? "⌥" : "Alt";
    case "shift":
      return isMac() ? "⇧" : "Shift";
    case "enter":
    case "return":
      return "↵";
    case "escape":
    case "esc":
      return "Esc";
    case "backspace":
      return isMac() ? "⌫" : "Backspace";
    case "delete":
      return isMac() ? "⌦" : "Del";
    case "tab":
      return isMac() ? "⇥" : "Tab";
    case "space":
      return "Space";
    case "arrowup":
    case "arrow-up":
      return "↑";
    case "arrowdown":
    case "arrow-down":
      return "↓";
    case "arrowleft":
    case "arrow-left":
      return "←";
    case "arrowright":
    case "arrow-right":
      return "→";
    default:
      return key.length === 1 ? key.toUpperCase() : key;
  }
}

export function formatShortcut(shortcut: string): string {
  return shortcut.split("+").map((part) => formatKey(part.trim())).join("+");
}
