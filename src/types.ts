export type SaveStatus = "Idle" | "Dirty" | "Saving" | "Saved" | "Error";

export type LineEnding = "LF" | "CRLF" | "CR";

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

export type AppTheme = "dark" | "light";

export type MarkdownProfile = "StrictCommonMark" | "GfmSafe";

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
