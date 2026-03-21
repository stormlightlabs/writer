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
  documentsByLocation: {},
  directoriesByLocation: {},
  expandedLocationIds: [],
  expandedDirectoriesByLocation: {},
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
    set((state) => {
      const validLocationIds = new Set(locations.map((location) => location.id));
      const selectedLocationId = state.selectedLocationId && validLocationIds.has(state.selectedLocationId)
        ? state.selectedLocationId
        : locations[0]?.id;

      const documentsByLocation = Object.fromEntries(
        Object.entries(state.documentsByLocation).filter(([locationId]) => validLocationIds.has(Number(locationId))),
      );
      const directoriesByLocation = Object.fromEntries(
        Object.entries(state.directoriesByLocation).filter(([locationId]) => validLocationIds.has(Number(locationId))),
      );
      const expandedDirectoriesByLocation = Object.fromEntries(
        Object.entries(state.expandedDirectoriesByLocation).filter(([locationId]) =>
          validLocationIds.has(Number(locationId))
        ),
      );

      return {
        locations,
        selectedLocationId,
        documents: selectedLocationId ? documentsByLocation[selectedLocationId] ?? [] : [],
        directories: selectedLocationId ? directoriesByLocation[selectedLocationId] ?? [] : [],
        documentsByLocation,
        directoriesByLocation,
        expandedLocationIds: state.expandedLocationIds.filter((locationId) => validLocationIds.has(locationId)),
        expandedDirectoriesByLocation,
      };
    });
  },
  setLoadingLocations: (value) => set({ isLoadingLocations: value }),
  setSelectedLocation: (locationId) =>
    set((state) => ({
      selectedLocationId: locationId,
      selectedDocPath: undefined,
      documents: locationId ? state.documentsByLocation[locationId] ?? [] : [],
      directories: locationId ? state.directoriesByLocation[locationId] ?? [] : [],
    })),

  setSelectedDocPath: (path) => set({ selectedDocPath: path }),
  setDocuments: (documents) =>
    set((state) => {
      const selectedLocationId = state.selectedLocationId;
      if (!selectedLocationId) {
        return { documents };
      }

      return { documents, documentsByLocation: { ...state.documentsByLocation, [selectedLocationId]: documents } };
    }),
  setDirectories: (directories) =>
    set((state) => {
      const selectedLocationId = state.selectedLocationId;
      if (!selectedLocationId) {
        return { directories };
      }

      return {
        directories,
        directoriesByLocation: { ...state.directoriesByLocation, [selectedLocationId]: directories },
      };
    }),
  setDocumentsForLocation: (locationId, documents) =>
    set((state) => ({
      documentsByLocation: { ...state.documentsByLocation, [locationId]: documents },
      ...(state.selectedLocationId === locationId ? { documents } : {}),
    })),
  setDirectoriesForLocation: (locationId, directories) =>
    set((state) => ({
      directoriesByLocation: { ...state.directoriesByLocation, [locationId]: directories },
      ...(state.selectedLocationId === locationId ? { directories } : {}),
    })),
  setSidebarTreeState: (sidebarTreeState) =>
    set({
      expandedLocationIds: sidebarTreeState.expandedLocationIds,
      expandedDirectoriesByLocation: sidebarTreeState.expandedDirectoriesByLocation,
    }),
  toggleExpandedLocation: (locationId) =>
    set((state) => ({
      expandedLocationIds: state.expandedLocationIds.includes(locationId)
        ? state.expandedLocationIds.filter((currentId) => currentId !== locationId)
        : [...state.expandedLocationIds, locationId],
    })),
  toggleExpandedDirectory: (locationId, path) => set((state) => {
    const currentPaths = state.expandedDirectoriesByLocation[locationId] ?? [];
    const nextPaths = currentPaths.includes(path)
      ? currentPaths.filter((currentPath) => currentPath !== path)
      : [...currentPaths, path];

    return { expandedDirectoriesByLocation: { ...state.expandedDirectoriesByLocation, [locationId]: nextPaths } };
  }),
  expandDirectories: (locationId, paths) =>
    set((state) => {
      if (paths.length === 0) {
        return state;
      }

      const currentPaths = state.expandedDirectoriesByLocation[locationId] ?? [];
      const nextPaths = Array.from(new Set([...currentPaths, ...paths]));
      if (nextPaths.length === currentPaths.length) {
        return state;
      }

      return { expandedDirectoriesByLocation: { ...state.expandedDirectoriesByLocation, [locationId]: nextPaths } };
    }),
  collapseDirectories: (locationId, paths) =>
    set((state) => {
      if (paths.length === 0) {
        return state;
      }

      const currentPaths = state.expandedDirectoriesByLocation[locationId] ?? [];
      const collapsedPaths = new Set(paths);
      const nextPaths = currentPaths.filter((currentPath) => !collapsedPaths.has(currentPath));
      if (nextPaths.length === currentPaths.length) {
        return state;
      }

      return { expandedDirectoriesByLocation: { ...state.expandedDirectoriesByLocation, [locationId]: nextPaths } };
    }),
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
