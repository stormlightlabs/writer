// oxlint-disable react_perf/jsx-no-new-object-as-prop
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Editor } from "../components/Editor";

describe(Editor, () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render editor container", () => {
      render(<Editor />);
      const container = screen.getByTestId("editor-container");
      expect(container).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(<Editor className="custom-editor" />);
      const container = screen.getByTestId("editor-container");
      expect(container).toHaveClass("custom-editor");
    });

    it("should set data-theme attribute", () => {
      render(<Editor presentation={{ theme: "light" }} />);
      const container = screen.getByTestId("editor-container");
      expect(container).toHaveAttribute("data-theme", "light");
    });

    it("should set data-ready attribute when editor is initialized", () => {
      render(<Editor />);
      const container = screen.getByTestId("editor-container");
      expect(container).toHaveAttribute("data-ready", "true");
    });

    it("should render line numbers by default", () => {
      const { container } = render(<Editor />);
      expect(container.querySelector(".cm-lineNumbers")).toBeInTheDocument();
    });

    it("should hide line numbers when disabled via prop", () => {
      const { container } = render(<Editor presentation={{ showLineNumbers: false }} />);
      expect(container.querySelector(".cm-lineNumbers")).not.toBeInTheDocument();
    });

    it("should enable text wrapping by default", () => {
      const { container } = render(<Editor />);
      expect(container.querySelector(".cm-lineWrapping")).toBeInTheDocument();
    });

    it("should disable text wrapping when disabled via prop", () => {
      const { container } = render(<Editor presentation={{ textWrappingEnabled: false }} />);
      expect(container.querySelector(".cm-lineWrapping")).not.toBeInTheDocument();
    });

    it("should apply custom font family and size variables", () => {
      render(<Editor presentation={{ fontFamily: "IBM Plex Sans Variable", fontSize: 19 }} />);
      const container = screen.getByTestId("editor-container");
      expect(container).toHaveStyle(
        "--editor-font-family: \"Writer IBM Plex Sans\", \"IBM Plex Sans\", -apple-system, BlinkMacSystemFont, sans-serif",
      );
      expect(container).toHaveStyle("--editor-font-size: 19px");
    });
  });

  describe("initial content", () => {
    it("should render with empty text by default", () => {
      const { container } = render(<Editor />);
      const editorContent = container.querySelector(".cm-content");
      expect(editorContent).toBeInTheDocument();
    });

    it("should render with initial text", () => {
      const { container } = render(<Editor initialText="# Hello World" />);
      const editorContent = container.querySelector(".cm-content");
      expect(editorContent).toBeInTheDocument();
    });
  });

  describe("theme switching", () => {
    it("should support dark theme", () => {
      render(<Editor presentation={{ theme: "dark" }} />);
      const container = screen.getByTestId("editor-container");
      expect(container).toHaveAttribute("data-theme", "dark");
    });

    it("should support light theme", () => {
      render(<Editor presentation={{ theme: "light" }} />);
      const container = screen.getByTestId("editor-container");
      expect(container).toHaveAttribute("data-theme", "light");
    });

    it("should default to dark theme", () => {
      render(<Editor />);
      const container = screen.getByTestId("editor-container");
      expect(container).toHaveAttribute("data-theme", "dark");
    });
  });

  describe("disabled state", () => {
    it("should render in enabled state by default", () => {
      render(<Editor />);
      const container = screen.getByTestId("editor-container");
      expect(container).toBeInTheDocument();
    });

    it("should render in disabled state", () => {
      render(<Editor disabled />);
      const container = screen.getByTestId("editor-container");
      expect(container).toBeInTheDocument();
    });
  });

  describe("callbacks", () => {
    it("should call onChange when content changes", async () => {
      const { container } = render(<Editor onChange={mockOnChange} debounceMs={0} />);
      const content = container.querySelector(".cm-content");

      if (content) {
        fireEvent.input(content, { target: { textContent: "New text" } });

        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalledWith("New text");
        }, { timeout: 100 });
      }
    });

    it("should debounce onChange calls", async () => {
      const { container } = render(<Editor onChange={mockOnChange} debounceMs={100} />);
      const content = container.querySelector(".cm-content");

      if (content) {
        fireEvent.input(content, { target: { textContent: "Text 1" } });
        fireEvent.input(content, { target: { textContent: "Text 2" } });
        fireEvent.input(content, { target: { textContent: "Text 3" } });

        expect(mockOnChange).not.toHaveBeenCalled();

        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalledWith("Text 3");
        }, { timeout: 1200 });
      }
    });
  });

  describe("prop updates", () => {
    it("updates editor text when initialText changes", async () => {
      const { container, rerender } = render(<Editor initialText="First text" />);
      expect(container.querySelector(".cm-content")).toHaveTextContent("First text");

      rerender(<Editor initialText="Second text" />);

      await waitFor(() => {
        expect(container.querySelector(".cm-content")).toHaveTextContent("Second text");
      });
    });

    it("keeps the editor view instance when only text changes", async () => {
      const { container, rerender } = render(<Editor initialText="First text" />);
      const firstEditorRoot = container.querySelector(".cm-editor");

      rerender(<Editor initialText="Second text" />);

      await waitFor(() => {
        expect(container.querySelector(".cm-content")).toHaveTextContent("Second text");
      });

      expect(container.querySelector(".cm-editor")).toBe(firstEditorRoot);
    });

    it("keeps the editor view instance when presentation props change", () => {
      const { container, rerender } = render(<Editor initialText="Persistent" presentation={{ theme: "dark" }} />);
      const firstEditorRoot = container.querySelector(".cm-editor");

      rerender(<Editor initialText="Persistent" presentation={{ theme: "light" }} />);
      const secondEditorRoot = container.querySelector(".cm-editor");

      expect(screen.getByTestId("editor-container")).toHaveAttribute("data-theme", "light");
      expect(secondEditorRoot).toBeInTheDocument();
      expect(secondEditorRoot).toBe(firstEditorRoot);
      expect(container.querySelector(".cm-content")).toHaveTextContent("Persistent");
    });

    it("keeps the editor view instance when line number visibility changes", () => {
      const { container, rerender } = render(
        <Editor initialText="Persistent" presentation={{ showLineNumbers: true }} />,
      );
      const firstEditorRoot = container.querySelector(".cm-editor");
      rerender(<Editor initialText="Persistent" presentation={{ showLineNumbers: false }} />);

      const secondEditorRoot = container.querySelector(".cm-editor");
      expect(secondEditorRoot).toBeInTheDocument();
      expect(secondEditorRoot).toBe(firstEditorRoot);
      expect(container.querySelector(".cm-lineNumbers")).not.toBeInTheDocument();
      expect(container.querySelector(".cm-content")).toHaveTextContent("Persistent");
    });

    it("keeps the editor view instance when text wrapping changes", () => {
      const { container, rerender } = render(
        <Editor initialText="Persistent" presentation={{ textWrappingEnabled: true }} />,
      );
      const firstEditorRoot = container.querySelector(".cm-editor");
      rerender(<Editor initialText="Persistent" presentation={{ textWrappingEnabled: false }} />);

      const secondEditorRoot = container.querySelector(".cm-editor");
      expect(secondEditorRoot).toBeInTheDocument();
      expect(secondEditorRoot).toBe(firstEditorRoot);
      expect(container.querySelector(".cm-lineWrapping")).not.toBeInTheDocument();
      expect(container.querySelector(".cm-content")).toHaveTextContent("Persistent");
    });

    it("keeps the editor view instance when syntax highlighting mode changes", () => {
      const { container, rerender } = render(
        <Editor initialText="# Heading" presentation={{ syntaxHighlightingEnabled: true }} />,
      );
      const firstEditorRoot = container.querySelector(".cm-editor");
      rerender(<Editor initialText="# Heading" presentation={{ syntaxHighlightingEnabled: false }} />);

      const secondEditorRoot = container.querySelector(".cm-editor");
      expect(secondEditorRoot).toBeInTheDocument();
      expect(secondEditorRoot).toBe(firstEditorRoot);
      expect(container.querySelector(".cm-content")).toHaveTextContent("# Heading");
    });

    it("focuses the editor when container is clicked", async () => {
      const { container } = render(<Editor />);
      fireEvent.click(screen.getByTestId("editor-container"));

      await waitFor(() => {
        const editorRoot = container.querySelector(".cm-editor");
        expect(editorRoot).toBeInTheDocument();
        expect(editorRoot?.contains(document.activeElement)).toBe(true);
      });
    });

    it("should apply typewriter scrolling when enabled", () => {
      const { container } = render(<Editor presentation={{ typewriterScrollingEnabled: true }} />);
      expect(container.querySelector(".cm-editor")).toBeInTheDocument();
    });

    it("should apply focus dimming in sentence mode", () => {
      const { container } = render(<Editor presentation={{ focusDimmingMode: "sentence" }} />);
      expect(container.querySelector(".cm-editor")).toBeInTheDocument();
    });

    it("should apply focus dimming in paragraph mode", () => {
      const { container } = render(<Editor presentation={{ focusDimmingMode: "paragraph" }} />);
      expect(container.querySelector(".cm-editor")).toBeInTheDocument();
    });

    it("should keep editor when typewriterScrollingEnabled changes", () => {
      const { container, rerender } = render(<Editor presentation={{ typewriterScrollingEnabled: false }} />);
      const firstEditorRoot = container.querySelector(".cm-editor");

      rerender(<Editor presentation={{ typewriterScrollingEnabled: true }} />);
      const secondEditorRoot = container.querySelector(".cm-editor");
      expect(secondEditorRoot).toBe(firstEditorRoot);
    });

    it("should keep editor when focusDimmingMode changes", () => {
      const { container, rerender } = render(<Editor presentation={{ focusDimmingMode: "off" }} />);
      const firstEditorRoot = container.querySelector(".cm-editor");

      rerender(<Editor presentation={{ focusDimmingMode: "sentence" }} />);
      const secondEditorRoot = container.querySelector(".cm-editor");
      expect(secondEditorRoot).toBe(firstEditorRoot);
    });

    it("should apply POS highlighting when enabled", () => {
      const { container } = render(<Editor presentation={{ posHighlightingEnabled: true }} />);
      expect(container.querySelector(".cm-editor")).toBeInTheDocument();
    });

    it("should not apply POS highlighting when disabled", () => {
      const { container } = render(<Editor presentation={{ posHighlightingEnabled: false }} />);
      expect(container.querySelector(".cm-editor")).toBeInTheDocument();
    });

    it("should keep editor when posHighlightingEnabled changes", () => {
      const { container, rerender } = render(<Editor presentation={{ posHighlightingEnabled: false }} />);
      const firstEditorRoot = container.querySelector(".cm-editor");

      rerender(<Editor presentation={{ posHighlightingEnabled: true }} />);
      const secondEditorRoot = container.querySelector(".cm-editor");
      expect(secondEditorRoot).toBe(firstEditorRoot);
    });
  });
});
