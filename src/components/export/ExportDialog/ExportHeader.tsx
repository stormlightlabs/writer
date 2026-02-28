import { Button } from "$components/Button";
import { FileTextIcon } from "$components/icons";
import { XIcon } from "$icons";

type ExportDialogHeaderProps = { title?: string; onCancel: () => void };

export const ExportDialogHeader = ({ title, onCancel }: ExportDialogHeaderProps) => (
  <div className="mb-4 flex items-start justify-between gap-3 border-b border-border-subtle pb-4">
    <div className="min-w-0">
      <h2 className="m-0 text-lg font-semibold text-text-primary">Export Document</h2>
      <p className="m-0 mt-1 text-xs text-text-secondary">Choose an output format and export settings.</p>
      {title
        ? (
          <p className="m-0 mt-2 inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-layer-02/55 px-2 py-1 text-xs text-text-secondary">
            <FileTextIcon size="xs" />
            <span className="max-w-[340px] truncate text-text-primary">{title}</span>
          </p>
        )
        : null}
    </div>
    <Button type="button" variant="iconSubtle" size="iconLg" onClick={onCancel} aria-label="Close export dialog">
      <XIcon size="sm" />
    </Button>
  </div>
);
