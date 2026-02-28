import type { DocMeta, Tab } from "$types";
import { formatDraftDate } from "./date";

// TODO: make this recursive
export function buildDraftRelPath(locationId: number, documents: DocMeta[], tabs: Tab[]): string {
  const usedPaths = new Set<string>();

  for (const doc of documents) {
    if (doc.location_id === locationId) {
      usedPaths.add(doc.rel_path.toLowerCase());
    }
  }

  for (const tab of tabs) {
    if (tab.docRef.location_id === locationId) {
      usedPaths.add(tab.docRef.rel_path.toLowerCase());
    }
  }

  const base = `untitled_${formatDraftDate()}`;
  let suffix = 0;
  while (true) {
    const fileName = suffix === 0 ? `${base}.md` : `${base}_${suffix}.md`;
    if (!usedPaths.has(fileName.toLowerCase())) {
      return fileName;
    }
    suffix += 1;
  }
}

export const getDraftTitle = (relPath: string): string => relPath.split("/").pop() || "Untitled";

export function sanitizeExportFilename(title: string, extension: string): string {
  const sanitized = title.replaceAll(/[^\w\s.-]/g, "").replaceAll(/\s+/g, "_").replaceAll(/_+/g, "_").replaceAll(
    /^_|_$/g,
    "",
  );
  return sanitized ? `${sanitized}.${extension}` : `document.${extension}`;
}
