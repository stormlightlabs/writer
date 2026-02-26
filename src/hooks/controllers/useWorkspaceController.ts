import { logger } from "$logger";
import { docList, locationAddViaDialog, locationRemove, runCmd } from "$ports";
import {
  useTabsActions,
  useTabsState,
  useWorkspaceDocumentsActions,
  useWorkspaceDocumentsState,
  useWorkspaceLocationsActions,
  useWorkspaceLocationsState,
} from "$state/selectors";
import { useTabsStore } from "$state/stores/tabs";
import { useWorkspaceStore } from "$state/stores/workspace";
import type { SidebarRefreshReason } from "$state/types";
import type { DocMeta, DocRef } from "$types";
import { buildDraftRelPath, getDraftTitle } from "$utils/paths";
import { useCallback, useMemo } from "react";

const TRANSIENT_EMPTY_REFRESH_RETRY_DELAY_MS = 120;

type RefreshSidebarOptions = { source?: SidebarRefreshReason; attempt?: number };

function areDocumentsEqual(left: DocMeta[], right: DocMeta[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (
      a.location_id !== b.location_id
      || a.rel_path !== b.rel_path
      || a.title !== b.title
      || a.updated_at !== b.updated_at
      || a.word_count !== b.word_count
    ) {
      return false;
    }
  }

  return true;
}

export function useWorkspaceController() {
  const { locations, selectedLocationId, isLoadingLocations, sidebarFilter } = useWorkspaceLocationsState();
  const { selectedDocPath, documents, isLoadingDocuments, refreshingLocationId, sidebarRefreshReason } =
    useWorkspaceDocumentsState();
  const { setSidebarRefreshState } = useWorkspaceDocumentsActions();
  const { setSidebarFilter, setSelectedLocation, addLocation, removeLocation } = useWorkspaceLocationsActions();
  const { tabs, activeTabId } = useTabsState();
  const { openDocumentTab, selectTab, closeTab, reorderTabs, markActiveTabModified } = useTabsActions();
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);

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

  const handleSelectDocument = useCallback((locationId: number, path: string) => {
    const docTitle = useWorkspaceStore.getState().documents.find((doc) =>
      doc.location_id === locationId && doc.rel_path === path
    )?.title;

    const title = docTitle || path.split("/").pop() || "Untitled";
    const docRef = { location_id: locationId, rel_path: path };
    openDocumentTab(docRef, title);
  }, [openDocumentTab]);

  const handleSelectLocation = setSelectedLocation;
  const handleSelectTab = selectTab;
  const handleCloseTab = closeTab;
  const handleReorderTabs = reorderTabs;

  const handleCreateDraftTab = useCallback((docRef: DocRef, title: string) => {
    openDocumentTab(docRef, title);
  }, [openDocumentTab]);

  const handleCreateNewDocument = useCallback((locationId?: number) => {
    const workspaceState = useWorkspaceStore.getState();
    const tabsState = useTabsStore.getState();
    const targetLocationId = locationId ?? workspaceState.selectedLocationId ?? workspaceState.locations[0]?.id;

    if (!targetLocationId) {
      logger.warn("Cannot create draft without a selected location.");
      return null;
    }

    const relPath = buildDraftRelPath(targetLocationId, workspaceState.documents, tabsState.tabs);
    const docRef: DocRef = { location_id: targetLocationId, rel_path: relPath };
    openDocumentTab(docRef, getDraftTitle(relPath));
    return docRef;
  }, [openDocumentTab]);

  const handleRefreshSidebar = useCallback((locationId?: number, options: RefreshSidebarOptions = {}) => {
    const source = options.source ?? "manual";
    const attempt = options.attempt ?? 0;
    const workspaceState = useWorkspaceStore.getState();
    const targetLocationId = locationId ?? workspaceState.selectedLocationId ?? workspaceState.locations[0]?.id;

    if (!targetLocationId || workspaceState.selectedLocationId !== targetLocationId) {
      return;
    }

    setSidebarRefreshState(targetLocationId, source);

    runCmd(docList(targetLocationId, (nextDocuments) => {
      const latestState = useWorkspaceStore.getState();
      if (latestState.selectedLocationId !== targetLocationId) {
        if (latestState.refreshingLocationId === targetLocationId) {
          latestState.setSidebarRefreshState(undefined, null);
        }
        return;
      }

      if (nextDocuments.length === 0 && latestState.documents.length > 0 && attempt === 0) {
        setTimeout(() => {
          handleRefreshSidebar(targetLocationId, { source, attempt: attempt + 1 });
        }, TRANSIENT_EMPTY_REFRESH_RETRY_DELAY_MS);
        return;
      }

      if (!areDocumentsEqual(latestState.documents, nextDocuments)) {
        latestState.setDocuments(nextDocuments);
      }

      if (latestState.refreshingLocationId === targetLocationId) {
        latestState.setSidebarRefreshState(undefined, null);
      }
    }, (error) => {
      if (attempt === 0) {
        setTimeout(() => {
          handleRefreshSidebar(targetLocationId, { source, attempt: attempt + 1 });
        }, TRANSIENT_EMPTY_REFRESH_RETRY_DELAY_MS);
        return;
      }

      logger.error("Failed to refresh sidebar documents", { locationId: targetLocationId, error });
      const latestState = useWorkspaceStore.getState();
      if (latestState.refreshingLocationId === targetLocationId) {
        latestState.setSidebarRefreshState(undefined, null);
      }
    }));
  }, [setSidebarRefreshState]);

  return useMemo(
    () => ({
      locations,
      documents,
      selectedLocationId,
      selectedDocPath,
      locationDocuments,
      sidebarFilter,
      isSidebarLoading: isLoadingLocations || isLoadingDocuments,
      refreshingLocationId,
      sidebarRefreshReason,
      tabs,
      activeTabId,
      activeTab,
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
      handleCreateNewDocument,
      handleRefreshSidebar,
    }),
    [
      locations,
      documents,
      selectedLocationId,
      selectedDocPath,
      locationDocuments,
      sidebarFilter,
      isLoadingLocations,
      isLoadingDocuments,
      refreshingLocationId,
      sidebarRefreshReason,
      tabs,
      activeTabId,
      activeTab,
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
      handleCreateNewDocument,
      handleRefreshSidebar,
    ],
  );
}
