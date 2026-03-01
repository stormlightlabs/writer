import type { DocumentDragData } from "$components/Sidebar/DocumentItem";
import { type DestinationData, type Edge } from "$dnd";
import type { DocMeta } from "$types";

export type FolderDragData = { type: "folder"; locationId: number; relPath: string; title: string };
export type SidebarDragData = DocumentDragData | FolderDragData;

type DestinationDropTarget = { data?: unknown };
type PointerInfo = { x?: number; y?: number; altKey?: boolean };

function splitPathSegments(relPath: string): string[] {
  return relPath.split(/[\\/]+/).filter(Boolean);
}

function isFolderDropNoop(sourcePath: string, destinationParentPath: string): boolean {
  return getParentDirectoryPath(sourcePath) === destinationParentPath;
}

function isDestinationData(value: unknown): value is DestinationData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybe = value as Partial<DestinationData>;
  return typeof maybe.locationId === "number" && Number.isFinite(maybe.locationId);
}

function destinationPriority(destination: DestinationData): number {
  if (destination.targetType === "document") {
    return 3;
  }
  if (destination.targetType === "folder" || destination.folderPath) {
    return 2;
  }
  return 1;
}

function canDropIntoLocationTarget(sourceData: SidebarDragData, locationId: number): boolean {
  if (sourceData.type === "folder") {
    return sourceData.locationId === locationId && getParentDirectoryPath(sourceData.relPath) !== "";
  }

  return sourceData.type === "document";
}

function canDropIntoDocumentTarget(sourceData: SidebarDragData, destination: DestinationData): boolean {
  if (sourceData.type !== "document" || destination.targetType !== "document" || !destination.relPath) {
    return false;
  }

  return sourceData.locationId === destination.locationId && sourceData.relPath !== destination.relPath;
}

export function isDocumentDragData(value: unknown): value is DocumentDragData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybe = value as Partial<DocumentDragData>;
  return maybe.type === "document" && typeof maybe.locationId === "number" && typeof maybe.relPath === "string";
}

export function isFolderDragData(sourceData: unknown): sourceData is FolderDragData {
  if (!sourceData || typeof sourceData !== "object") {
    return false;
  }

  const data = sourceData as Partial<FolderDragData>;
  return data.type === "folder" && typeof data.locationId === "number" && typeof data.relPath === "string";
}

export function isSidebarDragData(value: unknown): value is SidebarDragData {
  return isDocumentDragData(value) || isFolderDragData(value);
}

export function getFilename(relPath: string): string {
  return relPath.split("/").pop() || relPath;
}

export function getParentDirectoryPath(relPath: string): string {
  const parts = splitPathSegments(relPath);
  return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
}

export function canDropDocumentIntoFolder(sourceData: unknown, locationId: number, folderPath: string): boolean {
  if (!isDocumentDragData(sourceData)) {
    return false;
  }

  if (sourceData.locationId !== locationId) {
    return true;
  }

  return getParentDirectoryPath(sourceData.relPath) !== folderPath;
}

export function canDropFolderIntoFolder(sourceData: unknown, locationId: number, folderPath: string): boolean {
  if (!isFolderDragData(sourceData)) {
    return false;
  }

  if (sourceData.locationId !== locationId) {
    return false;
  }

  if (sourceData.relPath === folderPath) {
    return false;
  }

  if (folderPath.startsWith(`${sourceData.relPath}/`)) {
    return false;
  }

  return !isFolderDropNoop(sourceData.relPath, folderPath);
}

export function resolveDestinationFromDropTargets(dropTargets: unknown): DestinationData | null {
  if (!Array.isArray(dropTargets)) {
    return null;
  }

  let best: DestinationData | null = null;
  for (const target of dropTargets as DestinationDropTarget[]) {
    const data = target.data;
    if (!isDestinationData(data)) {
      continue;
    }

    if (!best || destinationPriority(data) > destinationPriority(best)) {
      best = data;
    }
  }

  return best;
}

