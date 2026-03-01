import {
  dirCreate,
  dirList,
  dirMove,
  docDelete,
  docList,
  docMove,
  docRename,
  docSave,
  locationAddViaDialog,
  locationList,
  locationRemove,
  runCmd,
  sessionCloseTab,
  sessionDropDoc,
  sessionGet,
  sessionMarkTabModified,
  sessionOpenTab,
  sessionPruneLocations,
  sessionReorderTabs,
  sessionSelectTab,
  sessionUpdateTabDoc,
} from "$ports";
import {
  useTabsActions,
  useTabsState,
  useWorkspaceDocumentsActions,
  useWorkspaceDocumentsState,
  useWorkspaceLocationsActions,
  useWorkspaceLocationsState,
} from "$state/selectors";
import { useWorkspaceStore } from "$state/stores/workspace";
import type { SidebarRefreshReason } from "$state/types";
import type { AppError, DocMeta, DocRef, SessionState, Tab } from "$types";
import { buildDraftRelPath, getDraftTitle } from "$utils/paths";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useEffect, useMemo } from "react";

const TRANSIENT_EMPTY_REFRESH_RETRY_DELAY_MS = 120;

type RefreshSidebarOptions = { source?: SidebarRefreshReason; attempt?: number };

function toLocationId(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

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

function areDirectoriesEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function mapDirectoryMovedRelPath(sourceDir: string, destinationDir: string, candidate: string): string | null {
  if (candidate === sourceDir) {
    return destinationDir;
  }

  const prefix = `${sourceDir}/`;
  if (!candidate.startsWith(prefix)) {
    return null;
  }

  const suffix = candidate.slice(prefix.length);
  return suffix ? `${destinationDir}/${suffix}` : destinationDir;
}

export function useWorkspaceController() {
  const { locations, selectedLocationId, isLoadingLocations, sidebarFilter } = useWorkspaceLocationsState();
  const { selectedDocPath, documents, isLoadingDocuments, refreshingLocationId, sidebarRefreshReason } =
    useWorkspaceDocumentsState();
  const { setSidebarRefreshState } = useWorkspaceDocumentsActions();
  const { setSidebarFilter, setSelectedLocation, setLocations } = useWorkspaceLocationsActions();
  const { tabs, activeTabId, isSessionHydrated } = useTabsState();
  const { applySessionState } = useTabsActions();
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);

  const applySession = useCallback((session: SessionState) => {
    applySessionState(session);
  }, [applySessionState]);

  useEffect(() => {
    void runCmd(sessionGet(applySession, (error) => {
      logger.error(f("Failed to load session state", { error }));
      applySession({ tabs: [], activeTabId: null });
    }));
  }, [applySession]);

  useEffect(() => {
    if (!isSessionHydrated || isLoadingLocations) {
      return;
    }

    const validLocationIds = locations.map((location) => location.id);
    void runCmd(sessionPruneLocations(validLocationIds, applySession, (error) => {
      logger.error(f("Failed to prune session tabs by location", { error, validLocationIds }));
    }));
  }, [locations, isSessionHydrated, isLoadingLocations, applySession]);

  const locationDocuments = useMemo(
    () => (selectedLocationId ? documents.filter((doc) => doc.location_id === selectedLocationId) : []),
    [documents, selectedLocationId],
  );

  const refreshLocations = useCallback((nextSelectedLocationId?: number) => {
    runCmd(locationList((nextLocations) => {
      setLocations(nextLocations);
      if (nextSelectedLocationId && nextLocations.some((location) => location.id === nextSelectedLocationId)) {
        setSelectedLocation(nextSelectedLocationId);
      }
    }, (error) => {
      logger.error(f("Failed to refresh locations", { error }));
    }));
  }, [setLocations, setSelectedLocation]);

  const handleAddLocation = useCallback(() => {
    runCmd(locationAddViaDialog((location) => {
      refreshLocations(location.id);
    }, (error) => {
      logger.error(f("Failed to add location", { error }));
    }));
  }, [refreshLocations]);

  const handleRemoveLocation = useCallback((locationId: number) => {
    runCmd(locationRemove(locationId, (removed) => {
      if (removed) {
        refreshLocations();
      }
    }, (error) => {
      logger.error(f("Failed to remove location", { locationId, error }));
    }));
  }, [refreshLocations]);

  const openTab = useCallback((docRef: DocRef, title: string) => {
    void runCmd(sessionOpenTab(docRef, title, applySession, (error) => {
      logger.error(f("Failed to open session tab", { docRef, title, error }));
    }));
  }, [applySession]);

  const handleSelectDocument = useCallback((locationId: number, path: string) => {
    const docTitle = useWorkspaceStore.getState().documents.find((doc) =>
      doc.location_id === locationId && doc.rel_path === path
    )?.title;

    const title = docTitle || path.split("/").pop() || "Untitled";
    openTab({ location_id: locationId, rel_path: path }, title);
  }, [openTab]);

  const handleSelectLocation = setSelectedLocation;

  const handleSelectTab = useCallback((tabId: string) => {
    void runCmd(sessionSelectTab(tabId, applySession, (error) => {
      logger.error(f("Failed to select session tab", { tabId, error }));
    }));
  }, [applySession]);

  const handleCloseTab = useCallback((tabId: string) => {
    void runCmd(sessionCloseTab(tabId, applySession, (error) => {
      logger.error(f("Failed to close session tab", { tabId, error }));
    }));
  }, [applySession]);

  const handleReorderTabs = useCallback((nextTabs: Tab[]) => {
    void runCmd(sessionReorderTabs(nextTabs.map((tab) => tab.id), applySession, (error) => {
      logger.error(f("Failed to reorder session tabs", { error }));
    }));
  }, [applySession]);

  const markActiveTabModified = useCallback((isModified: boolean) => {
    if (!activeTabId) {
      return;
    }

    void runCmd(sessionMarkTabModified(activeTabId, isModified, applySession, (error) => {
      logger.error(f("Failed to mark session tab modified", { activeTabId, isModified, error }));
    }));
  }, [activeTabId, applySession]);

  const handleCreateDraftTab = useCallback((docRef: DocRef, title: string) => {
    openTab(docRef, title);
  }, [openTab]);

  const handleCreateNewDocument = useCallback((locationId?: number) => {
    const workspaceState = useWorkspaceStore.getState();
    const requestedLocationId = toLocationId(locationId);
    const targetLocationId = requestedLocationId ?? workspaceState.selectedLocationId
      ?? workspaceState.locations[0]?.id;

    if (!targetLocationId) {
      logger.warn("Cannot create draft without a selected location.");
      return null;
    }

    const relPath = buildDraftRelPath(targetLocationId, workspaceState.documents, tabs);
    const docRef: DocRef = { location_id: targetLocationId, rel_path: relPath };
    openTab(docRef, getDraftTitle(relPath));
    return docRef;
  }, [openTab, tabs]);

  const handleRefreshSidebar = useCallback((locationId?: number, options: RefreshSidebarOptions = {}) => {
    const source = options.source ?? "manual";
    const attempt = options.attempt ?? 0;
    const workspaceState = useWorkspaceStore.getState();
    const requestedLocationId = toLocationId(locationId);
    const targetLocationId = requestedLocationId ?? workspaceState.selectedLocationId
      ?? workspaceState.locations[0]?.id;

    if (!targetLocationId || workspaceState.selectedLocationId !== targetLocationId) {
      return;
    }

    setSidebarRefreshState(targetLocationId, source);

    runCmd(dirList(targetLocationId, (nextDirectories) => {
      const latestState = useWorkspaceStore.getState();
      if (latestState.selectedLocationId !== targetLocationId) {
        return;
      }

      if (!areDirectoriesEqual(latestState.directories, nextDirectories)) {
        latestState.setDirectories(nextDirectories);
      }
    }, (error) => {
      logger.error(f("Failed to refresh sidebar directories", { locationId: targetLocationId, error }));
    }));

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

      logger.error(f("Failed to refresh sidebar documents", { locationId: targetLocationId, error }));
      const latestState = useWorkspaceStore.getState();
      if (latestState.refreshingLocationId === targetLocationId) {
        latestState.setSidebarRefreshState(undefined, null);
      }
    }));
  }, [setSidebarRefreshState]);

  const handleRenameDocument = useCallback((locationId: number, relPath: string, newName: string): Promise<boolean> => {
    return new Promise((resolve) => {
      runCmd(docRename(locationId, relPath, newName, (newMeta) => {
        void runCmd(
          sessionUpdateTabDoc(
            locationId,
            relPath,
            { location_id: locationId, rel_path: newMeta.rel_path },
            newMeta.title,
            applySession,
            () => {},
          ),
        );

        logger.info(f("Document renamed", { locationId, oldPath: relPath, newPath: newMeta.rel_path }));
        resolve(true);
      }, (error: AppError) => {
        logger.error(f("Failed to rename document", { locationId, relPath, newName, error }));
        resolve(false);
      }));
    });
  }, [applySession]);

  const handleMoveDocument = useCallback(
    (locationId: number, relPath: string, newRelPath: string, targetLocationId?: number): Promise<boolean> => {
      return new Promise((resolve) => {
        runCmd(docMove(locationId, relPath, newRelPath, (newMeta) => {
          void runCmd(
            sessionUpdateTabDoc(
              locationId,
              relPath,
              { location_id: newMeta.location_id, rel_path: newMeta.rel_path },
              newMeta.title,
              applySession,
              () => {},
            ),
          );

          logger.info(
            f("Document moved", {
              sourceLocationId: locationId,
              targetLocationId: newMeta.location_id,
              oldPath: relPath,
              newPath: newMeta.rel_path,
            }),
          );
          resolve(true);
        }, (error: AppError) => {
          logger.error(f("Failed to move document", { locationId, relPath, newRelPath, targetLocationId, error }));
          resolve(false);
        }, targetLocationId));
      });
    },
    [applySession],
  );

  const handleDeleteDocument = useCallback((locationId: number, relPath: string): Promise<boolean> => {
    return new Promise((resolve) => {
      runCmd(docDelete(locationId, relPath, (deleted) => {
        if (!deleted) {
          resolve(false);
          return;
        }

        void runCmd(sessionDropDoc(locationId, relPath, applySession, () => {}));

        logger.info(f("Document deleted", { locationId, relPath }));
        resolve(true);
      }, (error: AppError) => {
        logger.error(f("Failed to delete document", { locationId, relPath, error }));
        resolve(false);
      }));
    });
  }, [applySession]);

  const handleMoveDirectory = useCallback(
    (locationId: number, relPath: string, newRelPath: string): Promise<boolean> => {
      return new Promise((resolve) => {
        runCmd(dirMove(locationId, relPath, newRelPath, (resolvedPath) => {
          for (const tab of tabs) {
            if (tab.docRef.location_id !== locationId) {
              continue;
            }

            const remappedRelPath = mapDirectoryMovedRelPath(relPath, resolvedPath, tab.docRef.rel_path);
            if (!remappedRelPath) {
              continue;
            }

            void runCmd(
              sessionUpdateTabDoc(
                locationId,
                tab.docRef.rel_path,
                { location_id: locationId, rel_path: remappedRelPath },
                tab.title,
                applySession,
                () => {},
              ),
            );
          }

          logger.info(f("Directory moved", { locationId, relPath, newRelPath: resolvedPath }));
          resolve(true);
        }, (error: AppError) => {
          logger.error(f("Failed to move directory", { locationId, relPath, newRelPath, error }));
          resolve(false);
        }));
      });
    },
    [applySession, tabs],
  );

  const handleImportExternalFile = useCallback(
    (locationId: number, relPath: string, content: string): Promise<boolean> => {
      return new Promise((resolve) => {
        runCmd(docSave(locationId, relPath, content, (result) => {
          logger.info(f("External file imported", { locationId, relPath, result }));
          resolve(true);
        }, (error: AppError) => {
          logger.error(f("Failed to import external file", { locationId, relPath, error }));
          resolve(false);
        }));
      });
    },
    [],
  );

  const handleCreateDirectory = useCallback(
    (locationId: number, parentRelPath: string, newDirectoryName: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const trimmedName = newDirectoryName.trim();
        if (!trimmedName) {
          resolve(false);
          return;
        }

        const normalizedParent = parentRelPath.trim().replaceAll(/[/\\]+$/g, "");
        const directoryRelPath = normalizedParent ? `${normalizedParent}/${trimmedName}` : trimmedName;

        runCmd(dirCreate(locationId, directoryRelPath, (created) => {
          logger.info(f("Directory create command completed", { locationId, directoryRelPath, created }));
          resolve(created);
        }, (error: AppError) => {
          logger.error(f("Failed to create nested directory", { locationId, directoryRelPath, error }));
          resolve(false);
        }));
      });
    },
    [],
  );

  return useMemo(
    () => ({
      locations,
      documents,
      selectedLocationId,
      selectedDocPath,
      locationDocuments,
      sidebarFilter,
      isSidebarLoading: isLoadingLocations || isLoadingDocuments,
      isSessionHydrated,
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
      handleRenameDocument,
      handleMoveDocument,
      handleMoveDirectory,
      handleDeleteDocument,
      handleCreateDirectory,
      handleImportExternalFile,
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
      isSessionHydrated,
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
      handleRenameDocument,
      handleMoveDocument,
      handleMoveDirectory,
      handleDeleteDocument,
      handleCreateDirectory,
      handleImportExternalFile,
    ],
  );
}
