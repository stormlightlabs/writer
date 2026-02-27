import { docList, locationList, runCmd, startWatch, stopWatch } from "$ports";
import {
  useWorkspaceDocumentsActions,
  useWorkspaceLocationsActions,
  useWorkspaceLocationsState,
} from "$state/selectors";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useEffect, useRef } from "react";
import { useBackendEvents } from "./useBackendEvents";

export function useWorkspaceSync(): void {
  const { locations, selectedLocationId } = useWorkspaceLocationsState();
  const { setLocations, setLoadingLocations } = useWorkspaceLocationsActions();
  const { setDocuments, setLoadingDocuments, setSidebarRefreshState } = useWorkspaceDocumentsActions();

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

  const documentRequestRef = useRef(0);
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

  const loadDocuments = useCallback(
    (locationId: number, source: "manual" | "external" = "manual", hint?: ExternalRefreshHint) => {
      const requestId = ++documentRequestRef.current;

      if (source === "manual") {
        setLoadingDocuments(true);
      } else {
        setSidebarRefreshState(locationId, source);
      }

      runCmd(docList(locationId, (nextDocuments) => {
        if (documentRequestRef.current !== requestId) {
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
            loadDocuments(locationId, "external", {
              changedRelPath,
              changeKind: hint?.changeKind,
              attempt: externalAttempt + 1,
            });
          }, EXTERNAL_REFRESH_RETRY_DELAY_MS);
        }

        setDocuments(nextDocuments);
        if (source === "manual") {
          setLoadingDocuments(false);
        }
        setSidebarRefreshState(undefined, null);
      }, (error) => {
        if (documentRequestRef.current !== requestId) {
          return;
        }

        logger.error(f("Failed to load documents", { locationId, error }));
        if (source === "manual") {
          setLoadingDocuments(false);
        }
        setSidebarRefreshState(undefined, null);
      }));
    },
    [setDocuments, setLoadingDocuments, setSidebarRefreshState],
  );

  useEffect(() => {
    if (!selectedLocationId) {
      setDocuments([]);
      setLoadingDocuments(false);
      return;
    }

    loadDocuments(selectedLocationId, "manual");
  }, [selectedLocationId, loadDocuments, setDocuments, setLoadingDocuments]);

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
      const currentLocationId = selectedLocationRef.current;
      if (currentLocationId && event.location_id === currentLocationId) {
        loadDocuments(currentLocationId, "external", {
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
