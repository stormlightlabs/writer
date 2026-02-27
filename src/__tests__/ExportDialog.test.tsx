import { PdfExportDialog } from "$components/pdf/ExportDialog/ExportDialog";
import { DEFAULT_OPTIONS } from "$pdf/constants";
import type { PdfExportOptions, PdfRenderResult } from "$pdf/types";
import { useAppStore } from "$state/stores/app";
import { resetPdfExportStore, usePdfExportStore } from "$state/stores/pdf-export";
import { resetUiStore, useUiStore } from "$state/stores/ui";
import type { EditorFontFamily } from "$types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRenderResult: PdfRenderResult = {
  title: "Test Document",
  word_count: 100,
  nodes: [{ type: "paragraph", content: "Hello world" }],
};

const mockOnExport = vi.fn();

vi.mock(
  "$components/pdf/PdfPreview",
  () => ({ PdfPreviewPanel: () => <div data-testid="pdf-preview">Preview Content</div> }),
);

vi.mock("$hooks/useViewportTier", () => ({ useViewportTier: () => ({ isCompact: false, viewportWidth: 1400 }) }));

type RenderDialogArgs = {
  previewResult?: PdfRenderResult | null;
  editorFontFamily?: EditorFontFamily;
  onExport?: (options: PdfExportOptions) => Promise<void>;
};

function renderExportDialog(
  { previewResult = mockRenderResult, editorFontFamily = "IBM Plex Sans Variable", onExport = mockOnExport }:
    RenderDialogArgs = {},
) {
  return render(
    <PdfExportDialog onExport={onExport} previewResult={previewResult} editorFontFamily={editorFontFamily} />,
  );
}

describe("PdfExportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetUiStore();
    resetPdfExportStore();
  });

  describe("visibility", () => {
    it("does not render when closed", () => {
      useUiStore.getState().setPdfExportDialogOpen(false);
      renderExportDialog();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders when open", () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      renderExportDialog();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Export to PDF")).toBeInTheDocument();
    });
  });

  describe("content layout", () => {
    it("renders header with close button", () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      renderExportDialog();
      expect(screen.getByText("Export to PDF")).toBeInTheDocument();
      expect(screen.getByLabelText("Close export dialog")).toBeInTheDocument();
    });

    it("renders options panel", () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      renderExportDialog();
      expect(screen.getByText("Page Size")).toBeInTheDocument();
      expect(screen.getByText("Orientation")).toBeInTheDocument();
    });

    it("renders footer with cancel and export buttons", () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      renderExportDialog();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Export PDF")).toBeInTheDocument();
    });

    it("renders preview panel when viewport is wide enough", () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      renderExportDialog();
      expect(screen.getByTestId("pdf-preview")).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("closes dialog when cancel button is clicked", () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      renderExportDialog();

      fireEvent.click(screen.getByText("Cancel"));

      expect(useUiStore.getState().pdfExportDialogOpen).toBe(false);
    });

    it("closes dialog when close button is clicked", () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      renderExportDialog();

      fireEvent.click(screen.getByLabelText("Close export dialog"));

      expect(useUiStore.getState().pdfExportDialogOpen).toBe(false);
    });

    it("calls onExport with current options when export is clicked", async () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      mockOnExport.mockResolvedValueOnce(void 0);
      renderExportDialog();

      fireEvent.click(screen.getByText("Export PDF"));

      await waitFor(() => {
        expect(mockOnExport).toHaveBeenCalledWith(DEFAULT_OPTIONS);
      });
    });

    it("disables export button while exporting", () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      usePdfExportStore.getState().startPdfExport();
      renderExportDialog();

      expect(screen.getByText("Exporting...")).toBeInTheDocument();
      const exportingButton = screen.getByText("Exporting...").closest("button");
      expect(exportingButton).toBeDisabled();
    });
  });

  describe("error handling", () => {
    it("displays error message when export fails", () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      usePdfExportStore.getState().failPdfExport("Export failed");
      renderExportDialog();

      expect(screen.getByText("Export failed")).toBeInTheDocument();
    });
  });

  describe("options modifications", () => {
    it("updates page size when changed", () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      renderExportDialog();

      const container = screen.getByText("Page Size").parentElement;
      const pageSizeSelect = container?.querySelector("select");
      if (!pageSizeSelect) throw new Error("Page size select not found");
      fireEvent.change(pageSizeSelect, { target: { value: "LETTER" } });

      expect(useUiStore.getState().pdfExportOptions.pageSize).toBe("LETTER");
    });

    it("updates orientation when changed", () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      renderExportDialog();

      const container = screen.getByText("Orientation").parentElement;
      const orientationSelect = container?.querySelector("select");
      if (!orientationSelect) throw new Error("Orientation select not found");
      fireEvent.change(orientationSelect, { target: { value: "landscape" } });

      expect(useUiStore.getState().pdfExportOptions.orientation).toBe("landscape");
    });

    it("updates font size when changed", () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      renderExportDialog();

      const fontSizeSlider = screen.getByRole("slider");
      fireEvent.change(fontSizeSlider, { target: { value: "12" } });

      expect(useUiStore.getState().pdfExportOptions.fontSize).toBe(12);
    });

    it("updates header checkbox when toggled", () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      renderExportDialog();

      const headerCheckbox = screen.getByLabelText("Include Header");
      fireEvent.click(headerCheckbox);

      expect(useUiStore.getState().pdfExportOptions.includeHeader).toBe(true);
    });

    it("updates footer checkbox when toggled", () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      renderExportDialog();

      const footerCheckbox = screen.getByLabelText("Include Footer");
      fireEvent.click(footerCheckbox);

      expect(useUiStore.getState().pdfExportOptions.includeFooter).toBe(true);
    });
  });

  describe("document title display", () => {
    it("shows document title when available", () => {
      useUiStore.getState().setPdfExportDialogOpen(true);
      useAppStore.getState().setDocuments([{
        location_id: 1,
        rel_path: "test.md",
        title: "My Document",
        word_count: 100,
        updated_at: "2024-01-01",
      }]);
      useAppStore.getState().openDocumentTab({ location_id: 1, rel_path: "test.md" }, "My Document");
      renderExportDialog();

      expect(screen.getByText("My Document")).toBeInTheDocument();
    });
  });
});
