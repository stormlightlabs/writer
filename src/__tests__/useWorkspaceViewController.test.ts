import { deriveWordCount } from "$hooks/controllers/useWorkspaceViewController";
import { describe, expect, it } from "vitest";

describe("deriveWordCount", () => {
  it("prefers Rust-rendered metadata word count when present", () => {
    expect(deriveWordCount("one two", 12)).toBe(12);
  });

  it("falls back to client-side split when metadata is unavailable", () => {
    expect(deriveWordCount("one two three", void 0)).toBe(3);
    expect(deriveWordCount("   ", void 0)).toBe(0);
  });
});
