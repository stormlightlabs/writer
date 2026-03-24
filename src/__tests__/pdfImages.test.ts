import { preloadPdfImages } from "$pdf/images";
import type { MarkdownNode } from "$pdf/types";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("preloadPdfImages", () => {
  const locationId = 42;
  const docRelPath = "drafts/doc.md";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(convertFileSrc).mockImplementation((path: string) => `asset://localhost${path}`);
    vi.mocked(invoke).mockImplementation(async (command, payload) => {
      if (command === "asset_resolve") {
        const { assetPath } = payload as { assetPath: string };
        if (assetPath.includes("missing")) {
          throw new Error("missing");
        }

        switch (assetPath) {
          case ".writer-assets/abc123.png":
            return "/root/.writer-assets/abc123.png";
          case ".writer-assets/img.png":
            return "/root/.writer-assets/img.png";
          case ".writer-assets/diagram.svg":
            return "/root/.writer-assets/diagram.svg";
          case "images/photo.png":
            return "/root/drafts/images/photo.png";
          case "images/list-img.jpg":
            return "/root/drafts/images/list-img.jpg";
          default:
            return `/root/${assetPath}`;
        }
      }

      if (command === "svg_to_png") {
        return { type: "ok", value: "data:image/png;base64,c3Zn" };
      }

      return await Promise.resolve(null);
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("missing")) {
          return await Promise.resolve({ ok: false, status: 404 } as Response);
        }
        const encoder = new TextEncoder();
        const bytes = encoder.encode("fake-image-bytes");
        return await Promise.resolve(
          { ok: true, arrayBuffer: async () => await Promise.resolve(bytes.buffer) } as unknown as Response,
        );
      }),
    );
  });

  it("returns empty record when there are no image nodes", async () => {
    const nodes: MarkdownNode[] = [{ type: "heading", level: 1, content: "Hello" }, {
      type: "paragraph",
      content: "World",
    }];
    const result = await preloadPdfImages(nodes, locationId, docRelPath);
    expect(result).toEqual({});
  });

  it("resolves a local image to a base64 data URL", async () => {
    const nodes: MarkdownNode[] = [{ type: "image", src: ".writer-assets/abc123.png", alt: "test" }];
    const result = await preloadPdfImages(nodes, locationId, docRelPath);
    expect(convertFileSrc).toHaveBeenCalledWith("/root/.writer-assets/abc123.png");
    expect(result[".writer-assets/abc123.png"]).toMatch(/^data:image\/png;base64,/);
  });

  it("supports non-.writer-assets local image paths", async () => {
    const nodes: MarkdownNode[] = [{ type: "image", src: "images/photo.png", alt: "photo" }];
    const result = await preloadPdfImages(nodes, locationId, docRelPath);
    expect(convertFileSrc).toHaveBeenCalledWith("/root/drafts/images/photo.png");
    expect(result["images/photo.png"]).toMatch(/^data:image\/png;base64,/);
  });

  it("deduplicates repeated image references", async () => {
    const nodes: MarkdownNode[] = [{ type: "image", src: ".writer-assets/img.png", alt: "first" }, {
      type: "image",
      src: ".writer-assets/img.png",
      alt: "second",
    }];
    const result = await preloadPdfImages(nodes, locationId, docRelPath);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(result[".writer-assets/img.png"]).toBeDefined();
  });

  it("gracefully omits images that fail to resolve or fetch", async () => {
    const nodes: MarkdownNode[] = [{ type: "image", src: ".writer-assets/missing.png", alt: "broken" }];
    const result = await preloadPdfImages(nodes, locationId, docRelPath);
    expect(result[".writer-assets/missing.png"]).toBeUndefined();
  });

  it("converts SVG images via the backend command", async () => {
    const nodes: MarkdownNode[] = [{ type: "image", src: ".writer-assets/diagram.svg", alt: "svg" }];
    const result = await preloadPdfImages(nodes, locationId, docRelPath);
    expect(vi.mocked(invoke)).toHaveBeenCalledWith("svg_to_png", {
      locationId,
      docRelPath,
      assetPath: ".writer-assets/diagram.svg",
    });
    expect(result[".writer-assets/diagram.svg"]).toBe("data:image/png;base64,c3Zn");
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("collects images from inside list items", async () => {
    const nodes: MarkdownNode[] = [{
      type: "list",
      ordered: false,
      items: [{ content: [{ type: "image", src: "images/list-img.jpg", alt: "in list" }] }],
    }];
    const result = await preloadPdfImages(nodes, locationId, docRelPath);
    expect(result["images/list-img.jpg"]).toMatch(/^data:image\/jpeg;base64,/);
  });
});
