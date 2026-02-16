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

const StatusItem = ({ label, value, title }: { label?: string; value: string | number; title?: string }) => (
  <div title={title} className="flex items-center gap-1 text-xs text-text-secondary px-2">
    {label && <span className="text-text-placeholder">{label}:</span>}
    <span>{value}</span>
  </div>
);

const StatusDivider = () => <div className="w-px h-3 bg-border-subtle" />;

function formatDate(dateString: string) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
          label="Modified"
          value={formatDate(docMeta.updated_at)}
          title={`Last modified: ${new Date(docMeta.updated_at).toLocaleString()}`} />
        <StatusDivider />
        <StatusItem label="Words" value={wordCount.toLocaleString()} />
        <StatusDivider />
        <StatusItem label="Chars" value={charCount.toLocaleString()} />
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
    <footer className="h-6 bg-layer-01 border-t border-border-subtle flex items-center justify-between px-4 font-mono">
      <div className="flex items-center gap-2">
        {docMeta
          ? <StatusMeta docMeta={docMeta} wordCount={wordCount} charCount={charCount} />
          : <span className="text-xs text-text-placeholder">No document open</span>}
        {selectionCount && selectionCount > 0 ? <SelectedCount selectionCount={selectionCount} /> : null}
      </div>

      <div className="flex items-center gap-2">
        <StatusItem label="Ln" value={cursorLine} />
        <span className="text-text-placeholder">,</span>
        <StatusItem label="Col" value={cursorColumn} />
        <StatusDivider />
        <StatusItem value={encoding} />
        <StatusDivider />
        <StatusItem value={lineEnding} />
      </div>
    </footer>
  );
}
