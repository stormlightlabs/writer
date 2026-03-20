type FileTypeIconProps = { filename: string; className?: string };

export function getRecordIconClass(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "py":
      return "i-fluent-document-py-16-filled";
    case "md":
    case "markdown":
      return "i-fluent-document-text-16-filled";
    case "js":
      return "i-fluent-document-javascript-16-filled";
    case "ts":
      return "i-fluent-document-ts-16-filled";
    case "yaml":
    case "yml":
      return "i-fluent-document-yml-16-filled";
    case "java":
      return "i-fluent-document-java-16-filled";
    case "sass":
      return "i-fluent-document-sass-16-filled";
    case "css":
      return "i-fluent-document-css-16-filled";
    case "csv":
      return "i-fluent-document-csv-16-filled";
    case "fs":
      return "i-fluent-document-fs-16-filled";
    case "cs":
      return "i-fluent-document-cs-16-filled";
    default:
      return "i-fluent-document-16-filled";
  }
}

export function FileTypeIcon({ filename, className = "" }: FileTypeIconProps) {
  return <i className={`${getRecordIconClass(filename)} ${className}`.trim()} />;
}
