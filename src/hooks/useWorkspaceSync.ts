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
  const { selectedLocationId } = useWorkspaceLocationsState();
  const { setLocations, setLoadingLocations } = useWorkspaceLocationsActions();
  const { setDocuments, setLoadingDocuments } = useWorkspaceDocumentsActions();

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
  const selectedLocationRef = useRef<number | null>(selectedLocationId);

  useEffect(() => {
    selectedLocationRef.current = selectedLocationId;
  }, [selectedLocationId]);

  const loadDocuments = useCallback((locationId: number) => {
    const requestId = ++documentRequestRef.current;

    setLoadingDocuments(true);
    runCmd(docList(locationId, (nextDocuments) => {
      if (documentRequestRef.current !== requestId) {
        return;
      }

      setDocuments(nextDocuments);
      setLoadingDocuments(false);
    }, (error) => {
      if (documentRequestRef.current !== requestId) {
        return;
      }

      logger.error(f("Failed to load documents", { locationId, error }));
      setLoadingDocuments(false);
    }));
  }, [setDocuments, setLoadingDocuments]);

  useEffect(() => {
    if (!selectedLocationId) {
      setDocuments([]);
      setLoadingDocuments(false);
      return;
    }

    loadDocuments(selectedLocationId);
  }, [selectedLocationId, loadDocuments, setDocuments, setLoadingDocuments]);

  useEffect(() => {
    if (!selectedLocationId) {
      return;
    }

    void runCmd(startWatch(selectedLocationId));

    return () => {
      void runCmd(stopWatch(selectedLocationId));
    };
  }, [selectedLocationId]);

  useBackendEvents({
    onDocModifiedExternally: (docRef) => {
      const currentLocationId = selectedLocationRef.current;
      if (currentLocationId && docRef.location_id === currentLocationId) {
        loadDocuments(currentLocationId);
        return;
      }

      loadLocations(false);
    },
  });
}
