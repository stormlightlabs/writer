import type { BackendEvent, Cmd } from "$ports";
import {
  backendEvents,
  locationAddViaDialog,
  locationList,
  locationRemove,
  locationValidate,
  runCmd,
  SubscriptionManager,
} from "$ports";
import { AppError, LocationDescriptor, LocationId } from "$types";
import { useCallback, useEffect, useRef, useState } from "react";

type UsePortsState<T> = { data: T | null; error: AppError | null; loading: boolean };

type UsePortsReturn<T> = UsePortsState<T> & { execute: (cmd: Cmd) => Promise<void>; reset: () => void };

export function usePorts<T = unknown>(): UsePortsReturn<T> {
  const [state, setState] = useState<UsePortsState<T>>({ data: null, error: null, loading: false });

  const execute = useCallback(async (cmd: Cmd) => {
    if (cmd.type === "None") return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      await runCmd(cmd);
      setState((prev) => ({ ...prev, loading: false }));
    } catch (error) {
      setState({
        data: null,
        error: { code: "IO_ERROR", message: error instanceof Error ? error.message : String(error) },
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

export function useBackendEvents(options: UseBackendEventsOptions): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const manager = new SubscriptionManager();
    let cleanupFn: (() => void) | undefined;

    const handleEvent = (event: BackendEvent) => {
      switch (event.type) {
        case "LocationMissing": {
          optionsRef.current.onLocationMissing?.(event.location_id, event.path);
          break;
        }
        case "LocationChanged": {
          optionsRef.current.onLocationChanged?.(event.location_id, event.old_path, event.new_path);
          break;
        }
        case "ReconciliationComplete": {
          optionsRef.current.onReconciliationComplete?.(event.checked, event.missing);
          break;
        }
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

  const validateLocations = useCallback(
    async (): Promise<Array<[LocationId, string]>> =>
      await new Promise((resolve, reject) => {
        runCmd(locationValidate((missing) => resolve(missing), (err) => reject(err)));
      }),
    [],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { locations, loading, error, refresh, addLocation, removeLocation, validateLocations };
}
