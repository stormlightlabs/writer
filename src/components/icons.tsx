/**
 * Icon Components
 *
 * Custom SVG icons following Carbon Design System iconography principles.
 * 16x16 viewBox, 2px stroke width, clean geometric shapes.
 */

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

export const FolderIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <path
      d="M14 4H8L6 2H2C1.44772 2 1 2.44772 1 3V13C1 13.5523 1.44772 14 2 14H14C14.5523 14 15 13.5523 15 13V5C15 4.44772 14.5523 4 14 4Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none" />
  </svg>
);

export const FileTextIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <path
      d="M9 1H3C2.44772 1 2 1.44772 2 2V14C2 14.5523 2.44772 15 3 15H13C13.5523 15 14 14.5523 14 14V6L9 1Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none" />
    <path d="M9 1V6H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SearchIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M11 11L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const PlusIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const XIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const ChevronRightIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronDownIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SaveIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <path
      d="M12 14H4C2.89543 14 2 13.1046 2 12V4C2 2.89543 2.89543 2 4 2H10L14 6V12C14 13.1046 13.1046 14 12 14Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none" />
    <path d="M11 14V9H5V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CheckIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <path d="M3 8L6.5 11.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MoreVerticalIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <circle cx="8" cy="4" r="1" fill="currentColor" />
    <circle cx="8" cy="8" r="1" fill="currentColor" />
    <circle cx="8" cy="12" r="1" fill="currentColor" />
  </svg>
);

export const SettingsIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M13.5 8C13.5 8.27614 13.2761 8.5 13 8.5H12.5C11.6716 8.5 11 9.17157 11 10V10.5C11 10.7761 10.7761 11 10.5 11H10C9.17157 11 8.5 11.6716 8.5 12.5V13C8.5 13.2761 8.27614 13.5 8 13.5C7.72386 13.5 7.5 13.2761 7.5 13V12.5C7.5 11.6716 6.82843 11 6 11H5.5C5.22386 11 5 10.7761 5 10.5V10C5 9.17157 4.32843 8.5 3.5 8.5H3C2.72386 8.5 2.5 8.27614 2.5 8C2.5 7.72386 2.72386 7.5 3 7.5H3.5C4.32843 7.5 5 6.82843 5 6V5.5C5 5.22386 5.22386 5 5.5 5H6C6.82843 5 7.5 4.32843 7.5 3.5V3C7.5 2.72386 7.72386 2.5 8 2.5C8.27614 2.5 8.5 2.72386 8.5 3V3.5C8.5 4.32843 9.17157 5 10 5H10.5C10.7761 5 11 5.22386 11 5.5V6C11 6.82843 11.6716 7.5 12.5 7.5H13C13.2761 7.5 13.5 7.72386 13.5 8Z"
      stroke="currentColor"
      strokeWidth="1.5" />
  </svg>
);

export const SplitViewIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <rect x="2" y="2" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="9" y="2" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const EyeIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <path
      d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round" />
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const FocusIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <path
      d="M2 6V3C2 2.44772 2.44772 2 3 2H6M10 2H13C13.5523 2 14 2.44772 14 3V6M14 10V13C14 13.5523 13.5523 14 13 14H10M6 14H3C2.44772 14 2 13.5523 2 13V10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round" />
  </svg>
);

export const LibraryIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <path
      d="M4 14V4C4 2.89543 4.89543 2 6 2H12C13.1046 2 14 2.89543 14 4V14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round" />
    <path d="M2 14V8C2 6.89543 2.89543 6 4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const TrashIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <path
      d="M2 4H14M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round" />
  </svg>
);

export const RefreshIcon = ({ size = 16, className = "", style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={style}
    aria-hidden="true">
    <path
      d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C10.1747 2 12.0583 3.16595 13.1439 5M14 2V5H11"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round" />
  </svg>
);
