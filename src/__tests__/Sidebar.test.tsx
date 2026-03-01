import { Sidebar } from "$components/Sidebar";
import { useWorkspaceController } from "$hooks/controllers/useWorkspaceController";
import { useSidebarState } from "$state/selectors";
import { showErrorToast, showSuccessToast, showWarnToast } from "$state/stores/toasts";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$state/selectors", () => ({ useSidebarState: vi.fn() }));
vi.mock("$hooks/controllers/useWorkspaceController", () => ({ useWorkspaceController: vi.fn() }));
vi.mock("$state/stores/toasts", () => ({ showErrorToast: vi.fn(), showSuccessToast: vi.fn(), showWarnToast: vi.fn() }));
const { mockMonitorForElements, mockExtractClosestEdge, mockAnnounce } = vi.hoisted(() => ({
  mockMonitorForElements: vi.fn(),
  mockExtractClosestEdge: vi.fn<() => "top" | "bottom" | null>(() => null),
  mockAnnounce: vi.fn(),
}));

vi.mock("$dnd", async () => {
  const actual = await vi.importActual<typeof import("$dnd")>("$dnd");
  return {
    ...actual,
    monitorForElements: mockMonitorForElements,
    extractClosestEdge: mockExtractClosestEdge,
    announce: mockAnnounce,
    cleanup: vi.fn(),
  };
});

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
  directories: [],
  isLoading: false,
  refreshingLocationId: undefined,
  sidebarRefreshReason: null,
  externalDropTargetId: undefined,
  filterText: "",
  setFilterText: vi.fn(),
  setDocuments: vi.fn(),
  setDirectories: vi.fn(),
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
  handleMoveDirectory: vi.fn(),
  handleDeleteDocument: vi.fn(),
  handleCreateDirectory: vi.fn(),
  handleImportExternalFile: vi.fn(),
  ...overrides,
});

