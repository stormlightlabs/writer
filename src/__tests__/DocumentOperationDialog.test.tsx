import { DocumentOperationDialog, type DocumentOperationRequest } from "$components/Sidebar/DocumentOperationDialog";
import type { DocMeta } from "$types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const DOC: DocMeta = {
  location_id: 1,
  rel_path: "notes/test.md",
  title: "Test Document",
  updated_at: "2026-01-01T00:00:00Z",
  word_count: 12,
};

function renderDialog(operation: DocumentOperationRequest) {
  const onClose = vi.fn();
  const onRenameDocument = vi.fn().mockResolvedValue(true);
  const onMoveDocument = vi.fn().mockResolvedValue(true);
  const onDeleteDocument = vi.fn().mockResolvedValue(true);
  const onRefreshSidebar = vi.fn();

  render(
    <DocumentOperationDialog
      operation={operation}
      onClose={onClose}
      onRenameDocument={onRenameDocument}
      onMoveDocument={onMoveDocument}
      onDeleteDocument={onDeleteDocument}
      onRefreshSidebar={onRefreshSidebar} />,
  );

  return { onClose, onRenameDocument, onMoveDocument, onDeleteDocument, onRefreshSidebar };
}

describe("DocumentOperationDialog", () => {
  it("renames a document", async () => {
    const { onRenameDocument, onRefreshSidebar, onClose } = renderDialog({
      type: "rename",
      doc: DOC,
      anchor: { x: 120, y: 180 },
    });

    expect(screen.getByDisplayValue("test.md")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("New name"), { target: { value: "renamed.md" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await waitFor(() => {
      expect(onRenameDocument).toHaveBeenCalledWith(1, "notes/test.md", "renamed.md");
      expect(onRefreshSidebar).toHaveBeenCalledWith(1);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("moves a document", async () => {
    const { onMoveDocument, onRefreshSidebar, onClose } = renderDialog({
      type: "move",
      doc: DOC,
      anchor: { x: 10, y: 20 },
    });

    expect(screen.getByDisplayValue("notes/test.md")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("New path"), { target: { value: "archive/test.md" } });
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => {
      expect(onMoveDocument).toHaveBeenCalledWith(1, "notes/test.md", "archive/test.md");
      expect(onRefreshSidebar).toHaveBeenCalledWith(1);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("deletes a document", async () => {
    const { onDeleteDocument, onRefreshSidebar, onClose } = renderDialog({
      type: "delete",
      doc: DOC,
      anchor: { x: 15, y: 25 },
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(onDeleteDocument).toHaveBeenCalledWith(1, "notes/test.md");
      expect(onRefreshSidebar).toHaveBeenCalledWith(1);
      expect(onClose).toHaveBeenCalled();
    });
  });
});
