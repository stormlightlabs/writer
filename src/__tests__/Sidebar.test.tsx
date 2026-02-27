import { Sidebar } from "$components/Sidebar";
import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import { useSidebarState } from "$state/selectors";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$state/selectors", () => ({ useSidebarState: vi.fn() }));
vi.mock("$hooks/controllers/useWorkspaceController", () => ({ useWorkspaceController: vi.fn() }));

const createSidebarState = (overrides: Partial<ReturnType<typeof useSidebarState>> = {}) => ({
  locations: [{ id: 1, name: "Notes", root_path: "/tmp/notes", added_at: "2026-01-01T00:00:00Z" }],
  selectedLocationId: 1,
  selectedDocPath: undefined,
  documents: [],
  isLoading: false,
  refreshingLocationId: undefined,
  sidebarRefreshReason: null,
  filterText: "",
  setFilterText: vi.fn(),
  selectLocation: vi.fn(),
  toggleSidebarCollapsed: vi.fn(),
  showFilenamesInsteadOfTitles: false,
  ...overrides,
});

const createWorkspaceControllerState = (
  overrides: Partial<ReturnType<typeof useWorkspaceController>> = {},
): ReturnType<typeof useWorkspaceController> => ({
  locations: [],
  documents: [],
  selectedLocationId: undefined,
  selectedDocPath: undefined,
  locationDocuments: [],
  sidebarFilter: "",
  isSidebarLoading: false,
  refreshingLocationId: undefined,
  sidebarRefreshReason: null,
  tabs: [],
  activeTabId: null,
  activeTab: null,
  setSidebarFilter: vi.fn(),
  markActiveTabModified: vi.fn(),
  handleAddLocation: vi.fn(),
  handleRemoveLocation: vi.fn(),
  handleSelectLocation: vi.fn(),
  handleSelectDocument: vi.fn(),
  handleSelectTab: vi.fn(),
  handleCloseTab: vi.fn(),
  handleReorderTabs: vi.fn(),
  handleCreateDraftTab: vi.fn(),
  handleCreateNewDocument: vi.fn(),
  handleRefreshSidebar: vi.fn(),
  handleRenameDocument: vi.fn(),
  handleMoveDocument: vi.fn(),
  handleDeleteDocument: vi.fn(),
  ...overrides,
});

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkspaceController).mockReturnValue(createWorkspaceControllerState());
  });

  it("shows a single new document action and creates a doc for the selected location", () => {
    vi.mocked(useSidebarState).mockReturnValue(createSidebarState());
    const handleCreateNewDocument = vi.fn();

    render(<Sidebar onNewDocument={handleCreateNewDocument} />);

    const newDocumentButtons = screen.getAllByTitle("New Document");
    expect(newDocumentButtons).toHaveLength(1);

    fireEvent.click(newDocumentButtons[0]);
    expect(handleCreateNewDocument).toHaveBeenCalledWith(1);
  });

  it("disables the new document action when no location is selected", () => {
    vi.mocked(useSidebarState).mockReturnValue(createSidebarState({ selectedLocationId: undefined }));
    const handleCreateNewDocument = vi.fn();

    render(<Sidebar onNewDocument={handleCreateNewDocument} />);

    const newDocumentButton = screen.getByTitle("New Document");
    expect(newDocumentButton).toBeDisabled();

    fireEvent.click(newDocumentButton);
    expect(handleCreateNewDocument).not.toHaveBeenCalled();
  });

  it("refreshes sidebar documents for selected location", () => {
    vi.mocked(useSidebarState).mockReturnValue(createSidebarState());
    const handleRefreshSidebar = vi.fn();
    vi.mocked(useWorkspaceController).mockReturnValue(createWorkspaceControllerState({ handleRefreshSidebar }));

    render(<Sidebar />);

    fireEvent.click(screen.getByTitle("Refresh Sidebar"));
    expect(handleRefreshSidebar).toHaveBeenCalledWith(1);
  });

  it("shows refresh feedback for the selected location and disables refresh action", () => {
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({ refreshingLocationId: 1, sidebarRefreshReason: "save" }),
    );

    render(<Sidebar />);

    expect(screen.getByText("Updating after save...")).toBeInTheDocument();
    expect(screen.getByTitle("Refresh Sidebar")).toBeDisabled();
  });
});
