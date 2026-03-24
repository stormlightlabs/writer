import { preloadPdfImages, resolveAssetSrc } from "$pdf/images";
import type { MarkdownNode } from "$pdf/types";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("resolveAssetSrc", () => {
  it("resolves root-level asset from a root doc", () => {
    expect(resolveAssetSrc("/root", "doc.md", ".writer-assets/img.png")).toBe("/root/.writer-assets/img.png");
  });

  it("resolves via ../ from a subdirectory doc", () => {
    expect(resolveAssetSrc("/root", "drafts/doc.md", "../.writer-assets/img.png")).toBe("/root/.writer-assets/img.png");
  });

  it("resolves deeply nested doc", () => {
    expect(resolveAssetSrc("/root", "a/b/c/doc.md", "../../../.writer-assets/img.png")).toBe(
      "/root/.writer-assets/img.png",
    );
  });
});

describe("preloadPdfImages", () => {
  const locationRootPath = "/Users/test/notes";
  const docRelPath = "doc.md";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(convertFileSrc).mockImplementation((path: string) => `asset://localhost${path}`);
    vi.mocked(invoke).mockResolvedValue({ type: "ok", value: "data:image/png;base64,c3Zn" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("missing")) {
          return { ok: false, status: 404 } as Response;
        }
        const encoder = new TextEncoder();
        const bytes = encoder.encode("fake-image-bytes");
        return await new Promise((resolve) => {
          resolve({
            ok: true,
            arrayBuffer: async () =>
              await new Promise((r) => {
                r(bytes.buffer);
              }),
          } as unknown as Response);
        });
      }),
    );
  });

  it("returns empty record when there are no image nodes", async () => {
    const nodes: MarkdownNode[] = [{ type: "heading", level: 1, content: "Hello" }, {
      type: "paragraph",
      content: "World",
    }];
    const result = await preloadPdfImages(nodes, locationRootPath, docRelPath);
    expect(result).toEqual({});
  });

  it("resolves a .writer-assets/ image to a base64 data URL", async () => {
    const nodes: MarkdownNode[] = [{ type: "image", src: ".writer-assets/abc123.png", alt: "test" }];
    const result = await preloadPdfImages(nodes, locationRootPath, docRelPath);
    expect(convertFileSrc).toHaveBeenCalledWith(`${locationRootPath}/.writer-assets/abc123.png`);
    expect(result[".writer-assets/abc123.png"]).toMatch(/^data:image\/png;base64,/);
  });

  it("deduplicates the same image referenced multiple times", async () => {
    const nodes: MarkdownNode[] = [{ type: "image", src: ".writer-assets/img.png", alt: "first" }, {
      type: "image",
      src: ".writer-assets/img.png",
      alt: "second",
    }];
    const result = await preloadPdfImages(nodes, locationRootPath, docRelPath);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(result[".writer-assets/img.png"]).toBeDefined();
  });

  it("gracefully omits images that fail to fetch", async () => {
    const nodes: MarkdownNode[] = [{ type: "image", src: ".writer-assets/missing.png", alt: "broken" }];
    const result = await preloadPdfImages(nodes, locationRootPath, docRelPath);
    expect(result[".writer-assets/missing.png"]).toBeUndefined();
  });

  it("converts SVG images via svg_to_png backend command", async () => {
    const nodes: MarkdownNode[] = [{ type: "image", src: ".writer-assets/diagram.svg", alt: "svg" }];
    const result = await preloadPdfImages(nodes, locationRootPath, docRelPath);
    expect(vi.mocked(invoke)).toHaveBeenCalledWith("svg_to_png", {
      absolutePath: `${locationRootPath}/.writer-assets/diagram.svg`,
    });
    expect(result[".writer-assets/diagram.svg"]).toBe("data:image/png;base64,c3Zn");
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("skips images not under .writer-assets/", async () => {
    const nodes: MarkdownNode[] = [{ type: "image", src: "https://example.com/img.png", alt: "external" }];
    const result = await preloadPdfImages(nodes, locationRootPath, docRelPath);
    expect(result).toEqual({});
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("collects images from inside list items", async () => {
    const nodes: MarkdownNode[] = [{
      type: "list",
      ordered: false,
      items: [{ type: "image", src: ".writer-assets/list-img.jpg", alt: "in list" }],
    }];
    const result = await preloadPdfImages(nodes, locationRootPath, docRelPath);
    expect(result[".writer-assets/list-img.jpg"]).toMatch(/^data:image\/jpeg;base64,/);
  });
});
