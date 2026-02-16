/**
 * Tests for Editor component
 */

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
      render(<Editor theme="light" />);
      const container = screen.getByTestId("editor-container");
      expect(container).toHaveAttribute("data-theme", "light");
    });

    it("should set data-ready attribute when editor is initialized", () => {
      render(<Editor />);
      const container = screen.getByTestId("editor-container");
      expect(container).toHaveAttribute("data-ready", "true");
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
      render(<Editor theme="dark" />);
      const container = screen.getByTestId("editor-container");
      expect(container).toHaveAttribute("data-theme", "dark");
    });

    it("should support light theme", () => {
      render(<Editor theme="light" />);
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
          expect(mockOnChange).toHaveBeenCalledWith();
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
          expect(mockOnChange).toHaveBeenCalledWith();
        }, { timeout: 200 });
      }
    });
  });
});
