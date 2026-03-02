import { createPortal } from "react-dom";

type DragGhostProps = { label: string | null };

export function DragGhost({ label }: DragGhostProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div id="sidebar-drag-ghost" className="sidebar-drag-ghost" aria-hidden="true">{label ?? "Moving item"}</div>,
    document.body,
  );
}
