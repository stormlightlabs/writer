import type { MarkdownListItem, MarkdownNode } from "$pdf/types";
import { logAssetResolutionFailure, resolveAssetPath } from "$utils/assets";
import { f } from "$utils/serialize";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import * as logger from "@tauri-apps/plugin-log";

const preloadedImageSources = new Map<string, string>();

function mimeForExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return "image/png";
  }
}

async function fetchAsDataUrl(absolutePath: string): Promise<string> {
  const cached = preloadedImageSources.get(absolutePath);
  if (cached !== undefined) return cached;

  const url = convertFileSrc(absolutePath);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url} (${response.status})`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCodePoint(bytes[i]);
  }
  const ext = absolutePath.split(".").pop() ?? "png";
  const dataUrl = `data:${mimeForExtension(ext)};base64,${btoa(binary)}`;

  preloadedImageSources.set(absolutePath, dataUrl);
  return dataUrl;
}

function collectImageSrcsFromListItems(items: MarkdownListItem[]): string[] {
  return items.flatMap((item) => collectImageSrcs(item.content));
}

function collectImageSrcs(nodes: MarkdownNode[]): string[] {
  const srcs: string[] = [];
  for (const node of nodes) {
    if (node.type === "image") {
      srcs.push(node.src);
    } else if (node.type === "list") {
      srcs.push(...collectImageSrcsFromListItems(node.items));
    }
  }
  return srcs;
}

async function fetchSvgAsPngDataUrl(locationId: number, docRelPath: string, assetRef: string): Promise<string> {
  const absolutePath = await resolveAssetPath(locationId, docRelPath, assetRef);
  const cached = preloadedImageSources.get(absolutePath);
  if (cached !== undefined) return cached;

  const result = await invoke<unknown>("svg_to_png", { locationId, docRelPath, assetPath: assetRef });
  if (
    typeof result === "object" && result !== null
    && (result as Record<string, unknown>)["type"] === "ok"
    && typeof (result as Record<string, unknown>)["value"] === "string"
  ) {
    const dataUrl = (result as Record<string, unknown>)["value"] as string;
    preloadedImageSources.set(absolutePath, dataUrl);
    return dataUrl;
  }
  throw new Error(`svg_to_png failed for ${assetRef}`);
}

export async function preloadPdfImages(
  nodes: MarkdownNode[],
  locationId: number,
  docRelPath: string,
): Promise<Record<string, string>> {
  const srcs = [...new Set(collectImageSrcs(nodes))];
  const resolved: Record<string, string> = {};

  await Promise.allSettled(srcs.map(async (src) => {
    try {
      const absolutePath = await resolveAssetPath(locationId, docRelPath, src);
      resolved[src] = src.toLowerCase().endsWith(".svg")
        ? await fetchSvgAsPngDataUrl(locationId, docRelPath, src)
        : await fetchAsDataUrl(absolutePath);
    } catch (error) {
      logAssetResolutionFailure("PDF image", src, error);
    }
  }));

  logger.debug(f("PDF image preload complete", { requested: srcs.length, resolved: Object.keys(resolved).length }));
  return resolved;
}
