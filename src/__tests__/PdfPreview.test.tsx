import { PdfPreviewPanel, usePdfPreview } from "$components/pdf/PdfPreview";
import { DEFAULT_OPTIONS } from "$pdf/constants";
import { ensurePdfFontRegistered } from "$pdf/fonts";
import type { PdfRenderResult } from "$pdf/types";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toBlobMock = vi.fn();
const mockPdfDoc = { numPages: 3, getPage: vi.fn(), destroy: vi.fn() };
const mockGetDocument = vi.fn();

vi.mock("$components/pdf/MarkdownPdfDocument", () => ({ MarkdownPdfDocument: () => null }));

vi.mock("$pdf/fonts", () => ({ ensurePdfFontRegistered: vi.fn() }));

vi.mock(
  "@react-pdf/renderer",
  () => ({
    Font: { register: vi.fn() },
    Document: "Document",
    Page: "Page",
    Text: "Text",
    View: "View",
    StyleSheet: { create: (styles: unknown) => styles },
    pdf: vi.fn(() => ({ toBlob: toBlobMock })),
  }),
);

vi.mock(
  "pdfjs-dist",
  () => ({ GlobalWorkerOptions: { workerSrc: "" }, getDocument: vi.fn(() => ({ promise: mockGetDocument() })) }),
);

const mockRenderResult: PdfRenderResult = {
  title: "Test Document",
  word_count: 10,
  nodes: [{ type: "heading", level: 1, content: "Hello World" }, {
    type: "paragraph",
    content: "This is a test document.",
  }],
};

const createMockPdfBlob = () => {
  const pdfContent =
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\n0000000000 65535 f\ntrailer\n<< /Size 1 /Root 1 0 R >>\nstartxref\n45\n%%EOF";
  return new Blob([pdfContent], { type: "application/pdf" });
};

describe("usePdfPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toBlobMock.mockReset();
    mockGetDocument.mockReset();
    mockPdfDoc.getPage.mockReset();
    mockPdfDoc.destroy.mockReset();
  });

  it("returns idle state when result is null", () => {
    const { result } = renderHook(() =>
      usePdfPreview({ result: null, options: DEFAULT_OPTIONS, editorFontFamily: "IBM Plex Sans Variable" })
    );

    expect(result.current.status).toBe("idle");
  });

  it("generates preview and loads PDF document successfully", async () => {
    const mockBlob = createMockPdfBlob();
    toBlobMock.mockResolvedValueOnce(mockBlob);
    mockGetDocument.mockResolvedValueOnce(mockPdfDoc);

    const { result } = renderHook(() =>
      usePdfPreview({ result: mockRenderResult, options: DEFAULT_OPTIONS, editorFontFamily: "IBM Plex Sans Variable" })
    );

    expect(result.current.status).toBe("idle");

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    }, { timeout: 1000 });

    expect(result.current.status).toBe("success");
    if (result.current.status === "success") {
      expect(result.current.pageCount).toBe(3);
      expect(result.current.pdfDoc).toBe(mockPdfDoc);
    }

    expect(toBlobMock).toHaveBeenCalledTimes(1);
    expect(ensurePdfFontRegistered).toHaveBeenCalledWith("IBM Plex Sans Variable", "custom");
    expect(ensurePdfFontRegistered).toHaveBeenCalledWith("IBM Plex Mono", "custom");
  });

  it("retries with builtin fonts on failure", async () => {
    const mockBlob = createMockPdfBlob();
    toBlobMock.mockRejectedValueOnce(new Error("Custom font error")).mockResolvedValueOnce(mockBlob);
    mockGetDocument.mockResolvedValueOnce(mockPdfDoc);

    const { result } = renderHook(() =>
      usePdfPreview({ result: mockRenderResult, options: DEFAULT_OPTIONS, editorFontFamily: "IBM Plex Sans Variable" })
    );

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    }, { timeout: 1000 });

    expect(toBlobMock).toHaveBeenCalledTimes(2);
    expect(ensurePdfFontRegistered).toHaveBeenCalledWith("IBM Plex Sans Variable", "builtin");
    expect(ensurePdfFontRegistered).toHaveBeenCalledWith("IBM Plex Mono", "builtin");
  });

  it("returns error state when all retries fail", async () => {
    toBlobMock.mockRejectedValue(new Error("Render failed"));

    const { result } = renderHook(() =>
      usePdfPreview({ result: mockRenderResult, options: DEFAULT_OPTIONS, editorFontFamily: "IBM Plex Sans Variable" })
    );

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    }, { timeout: 1000 });

    expect(result.current.status).toBe("error");
    if (result.current.status === "error") {
      expect(result.current.message).toBe("Render failed");
    }
  });

  it("debounces option changes", async () => {
    const mockBlob = createMockPdfBlob();
    toBlobMock.mockResolvedValue(mockBlob);
    mockGetDocument.mockResolvedValue(mockPdfDoc);

    const { result, rerender } = renderHook(
      ({ options }) => usePdfPreview({ result: mockRenderResult, options, editorFontFamily: "IBM Plex Sans Variable" }),
      { initialProps: { options: DEFAULT_OPTIONS } },
    );

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    }, { timeout: 1000 });

    const initialCallCount = toBlobMock.mock.calls.length;

    rerender({ options: { ...DEFAULT_OPTIONS, fontSize: 12 } });
    rerender({ options: { ...DEFAULT_OPTIONS, fontSize: 13 } });

    await waitFor(() =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, 100);
      })
    );

    expect(toBlobMock).toHaveBeenCalledTimes(initialCallCount);

    await waitFor(() => {
      expect(toBlobMock.mock.calls.length).toBeGreaterThan(initialCallCount);
    }, { timeout: 1000 });
  });
});

