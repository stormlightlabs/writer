import { logger } from "$logger";
import type { BackendEvent } from "$ports";
import type { LocationId } from "$types";
import type { Event as TauriEvent, UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";

export type BackendEventState = {
  events: BackendEvent[];
  missingLocations: Array<{ location_id: LocationId; path: string }>;
  conflicts: Array<{ location_id: LocationId; rel_path: string; conflict_filename: string }>;
};

export type UseBackendEventsOptions = {
  onLocationMissing?: (locationId: LocationId, path: string) => void;
  onLocationChanged?: (locationId: LocationId, oldPath: string, newPath: string) => void;
  onReconciliationComplete?: (checked: number, missing: LocationId[]) => void;
};

export function useBackendEvents(options: UseBackendEventsOptions = {}): BackendEventState {
  const optionsRef = useRef(options);
  optionsRef.current = options;
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
              optionsRef.current.onLocationMissing?.(payload.location_id, payload.path);
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
              optionsRef.current.onReconciliationComplete?.(payload.checked, payload.missing);
              logger.info("Reconciliation complete", {
                checked: payload.checked,
                missingCount: payload.missing.length,
              });
              break;
            }
            case "LocationChanged": {
              optionsRef.current.onLocationChanged?.(payload.location_id, payload.old_path, payload.new_path);
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
