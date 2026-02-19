import type { Event as TauriEvent, UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { logger } from "../logger";
import type { BackendEvent } from "../ports";
import type { LocationId } from "../types";

export type BackendEventState = {
  events: BackendEvent[];
  missingLocations: Array<{ location_id: LocationId; path: string }>;
  conflicts: Array<{ location_id: LocationId; rel_path: string; conflict_filename: string }>;
};

export function useBackendEvents(): BackendEventState {
  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [missingLocations, setMissingLocations] = useState<Array<{ location_id: LocationId; path: string }>>([]);
  const [conflicts, setConflicts] = useState<
    Array<{ location_id: LocationId; rel_path: string; conflict_filename: string }>
  >([]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    const setupListener = async () => {
      try {
        unlisten = await listen<BackendEvent>("backend-event", (event: TauriEvent<BackendEvent>) => {
          const { payload } = event;

          setEvents((prev) => [...prev, payload]);

          switch (payload.type) {
            case "LocationMissing": {
              setMissingLocations((prev) => [...prev, { location_id: payload.location_id, path: payload.path }]);
              logger.warn("Location missing", { locationId: payload.location_id, path: payload.path });
              break;
            }
            case "ConflictDetected": {
              setConflicts((
                prev,
              ) => [...prev, {
                location_id: payload.location_id,
                rel_path: payload.rel_path,
                conflict_filename: payload.conflict_filename,
              }]);
              logger.warn("Conflict detected", {
                locationId: payload.location_id,
                relPath: payload.rel_path,
                conflictFileName: payload.conflict_filename,
              });
              break;
            }
            case "ReconciliationComplete": {
              logger.info("Reconciliation complete", {
                checked: payload.checked,
                missingCount: payload.missing.length,
              });
              break;
            }
            case "LocationChanged": {
              logger.info("Location changed", {
                locationId: payload.location_id,
                oldPath: payload.old_path,
                newPath: payload.new_path,
              });
              break;
            }
            case "DocModifiedExternally": {
              logger.info("Document modified externally", { docId: payload.doc_id });
              break;
            }
            case "SaveStatusChanged": {
              logger.info("Save status changed", { docId: payload.doc_id, status: payload.status });
              break;
            }
          }
        });
      } catch (error) {
        logger.error("Failed to subscribe to backend events", {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  return { events, missingLocations, conflicts };
}
