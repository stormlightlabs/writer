import { docExists, runCmd, sessionLastDocGet, sessionLastDocSet } from "$ports";
import type { DocRef, LocationDescriptor, Tab } from "$types";
import { useEffect, useRef } from "react";

type UseDocumentSessionEffectsArgs = {
  isSidebarLoading: boolean;
  locations: LocationDescriptor[];
  selectedLocationId?: number;
  tabs: Tab[];
  activeTab: Tab | null;
  documentsCount: number;
  activeDocRef: DocRef | null;
  openDoc: (docRef: DocRef) => void;
  handleSelectDocument: (locationId: number, path: string) => void;
  handleNewDocument: (locationId?: number) => void;
};

export function useDocumentSessionEffects(
  {
    isSidebarLoading,
    locations,
    selectedLocationId,
    tabs,
    activeTab,
    documentsCount,
    activeDocRef,
    openDoc,
    handleSelectDocument,
    handleNewDocument,
  }: UseDocumentSessionEffectsArgs,
): void {
  const startupDocumentReadyRef = useRef(false);
  const startupDocumentRestoredRef = useRef(false);

  useEffect(() => {
    if (startupDocumentReadyRef.current) {
      return;
    }

    if (isSidebarLoading || locations.length === 0 || tabs.length > 0) {
      return;
    }

    startupDocumentReadyRef.current = true;

    const completeStartupRestore = () => {
      startupDocumentRestoredRef.current = true;
    };

    const fallbackToBlankDraft = () => {
      completeStartupRestore();
      handleNewDocument(selectedLocationId ?? locations[0]?.id);
    };

    void runCmd(sessionLastDocGet((docRef) => {
      if (!docRef) {
        fallbackToBlankDraft();
        return;
      }

      const locationExists = locations.some((location) => location.id === docRef.location_id);
      if (!locationExists) {
        fallbackToBlankDraft();
        return;
      }

      void runCmd(docExists(docRef.location_id, docRef.rel_path, (exists) => {
        if (exists) {
          completeStartupRestore();
          handleSelectDocument(docRef.location_id, docRef.rel_path);
          return;
        }

        fallbackToBlankDraft();
      }, () => {
        fallbackToBlankDraft();
      }));
    }, () => {
      fallbackToBlankDraft();
    }));
  }, [isSidebarLoading, locations, selectedLocationId, tabs.length, handleSelectDocument, handleNewDocument]);

  useEffect(() => {
    if (!activeDocRef) {
      return;
    }

    openDoc(activeDocRef);
  }, [activeDocRef, openDoc]);

  useEffect(() => {
    if (!startupDocumentRestoredRef.current || isSidebarLoading || !selectedLocationId || documentsCount > 0) {
      return;
    }

    if (activeTab?.docRef.location_id === selectedLocationId) {
      return;
    }

    const existingTab = tabs.find((tab) => tab.docRef.location_id === selectedLocationId);
    if (existingTab) {
      handleSelectDocument(existingTab.docRef.location_id, existingTab.docRef.rel_path);
      return;
    }

    handleNewDocument(selectedLocationId);
  }, [activeTab, documentsCount, handleNewDocument, handleSelectDocument, isSidebarLoading, selectedLocationId, tabs]);

  useEffect(() => {
    if (!startupDocumentRestoredRef.current) {
      return;
    }

    void runCmd(sessionLastDocSet(activeDocRef, () => {}, () => {}));
  }, [activeDocRef]);
}
