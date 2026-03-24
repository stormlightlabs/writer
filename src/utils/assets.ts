import { assetResolve, runCmd } from "$ports";
import { f } from "$utils/serialize";
import { convertFileSrc } from "@tauri-apps/api/core";
import * as logger from "@tauri-apps/plugin-log";

const resolvedAssetPathCache = new Map<string, Promise<string>>();
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

function splitAssetReference(assetRef: string): { path: string; suffix: string } {
  const separatorIndex = assetRef.search(/[?#]/);
  const rawPath = separatorIndex >= 0 ? assetRef.slice(0, separatorIndex) : assetRef;
  const suffix = separatorIndex >= 0 ? assetRef.slice(separatorIndex) : "";

  try {
    return { path: decodeURI(rawPath), suffix };
  } catch {
    return { path: rawPath, suffix };
  }
}

export function isExternalAssetReference(assetRef: string): boolean {
  const trimmed = assetRef.trim();
  return trimmed.startsWith("//") || URL_SCHEME_PATTERN.test(trimmed);
}

export function isResolvableLocalAssetReference(assetRef: string): boolean {
  const trimmed = assetRef.trim();
  return trimmed !== "" && !trimmed.startsWith("#") && !isExternalAssetReference(trimmed);
}

export async function resolveAssetPath(locationId: number, docRelPath: string, assetRef: string): Promise<string> {
  const { path } = splitAssetReference(assetRef.trim());

  if (!isResolvableLocalAssetReference(path)) {
    throw new Error(`Asset reference is not local: ${assetRef}`);
  }

  const cacheKey = `${locationId}:${docRelPath}:${path}`;
  const existing = resolvedAssetPathCache.get(cacheKey);
  if (existing) {
    return await existing;
  }

  const pending = new Promise<string>((resolve, reject) => {
    void runCmd(assetResolve(locationId, docRelPath, path, resolve, reject));
  });

  resolvedAssetPathCache.set(cacheKey, pending);

  try {
    return await pending;
  } catch (error) {
    resolvedAssetPathCache.delete(cacheKey);
    throw error;
  }
}

export async function resolveAssetUrl(locationId: number, docRelPath: string, assetRef: string): Promise<string> {
  const { suffix } = splitAssetReference(assetRef);
  const resolvedPath = await resolveAssetPath(locationId, docRelPath, assetRef);
  return `${convertFileSrc(resolvedPath)}${suffix}`;
}

export function logAssetResolutionFailure(kind: string, assetRef: string, error: unknown) {
  void logger.debug(
    f(`Failed to resolve ${kind}`, {
      keyValues: { assetRef, error: error instanceof Error ? error.message : String(error) },
    }),
  );
}