describe("Sidebar", () => {
  let monitorArgs: {
    onDrop?: (args: unknown) => void;
    onDragStart?: (args: unknown) => void;
    onDropTargetChange?: (args: unknown) => void;
  } | undefined;

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

  it("renders empty directories from backend directory listing", () => {
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        directories: ["Samples", "Samples/sibling", "Archive"],
        documents: [{
          location_id: 1,
          rel_path: "Samples/some-file.md",
          title: "Some File",
          updated_at: "2026-02-27T10:15:00Z",
          word_count: 12,
        }],
      }),
    );

    render(<Sidebar />);

    expect(screen.getAllByText("Archive").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Samples").length).toBeGreaterThan(0);
  });

  it("moves a document to a different location on drop", () => {
    const handleMoveDocument = vi.fn().mockResolvedValue(true);
    vi.mocked(useWorkspaceController).mockReturnValue(createWorkspaceControllerState({ handleMoveDocument }));
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        documents: [{
          location_id: 1,
          rel_path: "test.md",
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

  it("shows a success toast when a dropped document move succeeds", async () => {
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

    await act(async () => {
      monitorArgs?.onDrop?.({
        source: { data: { type: "document", locationId: 1, relPath: "notes/test.md", title: "Test" } },
        location: {
          current: { dropTargets: [{ data: { locationId: 2, targetType: "location" } }], input: { altKey: false } },
        },
      });
      await Promise.resolve();
    });

    expect(showSuccessToast).toHaveBeenCalledWith("Moved Test to Archive");
    expect(showErrorToast).not.toHaveBeenCalled();
  });

  it("shows an error toast when a dropped document move fails", async () => {
    const handleMoveDocument = vi.fn().mockResolvedValue(false);
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

    await act(async () => {
      monitorArgs?.onDrop?.({
        source: { data: { type: "document", locationId: 1, relPath: "notes/test.md", title: "Test" } },
        location: {
          current: { dropTargets: [{ data: { locationId: 2, targetType: "location" } }], input: { altKey: false } },
        },
      });
      await Promise.resolve();
    });

    expect(showErrorToast).toHaveBeenCalledWith("Could not move Test");
  });

  it("shows a warning toast when dropped on a non-actionable target", () => {
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
        source: { data: { type: "document", locationId: 1, relPath: "test.md", title: "Test" } },
        location: {
          current: { dropTargets: [{ data: { locationId: 1, targetType: "location" } }], input: { altKey: false } },
        },
      });
    });

    expect(showWarnToast).toHaveBeenCalledWith("Drop target is not valid for moving this file");
  });

  it("moves into folder target when it is the active innermost destination", () => {
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
          current: {
            dropTargets: [{ data: { locationId: 2, folderPath: "archive/2026", targetType: "folder" } }, {
              data: { locationId: 2, targetType: "location" },
            }],
            input: { altKey: false },
          },
        },
      });
    });

    expect(handleMoveDocument).toHaveBeenCalledWith(1, "notes/test.md", "archive/2026/test.md", 2);
  });

  it("moves into folder even when location target appears before folder target", () => {
    const handleMoveDocument = vi.fn().mockResolvedValue(true);
    vi.mocked(useWorkspaceController).mockReturnValue(createWorkspaceControllerState({ handleMoveDocument }));
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        documents: [{
          location_id: 1,
          rel_path: "samples/some-file.md",
          title: "Some File",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }],
      }),
    );

    render(<Sidebar />);

    act(() => {
      monitorArgs?.onDrop?.({
        source: { data: { type: "document", locationId: 1, relPath: "samples/some-file.md", title: "Some File" } },
        location: {
          current: {
            dropTargets: [{ data: { locationId: 1, targetType: "location" } }, {
              data: { locationId: 1, folderPath: "samples/sibling", targetType: "folder" },
            }],
            input: { altKey: false },
          },
        },
      });
    });

    expect(handleMoveDocument).toHaveBeenCalledWith(1, "samples/some-file.md", "samples/sibling/some-file.md", 1);
  });

  it("falls back to pointer-hovered folder target when drop targets only include location", () => {
    const handleMoveDocument = vi.fn().mockResolvedValue(true);
    vi.mocked(useWorkspaceController).mockReturnValue(createWorkspaceControllerState({ handleMoveDocument }));
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        directories: ["samples", "samples/sibling"],
        documents: [{
          location_id: 1,
          rel_path: "samples/some-file.md",
          title: "Some File",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }],
      }),
    );

    const folderHit = document.createElement("div");
    folderHit.dataset.locationId = "1";
    folderHit.dataset.folderPath = "samples/sibling";
    globalThis.document.elementFromPoint = vi.fn(() => folderHit);

    render(<Sidebar />);

    act(() => {
      monitorArgs?.onDrop?.({
        source: { data: { type: "document", locationId: 1, relPath: "samples/some-file.md", title: "Some File" } },
        location: {
          current: {
            dropTargets: [{ data: { locationId: 1, targetType: "location" } }],
            input: { altKey: false, clientX: 18, clientY: 22 },
          },
        },
      });
    });

    expect(handleMoveDocument).toHaveBeenCalledWith(1, "samples/some-file.md", "samples/sibling/some-file.md", 1);
  });

  it("defaults to location root when elementFromPoint cannot resolve folder", () => {
    const handleMoveDocument = vi.fn().mockResolvedValue(true);
    vi.mocked(useWorkspaceController).mockReturnValue(createWorkspaceControllerState({ handleMoveDocument }));
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        directories: ["samples", "samples/sibling"],
        documents: [{
          location_id: 1,
          rel_path: "samples/some-file.md",
          title: "Some File",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }],
      }),
    );
    globalThis.document.elementFromPoint = vi.fn(() => null);

    render(<Sidebar />);

    const folderRow = document.createElement("div");
    folderRow.dataset.dropFolderRow = "true";
    folderRow.dataset.locationId = "1";
    folderRow.dataset.folderPath = "samples/sibling";
    folderRow.dataset.folderDepth = "2";
    folderRow.getBoundingClientRect = vi.fn(() =>
      ({
        left: 0,
        right: 300,
        top: 500,
        bottom: 560,
        width: 300,
        height: 60,
        x: 0,
        y: 500,
        toJSON: () => ({}),
      }) as DOMRect
    );
    const originalQuerySelectorAll = document.querySelectorAll.bind(document);
    vi.spyOn(document, "querySelectorAll").mockImplementation((selectors) => {
      if (
        selectors
          === "[data-drop-folder-row][data-location-id], [data-drop-document-row][data-location-id], [data-drop-location-root][data-location-id]"
      ) {
        return [folderRow] as unknown as NodeListOf<Element>;
      }
      return originalQuerySelectorAll(selectors);
    });

    act(() => {
      monitorArgs?.onDrop?.({
        source: { data: { type: "document", locationId: 1, relPath: "samples/some-file.md", title: "Some File" } },
        location: {
          current: {
            dropTargets: [{ data: { locationId: 1, targetType: "location" } }],
            input: { altKey: false, clientX: 120, clientY: 530 },
          },
        },
      });
    });

    expect(handleMoveDocument).toHaveBeenCalledWith(1, "samples/some-file.md", "some-file.md", 1);
  });

  it("defaults to location root when pointer is slightly outside a folder row", () => {
    const handleMoveDocument = vi.fn().mockResolvedValue(true);
    vi.mocked(useWorkspaceController).mockReturnValue(createWorkspaceControllerState({ handleMoveDocument }));
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        directories: ["samples", "samples/sibling"],
        documents: [{
          location_id: 1,
          rel_path: "samples/some-file.md",
          title: "Some File",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }],
      }),
    );
    globalThis.document.elementFromPoint = vi.fn(() => null);

    render(<Sidebar />);

    const folderRow = document.createElement("div");
    folderRow.dataset.dropFolderRow = "true";
    folderRow.dataset.locationId = "1";
    folderRow.dataset.folderPath = "samples/sibling";
    folderRow.dataset.folderDepth = "2";
    folderRow.getBoundingClientRect = vi.fn(() =>
      ({
        left: 0,
        right: 140,
        top: 500,
        bottom: 560,
        width: 140,
        height: 60,
        x: 0,
        y: 500,
        toJSON: () => ({}),
      }) as DOMRect
    );
    const originalQuerySelectorAll = document.querySelectorAll.bind(document);
    vi.spyOn(document, "querySelectorAll").mockImplementation((selectors) => {
      if (
        selectors
          === "[data-drop-folder-row][data-location-id], [data-drop-document-row][data-location-id], [data-drop-location-root][data-location-id]"
      ) {
        return [folderRow] as unknown as NodeListOf<Element>;
      }
      return originalQuerySelectorAll(selectors);
    });

    act(() => {
      monitorArgs?.onDrop?.({
        source: { data: { type: "document", locationId: 1, relPath: "samples/some-file.md", title: "Some File" } },
        location: {
          current: {
            dropTargets: [{ data: { locationId: 1, targetType: "location" } }],
            input: { altKey: false, clientX: 175, clientY: 530 },
          },
        },
      });
    });

    expect(handleMoveDocument).toHaveBeenCalledWith(1, "samples/some-file.md", "some-file.md", 1);
  });

  it("defaults to location root when folder body zones are not directly resolved by pointer hit testing", () => {
    const handleMoveDocument = vi.fn().mockResolvedValue(true);
    vi.mocked(useWorkspaceController).mockReturnValue(createWorkspaceControllerState({ handleMoveDocument }));
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        directories: ["samples", "samples/sibling"],
        documents: [{
          location_id: 1,
          rel_path: "samples/some-file.md",
          title: "Some File",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }],
      }),
    );
    globalThis.document.elementFromPoint = vi.fn(() => null);

    render(<Sidebar />);

    const folderZone = document.createElement("div");
    folderZone.dataset.dropFolderZone = "true";
    folderZone.dataset.locationId = "1";
    folderZone.dataset.folderPath = "samples/sibling";
    folderZone.dataset.folderDepth = "2";
    folderZone.getBoundingClientRect = vi.fn(() =>
      ({
        left: 0,
        right: 300,
        top: 500,
        bottom: 700,
        width: 300,
        height: 200,
        x: 0,
        y: 500,
        toJSON: () => ({}),
      }) as DOMRect
    );

    const originalQuerySelectorAll = document.querySelectorAll.bind(document);
    vi.spyOn(document, "querySelectorAll").mockImplementation((selectors) => {
      if (
        selectors
          === "[data-drop-folder-row][data-location-id], [data-drop-document-row][data-location-id], [data-drop-location-root][data-location-id]"
      ) {
        return [folderZone] as unknown as NodeListOf<Element>;
      }
      return originalQuerySelectorAll(selectors);
    });

    act(() => {
      monitorArgs?.onDrop?.({
        source: { data: { type: "document", locationId: 1, relPath: "samples/some-file.md", title: "Some File" } },
        location: {
          current: {
            dropTargets: [{ data: { locationId: 1, targetType: "location" } }],
            input: { altKey: false, clientX: 175, clientY: 640 },
          },
        },
      });
    });

    expect(handleMoveDocument).toHaveBeenCalledWith(1, "samples/some-file.md", "some-file.md", 1);
  });

  it("does not move root documents when drop metadata only reports location", () => {
    const handleMoveDocument = vi.fn().mockResolvedValue(true);
    vi.mocked(useWorkspaceController).mockReturnValue(createWorkspaceControllerState({ handleMoveDocument }));
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        directories: ["samples", "samples/sibling"],
        documents: [{
          location_id: 1,
          rel_path: "draft.md",
          title: "Draft",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }],
      }),
    );
    globalThis.document.elementFromPoint = vi.fn(() => null);

    render(<Sidebar />);

    const parentRow = document.createElement("div");
    parentRow.dataset.dropFolderRow = "true";
    parentRow.dataset.locationId = "1";
    parentRow.dataset.folderPath = "samples";
    parentRow.dataset.folderDepth = "1";
    parentRow.getBoundingClientRect = vi.fn(() =>
      ({
        left: 0,
        right: 300,
        top: 500,
        bottom: 560,
        width: 300,
        height: 60,
        x: 0,
        y: 500,
        toJSON: () => ({}),
      }) as DOMRect
    );

    const childRow = document.createElement("div");
    childRow.dataset.dropFolderRow = "true";
    childRow.dataset.locationId = "1";
    childRow.dataset.folderPath = "samples/sibling";
    childRow.dataset.folderDepth = "2";
    childRow.getBoundingClientRect = vi.fn(() =>
      ({
        left: 0,
        right: 300,
        top: 500,
        bottom: 560,
        width: 300,
        height: 60,
        x: 0,
        y: 500,
        toJSON: () => ({}),
      }) as DOMRect
    );

    const originalQuerySelectorAll = document.querySelectorAll.bind(document);
    vi.spyOn(document, "querySelectorAll").mockImplementation((selectors) => {
      if (
        selectors
          === "[data-drop-folder-row][data-location-id], [data-drop-document-row][data-location-id], [data-drop-location-root][data-location-id]"
      ) {
        return [parentRow, childRow] as unknown as NodeListOf<Element>;
      }
      return originalQuerySelectorAll(selectors);
    });

    act(() => {
      monitorArgs?.onDrop?.({
        source: { data: { type: "document", locationId: 1, relPath: "draft.md", title: "Draft" } },
        location: {
          current: {
            dropTargets: [{ data: { locationId: 1, targetType: "location" } }],
            input: { altKey: false, clientX: 175, clientY: 530 },
          },
        },
      });
    });

    expect(handleMoveDocument).not.toHaveBeenCalled();
    expect(showWarnToast).toHaveBeenCalledWith("Drop target is not valid for moving this file");
  });

  it("uses current metadata when drop metadata degrades to location-only", () => {
    const handleMoveDocument = vi.fn().mockResolvedValue(true);
    vi.mocked(useWorkspaceController).mockReturnValue(createWorkspaceControllerState({ handleMoveDocument }));
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        directories: ["Samples", "sibling-dir"],
        documents: [{
          location_id: 1,
          rel_path: "Samples/some-file.md",
          title: "Some File",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }],
      }),
    );

    render(<Sidebar />);

    act(() => {
      monitorArgs?.onDropTargetChange?.({
        source: { data: { type: "document", locationId: 1, relPath: "Samples/some-file.md", title: "Some File" } },
        location: {
          current: {
            dropTargets: [{ data: { locationId: 1, folderPath: "sibling-dir", targetType: "folder" } }],
            input: { altKey: false },
          },
        },
      });
    });

    act(() => {
      monitorArgs?.onDrop?.({
        source: { data: { type: "document", locationId: 1, relPath: "Samples/some-file.md", title: "Some File" } },
        location: {
          current: { dropTargets: [{ data: { locationId: 1, targetType: "location" } }], input: { altKey: false } },
          previous: { dropTargets: [{ data: { locationId: 1, folderPath: "sibling-dir", targetType: "folder" } }] },
        },
      });
    });

    expect(handleMoveDocument).toHaveBeenCalledWith(1, "Samples/some-file.md", "some-file.md", 1);
  });

  it("announces location hover when monitor reports location-only after a folder target", () => {
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        directories: ["Samples", "sibling-dir"],
        documents: [{
          location_id: 1,
          rel_path: "Samples/some-file.md",
          title: "Some File",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }],
      }),
    );

    render(<Sidebar />);

    act(() => {
      monitorArgs?.onDropTargetChange?.({
        source: { data: { type: "document", locationId: 1, relPath: "Samples/some-file.md", title: "Some File" } },
        location: {
          current: {
            dropTargets: [{ data: { locationId: 1, folderPath: "sibling-dir", targetType: "folder" } }],
            input: { altKey: false },
          },
        },
      });
    });

    act(() => {
      monitorArgs?.onDropTargetChange?.({
        source: { data: { type: "document", locationId: 1, relPath: "Samples/some-file.md", title: "Some File" } },
        location: {
          current: { dropTargets: [{ data: { locationId: 1, targetType: "location" } }], input: { altKey: false } },
          previous: { dropTargets: [{ data: { locationId: 1, folderPath: "sibling-dir", targetType: "folder" } }] },
        },
      });
    });

    expect(mockAnnounce).toHaveBeenLastCalledWith("Over Notes");
  });

  it("moves a folder into another folder in the same location on drop", () => {
    const handleMoveDirectory = vi.fn().mockResolvedValue(true);
    vi.mocked(useWorkspaceController).mockReturnValue(createWorkspaceControllerState({ handleMoveDirectory }));
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        directories: ["Samples", "Archive"],
        documents: [{
          location_id: 1,
          rel_path: "Samples/some-file.md",
          title: "Some File",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }],
      }),
    );

    render(<Sidebar />);

    act(() => {
      monitorArgs?.onDrop?.({
        source: { data: { type: "folder", locationId: 1, relPath: "Samples", title: "Samples" } },
        location: {
          current: {
            dropTargets: [{ data: { locationId: 1, folderPath: "Archive", targetType: "folder" } }],
            input: { altKey: false },
          },
        },
      });
    });

    expect(handleMoveDirectory).toHaveBeenCalledWith(1, "Samples", "Archive/Samples");
  });

  it("announces folder target when folder is the active destination", () => {
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        documents: [{
          location_id: 1,
          rel_path: "archive/2026/file.md",
          title: "File",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }],
      }),
    );
    render(<Sidebar />);
    fireEvent.click(screen.getByText("archive"));

    act(() => {
      monitorArgs?.onDropTargetChange?.({
        source: { data: { type: "document", locationId: 1, relPath: "notes/test.md", title: "Test" } },
        location: {
          current: {
            dropTargets: [{ data: { locationId: 1, folderPath: "archive/2026", targetType: "folder" } }, {
              data: { locationId: 1, targetType: "location" },
            }],
          },
        },
      });
    });

    expect(mockAnnounce).toHaveBeenCalledWith("Over archive/2026 in Notes");
    expect(screen.getByText("2026").closest(".sidebar-item")).toHaveClass("ring-border-interactive");
  });

  it("moves document to location root when dropped on a root-level neighbor", () => {
    const handleMoveDocument = vi.fn().mockResolvedValue(true);
    vi.mocked(useWorkspaceController).mockReturnValue(createWorkspaceControllerState({ handleMoveDocument }));
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        documents: [{
          location_id: 1,
          rel_path: "archive/note.md",
          title: "Note",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }, { location_id: 1, rel_path: "todo.md", title: "Todo", updated_at: "2026-01-01T00:00:00Z", word_count: 1 }],
      }),
    );

    render(<Sidebar />);

    act(() => {
      monitorArgs?.onDrop?.({
        source: { data: { type: "document", locationId: 1, relPath: "archive/note.md", title: "Note" } },
        location: {
          current: {
            dropTargets: [{ data: { locationId: 1, relPath: "todo.md", targetType: "document" } }],
            input: { altKey: false },
          },
        },
      });
    });

    expect(handleMoveDocument).toHaveBeenCalledWith(1, "archive/note.md", "note.md", 1);
  });

  it("keeps document reordering when a folder ancestor is also active", () => {
    const setDocuments = vi.fn();
    mockExtractClosestEdge.mockReturnValue("bottom");
    vi.mocked(useSidebarState).mockReturnValue(
      createSidebarState({
        setDocuments,
        documents: [{
          location_id: 1,
          rel_path: "archive/one.md",
          title: "One",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }, {
          location_id: 1,
          rel_path: "archive/two.md",
          title: "Two",
          updated_at: "2026-01-01T00:00:00Z",
          word_count: 1,
        }],
      }),
    );

    render(<Sidebar />);

    act(() => {
      monitorArgs?.onDrop?.({
        source: { data: { type: "document", locationId: 1, relPath: "archive/one.md", title: "One" } },
        location: {
          current: {
            dropTargets: [{ data: { locationId: 1, relPath: "archive/two.md", targetType: "document" } }, {
              data: { locationId: 1, folderPath: "archive", targetType: "folder" },
            }, { data: { locationId: 1, targetType: "location" } }],
            input: { altKey: false },
          },
        },
      });
    });

    expect(setDocuments).toHaveBeenCalledWith([{
      location_id: 1,
      rel_path: "archive/two.md",
      title: "Two",
      updated_at: "2026-01-01T00:00:00Z",
      word_count: 1,
    }, {
      location_id: 1,
      rel_path: "archive/one.md",
      title: "One",
      updated_at: "2026-01-01T00:00:00Z",
      word_count: 1,
    }]);
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
    expect(showSuccessToast).toHaveBeenCalledWith("Moved Test");
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
