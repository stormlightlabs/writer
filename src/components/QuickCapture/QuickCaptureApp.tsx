import { globalCaptureGet, globalCaptureSubmit, runCmd } from "$ports";
import type { CaptureMode, CaptureSubmitResult, GlobalCaptureSettings } from "$types";
import type { AppError } from "$types";
import { f } from "$utils/serialize";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useEffect, useRef, useState } from "react";
import { QuickCaptureForm } from "./QuickCaptureForm";

export function QuickCaptureApp() {
  const [settings, setSettings] = useState<GlobalCaptureSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const windowRef = useRef(getCurrentWindow());

  useEffect(() => {
    const loadSettings = async () => {
      await runCmd(globalCaptureGet((loadedSettings) => {
        setSettings(loadedSettings);
        setIsLoading(false);
      }, (err) => {
        logger.error(f("Failed to load global capture settings", { err }));
        setError("Failed to load settings");
        setIsLoading(false);
      }));
    };

    loadSettings();
  }, []);

  const handleSubmit = useCallback(
    async (text: string, mode: CaptureMode, destination?: { locationId: number; relPath: string }) => {
      if (!settings || isSubmitting) return;

      setIsSubmitting(true);
      setError(null);

      await runCmd(
        globalCaptureSubmit({ mode, text, destination, openMainAfterSave: false }, (result: CaptureSubmitResult) => {
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
        }, (err: AppError) => {
          setIsSubmitting(false);
          logger.error(f("Capture submission failed", { err }));
          setError(err.message || "Failed to save capture");
        }),
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
      <div className="flex items-center justify-center h-dvh bg-bg-primary">
        <div className="w-8 h-8 border-3 border-border-subtle border-t-accent-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <QuickCaptureForm
      defaultMode={settings?.defaultMode}
      onSubmit={handleSubmit}
      onClose={handleClose}
      isSubmitting={isSubmitting}
      error={error} />
  );
}
