import { imageDelete, imageImport, runCmd } from "$ports";
import type { AppError } from "$types";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useMemo } from "react";

/**
 * Controller hook for local image asset operations: `importImage` and `deleteImage`.
 */
export function useImageController() {
  const importImage = useCallback(
    (locationId: number, sourcePath: string, targetDir: string): Promise<string | false> =>
      new Promise((resolve) => {
        runCmd(imageImport(locationId, sourcePath, targetDir, (assetPath) => {
          logger.info(f("Image imported", { locationId, sourcePath, targetDir, assetPath }));
          resolve(assetPath);
        }, (error: AppError) => {
          logger.error(f("Failed to import image", { locationId, sourcePath, targetDir, error }));
          resolve(false);
        }));
      }),
    [],
  );

  const deleteImage = useCallback(
    (locationId: number, assetPath: string): Promise<boolean> =>
      new Promise((resolve) => {
        runCmd(imageDelete(locationId, assetPath, (removed) => {
          logger.info(f("Image deleted", { locationId, assetPath, removed }));
          resolve(removed);
        }, (error: AppError) => {
          logger.error(f("Failed to delete image", { locationId, assetPath, error }));
          resolve(false);
        }));
      }),
    [],
  );

  return useMemo(() => ({ importImage, deleteImage }), [importImage, deleteImage]);
}
