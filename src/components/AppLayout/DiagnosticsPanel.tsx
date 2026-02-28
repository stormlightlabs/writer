import { Button } from "$components/Button";
import { Sheet } from "$components/Sheet";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "$editor/constants";
import type { StyleMatch } from "$editor/types";
import { XIcon } from "$icons";
import { PatternCategory } from "$types";
import { useCallback, useMemo } from "react";

type DiagnosticsPanelProps = {
  isVisible: boolean;
  styleCheckEnabled: boolean;
  matches: StyleMatch[];
  onSelectMatch: (match: StyleMatch) => void;
  onClose: () => void;
  onOpenSettings: () => void;
};

type GroupedMatches = Record<PatternCategory, StyleMatch[]>;

const groupMatches = (matches: StyleMatch[]): GroupedMatches => ({
  filler: matches.filter((m) => m.category === "filler"),
  redundancy: matches.filter((m) => m.category === "redundancy"),
  cliche: matches.filter((m) => m.category === "cliche"),
});

function MatchItem({ match, onClick }: { match: StyleMatch; onClick: (match: StyleMatch) => void }) {
  const matchStyle = useMemo(
    () => ({ backgroundColor: `${CATEGORY_COLORS[match.category]}20`, color: CATEGORY_COLORS[match.category] }),
    [match.category],
  );

  const clickHandler = useCallback(() => onClick(match), [onClick, match]);

  return (
    <Button
      type="button"
      onClick={clickHandler}
      className="w-full text-left px-3 py-2 hover:bg-layer-hover border-b border-border-subtle last:border-b-0 cursor-pointer bg-transparent border-l-0 border-r-0 border-t-0">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={matchStyle}>{match.text}</span>
        <span className="text-xs text-text-secondary ml-auto">L{match.line}</span>
      </div>
      {match.replacement && (
        <p className="m-0 mt-1 text-xs text-text-secondary truncate">Suggestion: {match.replacement}</p>
      )}
    </Button>
  );
}

function CategorySection(
  { category, matches, onSelectMatch }: {
    category: keyof GroupedMatches;
    matches: StyleMatch[];
    onSelectMatch: (match: StyleMatch) => void;
  },
) {
  const labelStyle = useMemo(() => ({ backgroundColor: CATEGORY_COLORS[category] }), [category]);
  if (matches.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
        <span className="w-2 h-2 rounded-full" style={labelStyle} />
        <h3 className="m-0 text-xs font-medium text-text-primary">{CATEGORY_LABELS[category]}</h3>
        <span className="text-xs text-text-secondary ml-auto">{matches.length}</span>
      </div>
      <div>
        {matches.map((match, index) => {
          const k = `${category}-${index}-${match.from}`;
          return <MatchItem key={k} match={match} onClick={onSelectMatch} />;
        })}
      </div>
    </div>
  );
}

const DiagnosticsPanelHeader = (
  { totalCount, onClose, styleCheckEnabled }: { totalCount: number; onClose: () => void; styleCheckEnabled: boolean },
) => {
  const subtitle = useMemo(() => {
    if (!styleCheckEnabled) {
      return "Style Check is disabled";
    }

    if (totalCount === 0) {
      return "No issues found";
    }

    return `${totalCount} issue${totalCount === 1 ? "" : "s"} found`;
  }, [styleCheckEnabled, totalCount]);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
      <div>
        <h2 className="m-0 text-sm font-medium text-text-primary">Style Check</h2>
        <p className="m-0 text-xs text-text-secondary">{subtitle}</p>
      </div>
      <Button type="button" variant="iconSubtle" size="iconLg" onClick={onClose} aria-label="Close diagnostics panel">
        <XIcon className="w-4 h-4" />
      </Button>
    </div>
  );
};

const DiagnosticsDisabledState = ({ onOpenSettings }: { onOpenSettings: () => void }) => (
  <div className="flex-1 overflow-y-auto px-4 py-6">
    <p className="m-0 text-sm text-text-secondary mb-3">Enable Style Check in Settings to populate diagnostics.</p>
    <Button type="button" variant="outline" size="sm" onClick={onOpenSettings}>Open Settings</Button>
  </div>
);

const DiagnosticsPanelContent = (
  { grouped, totalCount, onSelectMatch, styleCheckEnabled, onOpenSettings }: {
    grouped: GroupedMatches;
    totalCount: number;
    onSelectMatch: (match: StyleMatch) => void;
    styleCheckEnabled: boolean;
    onOpenSettings: () => void;
  },
) => {
  if (!styleCheckEnabled) {
    return <DiagnosticsDisabledState onOpenSettings={onOpenSettings} />;
  }

  if (totalCount === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-8 text-center">
          <p className="m-0 text-sm text-text-secondary">Great writing! No style issues detected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <CategorySection category="filler" matches={grouped.filler} onSelectMatch={onSelectMatch} />
      <CategorySection category="redundancy" matches={grouped.redundancy} onSelectMatch={onSelectMatch} />
      <CategorySection category="cliche" matches={grouped.cliche} onSelectMatch={onSelectMatch} />
    </div>
  );
};

export function DiagnosticsPanel(
  { isVisible, styleCheckEnabled, matches, onSelectMatch, onClose, onOpenSettings }: DiagnosticsPanelProps,
) {
  const grouped = useMemo(() => groupMatches(matches), [matches]);
  const totalCount = useMemo(() => matches.length, [matches]);

  return (
    <Sheet
      isOpen={isVisible}
      onClose={onClose}
      position="r"
      size="sm"
      ariaLabel="Style diagnostics"
      backdropClassName="bg-black/25"
      className="right-4 top-14 bottom-4 rounded-lg border">
      <div className="flex min-h-0 h-full flex-col overflow-hidden">
        <DiagnosticsPanelHeader totalCount={totalCount} onClose={onClose} styleCheckEnabled={styleCheckEnabled} />
        <DiagnosticsPanelContent
          grouped={grouped}
          totalCount={totalCount}
          onSelectMatch={onSelectMatch}
          styleCheckEnabled={styleCheckEnabled}
          onOpenSettings={onOpenSettings} />
      </div>
    </Sheet>
  );
}
