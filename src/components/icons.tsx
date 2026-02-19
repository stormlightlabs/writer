export type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const sizeClass = (size: IconSize) => {
  switch (size) {
    case "xs":
      return "text-xs";
    case "sm":
      return "text-sm";
    case "md":
      return "text-base";
    case "lg":
      return "text-lg";
    case "xl":
      return "text-xl";
    case "2xl":
      return "text-2xl";
  }
};

export type IconProps = { size?: IconSize; className?: string; style?: React.CSSProperties };

export const FolderIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-folder-line" />
  </span>
);

export const FileTextIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-file-text-line" />
  </span>
);

export const SearchIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-search-line" />
  </span>
);

export const PlusIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-add-line" />
  </span>
);

export const XIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-close-line" />
  </span>
);

export const ChevronRightIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-arrow-right-s-line" />
  </span>
);

export const ChevronDownIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-arrow-down-s-line" />
  </span>
);

export const SaveIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-save-line" />
  </span>
);

export const CheckIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-check-line" />
  </span>
);

export const MoreVerticalIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-more-2-line" />
  </span>
);

export const SettingsIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-settings-3-line" />
  </span>
);

export const SplitViewIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-split-cells-horizontal" />
  </span>
);

export const EyeIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-eye-line" />
  </span>
);

export const FocusIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-focus-line" />
  </span>
);

export const LibraryIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-book-shelf-line" />
  </span>
);

export const TrashIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-delete-bin-line" />
  </span>
);

export const RefreshIcon = ({ size = "md", className = "", style }: IconProps) => (
  <span className={`flex items-center ${sizeClass(size)} ${className}`} style={style}>
    <i className="i-ri-refresh-line" />
  </span>
);
