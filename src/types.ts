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
