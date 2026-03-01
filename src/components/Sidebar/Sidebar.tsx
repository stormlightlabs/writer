import { Button } from "$components/Button";
import {
  announce,
  attachClosestEdge,
  cleanup as cleanupLiveRegion,
  dropTargetForElements,
  type Edge,
  extractClosestEdge,
  monitorForElements,
} from "$dnd";
import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import { useExternalDropHandler } from "$hooks/useExternalDropHandler";
import { CollapseIcon, FileAddIcon, FolderAddIcon, RefreshIcon } from "$icons";
import { useSidebarState } from "$state/selectors";
import { showErrorToast, showSuccessToast, showWarnToast } from "$state/stores/toasts";
import type { DocMeta } from "$types";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import type { ChangeEventHandler, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddButton } from "./AddButton";
import { type DocumentDragData } from "./DocumentItem";
import { EmptyLocations } from "./EmptyLocations";
import { OperationDialog } from "./OperationDialog";
import { SearchInput } from "./SearchInput";
import {
  canDropDocumentIntoFolder,
  canDropFolderIntoFolder,
  type FolderDragData,
  SidebarLocationItem,
} from "./SidebarLocationItem";
import { Title } from "./Title";

const EMPTY_DOCUMENTS: DocMeta[] = [];
const EMPTY_DIRECTORIES: string[] = [];

type DestinationData = {
  locationId: number;
  relPath?: string;
  folderPath?: string;
  targetType?: "location" | "document" | "folder";
};

type MoveDropDialogState = {
  sourceType: "document" | "folder";
  sourceLocationId: number;
  sourceRelPath: string;
  sourceTitle: string;
  targetLocationId: number;
};

type PointerInfo = { x?: number; y?: number; altKey?: boolean };

function isDocumentDragData(value: unknown): value is DocumentDragData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybe = value as Partial<DocumentDragData>;
  return maybe.type === "document" && typeof maybe.locationId === "number" && typeof maybe.relPath === "string";
}

function isFolderDragData(value: unknown): value is FolderDragData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybe = value as Partial<FolderDragData>;
  return maybe.type === "folder" && typeof maybe.locationId === "number" && typeof maybe.relPath === "string";
}

function isSidebarDragData(value: unknown): value is DocumentDragData | FolderDragData {
  return isDocumentDragData(value) || isFolderDragData(value);
}

function getFilename(relPath: string): string {
  return relPath.split("/").pop() || relPath;
}

function getParentDirectoryPath(relPath: string): string {
  const parts = relPath.split("/").filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
}

function isDestinationData(value: unknown): value is DestinationData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybe = value as Partial<DestinationData>;
  return typeof maybe.locationId === "number" && Number.isFinite(maybe.locationId);
}

function parseLocationId(locationIdRaw: string | undefined): number | null {
  if (!locationIdRaw) {
    return null;
  }

  const locationId = parseInt(locationIdRaw, 10);
  return Number.isNaN(locationId) ? null : locationId;
}

