import { dirList, globalCaptureGet, globalCaptureSubmit, locationList, runCmd, uiLayoutGet } from "$ports";
import type { AppTheme, CaptureMode, CaptureSubmitResult, GlobalCaptureSettings, LocationDescriptor } from "$types";
import type { AppError } from "$types";
import { f } from "$utils/serialize";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useEffect, useRef, useState } from "react";
import { QuickCaptureForm, type QuickCaptureSaveTarget } from "./QuickCaptureForm";

const getPreferredTheme = (): AppTheme => {
  if (typeof globalThis.matchMedia === "function") {
    return globalThis.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  return "dark";
};

export function QuickCaptureApp() {
  const [settings, setSettings] = useState<GlobalCaptureSettings | null>(null);
  const [locations, setLocations] = useState<LocationDescriptor[]>([]);
  const [saveTargets, setSaveTargets] = useState<QuickCaptureSaveTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<AppTheme>(() => getPreferredTheme());
  const [reduceMotion, setReduceMotion] = useState(false);
  const windowRef = useRef(getCurrentWindow());

  const normalizeRelPath = useCallback((value: string): string => {
    const normalized = value.replaceAll("\\", "/").replace(/^\.\/+/, "").replaceAll(/^\/+|\/+$/g, "");
    return normalized;
  }, []);

  const listLocationDirectories = useCallback(async (locationId: number): Promise<string[]> => {
    let directories: string[] = [];
    await runCmd(dirList(locationId, (loadedDirectories) => {
      directories = loadedDirectories;
    }, (err) => {
      logger.warn(f("Failed to load quick capture directories", { locationId, err }));
      directories = [];
    }));
    return directories;
  }, []);

  useEffect(() => {
    if (typeof globalThis.matchMedia !== "function") {
      return;
    }

    const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: light)");
    const handleThemeChange = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? "light" : "dark");
    };

    mediaQuery.addEventListener("change", handleThemeChange);
    return () => {
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadSettings = async () => {
      await runCmd(globalCaptureGet((loadedSettings) => {
        if (isCancelled) {
          return;
        }
        setSettings(loadedSettings);
        setIsLoading(false);
      }, (err) => {
        if (isCancelled) {
          return;
        }
        logger.error(f("Failed to load global capture settings", { err }));
        setError("Failed to load settings");
        setIsLoading(false);
      }));

      await runCmd(locationList((loadedLocations) => {
        if (isCancelled) {
          return;
        }
        setLocations(loadedLocations);
      }, (err) => {
        if (isCancelled) {
          return;
        }
        logger.warn(f("Failed to load locations for quick capture", { err }));
      }));

      await runCmd(uiLayoutGet((layoutSettings) => {
        if (isCancelled) {
          return;
        }
        setReduceMotion(layoutSettings.reduce_motion);
      }, (err) => {
        logger.warn(f("Failed to load layout settings for quick capture", { err }));
      }));
    };

    void loadSettings();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadSaveTargets = async () => {
      if (locations.length === 0) {
        setSaveTargets([]);
        return;
      }

      const defaultInboxDir = normalizeRelPath(settings?.inboxRelativeDir ?? "inbox");
      const loadedTargets = await Promise.all(locations.map(async (location) => {
        const directories = await listLocationDirectories(location.id);
        const normalizedDirectories = directories.map((directory) => normalizeRelPath(directory)).filter((directory) =>
          directory.length > 0
        );
        const allDirectories = Array.from(new Set([defaultInboxDir, ...normalizedDirectories])).filter((directory) =>
          directory.length > 0
        ).toSorted((a, b) => a.localeCompare(b));

        return allDirectories.map((
          directory,
        ) => ({
          id: `${location.id}:${directory}`,
          locationId: location.id,
          relPath: directory,
          label: `${location.name} / ${directory}`,
        } satisfies QuickCaptureSaveTarget));
      }));

      if (isCancelled) {
        return;
      }

      setSaveTargets(loadedTargets.flat());
    };

    void loadSaveTargets();
    return () => {
      isCancelled = true;
    };
  }, [listLocationDirectories, locations, normalizeRelPath, settings?.inboxRelativeDir]);

  const handleSubmitToDestination = useCallback(
    async (text: string, mode: CaptureMode, destination?: { locationId: number; relPath: string }) => {
      if (!settings || isSubmitting) return;

      setIsSubmitting(true);
      setError(null);
      const destinationPayload = mode === "Append" ? void 0 : destination;

      await runCmd(
        globalCaptureSubmit(
          { mode, text, destination: destinationPayload, openMainAfterSave: false },
          (result: CaptureSubmitResult) => {
            setIsSubmitting(false);

            if (result.success) {
              logger.info(
                f("Capture submitted successfully", { savedTo: result.savedTo, locationId: result.locationId }),
              );

              if (result.shouldClose) {
                windowRef.current.close().catch((err) => {
                  logger.error(
                    f("Failed to close window", { message: err instanceof Error ? err.message : String(err) }),
                  );
                });
              }
            } else {
              setError("Failed to save capture");
            }
          },
          (err: AppError) => {
            setIsSubmitting(false);
            logger.error(f("Capture submission failed", { err }));
            setError(err.message || "Failed to save capture");
          },
        ),
      );
    },
    [settings, isSubmitting],
  );

  const handleClose = useCallback(() => {
    windowRef.current.close().catch((err) => {
      logger.error(f("Failed to close window", { message: err instanceof Error ? err.message : String(err) }));
    });
  }, []);

  if (isLoading) {
    return (
      <div data-theme={theme} className="flex h-dvh items-center justify-center bg-surface-primary">
        <div className="w-8 h-8 border-3 border-stroke-subtle border-t-accent-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-theme={theme} className="h-dvh bg-surface-primary">
      <QuickCaptureForm
        defaultMode={settings?.defaultMode}
        onSubmit={handleSubmitToDestination}
        onClose={handleClose}
        isSubmitting={isSubmitting}
        error={error}
        reduceMotion={reduceMotion}
        saveTargets={saveTargets} />
    </div>
  );
}
