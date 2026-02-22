import { describePdfFont, ensurePdfFontRegistered } from "$pdf/fonts";
import { Font } from "@react-pdf/renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@react-pdf/renderer", () => ({ Font: { register: vi.fn(), load: vi.fn(async () => {}) } }));

describe("pdf fonts", () => {
  // oxlint-disable-next-line require-await
  const fetchMock = vi.fn(async () =>
    new Response(new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x00]), {
      status: 200,
      headers: { "content-type": "font/ttf" },
    })
  );

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
});
