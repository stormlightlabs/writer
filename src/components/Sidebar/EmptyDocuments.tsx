import { Button } from "$components/Button";

export const EmptyDocuments = (
  { filterText, onCreateDocument }: { filterText?: string; onCreateDocument?: () => void },
) => (
  <div className="px-6 py-3 text-text-placeholder text-xs italic">
    <p className="m-0">{filterText ? "No matching documents" : "No documents found"}</p>
    {!filterText && onCreateDocument && (
      <Button variant="link" size="xs" onClick={onCreateDocument} className="mt-1 text-[0.75rem]">New Document</Button>
    )}
  </div>
);
