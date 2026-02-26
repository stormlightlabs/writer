import { CheckIcon, SaveIcon } from "$icons";
import type { SaveStatus } from "$types";

export function SaveStatusIndicator({ status, compact = false }: { status: SaveStatus; compact?: boolean }) {
  switch (status) {
    case "Saving": {
      return (
        <div className="flex items-center gap-1.5 text-xs text-accent-cyan px-2 py-1 bg-layer-01 rounded border border-border-subtle">
          <SaveIcon size="sm" />
          {compact ? null : <span>Saving...</span>}
        </div>
      );
    }
    case "Saved": {
      return (
        <div className="flex items-center gap-1.5 text-xs text-accent-green px-2 py-1 bg-layer-01 rounded border border-border-subtle">
          <CheckIcon size="sm" />
          {compact ? null : <span>Saved</span>}
        </div>
      );
    }
    case "Dirty": {
      return (
        <div className="flex items-center gap-1.5 text-xs text-accent-yellow px-2 py-1 bg-layer-01 rounded border border-border-subtle">
          {compact ? null : <span>Unsaved</span>}
        </div>
      );
    }
    case "Error": {
      return (
        <div className="flex items-center gap-1.5 text-xs text-support-error px-2 py-1 bg-layer-01 rounded border border-border-subtle">
          {compact ? null : <span>Error</span>}
        </div>
      );
    }
    default: {
      return (
        <div className="flex items-center gap-1.5 text-xs text-text-placeholder px-2 py-1 bg-layer-01 rounded border border-border-subtle">
          {compact ? null : <span>Ready</span>}
        </div>
      );
    }
  }
}
