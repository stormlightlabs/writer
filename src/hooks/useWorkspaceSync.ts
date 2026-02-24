import { logger } from "$logger";
import { backendEvents, docList, locationList, runCmd, startWatch, stopWatch, SubscriptionManager } from "$ports";
import { useCallback, useEffect, useRef } from "react";
import {
  useWorkspaceDocumentsActions,
  useWorkspaceLocationsActions,
  useWorkspaceLocationsState,
} from "../state/stores/app";

export function useWorkspaceSync(): void {
  const { selectedLocationId } = useWorkspaceLocationsState();
  const { setLocations, setLoadingLocations } = useWorkspaceLocationsActions();
  const { setDocuments, setLoadingDocuments } = useWorkspaceDocumentsActions();

  const hasLoadedLocationsRef = useRef(false);

  useEffect(() => {
    if (hasLoadedLocationsRef.current) {
      return;
    }

    hasLoadedLocationsRef.current = true;

    setLoadingLocations(true);
    runCmd(locationList((nextLocations) => {
      setLocations(nextLocations);
      setLoadingLocations(false);
    }, (error) => {
      logger.error("Failed to load locations", { error });
      setLoadingLocations(false);
    }));
  }, [setLoadingLocations, setLocations]);

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

      logger.error("Failed to load documents", { locationId, error });
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

  useEffect(() => {
    const manager = new SubscriptionManager();
    let cleanupFn: (() => void) | undefined;

    manager.subscribe(backendEvents((event) => {
      if (event.type !== "DocModifiedExternally") {
        return;
      }

      const currentLocationId = selectedLocationRef.current;
      if (currentLocationId && event.doc_id.location_id === currentLocationId) {
        loadDocuments(currentLocationId);
      }
    })).then((cleanup) => {
      cleanupFn = cleanup;
    }).catch((error) => {
      logger.error("Failed to subscribe for workspace sync events", { error });
    });

    return () => {
      cleanupFn?.();
      manager.cleanup();
    };
  }, [loadDocuments]);
}
