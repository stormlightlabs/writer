import type {
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
  moveDialog: null,
});

export const getInitialWorkspaceState = (): WorkspaceState => ({
  ...getInitialWorkspaceLocationsState(),
  ...getInitialWorkspaceDocumentsState(),
});

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
  setExternalDropTarget: (locationId) => set({ externalDropTargetId: locationId }),
  openMoveDialog: (locationId, relPath) => set({ moveDialog: { locationId, relPath } }),
  closeMoveDialog: () => set({ moveDialog: null }),
}));

export function resetWorkspaceStore(): void {
  useWorkspaceStore.setState(getInitialWorkspaceState());
}
