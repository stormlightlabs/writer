import { DocumentItem } from "$components/Sidebar/DocumentItem";
import type { DocMeta } from "$types";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createMockDoc = (overrides: Partial<DocMeta> = {}): DocMeta => ({
  location_id: 1,
  rel_path: "notes/test.md",
  title: "Test Document",
  updated_at: "2026-01-01T00:00:00Z",
  word_count: 100,
  ...overrides,
});

const createProps = (overrides: Partial<Parameters<typeof DocumentItem>[0]> = {}) => ({
  doc: createMockDoc(),
  isSelected: false,
  onSelectDocument: vi.fn(),
  onOpenDocumentOperation: vi.fn(),
  filenameVisibility: false,
  ...overrides,
});

describe("DocumentItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      const props = createProps({ doc: createMockDoc({ title: "", rel_path: "notes/untitled.md" }) });
      render(<DocumentItem {...props} />);
      expect(screen.getByText("untitled.md")).toBeInTheDocument();
    });
  });

  describe("context menu", () => {
    it("opens context menu on right-click", () => {
      const props = createProps();
      render(<DocumentItem {...props} />);

      fireEvent.contextMenu(screen.getByText("Test Document"));
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("shows rename, move, and delete options", () => {
      const props = createProps();
      render(<DocumentItem {...props} />);

      fireEvent.contextMenu(screen.getByText("Test Document"));

      expect(screen.getByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Move" })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    });

    it("calls onSelectDocument when Open is clicked", () => {
      const onSelectDocument = vi.fn();
      const props = createProps({ onSelectDocument });
      render(<DocumentItem {...props} />);

      fireEvent.contextMenu(screen.getByText("Test Document"), { clientX: 120, clientY: 180 });
      fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));

      expect(onSelectDocument).toHaveBeenCalledWith(1, "notes/test.md");
    });

    it("opens rename operation with anchor position", () => {
      const onOpenDocumentOperation = vi.fn();
      const doc = createMockDoc();
      const props = createProps({ doc, onOpenDocumentOperation });
      render(<DocumentItem {...props} />);

      fireEvent.contextMenu(screen.getByText("Test Document"), { clientX: 120, clientY: 180 });
      fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

      expect(onOpenDocumentOperation).toHaveBeenCalledWith("rename", doc, { x: 120, y: 180 });
    });

    it("opens move operation", () => {
      const onOpenDocumentOperation = vi.fn();
      const doc = createMockDoc();
      const props = createProps({ doc, onOpenDocumentOperation });
      render(<DocumentItem {...props} />);

      fireEvent.contextMenu(screen.getByText("Test Document"), { clientX: 40, clientY: 50 });
      fireEvent.click(screen.getByRole("menuitem", { name: "Move" }));

      expect(onOpenDocumentOperation).toHaveBeenCalledWith("move", doc, { x: 40, y: 50 });
    });

    it("opens delete operation", () => {
      const onOpenDocumentOperation = vi.fn();
      const doc = createMockDoc();
      const props = createProps({ doc, onOpenDocumentOperation });
      render(<DocumentItem {...props} />);

      fireEvent.contextMenu(screen.getByText("Test Document"), { clientX: 12, clientY: 34 });
      fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

      expect(onOpenDocumentOperation).toHaveBeenCalledWith("delete", doc, { x: 12, y: 34 });
    });
  });
});
