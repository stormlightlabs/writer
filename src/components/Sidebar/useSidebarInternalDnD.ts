import {
  announce,
  attachClosestEdge,
  cleanup as cleanupLiveRegion,
  type DestinationData,
  dropTargetForElements,
  extractClosestEdge,
  monitorForElements,
  resolveDestinationFromPointer,
} from "$dnd";
import {
  getFilename,
  getParentDirectoryPath,
  isSidebarDragData,
  pointerFromInput,
  reorderDocumentsInLocation,
  resolveDestinationFromDropTargets,
  summarizePointerInput,
  walkUpToValidDestination,
} from "$dnd/sidebar";
import { showErrorToast, showSuccessToast, showWarnToast } from "$state/stores/toasts";
import type { DocMeta, LocationDescriptor } from "$types";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import type { ChangeEventHandler, DragEvent, FormEvent, ReactNode, RefObject } from "react";
import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { DnDMoveDialog } from "./DnDMoveDialog";

type MoveDropDialogState = {
  sourceType: "document" | "folder";
  sourceLocationId: number;
  sourceRelPath: string;
  sourceTitle: string;
  targetLocationId: number;
};

type UseSidebarInternalDnDArgs = {
  locations: LocationDescriptor[];
  documents: DocMeta[];
  setDocuments: (documents: DocMeta[]) => void;
  handleMoveDocument: (
    locationId: number,
    relPath: string,
    newRelPath: string,
    targetLocationId?: number,
  ) => Promise<boolean>;
  handleMoveDirectory: (locationId: number, relPath: string, newRelPath: string) => Promise<boolean>;
  handleRefreshSidebar: (locationId?: number) => void;
};

type SidebarInternalDnDResult = {
  dropZoneRef: RefObject<HTMLDivElement | null>;
  handleDragOver: (event: DragEvent) => void;
  handleDragLeave: () => void;
  activeInternalDropTarget: DestinationData | null;
  moveDialog: ReactNode;
};

export function useSidebarInternalDnD(
  { locations, documents, setDocuments, handleMoveDocument, handleMoveDirectory, handleRefreshSidebar }:
    UseSidebarInternalDnDArgs,
): SidebarInternalDnDResult {
  const [moveDropDialog, setMoveDropDialog] = useState<MoveDropDialogState | null>(null);
  const [moveDropPath, setMoveDropPath] = useState("");
  const [isMovingDrop, setIsMovingDrop] = useState(false);
  const [activeInternalDropTarget, setActiveInternalDropTarget] = useState<DestinationData | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const nativeDragPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleDragOver = useCallback((event: DragEvent) => {
    nativeDragPosRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleDragLeave = useCallback(() => {
    nativeDragPosRef.current = null;
  }, []);

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

        if (modifierDrop) {
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
          if (resolvedTargetLocationId !== sourceData.locationId) {
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

  const moveDialog = createElement(DnDMoveDialog, {
    isOpen: moveDropDialog !== null,
    onClose: closeMoveDropDialog,
    entityLabel: moveDropDialog?.sourceType === "folder" ? "folder" : "document",
    formId: "sidebar-drop-move-form",
    path: moveDropPath,
    onPathChange: handleMoveDropPathChange,
    onSubmit: handleMoveDropSubmit,
    isPending: isMovingDrop,
    confirmDisabled: !moveDropPathTrimmed || isMoveDropUnchanged,
  });

  return { dropZoneRef, handleDragOver, handleDragLeave, activeInternalDropTarget, moveDialog };
}
