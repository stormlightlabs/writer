import { DocumentItem } from "$components/Sidebar/DocumentItem";
import { useSidebarState } from "$state/selectors";
import type { DocMeta } from "$types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$state/selectors", () => ({ useSidebarState: vi.fn() }));

const createMockDoc = (overrides: Partial<DocMeta> = {}): DocMeta => ({
  location_id: 1,
  rel_path: "notes/test.md",
  title: "Test Document",
  updated_at: "2026-01-01T00:00:00Z",
  word_count: 100,
  ...overrides,
});

const mockSidebarState = { filenameVisibility: false };

const createProps = (overrides: Partial<Parameters<typeof DocumentItem>[0]> = {}) => ({
  doc: createMockDoc(),
  isSelected: false,
  selectedDocPath: undefined,
  onSelectDocument: vi.fn(),
  onRenameDocument: vi.fn().mockResolvedValue(true),
  onMoveDocument: vi.fn().mockResolvedValue(true),
  onDeleteDocument: vi.fn().mockResolvedValue(true),
  filenameVisibility: false,
  id: 1,
  ...overrides,
});

describe("DocumentItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSidebarState).mockReturnValue(mockSidebarState as ReturnType<typeof useSidebarState>);
  });

  describe("display", () => {
    it("displays document title by default", () => {
      const props = createProps({ doc: createMockDoc({ title: "My Document" }) });
      render(<DocumentItem {...props} />);
      expect(screen.getByText("My Document")).toBeInTheDocument();
    });

    it("displays filename when filenameVisibility is true", () => {
      const props = createProps({
        doc: createMockDoc({ title: "My Document", rel_path: "notes/my-file.md" }),
        filenameVisibility: true,
      });
      render(<DocumentItem {...props} />);
      expect(screen.getByText("my-file.md")).toBeInTheDocument();
    });

    it("displays filename when title is empty", () => {
      const props = createProps({
        doc: createMockDoc({ title: "", rel_path: "notes/untitled.md" }),
        filenameVisibility: false,
      });
      render(<DocumentItem {...props} />);
      expect(screen.getByText("untitled.md")).toBeInTheDocument();
    });
  });

  describe("context menu", () => {
    it("opens context menu on right-click", () => {
      const props = createProps();
      render(<DocumentItem {...props} />);

      const item = screen.getByText("Test Document");
      fireEvent.contextMenu(item);

      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("shows rename, move, and delete options", () => {
      const props = createProps();
      render(<DocumentItem {...props} />);

      const item = screen.getByText("Test Document");
      fireEvent.contextMenu(item);

      expect(screen.getByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Move" })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    });

    it("calls onSelectDocument when Open is clicked", () => {
      const onSelectDocument = vi.fn();
      const props = createProps({ onSelectDocument });
      render(<DocumentItem {...props} />);

      const item = screen.getByText("Test Document");
      fireEvent.contextMenu(item);
      fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));

      expect(onSelectDocument).toHaveBeenCalledWith(1, "notes/test.md");
    });
  });

  describe("rename dialog", () => {
    it("opens rename dialog when Rename is clicked", () => {
      const props = createProps();
      render(<DocumentItem {...props} />);

      const item = screen.getByText("Test Document");
      fireEvent.contextMenu(item);
      fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

      expect(screen.getByText("Rename Document")).toBeInTheDocument();
      expect(screen.getByDisplayValue("test.md")).toBeInTheDocument();
    });

    it("calls onRenameDocument with new name", async () => {
      const onRenameDocument = vi.fn().mockResolvedValue(true);
      const props = createProps({ onRenameDocument });
      render(<DocumentItem {...props} />);

      const item = screen.getByText("Test Document");
      fireEvent.contextMenu(item);
      fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

      const input = screen.getByDisplayValue("test.md");
      fireEvent.change(input, { target: { value: "renamed.md" } });
      fireEvent.click(screen.getByRole("button", { name: "Rename" }));

      await waitFor(() => {
        expect(onRenameDocument).toHaveBeenCalledWith(1, "notes/test.md", "renamed.md");
      });
    });
  });

  describe("move dialog", () => {
    it("opens move dialog when Move is clicked", () => {
      const props = createProps();
      render(<DocumentItem {...props} />);

      const item = screen.getByText("Test Document");
      fireEvent.contextMenu(item);
      fireEvent.click(screen.getByRole("menuitem", { name: "Move" }));

      expect(screen.getByText("Move Document")).toBeInTheDocument();
      expect(screen.getByDisplayValue("notes/test.md")).toBeInTheDocument();
    });

    it("calls onMoveDocument with new path", async () => {
      const onMoveDocument = vi.fn().mockResolvedValue(true);
      const props = createProps({ onMoveDocument });
      render(<DocumentItem {...props} />);

      const item = screen.getByText("Test Document");
      fireEvent.contextMenu(item);
      fireEvent.click(screen.getByRole("menuitem", { name: "Move" }));

      const input = screen.getByDisplayValue("notes/test.md");
      fireEvent.change(input, { target: { value: "archive/test.md" } });
      fireEvent.click(screen.getByRole("button", { name: "Move" }));

      await waitFor(() => {
        expect(onMoveDocument).toHaveBeenCalledWith(1, "notes/test.md", "archive/test.md");
      });
    });
  });

  describe("delete dialog", () => {
    it("opens delete confirmation dialog when Delete is clicked", () => {
      const props = createProps();
      render(<DocumentItem {...props} />);

      const item = screen.getByText("Test Document");
      fireEvent.contextMenu(item);
      fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

      expect(screen.getByText("Delete Document")).toBeInTheDocument();
    });

    it("calls onDeleteDocument when confirmed", async () => {
      const onDeleteDocument = vi.fn().mockResolvedValue(true);
      const props = createProps({ onDeleteDocument });
      render(<DocumentItem {...props} />);

      const item = screen.getByText("Test Document");
      fireEvent.contextMenu(item);
      fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      await waitFor(() => {
        expect(onDeleteDocument).toHaveBeenCalledWith(1, "notes/test.md");
      });
    });
  });
});
