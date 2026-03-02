import type {
  SidebarDropEdge,
  SidebarRefreshReason,
  WorkspaceDocumentsActions,
  WorkspaceDocumentsState,
  WorkspaceLocationsActions,
  WorkspaceLocationsState,
  WorkspaceState,
} from "$state/types";
import { create } from "zustand";

export type WorkspaceStore =
  & WorkspaceLocationsState
  & WorkspaceLocationsActions
  & WorkspaceDocumentsState
  & WorkspaceDocumentsActions;

export const getInitialWorkspaceLocationsState = (): WorkspaceLocationsState => ({
  locations: [],
  isLoadingLocations: true,
  selectedLocationId: undefined,
  sidebarFilter: "",
});

export const getInitialWorkspaceDocumentsState = (): WorkspaceDocumentsState => ({
  selectedDocPath: undefined,
  documents: [],
  directories: [],
  isLoadingDocuments: false,
  refreshingLocationId: undefined,
  sidebarRefreshReason: null,
  externalDropTargetId: undefined,
  externalDropFolderPath: undefined,
  activeDropTarget: null,
  folderSortOrderByLocation: {},
  moveDialog: null,
});

export const getInitialWorkspaceState = (): WorkspaceState => ({
  ...getInitialWorkspaceLocationsState(),
  ...getInitialWorkspaceDocumentsState(),
});

function parentOfPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
}

export const useWorkspaceStore = create<WorkspaceStore>()((set) => ({
  ...getInitialWorkspaceState(),

  setSidebarFilter: (value) => set({ sidebarFilter: value }),
  setLocations: (locations) => {
    set((state) => ({ locations, selectedLocationId: state.selectedLocationId ?? locations[0]?.id }));
  },
  setLoadingLocations: (value) => set({ isLoadingLocations: value }),
  setSelectedLocation: (locationId) => set({ selectedLocationId: locationId, selectedDocPath: undefined }),

  setSelectedDocPath: (path) => set({ selectedDocPath: path }),
  setDocuments: (documents) => set({ documents }),
  setDirectories: (directories) => set({ directories }),
  setLoadingDocuments: (value) => set({ isLoadingDocuments: value }),
  setSidebarRefreshState: (locationId, reason: SidebarRefreshReason | null = null) =>
    set({ refreshingLocationId: locationId, sidebarRefreshReason: locationId === undefined ? null : reason }),
  setExternalDropTarget: (locationId, folderPath) =>
    set((state) => {
      if (locationId === undefined) {
        return {
          externalDropTargetId: undefined,
          externalDropFolderPath: undefined,
          ...(state.activeDropTarget?.source === "external" ? { activeDropTarget: null } : {}),
        };
      }

      return {
        externalDropTargetId: locationId,
        externalDropFolderPath: folderPath,
        activeDropTarget: {
          source: "external",
          locationId,
          targetType: folderPath ? "folder" : "location",
          ...(folderPath ? { folderPath } : {}),
          intent: "into" as const,
        },
      };
    }),
  setActiveDropTarget: (target) =>
    set({
      activeDropTarget: target,
      externalDropTargetId: target?.source === "external" ? target.locationId : undefined,
      externalDropFolderPath: target?.source === "external" ? target.folderPath : undefined,
    }),
  reorderFolderSortOrder: (locationId, sourcePath, destinationPath, edge: SidebarDropEdge) =>
    set((state) => {
      if (sourcePath === destinationPath) {
        return state;
      }

      if (parentOfPath(sourcePath) !== parentOfPath(destinationPath)) {
        return state;
      }

      const currentOrder = [...(state.folderSortOrderByLocation[locationId] ?? [])];
      if (!currentOrder.includes(sourcePath)) {
        currentOrder.push(sourcePath);
      }
      if (!currentOrder.includes(destinationPath)) {
        currentOrder.push(destinationPath);
      }

      const sourceIndex = currentOrder.indexOf(sourcePath);
      const destinationIndex = currentOrder.indexOf(destinationPath);
      if (sourceIndex === -1 || destinationIndex === -1) {
        return state;
      }

      currentOrder.splice(sourceIndex, 1);
      const insertionBase = currentOrder.indexOf(destinationPath);
      const insertionIndex = edge === "top" ? insertionBase : insertionBase + 1;
      currentOrder.splice(insertionIndex, 0, sourcePath);

      return { folderSortOrderByLocation: { ...state.folderSortOrderByLocation, [locationId]: currentOrder } };
    }),
  openMoveDialog: (locationId, relPath) => set({ moveDialog: { locationId, relPath } }),
  closeMoveDialog: () => set({ moveDialog: null }),
}));

export function resetWorkspaceStore(): void {
  useWorkspaceStore.setState(getInitialWorkspaceState());
}
