import { Preview } from "$components/Preview";
import type { RenderResult } from "$types";
import { invoke } from "@tauri-apps/api/core";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  locationId: 7,
  docRelPath: "doc.md",
  blobDid: "did:plc:alice",
};

const normalize = (value: string) => {
  const segments = value.split("/");
  const normalized: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      normalized.pop();
      continue;
    }
    normalized.push(segment);
  }
  return `/${normalized.join("/")}`;
};

describe("Preview asset resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        return await Promise.resolve(
          { ok: true, arrayBuffer: async () => await Promise.resolve(bytes.buffer) } as unknown as Response,
        );
      }),
    );

    vi.mocked(invoke).mockImplementation(async (command, payload) => {
      if (command === "blob_download") {
        const { cid } = payload as { cid: string };
        return `images/${cid}.png`;
      }

      if (command !== "asset_resolve") {
        return await Promise.resolve(null);
      }

      const { docRelPath, assetPath } = payload as { docRelPath: string; assetPath: string };
      const docDir = docRelPath.includes("/") ? docRelPath.split("/").slice(0, -1).join("/") : "";

      if (assetPath === "images/missing.png") {
        throw new Error("missing");
      }

      return normalize(`/root/${docDir ? `${docDir}/` : ""}${assetPath}`);
    });
  });

  it("rewrites local image src values through the asset resolver", async () => {
    render(<Preview {...defaultProps} renderResult={makeRenderResult(`<img src="images/abc123.png" alt="test" />`)} />);

    const img = screen.getByRole("img", { name: "test" });
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("asset_resolve", {
        locationId: 7,
        docRelPath: "doc.md",
        assetPath: "images/abc123.png",
      });
      expect(img).toHaveAttribute("src", "asset://localhost/root/images/abc123.png");
    });
  });

  it("renders extensionless local image refs via data URL fallback", async () => {
    render(
      <Preview {...defaultProps} renderResult={makeRenderResult(`<img src="bc0fb832de00b2f654" alt="hash" />`)} />,
    );

    const img = screen.getByRole("img", { name: "hash" });
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("asset_resolve", {
        locationId: 7,
        docRelPath: "doc.md",
        assetPath: "bc0fb832de00b2f654",
      });
      expect(vi.mocked(fetch)).toHaveBeenCalled();
      expect(img.getAttribute("src") ?? "").toMatch(/^data:image\/png;base64,/);
    });
  });

  it("rewrites relative local image paths from subdirectory documents", async () => {
    render(
      <Preview
        {...defaultProps}
        docRelPath="drafts/doc.md"
        renderResult={makeRenderResult(`<img src="../images/cover.png" alt="cover" />`)} />,
    );

    const img = screen.getByRole("img", { name: "cover" });
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("asset_resolve", {
        locationId: 7,
        docRelPath: "drafts/doc.md",
        assetPath: "../images/cover.png",
      });
      expect(img).toHaveAttribute("src", "asset://localhost/root/images/cover.png");
    });
  });

  it("does not rewrite external image URLs", async () => {
    render(
      <Preview
        {...defaultProps}
        renderResult={makeRenderResult(`<img src="https://example.com/image.png" alt="ext" />`)} />,
    );

    const img = screen.getByRole("img", { name: "ext" });
    await waitFor(() => {
      expect(img).toHaveAttribute("src", "https://example.com/image.png");
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("resolves at://blob image URLs when blob DID context is provided", async () => {
    render(
      <Preview {...defaultProps} renderResult={makeRenderResult(`<img src="at://blob/bafkrei123" alt="blob" />`)} />,
    );

    const img = screen.getByRole("img", { name: "blob" });
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("blob_download", {
        locationId: 7,
        did: "did:plc:alice",
        cid: "bafkrei123",
        targetDir: "images",
      });
      expect(invoke).toHaveBeenCalledWith("asset_resolve", {
        locationId: 7,
        docRelPath: "doc.md",
        assetPath: "images/bafkrei123.png",
      });
      expect(img).toHaveAttribute("src", "asset://localhost/root/images/bafkrei123.png");
    });
  });

  it("leaves at://blob image URLs unresolved when blob DID context is missing", async () => {
    render(
      <Preview
        {...defaultProps}
        blobDid={undefined}
        renderResult={makeRenderResult(`<img src="at://blob/bafkrei999" alt="blob-missing" />`)} />,
    );

    const img = screen.getByRole("img", { name: "blob-missing" });
    await waitFor(() => {
      expect(img).toHaveAttribute("src", "at://blob/bafkrei999");
    });
    expect(invoke).not.toHaveBeenCalledWith("blob_download", expect.anything());
  });

  it("opens resolved local file links with the system opener", async () => {
    const user = userEvent.setup();
    render(<Preview {...defaultProps} renderResult={makeRenderResult(`<a href="files/report.pdf">Open report</a>`)} />);

    const link = screen.getByRole("link", { name: "Open report" });
    await user.click(link);

    await waitFor(() => {
      expect(openPath).toHaveBeenCalledWith("/root/files/report.pdf");
    });
  });

  it("opens external links with the system opener instead of navigating the webview", async () => {
    const user = userEvent.setup();
    render(<Preview {...defaultProps} renderResult={makeRenderResult(`<a href="https://example.com">External</a>`)} />);

    await user.click(screen.getByRole("link", { name: "External" }));

    await waitFor(() => {
      expect(openUrl).toHaveBeenCalledWith("https://example.com");
    });
  });

  it("leaves missing local images unresolved", async () => {
    render(
      <Preview {...defaultProps} renderResult={makeRenderResult(`<img src="images/missing.png" alt="missing" />`)} />,
    );

    const img = screen.getByRole("img", { name: "missing" });
    await waitFor(() => {
      expect(invoke).toHaveBeenCalled();
    });
    expect(img).toHaveAttribute("src", "images/missing.png");
  });
});
