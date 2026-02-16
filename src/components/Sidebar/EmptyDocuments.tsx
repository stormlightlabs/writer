export const EmptyDocuments = ({ filterText }: { filterText?: string }) => (
  <div className="px-6 py-3 text-text-placeholder text-xs italic">
    {filterText ? "No matching documents" : "No documents found"}
  </div>
);
