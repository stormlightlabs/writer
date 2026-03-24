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
          case "../images/abc123.png":
            return "/root/images/abc123.png";
          case "../images/img.png":
            return "/root/images/img.png";
          case "../images/diagram.svg":
            return "/root/images/diagram.svg";
          case "../images/photo.png":
            return "/root/images/photo.png";
          case "../images/list-img.jpg":
            return "/root/images/list-img.jpg";
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
    const nodes: MarkdownNode[] = [{ type: "image", src: "../images/abc123.png", alt: "test" }];
    const result = await preloadPdfImages(nodes, locationId, docRelPath);
    expect(convertFileSrc).toHaveBeenCalledWith("/root/images/abc123.png");
    expect(result["../images/abc123.png"]).toMatch(/^data:image\/png;base64,/);
  });

  it("supports location-root image paths referenced from nested documents", async () => {
    const nodes: MarkdownNode[] = [{ type: "image", src: "../images/photo.png", alt: "photo" }];
    const result = await preloadPdfImages(nodes, locationId, docRelPath);
    expect(convertFileSrc).toHaveBeenCalledWith("/root/images/photo.png");
    expect(result["../images/photo.png"]).toMatch(/^data:image\/png;base64,/);
  });

  it("deduplicates repeated image references", async () => {
    const nodes: MarkdownNode[] = [{ type: "image", src: "../images/img.png", alt: "first" }, {
      type: "image",
      src: "../images/img.png",
      alt: "second",
    }];
    const result = await preloadPdfImages(nodes, locationId, docRelPath);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(result["../images/img.png"]).toBeDefined();
  });

  it("gracefully omits images that fail to resolve or fetch", async () => {
    const nodes: MarkdownNode[] = [{ type: "image", src: "../images/missing.png", alt: "broken" }];
    const result = await preloadPdfImages(nodes, locationId, docRelPath);
    expect(result["../images/missing.png"]).toBeUndefined();
  });

  it("converts SVG images via the backend command", async () => {
    const nodes: MarkdownNode[] = [{ type: "image", src: "../images/diagram.svg", alt: "svg" }];
    const result = await preloadPdfImages(nodes, locationId, docRelPath);
    expect(vi.mocked(invoke)).toHaveBeenCalledWith("svg_to_png", {
      locationId,
      docRelPath,
      assetPath: "../images/diagram.svg",
    });
    expect(result["../images/diagram.svg"]).toBe("data:image/png;base64,c3Zn");
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("collects images from inside list items", async () => {
    const nodes: MarkdownNode[] = [{
      type: "list",
      ordered: false,
      items: [{ content: [{ type: "image", src: "../images/list-img.jpg", alt: "in list" }] }],
    }];
    const result = await preloadPdfImages(nodes, locationId, docRelPath);
    expect(result["../images/list-img.jpg"]).toMatch(/^data:image\/jpeg;base64,/);
  });
});