function resolveDestinationFromPointer(
  x: number,
  y: number,
): { destination: DestinationData; element: HTMLElement } | null {
  // PRIMARY: resolve directly from elementFromPoint + closest() result.
  const hitEl = document.elementFromPoint(x, y);
  const hitElement = hitEl instanceof HTMLElement ? hitEl.closest<HTMLElement>("[data-location-id]") : null;
  // This is authoritative — the browser knows its own coordinate space.
  if (hitElement) {
    const locationId = parseLocationId(hitElement.dataset.locationId);
    if (locationId !== null) {
      if (hitElement.dataset.documentPath) {
        return {
          destination: { locationId, relPath: hitElement.dataset.documentPath, targetType: "document" },
          element: hitElement,
        };
      }
      if (hitElement.dataset.folderPath) {
        return {
          destination: { locationId, folderPath: hitElement.dataset.folderPath, targetType: "folder" },
          element: hitElement,
        };
      }
      return { destination: { locationId, targetType: "location" }, element: hitElement };
    }
  }

  // FALLBACK: geometry-based resolution when elementFromPoint misses
  // (e.g. pointer in empty space between items).
  // Only match folder ROWS (not zones) — zones wrap all children and would
  // match empty space below the last child item.
  const allTargets = document.querySelectorAll<HTMLElement>(
    "[data-drop-folder-row][data-location-id], [data-drop-document-row][data-location-id], [data-drop-location-root][data-location-id]",
  );
  let best: { destination: DestinationData; element: HTMLElement; priority: number; area: number } | null = null;

  for (const el of allTargets) {
    const rect = el.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      continue;
    }

    const locationId = parseLocationId(el.dataset.locationId);
    if (locationId === null) {
      continue;
    }

    // Geometry fallback is intentionally conservative. When direct hit testing fails,
    // default to location-level targeting to avoid surprise folder/document moves.
    const destination: DestinationData = { locationId, targetType: "location" };
    const priority = 1;

    const area = Math.max(1, rect.width * rect.height);

    // Prefer: higher priority type (document > folder > location), then smaller area (innermost element)
    if (!best || priority > best.priority || (priority === best.priority && area < best.area)) {
      best = { destination, element: el, priority, area };
    }
  }

  // If the pointer is not directly over any row element (e.g. empty space above/below items),
  // fall back to the nearest row's location as a location-level drop target.
  if (!best) {
    let nearestDistance = Infinity;
    let nearestLocationId: number | null = null;
    let nearestElement: HTMLElement | null = null;
    for (const el of allTargets) {
      const rect = el.getBoundingClientRect();
      if (x < rect.left || x > rect.right) {
        continue;
      }
      const distance = y < rect.top ? rect.top - y : (y > rect.bottom ? y - rect.bottom : 0);
      const locationId = parseLocationId(el.dataset.locationId);
      if (locationId !== null && distance < nearestDistance) {
        nearestDistance = distance;
        nearestLocationId = locationId;
        nearestElement = el;
      }
    }

    if (nearestLocationId !== null && nearestElement && nearestDistance < 64) {
      best = {
        destination: { locationId: nearestLocationId, targetType: "location" },
        element: nearestElement,
        priority: 1,
        area: Infinity,
      };
    }
  }

  return best ? { destination: best.destination, element: best.element } : null;
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

function resolveDestinationFromDropTargets(dropTargets: unknown): DestinationData | null {
  if (!Array.isArray(dropTargets)) {
    return null;
  }

  let best: DestinationData | null = null;
  for (const target of dropTargets) {
    const data = (target as { data?: unknown }).data;
    if (!isDestinationData(data)) {
      continue;
    }

    if (!best || destinationPriority(data) > destinationPriority(best)) {
      best = data;
    }
  }

  return best;
}

function canDropIntoLocationTarget(sourceData: DocumentDragData | FolderDragData, locationId: number): boolean {
  if (sourceData.type === "folder") {
    return sourceData.locationId === locationId && getParentDirectoryPath(sourceData.relPath) !== "";
  }

  return sourceData.type === "document";
}

function canDropIntoDocumentTarget(
  sourceData: DocumentDragData | FolderDragData,
  destination: DestinationData,
): boolean {
  if (sourceData.type !== "document" || destination.targetType !== "document" || !destination.relPath) {
    return false;
  }

  return sourceData.locationId === destination.locationId && sourceData.relPath !== destination.relPath;
}

