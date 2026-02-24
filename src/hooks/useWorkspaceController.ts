import { logger } from "$logger";
import { locationAddViaDialog, locationRemove, runCmd } from "$ports";
import type { DocRef, Tab } from "$types";
import { useCallback, useMemo } from "react";
import {
  useAppStore,
  useTabsActions,
  useTabsState,
  useWorkspaceDocumentsState,
  useWorkspaceLocationsActions,
  useWorkspaceLocationsState,
} from "../state/stores/app";

export function useWorkspaceController(openDoc: (docRef: DocRef) => void) {
  const { locations, selectedLocationId, isLoadingLocations, sidebarFilter } = useWorkspaceLocationsState();
  const { selectedDocPath, documents, isLoadingDocuments } = useWorkspaceDocumentsState();
  const { setSidebarFilter, setSelectedLocation, addLocation, removeLocation } = useWorkspaceLocationsActions();
  const { tabs, activeTabId } = useTabsState();
  const { openDocumentTab, selectTab, closeTab, reorderTabs, markActiveTabModified } = useTabsActions();

  const locationDocuments = useMemo(
    () => (selectedLocationId ? documents.filter((doc) => doc.location_id === selectedLocationId) : []),
    [documents, selectedLocationId],
  );

  const handleAddLocation = useCallback(() => {
    runCmd(locationAddViaDialog((location) => {
      addLocation(location);
    }, (error) => {
      logger.error("Failed to add location", { error });
    }));
  }, [addLocation]);

  const handleRemoveLocation = useCallback((locationId: number) => {
    runCmd(locationRemove(locationId, (removed) => {
      if (removed) {
        removeLocation(locationId);
      }
    }, (error) => {
      logger.error("Failed to remove location", { locationId, error });
    }));
  }, [removeLocation]);

  const handleSelectLocation = useCallback((locationId: number) => {
    setSelectedLocation(locationId);
  }, [setSelectedLocation]);

  const handleSelectDocument = useCallback((locationId: number, path: string) => {
    const docTitle = useAppStore.getState().documents.find((doc) =>
      doc.location_id === locationId && doc.rel_path === path
    )?.title;

    const title = docTitle || path.split("/").pop() || "Untitled";
    const docRef = { location_id: locationId, rel_path: path };

    const { didCreateTab } = openDocumentTab(docRef, title);
    if (didCreateTab) {
      openDoc(docRef);
    }
  }, [openDoc, openDocumentTab]);

  const handleSelectTab = useCallback((tabId: string) => {
    const docRef = selectTab(tabId);
    if (docRef) {
      openDoc(docRef);
    }
  }, [openDoc, selectTab]);

  const handleCloseTab = useCallback((tabId: string) => {
    const docRef = closeTab(tabId);
    if (docRef) {
      openDoc(docRef);
    }
  }, [closeTab, openDoc]);

  const handleReorderTabs = useCallback((newTabs: Tab[]) => {
    reorderTabs(newTabs);
  }, [reorderTabs]);

  const handleCreateDraftTab = useCallback((docRef: DocRef, title: string) => {
    openDocumentTab(docRef, title);
  }, [openDocumentTab]);

  return {
    locations,
    documents,
    selectedLocationId,
    selectedDocPath,
    locationDocuments,
    sidebarFilter,
    isSidebarLoading: isLoadingLocations || isLoadingDocuments,
    tabs,
    activeTabId,
    setSidebarFilter,
    markActiveTabModified,
    handleAddLocation,
    handleRemoveLocation,
    handleSelectLocation,
    handleSelectDocument,
    handleSelectTab,
    handleCloseTab,
    handleReorderTabs,
    handleCreateDraftTab,
  };
}
