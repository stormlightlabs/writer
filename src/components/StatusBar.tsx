import type { DocMeta } from "../ports";

type StatusBarProps = {
  docMeta?: DocMeta | null;
  cursorLine: number;
  cursorColumn: number;
  wordCount: number;
  charCount: number;
  selectionCount?: number;
  encoding?: string;
  lineEnding?: "LF" | "CRLF" | "CR";
};

function StatusItem({ label, value, title }: { label?: string; value: string | number; title?: string }) {
  return (
    <div title={title} className="flex items-center gap-1 text-xs text-text-secondary px-2">
      {label && <span className="text-text-placeholder">{label}:</span>}
      <span>{value}</span>
    </div>
  );
}

function StatusDivider() {
  return <div className="w-px h-3 bg-border-subtle" />;
}

export function StatusBar(
  { docMeta, cursorLine, cursorColumn, wordCount, charCount, selectionCount, encoding = "UTF-8", lineEnding = "LF" }:
    StatusBarProps,
) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  return (
    <footer className="h-6 bg-layer-01 border-t border-border-subtle flex items-center justify-between px-4 font-mono">
      {/* Left section - Document info */}
      <div className="flex items-center gap-2">
        {docMeta
          ? (
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
          )
          : <span className="text-xs text-text-placeholder">No document open</span>}

        {selectionCount !== undefined && selectionCount > 0 && (
          <>
            <StatusDivider />
            <StatusItem label="Selected" value={selectionCount.toLocaleString()} />
          </>
        )}
      </div>

      {/* Right section - Cursor position */}
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
