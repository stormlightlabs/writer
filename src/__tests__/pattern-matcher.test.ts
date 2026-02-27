import { PatternMatcher } from "$editor/pattern-matcher";
import { describe, expect, it } from "vitest";

describe("PatternMatcher", () => {
  it("should find single-word patterns", () => {
    const patterns = [{ text: "basically", category: "filler" as const }, {
      text: "actually",
      category: "filler" as const,
    }];
    const matcher = new PatternMatcher(patterns);
    const text = "This is basically just a test actually";
    const matches = matcher.scan(text);

    expect(matches).toHaveLength(2);
    expect(matches[0].pattern.text).toBe("basically");
    expect(matches[1].pattern.text).toBe("actually");
  });

  it("should find multi-word patterns", () => {
    const patterns = [{ text: "in order to", category: "redundancy" as const }, {
      text: "at this point in time",
      category: "redundancy" as const,
    }];
    const matcher = new PatternMatcher(patterns);
    const text = "We need to act in order to succeed. At this point in time, we are ready.";
    const matches = matcher.scan(text);

    expect(matches).toHaveLength(2);
    expect(matches[0].pattern.text).toBe("in order to");
    expect(matches[1].pattern.text).toBe("at this point in time");
  });

  it("should respect word boundaries", () => {
    const patterns = [{ text: "just", category: "filler" as const }];
    const matcher = new PatternMatcher(patterns);
    const text = "This is just a test. Justice is important. Adjusting takes time.";
    const matches = matcher.scan(text);

    expect(matches).toHaveLength(1);
    expect(matches[0].pattern.text).toBe("just");
    expect(matches[0].start).toBe(8);
    expect(matches[0].end).toBe(12);
  });

  it("should respect unicode word boundaries", () => {
    const patterns = [{ text: "just", category: "filler" as const }];
    const matcher = new PatternMatcher(patterns);
    const text = "éjust should not match, but just should.";
    const matches = matcher.scan(text);
    const expectedStart = text.lastIndexOf("just");

    expect(matches).toHaveLength(1);
    expect(matches[0].start).toBe(expectedStart);
    expect(matches[0].end).toBe(matches[0].start + 4);
  });

  it("should be case-insensitive", () => {
    const patterns = [{ text: "basically", category: "filler" as const }];
    const matcher = new PatternMatcher(patterns);
    const text = "This is BASICALLY a test. Basically speaking.";
    const matches = matcher.scan(text);

    expect(matches).toHaveLength(2);
  });

  it("should find overlapping patterns", () => {
    const patterns = [{ text: "at the", category: "filler" as const }, {
      text: "at the end of the day",
      category: "cliche" as const,
    }];
    const matcher = new PatternMatcher(patterns);
    const text = "At the end of the day, we won.";
    const matches = matcher.scan(text);

    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("should rebuild with new patterns", () => {
    const patterns = [{ text: "basically", category: "filler" as const }];
    const matcher = new PatternMatcher(patterns);
    expect(matcher.scan("basically")).toHaveLength(1);

    matcher.rebuild([{ text: "actually", category: "filler" as const }]);
    expect(matcher.scan("basically")).toHaveLength(0);
    expect(matcher.scan("actually")).toHaveLength(1);
  });

  it("should handle empty patterns", () => {
    const matcher = new PatternMatcher([]);
    const matches = matcher.scan("Any text here");

    expect(matches).toHaveLength(0);
  });

  it("should handle empty text", () => {
    const patterns = [{ text: "test", category: "filler" as const }];
    const matcher = new PatternMatcher(patterns);
    const matches = matcher.scan("");

    expect(matches).toHaveLength(0);
  });
});
