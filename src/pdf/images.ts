import { f } from "$utils/serialize";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import * as logger from "@tauri-apps/plugin-log";
import type { MarkdownNode } from "./types";

const preloadedImageSources = new Map<string, string>();

export function resolveAssetSrc(locationRootPath: string, docRelPath: string, imgSrc: string): string {
  const dirParts = docRelPath.split("/").slice(0, -1);
  const base = dirParts.length > 0 ? `${locationRootPath}/${dirParts.join("/")}` : locationRootPath;
  const segments = `${base}/${imgSrc}`.split("/");
  const resolved: string[] = [];
  for (const seg of segments) {
    if (seg === "..") resolved.pop();
    else if (seg !== ".") resolved.push(seg);
  }
  return resolved.join("/");
}

function mimeForExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
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
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCodePoint(bytes[i]);
  }
  const ext = absolutePath.split(".").pop() ?? "png";
  const dataUrl = `data:${mimeForExtension(ext)};base64,${btoa(binary)}`;

  preloadedImageSources.set(absolutePath, dataUrl);
  return dataUrl;
}

function collectImageSrcs(nodes: MarkdownNode[]): string[] {
  const srcs: string[] = [];
  for (const node of nodes) {
    if (node.type === "image") srcs.push(node.src);
    else if (node.type === "list") srcs.push(...collectImageSrcs(node.items));
  }
  return srcs;
}

async function fetchSvgAsPngDataUrl(absolutePath: string): Promise<string> {
  const cached = preloadedImageSources.get(absolutePath);
  if (cached !== undefined) return cached;

  const result = await invoke<unknown>("svg_to_png", { absolutePath });
  if (
    typeof result === "object" && result !== null
    && (result as Record<string, unknown>)["type"] === "ok"
    && typeof (result as Record<string, unknown>)["value"] === "string"
  ) {
    const dataUrl = (result as Record<string, unknown>)["value"] as string;
    preloadedImageSources.set(absolutePath, dataUrl);
    return dataUrl;
  }
  throw new Error(`svg_to_png failed for ${absolutePath}`);
}

export async function preloadPdfImages(
  nodes: MarkdownNode[],
  locationRootPath: string,
  docRelPath: string,
): Promise<Record<string, string>> {
  const srcs = [...new Set(collectImageSrcs(nodes).filter((src) => src.includes(".writer-assets/")))];

  const resolved: Record<string, string> = {};

  await Promise.allSettled(srcs.map(async (src) => {
    try {
      const absolutePath = resolveAssetSrc(locationRootPath, docRelPath, src);
      resolved[src] = src.endsWith(".svg")
        ? await fetchSvgAsPngDataUrl(absolutePath)
        : await fetchAsDataUrl(absolutePath);
    } catch (err) {
      const error = err instanceof Error ? err.message : (String(err));
      logger.debug(f(`Failed to preload image: ${src}`), { keyValues: { error } });
    }
  }));

  return resolved;
}
