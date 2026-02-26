import { Sidebar } from "$components/Sidebar";
import { useSidebarState } from "$state/panel-selectors";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$state/panel-selectors", () => ({ useSidebarState: vi.fn() }));

const createSidebarState = (overrides: Partial<ReturnType<typeof useSidebarState>> = {}) => ({
  locations: [{ id: 1, name: "Notes", root_path: "/tmp/notes", added_at: "2026-01-01T00:00:00Z" }],
  selectedLocationId: 1,
  selectedDocPath: undefined,
  documents: [],
  isLoading: false,
  filterText: "",
  setFilterText: vi.fn(),
  selectLocation: vi.fn(),
  toggleSidebarCollapsed: vi.fn(),
  ...overrides,
});

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a single new document action and creates a doc for the selected location", () => {
    vi.mocked(useSidebarState).mockReturnValue(createSidebarState());
    const handleCreateNewDocument = vi.fn();

    render(
      <Sidebar
        handleAddLocation={vi.fn()}
        handleRemoveLocation={vi.fn()}
        handleSelectDocument={vi.fn()}
        handleCreateNewDocument={handleCreateNewDocument} />,
    );

    const newDocumentButtons = screen.getAllByTitle("New Document");
    expect(newDocumentButtons).toHaveLength(1);

    fireEvent.click(newDocumentButtons[0]);
    expect(handleCreateNewDocument).toHaveBeenCalledWith(1);
  });

  it("disables the new document action when no location is selected", () => {
    vi.mocked(useSidebarState).mockReturnValue(createSidebarState({ selectedLocationId: undefined }));
    const handleCreateNewDocument = vi.fn();

    render(
      <Sidebar
        handleAddLocation={vi.fn()}
        handleRemoveLocation={vi.fn()}
        handleSelectDocument={vi.fn()}
        handleCreateNewDocument={handleCreateNewDocument} />,
    );

    const newDocumentButton = screen.getByTitle("New Document");
    expect(newDocumentButton).toBeDisabled();

    fireEvent.click(newDocumentButton);
    expect(handleCreateNewDocument).not.toHaveBeenCalled();
  });
});
