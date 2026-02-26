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
  isLoadingDocuments: false,
  refreshingLocationId: undefined,
  sidebarRefreshReason: null,
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
  addLocation: (location) => {
    set((state) => ({
      locations: [...state.locations, location],
      selectedLocationId: location.id,
      selectedDocPath: undefined,
    }));
  },
  removeLocation: (locationId) => {
    set((state) => ({
      locations: state.locations.filter((location) => location.id !== locationId),
      selectedLocationId: state.selectedLocationId === locationId ? undefined : state.selectedLocationId,
      selectedDocPath: state.selectedLocationId === locationId ? undefined : state.selectedDocPath,
    }));
  },

  setSelectedDocPath: (path) => set({ selectedDocPath: path }),
  setDocuments: (documents) => set({ documents }),
  setLoadingDocuments: (value) => set({ isLoadingDocuments: value }),
  setSidebarRefreshState: (locationId, reason: SidebarRefreshReason | null = null) =>
    set({ refreshingLocationId: locationId, sidebarRefreshReason: locationId === undefined ? null : reason }),
}));

export function resetWorkspaceStore(): void {
  useWorkspaceStore.setState(getInitialWorkspaceState());
}
