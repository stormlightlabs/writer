// oxlint-disable unicorn/prefer-add-event-listener
import { assetResolve, blobDownload, runCmd } from "$ports";
import { f } from "$utils/serialize";
import { convertFileSrc } from "@tauri-apps/api/core";
import * as logger from "@tauri-apps/plugin-log";

const resolvedAssetPathCache = new Map<string, Promise<string>>();
const resolvedBlobAssetUrlCache = new Map<string, Promise<string>>();
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
const AT_BLOB_PATTERN = /^at:\/\/blob\/([A-Za-z0-9._:-]+)$/;
const DEFAULT_BLOB_IMPORT_DIR = "images";
const SUPPORTED_IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|gif|webp|svg)$/i;

function normalizePathSegments(path: string): string[] {
  return path.split("/").filter((segment) => segment !== "" && segment !== ".");
}

function toDocRelativePath(docRelPath: string, assetRelPath: string): string {
  const docSegments = normalizePathSegments(docRelPath);
  docSegments.pop();
  const assetSegments = normalizePathSegments(assetRelPath);

  let sharedPrefix = 0;
  while (
    sharedPrefix < docSegments.length
    && sharedPrefix < assetSegments.length
    && docSegments[sharedPrefix] === assetSegments[sharedPrefix]
  ) {
    sharedPrefix += 1;
  }

  const upSegments = new Array(docSegments.length - sharedPrefix).fill("..");
  const downSegments = assetSegments.slice(sharedPrefix);
  const relative = [...upSegments, ...downSegments].join("/");
  return relative || assetRelPath;
}

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

function hasKnownImageExtension(value: string): boolean {
  const path = value.split(/[?#]/)[0] ?? value;
  return SUPPORTED_IMAGE_EXTENSION_PATTERN.test(path);
}

function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (bytes.length >= 6) {
    const sig = String.fromCodePoint(...bytes.slice(0, 6));
    if (sig === "GIF87a" || sig === "GIF89a") {
      return "image/gif";
    }
  }

  if (
    bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  const probeLength = Math.min(bytes.length, 512);
  const probeText = new TextDecoder().decode(bytes.slice(0, probeLength)).trimStart();
  if (probeText.startsWith("<svg") || (probeText.startsWith("<?xml") && probeText.includes("<svg"))) {
    return "image/svg+xml";
  }

  return null;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read blob as data URL"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob as data URL"));
    reader.readAsDataURL(blob);
  });
}

async function convertAssetUrlToDataUrl(assetUrl: string): Promise<string> {
  const response = await fetch(assetUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch asset bytes: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const mime = detectImageMime(bytes) ?? "application/octet-stream";
  return await blobToDataUrl(new Blob([bytes], { type: mime }));
}

export function isExternalAssetReference(assetRef: string): boolean {
  const trimmed = assetRef.trim();
  return trimmed.startsWith("//") || URL_SCHEME_PATTERN.test(trimmed);
}

export function isResolvableLocalAssetReference(assetRef: string): boolean {
  const trimmed = assetRef.trim();
  return trimmed !== "" && !trimmed.startsWith("#") && !isExternalAssetReference(trimmed);
}

export function isAtProtoBlobReference(assetRef: string): boolean {
  return AT_BLOB_PATTERN.test(assetRef.trim());
}

function extractAtProtoBlobCid(assetRef: string): string | null {
  const match = assetRef.trim().match(AT_BLOB_PATTERN);
  return match?.[1] ?? null;
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

  void logger.debug(f("resolveAssetPath start", { keyValues: { locationId, docRelPath, assetRef: path } }));
  const pending = new Promise<string>((resolve, reject) => {
    void runCmd(assetResolve(locationId, docRelPath, path, resolve, reject));
  });

  resolvedAssetPathCache.set(cacheKey, pending);

  try {
    const resolvedPath = await pending;
    void logger.debug(
      f("resolveAssetPath success", { keyValues: { locationId, docRelPath, assetRef: path, resolvedPath } }),
    );
    return resolvedPath;
  } catch (error) {
    resolvedAssetPathCache.delete(cacheKey);
    logAssetResolutionFailure("resolveAssetPath", path, error);
    throw error;
  }
}

export async function resolveAssetUrl(locationId: number, docRelPath: string, assetRef: string): Promise<string> {
  const { path, suffix } = splitAssetReference(assetRef);
  const resolvedPath = await resolveAssetPath(locationId, docRelPath, assetRef);
  const resolvedUrl = `${convertFileSrc(resolvedPath)}${suffix}`;
  void logger.debug(
    f("resolveAssetUrl converted", {
      keyValues: { locationId, docRelPath, assetRef: path, resolvedPath, resolvedUrl },
    }),
  );

  if (hasKnownImageExtension(path) || hasKnownImageExtension(resolvedPath)) {
    void logger.debug(
      f("resolveAssetUrl extension fast-path", { keyValues: { locationId, docRelPath, assetRef: path, resolvedUrl } }),
    );
    return resolvedUrl;
  }

  try {
    const dataUrl = await convertAssetUrlToDataUrl(resolvedUrl);
    void logger.debug(
      f("resolveAssetUrl data-url fallback success", {
        keyValues: { locationId, docRelPath, assetRef: path, resolvedPath },
      }),
    );
    return dataUrl;
  } catch {
    void logger.debug(
      f("resolveAssetUrl data-url fallback failed, returning protocol URL", {
        keyValues: { locationId, docRelPath, assetRef: path, resolvedPath, resolvedUrl },
      }),
    );
    return resolvedUrl;
  }
}

export async function resolveAtProtoBlobUrl(
  locationId: number,
  docRelPath: string,
  did: string,
  assetRef: string,
): Promise<string> {
  const cid = extractAtProtoBlobCid(assetRef);
  if (!cid) {
    throw new Error(`Asset reference is not an at://blob URL: ${assetRef}`);
  }

  const cacheKey = `${locationId}:${docRelPath}:${did}:${cid}`;
  const existing = resolvedBlobAssetUrlCache.get(cacheKey);
  if (existing) {
    return await existing;
  }

  void logger.debug(f("resolveAtProtoBlobUrl start", { keyValues: { locationId, docRelPath, did, cid } }));
  const pending = new Promise<string>((resolve, reject) => {
    void runCmd(blobDownload(locationId, did, cid, DEFAULT_BLOB_IMPORT_DIR, (downloadedPath) => {
      const docRelativePath = toDocRelativePath(docRelPath, downloadedPath);
      void logger.debug(
        f("resolveAtProtoBlobUrl downloaded", {
          keyValues: { locationId, docRelPath, did, cid, downloadedPath, docRelativePath },
        }),
      );
      void resolveAssetUrl(locationId, docRelPath, docRelativePath).then(resolve).catch(reject);
    }, reject));
  });

  resolvedBlobAssetUrlCache.set(cacheKey, pending);

  try {
    const resolvedUrl = await pending;
    void logger.debug(
      f("resolveAtProtoBlobUrl success", { keyValues: { locationId, docRelPath, did, cid, resolvedUrl } }),
    );
    return resolvedUrl;
  } catch (error) {
    resolvedBlobAssetUrlCache.delete(cacheKey);
    logAssetResolutionFailure("resolveAtProtoBlobUrl", assetRef, error);
    throw error;
  }
}

export function logAssetResolutionFailure(kind: string, assetRef: string, error: unknown) {
  void logger.debug(
    f(`Failed to resolve ${kind}`, {
      keyValues: { assetRef, error: error instanceof Error ? error.message : String(error) },
    }),
  );
}
