import type { DocMeta, LineEnding } from "../types";

export type StatusBarProps = {
  docMeta?: DocMeta | null;
  cursorLine: number;
  cursorColumn: number;
  wordCount: number;
  charCount: number;
  selectionCount?: number;
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

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "—";
  }
}

const StatusMeta = (
  { docMeta, wordCount, charCount }: { docMeta: DocMeta | null; wordCount: number; charCount: number },
) => {
  if (docMeta) {
    return (
      <>
        <StatusItem
          label="Updated"
          value={formatDate(docMeta.updated_at)}
          valueClassName="max-w-[9.5rem]"
          title={`Last modified: ${new Date(docMeta.updated_at).toLocaleString()}`} />
        <StatusDivider />
        <StatusItem label="Words" value={wordCount.toLocaleString()} valueClassName="tabular-nums" />
        <StatusDivider />
        <StatusItem label="Chars" value={charCount.toLocaleString()} valueClassName="tabular-nums" />
      </>
    );
  }

  return null;
};

const SelectedCount = ({ selectionCount }: { selectionCount: number }) => (
  <>
    <StatusDivider />
    <StatusItem label="Selected" value={selectionCount.toLocaleString()} />
  </>
);

export function StatusBar(
  { docMeta, cursorLine, cursorColumn, wordCount, charCount, selectionCount, encoding = "utf8", lineEnding = "LF" }:
    StatusBarProps,
) {
  return (
    <footer className="h-7 bg-layer-01 border-t border-border-subtle flex items-center justify-between px-3 font-mono">
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
        {docMeta
          ? <StatusMeta docMeta={docMeta} wordCount={wordCount} charCount={charCount} />
          : <span className="truncate text-[0.6875rem] text-text-placeholder">No document open</span>}
        {selectionCount && selectionCount > 0 ? <SelectedCount selectionCount={selectionCount} /> : null}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <StatusItem label="Position" value={`Ln ${cursorLine}, Col ${cursorColumn}`} valueClassName="tabular-nums" />
        <StatusDivider />
        <StatusItem value={encoding} />
        <StatusDivider />
        <StatusItem value={lineEnding} />
      </div>
    </footer>
  );
}
