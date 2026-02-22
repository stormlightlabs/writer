import { CATEGORY_COLORS, CATEGORY_LABELS } from "$editor/constants";
import type { StyleMatch } from "$editor/style-check";
import { XIcon } from "$icons";
import { PatternCategory } from "$types";
import { useCallback, useMemo } from "react";

type DiagnosticsPanelProps = {
  isVisible: boolean;
  matches: StyleMatch[];
  sidebarCollapsed: boolean;
  topOffset: number;
  onSelectMatch: (match: StyleMatch) => void;
  onClose: () => void;
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
    <button
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
    </button>
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

const DiagnosticsPanelHeader = ({ totalCount, onClose }: { totalCount: number; onClose: () => void }) => (
  <>
    <div>
      <h2 className="m-0 text-sm font-medium text-text-primary">Style Check</h2>
      <p className="m-0 text-xs text-text-secondary">
        {totalCount === 0 ? "No issues found" : `${totalCount} issue${totalCount === 1 ? "" : "s"} found`}
      </p>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="w-7 h-7 flex items-center justify-center bg-transparent border border-border-subtle rounded text-icon-secondary hover:text-icon-primary cursor-pointer"
      aria-label="Close diagnostics panel">
      <XIcon className="w-4 h-4" />
    </button>
  </>
);

const DiagnosticsPanelContent = (
  { grouped, totalCount, onSelectMatch }: {
    grouped: GroupedMatches;
    totalCount: number;
    onSelectMatch: (match: StyleMatch) => void;
  },
) => {
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
  { isVisible, matches, sidebarCollapsed, topOffset, onSelectMatch, onClose }: DiagnosticsPanelProps,
) {
  const grouped = useMemo(() => groupMatches(matches), [matches]);
  const totalCount = useMemo(() => matches.length, [matches]);
  const panelStyle = useMemo(
    () => ({
      left: sidebarCollapsed ? 16 : 256 + 16,
      top: topOffset + 16,
      width: 320,
      maxHeight: "calc(100vh - 80px)",
    }),
    [sidebarCollapsed, topOffset],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed z-40 bg-layer-01 border border-border-subtle rounded-lg shadow-xl flex flex-col"
      style={panelStyle}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <DiagnosticsPanelHeader totalCount={totalCount} onClose={onClose} />
      </div>

      <DiagnosticsPanelContent grouped={grouped} totalCount={totalCount} onSelectMatch={onSelectMatch} />
    </div>
  );
}
