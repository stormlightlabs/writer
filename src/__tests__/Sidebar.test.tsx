import { Sidebar } from "$components/Sidebar";
import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import { useSidebarState } from "$state/selectors";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$state/selectors", () => ({ useSidebarState: vi.fn() }));
vi.mock("$hooks/controllers/useWorkspaceController", () => ({ useWorkspaceController: vi.fn() }));
const { mockMonitorForElements, mockExtractClosestEdge, mockAnnounce } = vi.hoisted(() => ({
  mockMonitorForElements: vi.fn(),
  mockExtractClosestEdge: vi.fn<() => "top" | "bottom" | null>(() => null),
  mockAnnounce: vi.fn(),
}));

vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", async () => {
  const actual = await vi.importActual<typeof import("@atlaskit/pragmatic-drag-and-drop/element/adapter")>(
    "@atlaskit/pragmatic-drag-and-drop/element/adapter",
  );
  return { ...actual, monitorForElements: mockMonitorForElements };
});

vi.mock("@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge", async () => {
  const actual = await vi.importActual<typeof import("@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge")>(
    "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge",
  );
  return { ...actual, extractClosestEdge: mockExtractClosestEdge };
});

vi.mock("@atlaskit/pragmatic-drag-and-drop-live-region", () => ({ announce: mockAnnounce, cleanup: vi.fn() }));

const createSidebarState = (overrides: Partial<ReturnType<typeof useSidebarState>> = {}) => ({
  locations: [{ id: 1, name: "Notes", root_path: "/tmp/notes", added_at: "2026-01-01T00:00:00Z" }, {
    id: 2,
    name: "Archive",
    root_path: "/tmp/archive",
    added_at: "2026-01-01T00:00:00Z",
  }],
  selectedLocationId: 1,
  selectedDocPath: undefined,
  documents: [],
  isLoading: false,
  refreshingLocationId: undefined,
  sidebarRefreshReason: null,
  externalDropTargetId: undefined,
  filterText: "",
  setFilterText: vi.fn(),
  setDocuments: vi.fn(),
  selectLocation: vi.fn(),
  toggleSidebarCollapsed: vi.fn(),
  filenameVisibility: false,
  setExternalDropTarget: vi.fn(),
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
  isSessionHydrated: true,
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
  handleCreateDirectory: vi.fn(),
  handleImportExternalFile: vi.fn(),
  ...overrides,
});

describe("Sidebar", () => {
  let monitorArgs: { onDrop?: (args: unknown) => void; onDragStart?: (args: unknown) => void } | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    monitorArgs = undefined;
    mockMonitorForElements.mockImplementation((args) => {
      monitorArgs = args as typeof monitorArgs;
      return () => {};
    });
    mockExtractClosestEdge.mockReturnValue(null);
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
      createSidebarState({ refreshingLocationId: 1, sidebarRefreshReason: "external" }),
    );

    render(<Sidebar />);

    expect(screen.getByText("Applying external file changes...")).toBeInTheDocument();
    expect(screen.getByTitle("Refresh Sidebar")).toBeDisabled();
  });

  it("renders nested directories as expandable tree nodes", () => {
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        documents: [{
          location_id: 1,
          rel_path: "inbox/2026/2026_02_27_1740683700000.md",
          title: "Quick capture note",
          updated_at: "2026-02-27T10:15:00Z",
          word_count: 12,
        }],
      }),
    );

    render(<Sidebar />);

    expect(screen.getByText("inbox")).toBeInTheDocument();
    expect(screen.queryByText("Quick capture note")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("inbox"));
    fireEvent.click(screen.getByText("2026"));

    expect(screen.getByText("Quick capture note")).toBeInTheDocument();
  });

  it("moves a document to a different location on drop", () => {
    const handleMoveDocument = vi.fn().mockResolvedValue(true);
    vi.mocked(useWorkspaceController).mockReturnValue(createWorkspaceControllerState({ handleMoveDocument }));
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        documents: [{
          location_id: 1,
          rel_path: "notes/test.md",
          title: "Test",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }],
      }),
    );

    render(<Sidebar />);

    act(() => {
      monitorArgs?.onDrop?.({
        source: { data: { type: "document", locationId: 1, relPath: "notes/test.md", title: "Test" } },
        location: {
          current: { dropTargets: [{ data: { locationId: 2, targetType: "location" } }], input: { altKey: false } },
        },
      });
    });

    expect(handleMoveDocument).toHaveBeenCalledWith(1, "notes/test.md", "test.md", 2);
  });

  it("reorders documents in-place when dropped on a sibling edge", () => {
    const setDocuments = vi.fn();
    mockExtractClosestEdge.mockReturnValue("bottom");
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        setDocuments,
        documents: [{
          location_id: 1,
          rel_path: "one.md",
          title: "One",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }, { location_id: 1, rel_path: "two.md", title: "Two", updated_at: "2026-01-01T00:00:00Z", word_count: 1 }],
      }),
    );

    render(<Sidebar />);

    act(() => {
      monitorArgs?.onDrop?.({
        source: { data: { type: "document", locationId: 1, relPath: "one.md", title: "One" } },
        location: {
          current: {
            dropTargets: [{ data: { locationId: 1, relPath: "two.md", targetType: "document" } }],
            input: { altKey: false },
          },
        },
      });
    });

    expect(setDocuments).toHaveBeenCalledWith([{
      location_id: 1,
      rel_path: "two.md",
      title: "Two",
      updated_at: "2026-01-01T00:00:00Z",
      word_count: 1,
    }, { location_id: 1, rel_path: "one.md", title: "One", updated_at: "2026-01-01T00:00:00Z", word_count: 1 }]);
  });

  it("opens a move dialog for modifier-key drops and submits destination path", async () => {
    const handleMoveDocument = vi.fn().mockResolvedValue(true);
    vi.mocked(useWorkspaceController).mockReturnValue(createWorkspaceControllerState({ handleMoveDocument }));
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        documents: [{
          location_id: 1,
          rel_path: "notes/test.md",
          title: "Test",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }],
      }),
    );

    render(<Sidebar />);

    act(() => {
      monitorArgs?.onDrop?.({
        source: { data: { type: "document", locationId: 1, relPath: "notes/test.md", title: "Test" } },
        location: {
          current: { dropTargets: [{ data: { locationId: 2, targetType: "location" } }], input: { altKey: true } },
        },
      });
    });

    const pathInput = await screen.findByLabelText("Destination path");
    expect(pathInput).toHaveValue("test.md");

    fireEvent.change(pathInput, { target: { value: "archive/test.md" } });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Move" }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(handleMoveDocument).toHaveBeenCalledWith(1, "notes/test.md", "archive/test.md", 2);
  });

  it("announces drag start for screen readers", () => {
    vi.mocked(useSidebarState).mockReturnValue(createSidebarState());
    render(<Sidebar />);

    act(() => {
      monitorArgs?.onDragStart?.({
        source: { data: { type: "document", locationId: 1, relPath: "notes/test.md", title: "Test" } },
      });
    });

    expect(mockAnnounce).toHaveBeenCalledWith("Picked up Test");
  });
});
