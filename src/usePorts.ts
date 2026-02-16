/**
 * React hooks for the Elm-style ports system
 *
 * Provides:
 * - usePorts: Execute commands and manage command state
 * - useBackendEvents: Subscribe to backend events
 * - useLocations: High-level hook for location management
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppError,
  BackendEvent,
  backendEvents,
  Cmd,
  locationAddViaDialog,
  LocationDescriptor,
  LocationId,
  locationList,
  locationRemove,
  locationValidate,
  runCmd,
  SubscriptionManager,
} from "./ports";

interface UsePortsState<T> {
  data: T | null;
  error: AppError | null;
  loading: boolean;
}

interface UsePortsReturn<T> extends UsePortsState<T> {
  execute: (cmd: Cmd) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for executing commands with loading and error state management.
 *
 * Usage:
 * ```tsx
 * const { data, error, loading, execute } = usePorts<LocationDescriptor[]>();
 *
 * useEffect(() => {
 *   execute(locationList(
 *     (locations) => console.log("Got locations:", locations),
 *     (error) => console.error("Failed:", error)
 *   ));
 * }, []);
 * ```
 */
export function usePorts<T = unknown>(): UsePortsReturn<T> {
  const [state, setState] = useState<UsePortsState<T>>({ data: null, error: null, loading: false });

  const execute = useCallback(async (cmd: Cmd) => {
    if (cmd.type === "None") return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      await runCmd(cmd);
      setState((prev) => ({ ...prev, loading: false }));
    } catch (e) {
      setState({
        data: null,
        error: { code: "IO_ERROR", message: e instanceof Error ? e.message : String(e) },
        loading: false,
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  return { ...state, execute, reset };
}

interface UseBackendEventsOptions {
  onLocationMissing?: (locationId: LocationId, path: string) => void;
  onLocationChanged?: (locationId: LocationId, oldPath: string, newPath: string) => void;
  onReconciliationComplete?: (checked: number, missing: LocationId[]) => void;
}

/**
 * Hook for subscribing to backend events.
 *
 * Usage:
 * ```tsx
 * useBackendEvents({
 *   onLocationMissing: (id, path) => console.warn(`Location ${id} missing at ${path}`),
 *   onReconciliationComplete: (checked, missing) => console.log(`Checked ${checked}, missing ${missing.length}`),
 * });
 * ```
 */
export function useBackendEvents(options: UseBackendEventsOptions): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const manager = new SubscriptionManager();
    let cleanupFn: (() => void) | undefined;

    const handleEvent = (event: BackendEvent) => {
      switch (event.type) {
        case "LocationMissing":
          optionsRef.current.onLocationMissing?.(event.location_id, event.path);
          break;
        case "LocationChanged":
          optionsRef.current.onLocationChanged?.(event.location_id, event.old_path, event.new_path);
          break;
        case "ReconciliationComplete":
          optionsRef.current.onReconciliationComplete?.(event.checked, event.missing);
          break;
      }
    };

    manager.subscribe(backendEvents(handleEvent)).then((cleanup) => {
      cleanupFn = cleanup;
    });

    return () => {
      cleanupFn?.();
      manager.cleanup();
    };
  }, []);
}

interface UseLocationsReturn {
  locations: LocationDescriptor[];
  loading: boolean;
  error: AppError | null;
  refresh: () => void;
  addLocation: () => Promise<void>;
  removeLocation: (locationId: LocationId) => Promise<void>;
  validateLocations: () => Promise<Array<[LocationId, string]>>;
}

/**
 * High-level hook for managing locations.
 *
 * Usage:
 * ```tsx
 * const { locations, loading, error, refresh, addLocation, removeLocation } = useLocations();
 *
 * return (
 *   <div>
 *     {locations.map(loc => (
 *       <div key={loc.id}>{loc.name} - {loc.root_path}</div>
 *     ))}
 *     <button onClick={addLocation}>Add Location</button>
 *   </div>
 * );
 * ```
 */
export function useLocations(): UseLocationsReturn {
  const [locations, setLocations] = useState<LocationDescriptor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    await runCmd(locationList((newLocations) => {
      setLocations(newLocations);
      setLoading(false);
    }, (err) => {
      setError(err);
      setLoading(false);
    }));
  }, []);

  const addLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    await runCmd(locationAddViaDialog(() => {
      refresh();
    }, (err) => {
      setError(err);
      setLoading(false);
    }));
  }, [refresh]);

  const removeLocation = useCallback(async (locationId: LocationId) => {
    setLoading(true);
    setError(null);

    await runCmd(locationRemove(locationId, (removed) => {
      if (removed) {
        refresh();
      } else {
        setLoading(false);
      }
    }, (err) => {
      setError(err);
      setLoading(false);
    }));
  }, [refresh]);

  const validateLocations = useCallback(async (): Promise<Array<[LocationId, string]>> => {
    return new Promise((resolve, reject) => {
      runCmd(locationValidate((missing) => resolve(missing), (err) => reject(err)));
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { locations, loading, error, refresh, addLocation, removeLocation, validateLocations };
}
