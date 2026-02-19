import { useEffect, useRef } from "react";
import { logger } from "../logger";
import { docList, locationList, runCmd } from "../ports";
import { useWorkspaceActions, useWorkspaceState } from "../state/appStore";

export function useWorkspaceSync(): void {
  const { selectedLocationId } = useWorkspaceState();
  const { setLocations, setLoadingLocations, setDocuments, setLoadingDocuments } = useWorkspaceActions();

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

  useEffect(() => {
    if (!selectedLocationId) {
      setDocuments([]);
      setLoadingDocuments(false);
      return;
    }

    const requestId = ++documentRequestRef.current;

    setLoadingDocuments(true);
    runCmd(docList(selectedLocationId, (nextDocuments) => {
      if (documentRequestRef.current !== requestId) {
        return;
      }

      setDocuments(nextDocuments);
      setLoadingDocuments(false);
    }, (error) => {
      if (documentRequestRef.current !== requestId) {
        return;
      }

      logger.error("Failed to load documents", { locationId: selectedLocationId, error });
      setLoadingDocuments(false);
    }));
  }, [selectedLocationId, setDocuments, setLoadingDocuments]);
}