function canDropIntoDestination(sourceData: DocumentDragData | FolderDragData, destination: DestinationData): boolean {
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

/**
 * When the initial destination is an invalid folder target (e.g. the source's own parent),
 * walk up the folder tree to find the nearest valid ancestor. This compensates for
 * pointer imprecision in Tauri WKWebView drag events — the user aims for a parent
 * folder but the cursor lands on the child row instead.
 */
function walkUpToValidDestination(
  sourceData: DocumentDragData | FolderDragData,
  destination: DestinationData,
): DestinationData | null {
  if (canDropIntoDestination(sourceData, destination)) {
    return destination;
  }

  // Only walk up for folder targets
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
      // Reached the root — try location-level drop
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

function summarizePointerInput(input: unknown): PointerInfo & { rawX?: number; rawY?: number; dpr?: number } {
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

function pointerFromInput(input: unknown): { x: number; y: number } | null {
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

function reorderDocumentsInLocation(
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

export type SidebarProps = { onNewDocument?: (locationId?: number) => void };

type SidebarActionsProps = {
  onAddLocation: () => void;
  onAddDocument: () => void;
  onRefresh: () => void;
  isAddDocumentDisabled: boolean;
  isRefreshDisabled: boolean;
  onToggleCollapse: () => void;
};

const HideSidebarButton = ({ onToggleCollapse }: { onToggleCollapse: () => void }) => (
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={onToggleCollapse}
    className="flex items-center gap-1.5"
    title="Hide sidebar (Ctrl+B)">
    <CollapseIcon size="sm" />
    Hide
  </Button>
);

const SidebarActions = (
  { onAddLocation, onAddDocument, onRefresh, isAddDocumentDisabled, isRefreshDisabled, onToggleCollapse }:
    SidebarActionsProps,
) => (
  <div className="flex items-center gap-2">
    <AddButton onClick={onAddLocation} icon={FolderAddIcon} title="New Location" />
    <AddButton onClick={onAddDocument} icon={FileAddIcon} title="New Document" disabled={isAddDocumentDisabled} />
    <AddButton onClick={onRefresh} icon={RefreshIcon} title="Refresh Sidebar" disabled={isRefreshDisabled} />
    <HideSidebarButton onToggleCollapse={onToggleCollapse} />
  </div>
);

export function Sidebar({ onNewDocument }: SidebarProps) {
  const {
    handleAddLocation,
    handleRemoveLocation,
    handleSelectDocument,
    handleCreateNewDocument,
    handleRefreshSidebar,
    handleRenameDocument,
    handleMoveDocument,
    handleMoveDirectory,
    handleDeleteDocument,
  } = useWorkspaceController();
  const {
    locations,
    selectedLocationId,
    selectedDocPath,
    documents,
    directories,
    isLoading,
    refreshingLocationId,
    sidebarRefreshReason,
    filterText,
    setFilterText,
    setDocuments,
    selectLocation,
    toggleSidebarCollapsed,
    filenameVisibility,
    externalDropTargetId,
    setExternalDropTarget,
  } = useSidebarState();
  const [expandedLocations, setExpandedLocations] = useState<Set<number>>(() => new Set(locations.map((l) => l.id)));
  const [showLocationMenu, setShowLocationMenu] = useState<number | null>(null);
  const [moveDropDialog, setMoveDropDialog] = useState<MoveDropDialogState | null>(null);
  const [moveDropPath, setMoveDropPath] = useState("");
  const [isMovingDrop, setIsMovingDrop] = useState(false);
  const [activeInternalDropTarget, setActiveInternalDropTarget] = useState<DestinationData | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const nativeDragPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    nativeDragPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleDragLeave = useCallback(() => {
    nativeDragPosRef.current = null;
  }, []);

  useExternalDropHandler(selectedLocationId, documents, setExternalDropTarget, handleRefreshSidebar);

  useEffect(() => {
    if (showLocationMenu === null) {
      return;
    }

    const handleOutsideMenuClick = (event: PointerEvent) => {
      if (!(event.target instanceof HTMLElement)) {
        setShowLocationMenu(null);
        return;
      }

      if (event.target.closest("[data-location-menu-root]")) {
        return;
      }

      setShowLocationMenu(null);
    };

    document.addEventListener("pointerdown", handleOutsideMenuClick);
    return () => document.removeEventListener("pointerdown", handleOutsideMenuClick);
  }, [showLocationMenu]);

  useEffect(() => {
    const dropZoneElement = dropZoneRef.current;
    if (!dropZoneElement) {
      return;
    }

    return dropTargetForElements({
      element: dropZoneElement,
      canDrop: ({ source }) => isSidebarDragData(source.data),
      getData: ({ input }) => {
        const pos = nativeDragPosRef.current ?? pointerFromInput(input);
        const resolved = pos ? resolveDestinationFromPointer(pos.x, pos.y) : null;
        if (!resolved) {
          return { targetType: "none" as const };
        }

        if (resolved.destination.targetType === "document" && resolved.element) {
          return attachClosestEdge(resolved.destination, {
            input,
            element: resolved.element,
            allowedEdges: ["top", "bottom"],
          });
        }

        return resolved.destination;
      },
    });
  }, []);

  useEffect(() => {
    const getLocationName = (locationId: number): string =>
      locations.find((location) => location.id === locationId)?.name ?? "location";

    const stop = monitorForElements({
      canMonitor: ({ source }) => isSidebarDragData(source.data),
      onDragStart: ({ source }) => {
        if (!isSidebarDragData(source.data)) {
          return;
        }
        announce(`Picked up ${source.data.title}`);
      },
      onDropTargetChange: ({ source, location }) => {
        if (!isSidebarDragData(source.data)) {
          setActiveInternalDropTarget(null);
          return;
        }

        const pos = nativeDragPosRef.current ?? pointerFromInput(location.current.input);
        const pointerDestination = pos ? resolveDestinationFromPointer(pos.x, pos.y)?.destination ?? null : null;
        const dropTargetDestination = resolveDestinationFromDropTargets(location.current.dropTargets);
        const rawDestination = pointerDestination && pointerDestination.targetType !== "location"
          ? pointerDestination
          : (dropTargetDestination ?? pointerDestination);
        const destinationData = rawDestination ? walkUpToValidDestination(source.data, rawDestination) : null;

        if (!destinationData) {
          setActiveInternalDropTarget(null);
          return;
        }

        setActiveInternalDropTarget(destinationData);

        if (destinationData.folderPath) {
          announce(`Over ${destinationData.folderPath} in ${getLocationName(destinationData.locationId)}`);
          return;
        }

        if (destinationData.targetType === "document" && destinationData.relPath) {
          announce(`Over ${getFilename(destinationData.relPath)}`);
          return;
        }

        announce(`Over ${getLocationName(destinationData.locationId)}`);
      },
      onDrop: ({ source, location }) => {
        setActiveInternalDropTarget(null);

        if (!isSidebarDragData(source.data)) {
          return;
        }

        const pos = nativeDragPosRef.current ?? pointerFromInput(location.current.input);
        const pointerDestination = pos ? resolveDestinationFromPointer(pos.x, pos.y)?.destination ?? null : null;
        const dropTargetDestination = resolveDestinationFromDropTargets(location.current.dropTargets);
        const rawDestination = pointerDestination && pointerDestination.targetType !== "location"
          ? pointerDestination
          : (dropTargetDestination ?? pointerDestination);
        const destinationData = rawDestination ? walkUpToValidDestination(source.data, rawDestination) : null;
        logger.warn(
          f("Sidebar DnD drop trace", {
            source: source.data,
            pointer: summarizePointerInput(location.current.input),
            rawDestination,
            resolvedDestination: destinationData,
          }),
        );
        if (!destinationData) {
          announce(`Dropped ${source.data.title}`);
          showWarnToast(
            source.data.type === "folder"
              ? "Drop target is not valid for moving this folder"
              : "Drop target is not valid for moving this file",
          );
          return;
        }

        const sourceData = source.data;
        const sourceFilename = getFilename(sourceData.relPath);
        const sourceParentPath = getParentDirectoryPath(sourceData.relPath);
        const modifierDrop = location.current.input.altKey;
        const resolvedTargetLocationId = destinationData.locationId;
        const destinationParentPath = destinationData.folderPath
          ?? (destinationData.targetType === "document" && destinationData.relPath
            ? getParentDirectoryPath(destinationData.relPath)
            : "");

        if (sourceData.type === "folder") {
          if (resolvedTargetLocationId !== sourceData.locationId) {
            announce("Could not move folder across locations");
            showWarnToast("Moving folders across locations is not supported yet");
            return;
          }

          const newRelPath = destinationData.folderPath
            ? `${destinationData.folderPath}/${sourceFilename}`
            : sourceFilename;

          if (modifierDrop) {
            setMoveDropDialog({
              sourceType: "folder",
              sourceLocationId: sourceData.locationId,
              sourceRelPath: sourceData.relPath,
              sourceTitle: sourceData.title,
              targetLocationId: resolvedTargetLocationId,
            });
            setMoveDropPath(newRelPath);
            announce(`Choose destination path for ${sourceData.title}`);
            return;
          }

          if (newRelPath === sourceData.relPath) {
            showWarnToast("Drop target is not valid for moving this folder");
            return;
          }

          void Promise.resolve(handleMoveDirectory(sourceData.locationId, sourceData.relPath, newRelPath)).then(
            (moved) => {
              if (!moved) {
                announce(`Could not move ${sourceData.title}`);
                showErrorToast(`Could not move ${sourceData.title}`);
                return;
              }

              handleRefreshSidebar(sourceData.locationId);
              announce(`Moved ${sourceData.title}`);
              showSuccessToast(`Moved ${sourceData.title}`);
            },
          ).catch((error: unknown) => {
            logger.error(f("Failed to move folder", { source: sourceData, dest: destinationData, error }));
            showErrorToast(`Could not move ${sourceData.title}`);
          });
          return;
        }

        const destinationEdge = extractClosestEdge(destinationData);

        if (modifierDrop && resolvedTargetLocationId) {
          const nextPathFromDestination = destinationParentPath
            ? `${destinationParentPath}/${sourceFilename}`
            : sourceFilename;
          const keepsSameParent = resolvedTargetLocationId === sourceData.locationId
            && sourceParentPath === destinationParentPath;
          const initialPath = keepsSameParent ? sourceData.relPath : nextPathFromDestination;

          setMoveDropDialog({
            sourceType: "document",
            sourceLocationId: sourceData.locationId,
            sourceRelPath: sourceData.relPath,
            sourceTitle: sourceData.title,
            targetLocationId: resolvedTargetLocationId,
          });
          setMoveDropPath(initialPath);
          announce(`Choose destination path for ${sourceData.title}`);
          return;
        }

        const refreshDocumentLists = () => {
          handleRefreshSidebar(sourceData.locationId);
          if (resolvedTargetLocationId && resolvedTargetLocationId !== sourceData.locationId) {
            handleRefreshSidebar(resolvedTargetLocationId);
          }
        };

        if (destinationData.folderPath) {
          const newRelPath = `${destinationData.folderPath}/${sourceFilename}`;
          void Promise.resolve(
            handleMoveDocument(sourceData.locationId, sourceData.relPath, newRelPath, resolvedTargetLocationId),
          ).then((moved) => {
            if (!moved) {
              announce(`Could not move ${sourceData.title}`);
              showErrorToast(`Could not move ${sourceData.title}`);
              return;
            }

            refreshDocumentLists();
            announce(`Moved ${sourceData.title} to ${getLocationName(resolvedTargetLocationId)}`);
            showSuccessToast(`Moved ${sourceData.title} to ${getLocationName(resolvedTargetLocationId)}`);
          }).catch((error: unknown) => {
            logger.error(
              f("Failed to move document into folder", { source: sourceData, dest: destinationData, error }),
            );
            showErrorToast(`Could not move ${sourceData.title}`);
          });
          return;
        }

        if (destinationData.targetType === "document" && destinationData.relPath) {
          const newRelPath = destinationParentPath ? `${destinationParentPath}/${sourceFilename}` : sourceFilename;
          const changedParentFolder = sourceParentPath !== destinationParentPath;

          if (changedParentFolder) {
            void Promise.resolve(
              handleMoveDocument(sourceData.locationId, sourceData.relPath, newRelPath, resolvedTargetLocationId),
            ).then((moved) => {
              if (!moved) {
                announce(`Could not move ${sourceData.title}`);
                showErrorToast(`Could not move ${sourceData.title}`);
                return;
              }

              refreshDocumentLists();
              announce(`Moved ${sourceData.title} to ${destinationParentPath || "location root"}`);
              showSuccessToast(`Moved ${sourceData.title}`);
            }).catch((error: unknown) => {
              logger.error(
                f("Failed to move document alongside destination neighbor", {
                  source: sourceData,
                  dest: destinationData,
                  error,
                }),
              );
              showErrorToast(`Could not move ${sourceData.title}`);
            });
            return;
          }
        }

        if (resolvedTargetLocationId !== sourceData.locationId) {
          const crossLocationPath = destinationParentPath
            ? `${destinationParentPath}/${sourceFilename}`
            : sourceFilename;
          void Promise.resolve(
            handleMoveDocument(sourceData.locationId, sourceData.relPath, crossLocationPath, resolvedTargetLocationId),
          ).then((moved) => {
            if (!moved) {
              announce(`Could not move ${sourceData.title}`);
              showErrorToast(`Could not move ${sourceData.title}`);
              return;
            }

            refreshDocumentLists();
            announce(`Moved ${sourceData.title} to ${getLocationName(resolvedTargetLocationId)}`);
            showSuccessToast(`Moved ${sourceData.title} to ${getLocationName(resolvedTargetLocationId)}`);
          }).catch((error: unknown) => {
            logger.error(f("Failed to move document", { source: sourceData, dest: destinationData, error }));
            showErrorToast(`Could not move ${sourceData.title}`);
          });
          return;
        }

        if (destinationData.targetType === "location" && sourceParentPath !== "") {
          void Promise.resolve(
            handleMoveDocument(sourceData.locationId, sourceData.relPath, sourceFilename, resolvedTargetLocationId),
          ).then((moved) => {
            if (!moved) {
              announce(`Could not move ${sourceData.title}`);
              showErrorToast(`Could not move ${sourceData.title}`);
              return;
            }

            refreshDocumentLists();
            announce(`Moved ${sourceData.title} to location root`);
            showSuccessToast(`Moved ${sourceData.title}`);
          }).catch((error: unknown) => {
            logger.error(
              f("Failed to move document to location root", { source: sourceData, dest: destinationData, error }),
            );
            showErrorToast(`Could not move ${sourceData.title}`);
          });
          return;
        }

        if (
          destinationData.targetType === "document"
          && destinationData.relPath
          && (destinationEdge === "top" || destinationEdge === "bottom")
        ) {
          setDocuments(
            reorderDocumentsInLocation(
              documents,
              sourceData.locationId,
              sourceData.relPath,
              destinationData.relPath,
              destinationEdge,
            ),
          );
          announce(
            `Moved ${sourceData.title} ${destinationEdge === "top" ? "before" : "after"} ${
              getFilename(destinationData.relPath)
            }`,
          );
          return;
        }

        announce(`Could not move ${sourceData.title} from that drop target`);
        showWarnToast("Drop target is not valid for moving this file");
      },
    });

    return () => {
      setActiveInternalDropTarget(null);
      stop();
      cleanupLiveRegion();
    };
  }, [documents, handleMoveDirectory, handleMoveDocument, handleRefreshSidebar, locations, setDocuments]);

  const locationDocuments = useMemo(
    () => (selectedLocationId ? documents.filter((doc) => doc.location_id === selectedLocationId) : []),
    [documents, selectedLocationId],
  );
  const locationDirectories = useMemo(() => (selectedLocationId ? directories : []), [directories, selectedLocationId]);

  const toggleLocation = useCallback((locationId: number) => {
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  }, []);

  const filteredDocuments = useMemo(
    () =>
      filterText
        ? locationDocuments.filter((doc) =>
          doc.title.toLowerCase().includes(filterText.toLowerCase())
          || doc.rel_path.toLowerCase().includes(filterText.toLowerCase())
        )
        : locationDocuments,
    [locationDocuments, filterText],
  );
  const filteredDirectories = useMemo(
    () =>
      filterText
        ? locationDirectories.filter((directoryPath) => directoryPath.toLowerCase().includes(filterText.toLowerCase()))
        : locationDirectories,
    [locationDirectories, filterText],
  );

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setFilterText(e.currentTarget.value);
  }, [setFilterText]);
  const handleAddDocument = useCallback(() => {
    if (!selectedLocationId) {
      return;
    }

    const createNewDocument = onNewDocument ?? handleCreateNewDocument;
    createNewDocument(selectedLocationId);
  }, [handleCreateNewDocument, onNewDocument, selectedLocationId]);

  const handleRefresh = useCallback(() => {
    handleRefreshSidebar(selectedLocationId);
  }, [handleRefreshSidebar, selectedLocationId]);

  const closeMoveDropDialog = useCallback(() => {
    if (isMovingDrop) {
      return;
    }
    setMoveDropDialog(null);
    setMoveDropPath("");
  }, [isMovingDrop]);

  const handleMoveDropPathChange: ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
    setMoveDropPath(event.currentTarget.value);
  }, []);

  const handleMoveDropSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!moveDropDialog) {
      return;
    }

    const nextPath = moveDropPath.trim();
    if (!nextPath) {
      return;
    }

    setIsMovingDrop(true);
    try {
      const moved = moveDropDialog.sourceType === "folder"
        ? await handleMoveDirectory(moveDropDialog.sourceLocationId, moveDropDialog.sourceRelPath, nextPath)
        : await handleMoveDocument(
          moveDropDialog.sourceLocationId,
          moveDropDialog.sourceRelPath,
          nextPath,
          moveDropDialog.targetLocationId,
        );

      if (!moved) {
        announce(`Could not move ${moveDropDialog.sourceTitle}`);
        showErrorToast(`Could not move ${moveDropDialog.sourceTitle}`);
        return;
      }

      handleRefreshSidebar(moveDropDialog.sourceLocationId);
      if (
        moveDropDialog.sourceType === "document" && moveDropDialog.targetLocationId !== moveDropDialog.sourceLocationId
      ) {
        handleRefreshSidebar(moveDropDialog.targetLocationId);
      }
      announce(`Moved ${moveDropDialog.sourceTitle}`);
      showSuccessToast(`Moved ${moveDropDialog.sourceTitle}`);
      setMoveDropDialog(null);
      setMoveDropPath("");
    } catch (error: unknown) {
      logger.error(f("Failed to move dropped document from dialog", { moveDropDialog, error }));
      showErrorToast(`Could not move ${moveDropDialog.sourceTitle}`);
    } finally {
      setIsMovingDrop(false);
    }
  }, [handleMoveDirectory, handleMoveDocument, handleRefreshSidebar, moveDropDialog, moveDropPath]);
  const moveDropPathTrimmed = moveDropPath.trim();
  const isMoveDropUnchanged = moveDropDialog
    ? moveDropDialog.sourceLocationId === moveDropDialog.targetLocationId
      && moveDropDialog.sourceRelPath === moveDropPathTrimmed
    : false;
  const moveDropEntityLabel = moveDropDialog?.sourceType === "folder" ? "folder" : "document";
  const moveDropFormId = "sidebar-drop-move-form";

  return (
    <aside className="w-full bg-layer-01 border-r border-border-subtle flex h-full flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <Title isLoading={isLoading} />
        <SidebarActions
          onAddLocation={handleAddLocation}
          onAddDocument={handleAddDocument}
          onRefresh={handleRefresh}
          isAddDocumentDisabled={!selectedLocationId}
          isRefreshDisabled={!selectedLocationId || refreshingLocationId === selectedLocationId}
          onToggleCollapse={toggleSidebarCollapsed} />
      </div>
      <SearchInput filterText={filterText} handleInputChange={handleInputChange} />
      <div
        ref={dropZoneRef}
        className="flex-1 overflow-y-auto pt-2 pb-2"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}>
        {locations.length === 0 ? <EmptyLocations onAddLocation={handleAddLocation} /> : locations.map((location) => {
          const isSelectedLocation = selectedLocationId === location.id;
          const isRefreshingLocation = refreshingLocationId === location.id;
          const locationDocs = isSelectedLocation ? filteredDocuments : EMPTY_DOCUMENTS;
          const locationDirs = isSelectedLocation ? filteredDirectories : EMPTY_DIRECTORIES;
          const isActiveDropLocation = activeInternalDropTarget?.locationId === location.id;
          const activeDropDocumentPath = isActiveDropLocation && activeInternalDropTarget?.targetType === "document"
            ? activeInternalDropTarget.relPath
            : undefined;
          const activeDropDocumentEdge = isActiveDropLocation && activeInternalDropTarget?.targetType === "document"
            ? extractClosestEdge(activeInternalDropTarget)
            : null;

          return (
            <SidebarLocationItem
              key={location.id}
              location={location}
              isSelected={isSelectedLocation}
              selectedDocPath={selectedDocPath}
              isExpanded={expandedLocations.has(location.id)}
              onSelect={selectLocation}
              onToggle={toggleLocation}
              onRemove={handleRemoveLocation}
              onRefresh={handleRefreshSidebar}
              onSelectDocument={handleSelectDocument}
              onRenameDocument={handleRenameDocument}
              onMoveDocument={handleMoveDocument}
              onDeleteDocument={handleDeleteDocument}
              setShowLocationMenu={setShowLocationMenu}
              isMenuOpen={showLocationMenu === location.id}
              documents={locationDocs}
              directories={locationDirs}
              isRefreshing={isRefreshingLocation}
              refreshReason={sidebarRefreshReason}
              filterText={filterText}
              filenameVisibility={filenameVisibility}
              isExternalDropTarget={externalDropTargetId === location.id}
              isInternalDropTarget={isActiveDropLocation && activeInternalDropTarget.targetType === "location"}
              activeDropFolderPath={isActiveDropLocation ? activeInternalDropTarget.folderPath : undefined}
              activeDropDocumentPath={activeDropDocumentPath}
              activeDropDocumentEdge={activeDropDocumentEdge} />
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-border-subtle text-xs text-text-placeholder flex items-center justify-between">
        <span>{locations.length} location{locations.length === 1 ? "" : "s"}</span>
        <span>
          {selectedLocationId ? `${locationDocuments.length} document${locationDocuments.length === 1 ? "" : "s"}` : ""}
        </span>
      </div>
      <OperationDialog
        isOpen={moveDropDialog !== null}
        onClose={closeMoveDropDialog}
        ariaLabel={`Move ${moveDropEntityLabel}`}
        title={`Move ${moveDropEntityLabel === "folder" ? "Folder" : "Document"}`}
        description={`Update the destination path for this ${moveDropEntityLabel}. Use slashes to create nested folders automatically.`}
        confirmLabel="Move"
        pendingLabel="Moving..."
        confirmButtonType="submit"
        confirmFormId={moveDropFormId}
        confirmDisabled={!moveDropPathTrimmed || isMoveDropUnchanged}
        isPending={isMovingDrop}
        widthClassName="w-[min(94vw,460px)]">
        <form id={moveDropFormId} onSubmit={handleMoveDropSubmit} className="space-y-2">
          <label
            htmlFor="sidebar-drop-move-input"
            className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Destination path
          </label>
          <input
            id="sidebar-drop-move-input"
            type="text"
            value={moveDropPath}
            onChange={handleMoveDropPathChange}
            className="w-full rounded-md border border-border-subtle bg-layer-02 px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
            autoFocus
            disabled={isMovingDrop} />
        </form>
      </OperationDialog>
    </aside>
  );
}
