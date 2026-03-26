import { describePdfFont, ensurePdfFontRegistered, resolvePdfFont } from "$pdf/fonts";
import { Font } from "@react-pdf/renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@react-pdf/renderer", () => ({ Font: { register: vi.fn(), load: vi.fn(async () => {}) } }));

describe("pdf fonts", () => {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const isOtf = url.endsWith(".otf");
    const bytes = isOtf
      ? new Uint8Array([0x4f, 0x54, 0x54, 0x4f, 0x00, 0x00])
      : new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x00]);

    return await Promise.resolve(
      new Response(bytes, { status: 200, headers: { "content-type": isOtf ? "font/otf" : "font/ttf" } }),
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers static IBM Plex Sans with italic support", async () => {
    await ensurePdfFontRegistered("IBM Plex Sans Variable", "custom");

    expect(Font.register).toHaveBeenCalledTimes(1);
    expect(Font.register).toHaveBeenCalledWith({
      family: "IBMPlexSans",
      fonts: expect.arrayContaining([
        expect.objectContaining({
          fontWeight: "normal",
          fontStyle: "italic",
          src: expect.stringMatching(/^data:font\/ttf;base64,/),
        }),
        expect.objectContaining({
          fontWeight: "bold",
          fontStyle: "italic",
          src: expect.stringMatching(/^data:font\/ttf;base64,/),
        }),
      ]),
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/fonts/ibm-plex-sans-400-normal.ttf"), {
      method: "GET",
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/fonts/ibm-plex-sans-700-italic.ttf"), {
      method: "GET",
    });
  });

  it("describes custom font sources for export diagnostics", () => {
    const description = describePdfFont("Monaspace Xenon", "custom");

    expect(description.family).toBe("MonaspaceXenon");
    expect(description.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: "monaspace-xenon-400-italic.otf", fontStyle: "italic", fontWeight: "normal" }),
        expect.objectContaining({ file: "monaspace-xenon-700-italic.otf", fontStyle: "italic", fontWeight: "bold" }),
      ]),
    );
  });

  it("registers bundled Noto Sans CJK SC using local OTF assets", async () => {
    await ensurePdfFontRegistered("Noto Sans CJK SC", "custom");

    expect(Font.register).toHaveBeenCalledWith({
      family: "NotoSansCJKSC",
      fonts: expect.arrayContaining([
        expect.objectContaining({
          fontWeight: "normal",
          fontStyle: "normal",
          src: expect.stringMatching(/^data:font\/otf;base64,/),
        }),
        expect.objectContaining({
          fontWeight: "bold",
          fontStyle: "italic",
          src: expect.stringMatching(/^data:font\/otf;base64,/),
        }),
      ]),
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/fonts/noto-sans-cjk-sc-400-normal.otf"), {
      method: "GET",
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/fonts/noto-sans-cjk-sc-700-normal.otf"), {
      method: "GET",
    });
  });

  it("falls back to Noto Sans CJK SC for proportional fonts with CJK content", () => {
    expect(resolvePdfFont("IBM Plex Sans Variable", "Hello 世界")).toBe("Noto Sans CJK SC");
  });

  it("falls back to Maple Mono for monospace fonts with CJK content", () => {
    expect(resolvePdfFont("IBM Plex Mono", "Hello 世界")).toBe("Maple Mono");
  });
});
