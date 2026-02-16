import { useCallback, useMemo } from "react";
import { locationAddViaDialog, locationRemove, runCmd } from "../ports";
import { useAppStore, useTabsActions, useTabsState, useWorkspaceActions, useWorkspaceState } from "../state/appStore";
import type { DocRef, Tab } from "../types";

export type OpenDocument = (docRef: DocRef) => void;

export function useWorkspaceController(openDoc: OpenDocument) {
  const {
    locations,
    selectedLocationId,
    selectedDocPath,
    documents,
    isLoadingLocations,
    isLoadingDocuments,
    sidebarFilter,
  } = useWorkspaceState();

  const { setSidebarFilter, setSelectedLocation, addLocation, removeLocation } = useWorkspaceActions();
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
      console.error("Failed to add location:", error);
    }));
  }, [addLocation]);

  const handleRemoveLocation = useCallback((locationId: number) => {
    runCmd(locationRemove(locationId, (removed) => {
      if (removed) {
        removeLocation(locationId);
      }
    }, (error) => {
      console.error("Failed to remove location:", error);
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
  };
}
