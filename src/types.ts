export type SaveStatus = "Idle" | "Dirty" | "Saving" | "Saved" | "Error";

export type LineEnding = "LF" | "CRLF" | "CR";

export type AppTheme = "dark" | "light";

export type EditorFontFamily =
  | "IBM Plex Mono"
  | "IBM Plex Sans Variable"
  | "IBM Plex Serif"
  | "Monaspace Argon"
  | "Monaspace Krypton"
  | "Monaspace Neon"
  | "Monaspace Radon"
  | "Monaspace Xenon";

export type MarkdownProfile = "StrictCommonMark" | "GfmSafe";

export type PanelMode = "editor" | "preview" | "split";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

export type ErrorCode =
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "INVALID_PATH"
  | "IO_ERROR"
  | "PARSE_ERROR"
  | "INDEX_ERROR"
  | "CONFLICT";

export type LocationId = number;

export type DocRef = { location_id: LocationId; rel_path: string };

export type Tab = { id: string; docRef: DocRef; title: string; isModified: boolean; isPinned?: boolean };

export type DocMeta = {
  location_id: LocationId;
  rel_path: string;
  title: string;
  updated_at: string;
  word_count: number;
};

export type DocContent = { text: string; meta: DocMeta };

export type LocationDescriptor = { id: LocationId; name: string; root_path: string; added_at: string };

export type Heading = { level: number; text: string; anchor: string | null };

export type LinkRef = { url: string; title: string | null };

export type TaskStats = { total: number; completed: number };

export type DocumentMetadata = {
  title: string | null;
  outline: Heading[];
  links: LinkRef[];
  task_items: TaskStats;
  word_count: number;
};

export type RenderResult = { html: string; metadata: DocumentMetadata };

export type SearchMatch = { start: number; end: number };

export type SearchHit = {
  location_id: LocationId;
  rel_path: string;
  title: string;
  snippet: string;
  line: number;
  column: number;
  matches: SearchMatch[];
};

export type AppError = { code: ErrorCode; message: string; context?: string };

export type FocusDimmingMode = "off" | "sentence" | "paragraph";

export type FocusModeSettings = { typewriterScrollingEnabled: boolean; dimmingMode: FocusDimmingMode };

export type PosHighlightingEnabled = boolean;
