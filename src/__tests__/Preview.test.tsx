import { Preview, resolveAssetSrc } from "$components/Preview";
import type { RenderResult } from "$types";
import { convertFileSrc } from "@tauri-apps/api/core";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const makeRenderResult = (html: string): RenderResult => ({
  html,
  metadata: { title: null, outline: [], links: [], task_items: { total: 0, completed: 0 }, word_count: 0 },
});

const defaultProps = {
  theme: "dark" as const,
  editorLine: 1,
  previewStyle: "github" as const,
  editorFontFamily: "IBM Plex Mono" as const,
};

describe("resolveAssetSrc", () => {
  it("resolves a root-level asset path", () => {
    expect(resolveAssetSrc("/root", "doc.md", ".writer-assets/img.png")).toBe("/root/.writer-assets/img.png");
  });

  it("resolves a relative asset path from a subdirectory document", () => {
    expect(resolveAssetSrc("/root", "drafts/doc.md", "../.writer-assets/img.png")).toBe("/root/.writer-assets/img.png");
  });

  it("resolves a deeply nested document", () => {
    expect(resolveAssetSrc("/root", "a/b/doc.md", "../../.writer-assets/img.png")).toBe("/root/.writer-assets/img.png");
  });

  it("handles no document subdirectory (root doc) with .writer-assets/ src", () => {
    expect(resolveAssetSrc("/my/location", "notes.md", ".writer-assets/abc.jpg")).toBe(
      "/my/location/.writer-assets/abc.jpg",
    );
  });
});

describe("Preview image resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(convertFileSrc).mockImplementation((path: string) => `asset://localhost${path}`);
  });

  it("rewrites .writer-assets/ img src to convertFileSrc URL", () => {
    const html = `<img src=".writer-assets/abc123.png" alt="test" />`;
    render(
      <Preview
        {...defaultProps}
        renderResult={makeRenderResult(html)}
        locationRootPath="/Users/test/notes"
        docRelPath="doc.md" />,
    );

    const img = screen.getByRole("img", { name: "test" });
    expect(convertFileSrc).toHaveBeenCalledWith("/Users/test/notes/.writer-assets/abc123.png");
    expect(img).toHaveAttribute("src", "asset://localhost/Users/test/notes/.writer-assets/abc123.png");
  });

  it("rewrites relative asset paths from subdirectory documents", () => {
    const html = `<img src="../.writer-assets/img.jpg" alt="sub" />`;
    render(
      <Preview
        {...defaultProps}
        renderResult={makeRenderResult(html)}
        locationRootPath="/root"
        docRelPath="drafts/doc.md" />,
    );

    const img = screen.getByRole("img", { name: "sub" });
    expect(convertFileSrc).toHaveBeenCalledWith("/root/.writer-assets/img.jpg");
    expect(img).toHaveAttribute("src", "asset://localhost/root/.writer-assets/img.jpg");
  });

  it("does not rewrite external http URLs", () => {
    const html = `<img src="https://example.com/image.png" alt="ext" />`;
    render(
      <Preview {...defaultProps} renderResult={makeRenderResult(html)} locationRootPath="/root" docRelPath="doc.md" />,
    );

    const img = screen.getByRole("img", { name: "ext" });
    expect(convertFileSrc).not.toHaveBeenCalled();
    expect(img).toHaveAttribute("src", "https://example.com/image.png");
  });

  it("does not rewrite already-resolved asset: URLs", () => {
    const html = `<img src="asset://localhost/root/.writer-assets/img.png" alt="already" />`;
    render(
      <Preview {...defaultProps} renderResult={makeRenderResult(html)} locationRootPath="/root" docRelPath="doc.md" />,
    );

    const img = screen.getByRole("img", { name: "already" });
    expect(convertFileSrc).not.toHaveBeenCalled();
    expect(img).toHaveAttribute("src", "asset://localhost/root/.writer-assets/img.png");
  });

  it("does not rewrite anything when locationRootPath is not provided", () => {
    const html = `<img src=".writer-assets/img.png" alt="no-path" />`;
    render(<Preview {...defaultProps} renderResult={makeRenderResult(html)} docRelPath="doc.md" />);

    const img = screen.getByRole("img", { name: "no-path" });
    expect(convertFileSrc).not.toHaveBeenCalled();
    expect(img).toHaveAttribute("src", ".writer-assets/img.png");
  });

  it("re-resolves images when renderResult changes", () => {
    const { rerender } = render(
      <Preview
        {...defaultProps}
        renderResult={makeRenderResult(`<img src=".writer-assets/a.png" alt="a" />`)}
        locationRootPath="/root"
        docRelPath="doc.md" />,
    );

    expect(convertFileSrc).toHaveBeenCalledWith("/root/.writer-assets/a.png");
    vi.clearAllMocks();

    rerender(
      <Preview
        {...defaultProps}
        renderResult={makeRenderResult(`<img src=".writer-assets/b.png" alt="b" />`)}
        locationRootPath="/root"
        docRelPath="doc.md" />,
    );

    expect(convertFileSrc).toHaveBeenCalledWith("/root/.writer-assets/b.png");
  });
});