export function canDropIntoDestination(sourceData: SidebarDragData, destination: DestinationData): boolean {
  if (destination.folderPath) {
    if (sourceData.type === "folder") {
      return canDropFolderIntoFolder(sourceData, destination.locationId, destination.folderPath);
    }

    return canDropDocumentIntoFolder(sourceData, destination.locationId, destination.folderPath);
  }

  if (destination.targetType === "document") {
    return canDropIntoDocumentTarget(sourceData, destination);
  }

  return canDropIntoLocationTarget(sourceData, destination.locationId);
}

export function walkUpToValidDestination(
  sourceData: SidebarDragData,
  destination: DestinationData,
): DestinationData | null {
  if (canDropIntoDestination(sourceData, destination)) {
    return destination;
  }

  if (!destination.folderPath) {
    return null;
  }

  let currentPath = destination.folderPath;
  while (currentPath) {
    const parentPath = getParentDirectoryPath(currentPath);
    if (parentPath === currentPath) {
      break;
    }

    if (parentPath) {
      const parentDestination: DestinationData = {
        locationId: destination.locationId,
        folderPath: parentPath,
        targetType: "folder",
      };
      if (canDropIntoDestination(sourceData, parentDestination)) {
        return parentDestination;
      }
    } else {
      const rootDestination: DestinationData = { locationId: destination.locationId, targetType: "location" };
      if (canDropIntoDestination(sourceData, rootDestination)) {
        return rootDestination;
      }
      break;
    }

    currentPath = parentPath;
  }

  return null;
}

export function summarizePointerInput(input: unknown): PointerInfo & { rawX?: number; rawY?: number; dpr?: number } {
  if (!input || typeof input !== "object") {
    return {};
  }

  const maybe = input as Partial<{ clientX: number; clientY: number; x: number; y: number; altKey: boolean }>;
  const dpr = window.devicePixelRatio || 1;
  const rawX = typeof maybe.clientX === "number" ? maybe.clientX : maybe.x;
  const rawY = typeof maybe.clientY === "number" ? maybe.clientY : maybe.y;
  return {
    x: typeof rawX === "number" ? rawX / dpr : undefined,
    y: typeof rawY === "number" ? rawY / dpr : undefined,
    rawX,
    rawY,
    dpr,
    altKey: typeof maybe.altKey === "boolean" ? maybe.altKey : undefined,
  };
}

export function pointerFromInput(input: unknown): { x: number; y: number } | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const maybe = input as Partial<{ clientX: number; clientY: number; x: number; y: number }>;
  const x = typeof maybe.clientX === "number" ? maybe.clientX : maybe.x;
  const y = typeof maybe.clientY === "number" ? maybe.clientY : maybe.y;
  if (typeof x !== "number" || typeof y !== "number") {
    return null;
  }

  return { x, y };
}

export function reorderDocumentsInLocation(
  documents: DocMeta[],
  locationId: number,
  sourceRelPath: string,
  destinationRelPath: string,
  edge: Edge | null,
): DocMeta[] {
  if (edge !== "top" && edge !== "bottom") {
    return documents;
  }

  const locationDocuments = documents.filter((doc) => doc.location_id === locationId);
  const sourceIndex = locationDocuments.findIndex((doc) => doc.rel_path === sourceRelPath);
  if (sourceIndex === -1) {
    return documents;
  }

  const [sourceDoc] = locationDocuments.splice(sourceIndex, 1);
  const destinationIndex = locationDocuments.findIndex((doc) => doc.rel_path === destinationRelPath);
  if (destinationIndex === -1) {
    return documents;
  }

  const insertIndex = edge === "top" ? destinationIndex : destinationIndex + 1;
  locationDocuments.splice(insertIndex, 0, sourceDoc);

  let locationCursor = 0;
  return documents.map((doc) => {
    if (doc.location_id !== locationId) {
      return doc;
    }

    const next = locationDocuments[locationCursor];
    locationCursor += 1;
    return next;
  });
}
