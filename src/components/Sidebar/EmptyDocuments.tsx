export const EmptyDocuments = ({ filterText }: { filterText?: string }) => (
  <div className="px-6 py-3 text-text-placeholder text-xs italic">
    <p className="m-0">{filterText ? "No matching documents" : "No documents found"}</p>
  </div>
);