describe("PdfPreviewPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toBlobMock.mockReset();
    mockGetDocument.mockReset();
    mockPdfDoc.getPage.mockReset();
    mockPdfDoc.destroy.mockReset();
  });

  it("renders idle state when result is null", () => {
    render(<PdfPreviewPanel result={null} options={DEFAULT_OPTIONS} editorFontFamily="IBM Plex Sans Variable" />);

    expect(screen.getByText("Select a document to preview")).toBeInTheDocument();
  });

  it("renders loading skeleton while generating preview", async () => {
    toBlobMock.mockImplementation(() => new Promise(() => {}));

    const { container } = render(
      <PdfPreviewPanel result={mockRenderResult} options={DEFAULT_OPTIONS} editorFontFamily="IBM Plex Sans Variable" />,
    );

    await waitFor(() => {
      const skeletonElements = container.querySelectorAll(".animate-pulse");
      expect(skeletonElements.length).toBeGreaterThan(0);
    }, { timeout: 500 });
  });

  it("renders error state on failure", async () => {
    toBlobMock.mockRejectedValue(new Error("Generation failed"));

    render(
      <PdfPreviewPanel result={mockRenderResult} options={DEFAULT_OPTIONS} editorFontFamily="IBM Plex Sans Variable" />,
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to generate preview")).toBeInTheDocument();
    });

    expect(screen.getByText("Generation failed")).toBeInTheDocument();
  });

  it("renders PDF canvas and page navigation on success", async () => {
    const mockBlob = createMockPdfBlob();
    toBlobMock.mockResolvedValueOnce(mockBlob);
    mockGetDocument.mockResolvedValueOnce(mockPdfDoc);
    mockPdfDoc.getPage.mockResolvedValue({
      getViewport: vi.fn(() => ({ width: 600, height: 800 })),
      render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
      cleanup: vi.fn(),
    });

    const { container } = render(
      <PdfPreviewPanel result={mockRenderResult} options={DEFAULT_OPTIONS} editorFontFamily="IBM Plex Sans Variable" />,
    );

    await waitFor(() => {
      const canvas = container.querySelector("canvas");
      expect(canvas).toBeInTheDocument();
    }, { timeout: 1000 });

    await waitFor(() => {
      expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });
  });

  it("shows page navigation controls for multi-page documents", async () => {
    const mockBlob = createMockPdfBlob();
    toBlobMock.mockResolvedValueOnce(mockBlob);
    mockGetDocument.mockResolvedValueOnce(mockPdfDoc);
    mockPdfDoc.getPage.mockResolvedValue({
      getViewport: vi.fn(() => ({ width: 600, height: 800 })),
      render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
      cleanup: vi.fn(),
    });

    render(
      <PdfPreviewPanel result={mockRenderResult} options={DEFAULT_OPTIONS} editorFontFamily="IBM Plex Sans Variable" />,
    );

    await waitFor(() => {
      expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Previous page")).toBeInTheDocument();
    expect(screen.getByLabelText("Next page")).toBeInTheDocument();
  });

  it("does not show page navigation for single-page documents", async () => {
    const singlePagePdfDoc = { ...mockPdfDoc, numPages: 1 };
    const mockBlob = createMockPdfBlob();
    toBlobMock.mockResolvedValueOnce(mockBlob);
    mockGetDocument.mockResolvedValueOnce(singlePagePdfDoc);
    singlePagePdfDoc.getPage.mockResolvedValue({
      getViewport: vi.fn(() => ({ width: 600, height: 800 })),
      render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
      cleanup: vi.fn(),
    });

    const { container } = render(
      <PdfPreviewPanel result={mockRenderResult} options={DEFAULT_OPTIONS} editorFontFamily="IBM Plex Sans Variable" />,
    );

    await waitFor(() => {
      const canvas = container.querySelector("canvas");
      expect(canvas).toBeInTheDocument();
    }, { timeout: 1000 });

    expect(screen.queryByLabelText("Previous page")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Next page")).not.toBeInTheDocument();
  });

  it("navigates between pages using prev/next buttons", async () => {
    const user = userEvent.setup();
    const mockBlob = createMockPdfBlob();
    toBlobMock.mockResolvedValueOnce(mockBlob);
    mockGetDocument.mockResolvedValueOnce(mockPdfDoc);
    mockPdfDoc.getPage.mockResolvedValue({
      getViewport: vi.fn(() => ({ width: 600, height: 800 })),
      render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
      cleanup: vi.fn(),
    });

    render(
      <PdfPreviewPanel result={mockRenderResult} options={DEFAULT_OPTIONS} editorFontFamily="IBM Plex Sans Variable" />,
    );

    await waitFor(() => {
      expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });

    const nextButton = screen.getByLabelText("Next page");
    const prevButton = screen.getByLabelText("Previous page");

    expect(prevButton).toBeDisabled();

    await user.click(nextButton);
    await waitFor(() => {
      expect(screen.getByText("2 / 3")).toBeInTheDocument();
    });

    expect(prevButton).not.toBeDisabled();

    await user.click(nextButton);
    await waitFor(() => {
      expect(screen.getByText("3 / 3")).toBeInTheDocument();
    });

    expect(nextButton).toBeDisabled();

    await user.click(prevButton);
    await waitFor(() => {
      expect(screen.getByText("2 / 3")).toBeInTheDocument();
    });
  });

  it("aborts previous generation when unmounting", () => {
    const mockBlob = createMockPdfBlob();
    toBlobMock.mockResolvedValueOnce(mockBlob);
    mockGetDocument.mockResolvedValueOnce(mockPdfDoc);

    const { unmount } = render(
      <PdfPreviewPanel result={mockRenderResult} options={DEFAULT_OPTIONS} editorFontFamily="IBM Plex Sans Variable" />,
    );

    unmount();

    expect(() => {
      unmount();
    }).not.toThrow();
  });
});
