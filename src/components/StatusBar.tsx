import { useViewportTier } from "$hooks/useViewportTier";
import type { DocMeta, LineEnding } from "$types";
import { formatStatusDate } from "$utils/date";
import { useMemo } from "react";

export type StatusBarStats = {
  cursorLine: number;
  cursorColumn: number;
  wordCount: number;
  charCount: number;
  selectionCount?: number;
};

export type StatusBarProps = {
  docMeta?: DocMeta | null;
  stats: StatusBarStats;
  encoding?: string;
  lineEnding?: LineEnding;
};

type StatusItemProps = { label?: string; value: string | number; title?: string; valueClassName?: string };

const StatusItem = ({ label, value, title, valueClassName = "" }: StatusItemProps) => (
  <div title={title} className="flex min-w-0 items-center gap-1 px-1.5 text-[0.6875rem] text-text-secondary">
    {label && <span className="shrink-0 text-text-placeholder">{label}</span>}
    <span className={`truncate ${valueClassName}`}>{value}</span>
  </div>
);

const StatusDivider = () => <div className="h-3 w-px bg-border-subtle" />;

const UpdatedAtItem = ({ updatedAt }: { updatedAt: string }) => (
  <>
    <StatusItem
      label="Updated"
      value={formatStatusDate(updatedAt)}
      valueClassName="max-w-[9.5rem]"
      title={`Last modified: ${new Date(updatedAt).toLocaleString()}`} />
    <StatusDivider />
  </>
);

const WordAndCharItems = ({ wordCount, charCount }: { wordCount: number; charCount: number }) => (
  <>
    <StatusItem label="Words" value={wordCount.toLocaleString()} valueClassName="tabular-nums" />
    <StatusDivider />
    <StatusItem label="Chars" value={charCount.toLocaleString()} valueClassName="tabular-nums" />
  </>
);

const SelectionItems = ({ selectionCount }: { selectionCount: number }) => (
  <>
    <StatusDivider />
    <StatusItem label="Selected" value={selectionCount.toLocaleString()} />
  </>
);

const EncodingItems = ({ encoding }: { encoding: string }) => (
  <>
    <StatusDivider />
    <StatusItem value={encoding} />
  </>
);

const LineEndingItems = ({ lineEnding }: { lineEnding: LineEnding }) => (
  <>
    <StatusDivider />
    <StatusItem value={lineEnding} />
  </>
);

const LeftItems = (
  { docMeta, stats, showUpdatedAt, showSelection }: {
    docMeta?: DocMeta | null;
    stats: StatusBarStats;
    showUpdatedAt: boolean;
    showSelection: boolean;
  },
) => {
  const selectionCount = useMemo(() => stats.selectionCount ?? 0, [stats.selectionCount]);
  if (!docMeta) {
    return <span className="truncate text-[0.6875rem] text-text-placeholder">No document open</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
      {showUpdatedAt ? <UpdatedAtItem updatedAt={docMeta.updated_at} /> : null}
      <WordAndCharItems wordCount={stats.wordCount} charCount={stats.charCount} />
      {showSelection && selectionCount > 0 ? <SelectionItems selectionCount={selectionCount} /> : null}
    </div>
  );
};

const RightItems = (
  { stats, encoding, lineEnding, showEncoding, showLineEnding }: {
    stats: StatusBarStats;
    encoding: string;
    lineEnding: LineEnding;
    showEncoding: boolean;
    showLineEnding: boolean;
  },
) => (
  <div className="flex shrink-0 items-center gap-1.5">
    <StatusItem
      label="Position"
      value={`Ln ${stats.cursorLine}, Col ${stats.cursorColumn}`}
      valueClassName="tabular-nums" />
    {showEncoding ? <EncodingItems encoding={encoding} /> : null}
    {showLineEnding ? <LineEndingItems lineEnding={lineEnding} /> : null}
  </div>
);

export function StatusBar({ docMeta, stats, encoding = "utf8", lineEnding = "LF" }: StatusBarProps) {
  const { viewportWidth, isCompact, isNarrow } = useViewportTier();
  const showUpdatedAt = useMemo(() => !isCompact && viewportWidth >= 900, [isCompact, viewportWidth]);
  const showEncoding = useMemo(() => !isCompact, [isCompact]);
  const showLineEnding = useMemo(() => !isNarrow, [isNarrow]);
  const showSelection = useMemo(() => !isCompact, [isCompact]);

  return (
    <footer className="h-7 bg-layer-01 border-t border-border-subtle flex items-center justify-between px-2 sm:px-3 font-mono gap-2">
      <LeftItems docMeta={docMeta} stats={stats} showUpdatedAt={showUpdatedAt} showSelection={showSelection} />

      <RightItems
        stats={stats}
        encoding={encoding}
        lineEnding={lineEnding}
        showEncoding={showEncoding}
        showLineEnding={showLineEnding} />
    </footer>
  );
}
