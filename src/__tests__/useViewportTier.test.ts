import { getViewportTier, VIEWPORT_BREAKPOINTS } from "$hooks/useViewportTier";
import { describe, expect, it } from "vitest";

describe("getViewportTier", () => {
  it("returns compact at or below compact max", () => {
    expect(getViewportTier(320)).toBe("compact");
    expect(getViewportTier(VIEWPORT_BREAKPOINTS.compactMax)).toBe("compact");
  });

  it("returns narrow between compact and narrow max", () => {
    expect(getViewportTier(VIEWPORT_BREAKPOINTS.compactMax + 1)).toBe("narrow");
    expect(getViewportTier(VIEWPORT_BREAKPOINTS.narrowMax)).toBe("narrow");
  });

  it("returns standard between narrow and standard max", () => {
    expect(getViewportTier(VIEWPORT_BREAKPOINTS.narrowMax + 1)).toBe("standard");
    expect(getViewportTier(VIEWPORT_BREAKPOINTS.standardMax)).toBe("standard");
  });

  it("returns wide above standard max", () => {
    expect(getViewportTier(VIEWPORT_BREAKPOINTS.standardMax + 1)).toBe("wide");
    expect(getViewportTier(2200)).toBe("wide");
  });
});
