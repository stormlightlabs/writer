import type { BackendEvent } from "$ports";
import type { LocationId } from "$types";
import { f } from "$utils/serialize";
import type { Event as TauriEvent, UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import * as logger from "@tauri-apps/plugin-log";
import { useEffect, useRef, useState } from "react";

export type BackendEventState = {
  missingLocations: Array<{ location_id: LocationId; path: string }>;
  conflicts: Array<{ location_id: LocationId; rel_path: string; conflict_filename: string }>;
};

export type UseBackendEventsOptions = {
  onLocationMissing?: (locationId: LocationId, path: string) => void;
  onLocationChanged?: (locationId: LocationId, oldPath: string, newPath: string) => void;
  onReconciliationComplete?: (checked: number, missing: LocationId[]) => void;
  onDocModifiedExternally?: (docRef: { location_id: LocationId; rel_path: string }) => void;
};

const MAX_ALERT_ITEMS = 100;
const INITIAL_STATE: BackendEventState = { missingLocations: [], conflicts: [] };

let state: BackendEventState = INITIAL_STATE;
let sharedUnlisten: UnlistenFn | null = null;
let isStartingListener = false;
const stateSubscribers = new Set<() => void>();
const eventSubscribers = new Set<(event: BackendEvent) => void>();

function limitItems<T>(items: T[]): T[] {
  if (items.length <= MAX_ALERT_ITEMS) {
    return items;
  }

  return items.slice(items.length - MAX_ALERT_ITEMS);
}

function notifyStateSubscribers(): void {
  for (const subscriber of stateSubscribers) {
    subscriber();
  }
}

function handleBackendEvent(payload: BackendEvent): void {
  switch (payload.type) {
    case "LocationMissing": {
      state = {
        ...state,
        missingLocations: limitItems([...state.missingLocations, {
          location_id: payload.location_id,
          path: payload.path,
        }]),
      };
      notifyStateSubscribers();
      logger.warn(f("Location missing", { locationId: payload.location_id, path: payload.path }));
      break;
    }
    case "ConflictDetected": {
      state = {
        ...state,
        conflicts: limitItems([...state.conflicts, {
          location_id: payload.location_id,
          rel_path: payload.rel_path,
          conflict_filename: payload.conflict_filename,
        }]),
      };
      notifyStateSubscribers();
      logger.warn(
        f("Conflict detected", {
          locationId: payload.location_id,
          relPath: payload.rel_path,
          conflictFileName: payload.conflict_filename,
        }),
      );
      break;
    }
    case "ReconciliationComplete": {
      logger.info(f("Reconciliation complete", { checked: payload.checked, missingCount: payload.missing.length }));
      break;
    }
    case "LocationChanged": {
      logger.info(
        f("Location changed", {
          locationId: payload.location_id,
          oldPath: payload.old_path,
          newPath: payload.new_path,
        }),
      );
      break;
    }
    case "DocModifiedExternally": {
      logger.info(f("Document modified externally", { docId: payload.doc_id }));
      break;
    }
    case "SaveStatusChanged": {
      logger.info(f("Save status changed", { docId: payload.doc_id, status: payload.status }));
      break;
    }
  }

  for (const subscriber of eventSubscribers) {
    subscriber(payload);
  }
}

function startSharedListener(): void {
  if (sharedUnlisten || isStartingListener) {
    return;
  }

  isStartingListener = true;
  void listen<BackendEvent>("backend-event", (event: TauriEvent<BackendEvent>) => {
    handleBackendEvent(event.payload);
  }).then((unlisten) => {
    sharedUnlisten = unlisten;
  }).catch((error) => {
    logger.error(
      f("Failed to subscribe to backend events", { message: error instanceof Error ? error.message : String(error) }),
    );
  }).finally(() => {
    isStartingListener = false;
    if (stateSubscribers.size === 0 && eventSubscribers.size === 0 && sharedUnlisten) {
      sharedUnlisten();
      sharedUnlisten = null;
    }
  });
}

function stopSharedListenerIfIdle(): void {
  if (stateSubscribers.size > 0 || eventSubscribers.size > 0 || !sharedUnlisten) {
    return;
  }

  sharedUnlisten();
  sharedUnlisten = null;
}

function subscribeState(callback: () => void): () => void {
  stateSubscribers.add(callback);
  startSharedListener();
  return () => {
    stateSubscribers.delete(callback);
    stopSharedListenerIfIdle();
  };
}

function subscribeEvents(callback: (event: BackendEvent) => void): () => void {
  eventSubscribers.add(callback);
  startSharedListener();
  return () => {
    eventSubscribers.delete(callback);
    stopSharedListenerIfIdle();
  };
}

function getSnapshot(): BackendEventState {
  return state;
}

export function useBackendEvents(options: UseBackendEventsOptions = {}): BackendEventState {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [snapshot, setSnapshot] = useState<BackendEventState>(() => getSnapshot());

  useEffect(() => {
    return subscribeState(() => {
      setSnapshot(getSnapshot());
    });
  }, []);

  useEffect(() => {
    return subscribeEvents((payload) => {
      switch (payload.type) {
        case "LocationMissing":
          optionsRef.current.onLocationMissing?.(payload.location_id, payload.path);
          break;
        case "LocationChanged":
          optionsRef.current.onLocationChanged?.(payload.location_id, payload.old_path, payload.new_path);
          break;
        case "ReconciliationComplete":
          optionsRef.current.onReconciliationComplete?.(payload.checked, payload.missing);
          break;
        case "DocModifiedExternally":
          optionsRef.current.onDocModifiedExternally?.(payload.doc_id);
          break;
        default:
          break;
      }
    });
  }, []);

  return snapshot;
}
