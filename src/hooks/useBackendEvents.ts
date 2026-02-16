/**
 * useBackendEvents hook
 *
 * Subscribes to backend events and provides them to the application.
 * Handles location missing, conflict detection, and reconciliation events.
 */

import { useEffect, useState } from "react";
import { listen, Event as TauriEvent, UnlistenFn } from "@tauri-apps/api/event";
import type { BackendEvent, LocationId } from "../ports";

export interface BackendEventState {
  events: BackendEvent[];
  missingLocations: Array<{ location_id: LocationId; path: string }>;
  conflicts: Array<{ location_id: LocationId; rel_path: string; conflict_filename: string }>;
}

export function useBackendEvents(): BackendEventState {
  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [missingLocations, setMissingLocations] = useState<Array<{ location_id: LocationId; path: string }>>([]);
  const [conflicts, setConflicts] = useState<Array<{ location_id: LocationId; rel_path: string; conflict_filename: string }>>([]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    const setupListener = async () => {
      try {
        unlisten = await listen<BackendEvent>("backend-event", (event: TauriEvent<BackendEvent>) => {
          const payload = event.payload;
          
          setEvents((prev) => [...prev, payload]);

          switch (payload.type) {
            case "LocationMissing":
              setMissingLocations((prev) => [
                ...prev,
                { location_id: payload.location_id, path: payload.path },
              ]);
              console.warn("Location missing:", payload.location_id, payload.path);
              break;

            case "ConflictDetected":
              setConflicts((prev) => [
                ...prev,
                {
                  location_id: payload.location_id,
                  rel_path: payload.rel_path,
                  conflict_filename: payload.conflict_filename,
                },
              ]);
              console.warn("Conflict detected:", payload.conflict_filename);
              break;

            case "ReconciliationComplete":
              console.log("Reconciliation complete:", payload.checked, "checked,", payload.missing.length, "missing");
              break;

            case "LocationChanged":
              console.log("Location changed:", payload.location_id, payload.old_path, "->", payload.new_path);
              break;

            case "DocModifiedExternally":
              console.log("Document modified externally:", payload.doc_id);
              break;

            case "SaveStatusChanged":
              console.log("Save status changed:", payload.doc_id, payload.status);
              break;
          }
        });
      } catch (error) {
        console.error("Failed to subscribe to backend events:", error);
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
