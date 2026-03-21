import { dirList, docList, locationList, runCmd, startWatch, stopWatch } from "$ports";
import {
  useWorkspaceDocumentsActions,
  useWorkspaceLocationsActions,
  useWorkspaceLocationsState,
} from "$state/selectors";
import { useWorkspaceStore } from "$state/stores/workspace";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useEffect, useRef } from "react";
import { useBackendEvents } from "./useBackendEvents";

export function useWorkspaceSync(): void {
  const { locations, selectedLocationId } = useWorkspaceLocationsState();
  const { setLocations, setLoadingLocations } = useWorkspaceLocationsActions();
  const {
    setDocuments,
    setDirectories,
    setDocumentsForLocation,
    setDirectoriesForLocation,
    setLoadingDocuments,
    setSidebarRefreshState,
  } = useWorkspaceDocumentsActions();

  const hasLoadedLocationsRef = useRef(false);
  const loadLocations = useCallback((showLoading = true) => {
    if (showLoading) {
      setLoadingLocations(true);
    }

    runCmd(locationList((nextLocations) => {
      setLocations(nextLocations);
      if (showLoading) {
        setLoadingLocations(false);
      }
    }, (error) => {
      logger.error(f("Failed to load locations", { error }));
      if (showLoading) {
        setLoadingLocations(false);
      }
    }));
  }, [setLoadingLocations, setLocations]);

  useEffect(() => {
    if (hasLoadedLocationsRef.current) {
      return;
    }

    hasLoadedLocationsRef.current = true;
    loadLocations(true);
  }, [loadLocations]);

  const documentRequestRef = useRef<Record<number, number>>({});
  const directoryRequestRef = useRef<Record<number, number>>({});
  const pendingLoadCountRef = useRef<Record<number, number>>({});
  const EXTERNAL_REFRESH_RETRY_DELAY_MS = 120;
  const EXTERNAL_REFRESH_MAX_ATTEMPTS = 3;
  const selectedLocationRef = useRef<number | null>(selectedLocationId);

  useEffect(() => {
    selectedLocationRef.current = selectedLocationId;
  }, [selectedLocationId]);

  type ExternalRefreshHint = {
    changedRelPath?: string;
    changeKind?: "Created" | "Modified" | "Deleted" | "Renamed";
    attempt?: number;
  };

  const finishLocationLoad = useCallback((locationId: number, source: "manual" | "external") => {
    const pendingCount = pendingLoadCountRef.current[locationId];
    if (!pendingCount) {
      return;
    }

    if (pendingCount > 1) {
      pendingLoadCountRef.current[locationId] = pendingCount - 1;
      return;
    }

    delete pendingLoadCountRef.current[locationId];

    if (source === "manual" && selectedLocationRef.current === locationId) {
      setLoadingDocuments(false);
    }

    if (useWorkspaceStore.getState().refreshingLocationId === locationId) {
      setSidebarRefreshState(undefined, null);
    }
  }, [setLoadingDocuments, setSidebarRefreshState]);

  const loadLocationTree = useCallback(
    (locationId: number, source: "manual" | "external" = "manual", hint?: ExternalRefreshHint) => {
      documentRequestRef.current[locationId] = (documentRequestRef.current[locationId] ?? 0) + 1;
      directoryRequestRef.current[locationId] = (directoryRequestRef.current[locationId] ?? 0) + 1;
      const documentRequestId = documentRequestRef.current[locationId];
      const directoryRequestId = directoryRequestRef.current[locationId];
      pendingLoadCountRef.current[locationId] = 2;

      if (source === "manual" && selectedLocationRef.current === locationId) {
        setLoadingDocuments(true);
      } else {
        setSidebarRefreshState(locationId, source);
      }

      runCmd(dirList(locationId, (nextDirectories) => {
        if (directoryRequestRef.current[locationId] !== directoryRequestId) {
          return;
        }

        setDirectoriesForLocation(locationId, nextDirectories);
        finishLocationLoad(locationId, source);
      }, (error) => {
        if (directoryRequestRef.current[locationId] !== directoryRequestId) {
          return;
        }

        logger.error(f("Failed to load directories", { locationId, error }));
        finishLocationLoad(locationId, source);
      }));

      runCmd(docList(locationId, (nextDocuments) => {
        if (documentRequestRef.current[locationId] !== documentRequestId) {
          return;
        }

        const externalAttempt = hint?.attempt ?? 0;
        const changedRelPath = hint?.changedRelPath;
        const includesChangedPath = Boolean(
          changedRelPath && nextDocuments.some((doc) => doc.rel_path === changedRelPath),
        );
        const shouldRetryExternalRefresh = source === "external"
          && Boolean(changedRelPath)
          && externalAttempt < EXTERNAL_REFRESH_MAX_ATTEMPTS
          && ((hint?.changeKind !== "Deleted" && !includesChangedPath)
            || (hint?.changeKind === "Deleted" && includesChangedPath));

        if (shouldRetryExternalRefresh) {
          setTimeout(() => {
            loadLocationTree(locationId, "external", {
              changedRelPath,
              changeKind: hint?.changeKind,
              attempt: externalAttempt + 1,
            });
          }, EXTERNAL_REFRESH_RETRY_DELAY_MS);
        }

        setDocumentsForLocation(locationId, nextDocuments);
        finishLocationLoad(locationId, source);
      }, (error) => {
        if (documentRequestRef.current[locationId] !== documentRequestId) {
          return;
        }

        logger.error(f("Failed to load documents", { locationId, error }));
        finishLocationLoad(locationId, source);
      }));
    },
    [
      finishLocationLoad,
      setDirectoriesForLocation,
      setDocumentsForLocation,
      setLoadingDocuments,
      setSidebarRefreshState,
    ],
  );

  useEffect(() => {
    if (!selectedLocationId) {
      setDocuments([]);
      setDirectories([]);
      setLoadingDocuments(false);
      return;
    }

    loadLocationTree(selectedLocationId, "manual");
  }, [loadLocationTree, selectedLocationId, setDirectories, setDocuments, setLoadingDocuments]);

  const watchedLocationIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const nextWatchedIds = new Set(locations.map((location) => location.id));
    const currentWatchedIds = watchedLocationIdsRef.current;

    for (const locationId of nextWatchedIds) {
      if (!currentWatchedIds.has(locationId)) {
        void runCmd(startWatch(locationId));
      }
    }

    for (const locationId of currentWatchedIds) {
      if (!nextWatchedIds.has(locationId)) {
        void runCmd(stopWatch(locationId));
      }
    }

    watchedLocationIdsRef.current = nextWatchedIds;
  }, [locations]);

  useEffect(() => {
    return () => {
      for (const locationId of watchedLocationIdsRef.current) {
        void runCmd(stopWatch(locationId));
      }
      watchedLocationIdsRef.current.clear();
    };
  }, []);

  useBackendEvents({
    onLocationMissing: () => {
      loadLocations(false);
    },
    onLocationChanged: () => {
      loadLocations(false);
    },
    onReconciliationComplete: () => {
      loadLocations(false);
    },
    onFilesystemChanged: (event) => {
      const workspaceState = useWorkspaceStore.getState();
      const currentLocationId = selectedLocationRef.current;
      const hasCachedTree = Object.prototype.hasOwnProperty.call(workspaceState.documentsByLocation, event.location_id)
        || Object.prototype.hasOwnProperty.call(workspaceState.directoriesByLocation, event.location_id);

      if ((currentLocationId && event.location_id === currentLocationId) || hasCachedTree) {
        loadLocationTree(event.location_id, "external", {
          changedRelPath: event.rel_path,
          changeKind: event.change_kind,
          attempt: 0,
        });
        return;
      }

      if (event.entry_kind === "Directory") {
        loadLocations(false);
      }
    },
  });
}
