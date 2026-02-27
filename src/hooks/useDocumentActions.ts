import type { EditorMsg } from "$hooks/useEditor";
import type { DocMeta, DocRef, Tab } from "$types";
import { buildDraftRelPath, getDraftTitle } from "$utils/paths";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback } from "react";

type UseDocumentActionsArgs = {
  editorDocRef: DocRef | null;
  selectedLocationId?: number;
  documents: DocMeta[];
  tabs: Tab[];
  dispatchEditor: (msg: EditorMsg) => void;
  createDraftTab: (docRef: DocRef, title: string) => void;
  createNewDocument: (locationId?: number) => DocRef | null;
};

function toLocationId(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function useDocumentActions(
  { editorDocRef, selectedLocationId, documents, tabs, dispatchEditor, createDraftTab, createNewDocument }:
    UseDocumentActionsArgs,
) {
  const handleSave = useCallback(() => {
    if (!editorDocRef && !selectedLocationId) {
      logger.warn("Cannot save draft without a selected location.");
      return;
    }

    if (!editorDocRef && selectedLocationId) {
      const relPath = buildDraftRelPath(selectedLocationId, documents, tabs);
      const draftRef: DocRef = { location_id: selectedLocationId, rel_path: relPath };

      createDraftTab(draftRef, getDraftTitle(relPath));
      dispatchEditor({ type: "DraftDocInitialized", docRef: draftRef });
    }

    dispatchEditor({ type: "SaveRequested" });
  }, [createDraftTab, dispatchEditor, documents, editorDocRef, selectedLocationId, tabs]);

  const handleNewDocument = useCallback((locationId?: number) => {
    const draftRef = createNewDocument(toLocationId(locationId));
    if (!draftRef) {
      logger.warn("Cannot create a new document without a selected location.");
      return;
    }

    dispatchEditor({ type: "NewDraftCreated", docRef: draftRef });
  }, [createNewDocument, dispatchEditor]);

  return { handleSave, handleNewDocument };
}
