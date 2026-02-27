import type { DocRef, LocationDescriptor, Tab } from "$types";
import { useEffect, useRef } from "react";

type UseDocumentSessionEffectsArgs = {
  isSidebarLoading: boolean;
  isSessionHydrated: boolean;
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
    isSessionHydrated,
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

    if (!isSessionHydrated || isSidebarLoading || locations.length === 0) {
      return;
    }

    startupDocumentReadyRef.current = true;
    startupDocumentRestoredRef.current = true;

    if (tabs.length === 0) {
      handleNewDocument(selectedLocationId ?? locations[0]?.id);
    }
  }, [isSessionHydrated, isSidebarLoading, locations, selectedLocationId, tabs.length, handleNewDocument]);

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
}
