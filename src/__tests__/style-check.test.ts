import { collectStyleMatches, resolveStyleMatchAtPosition, styleCheck } from "$editor/style-check";
import type { StyleMatch } from "$editor/types";
import { runStyleCheckScan } from "$ports";
import { EditorState, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$ports", async () => {
  const actual = await vi.importActual<typeof import("$ports")>("$ports");
  return { ...actual, runStyleCheckScan: vi.fn() };
});

const runStyleCheckScanMock = vi.mocked(runStyleCheckScan);

function lineAndColumn(text: string, position: number): { line: number; column: number } {
  const lines = text.slice(0, position).split("\n");
  return { line: lines.length, column: lines.at(-1)?.length ?? 0 };
}

describe("styleCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("collects exact absolute ranges with document-cased text", () => {
    const doc = "Start BASICALLY now.\nAnd at this point in time we decide.";

    const matches = collectStyleMatches(Text.of(doc.split("\n")), [{
      from: doc.indexOf("BASICALLY"),
      to: doc.indexOf("BASICALLY") + "BASICALLY".length,
      category: "filler",
    }, {
      from: doc.indexOf("at this point in time"),
      to: doc.indexOf("at this point in time") + "at this point in time".length,
      category: "redundancy",
      replacement: "now",
    }]);
    const first = lineAndColumn(doc, doc.indexOf("BASICALLY"));
    const second = lineAndColumn(doc, doc.indexOf("at this point in time"));

    expect(matches).toStrictEqual([{
      from: doc.indexOf("BASICALLY"),
      to: doc.indexOf("BASICALLY") + "BASICALLY".length,
      text: "BASICALLY",
      category: "filler",
      replacement: undefined,
      line: first.line,
      column: first.column,
    }, {
      from: doc.indexOf("at this point in time"),
      to: doc.indexOf("at this point in time") + "at this point in time".length,
      text: "at this point in time",
      category: "redundancy",
      replacement: "now",
      line: second.line,
      column: second.column,
    }]);
  });

  it("deduplicates identical overlapping dictionary/custom results", () => {
    const matches = collectStyleMatches(Text.of(["actually"]), [{ from: 0, to: 8, category: "filler" }, {
      from: 0,
      to: 8,
      category: "filler",
    }]);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ from: 0, to: 8, text: "actually", category: "filler" });
  });

  it("resolves tooltip hover positions with side-aware boundaries", () => {
    const matches: StyleMatch[] = [{ from: 5, to: 10, text: "match", category: "filler", line: 1, column: 5 }];

    expect(resolveStyleMatchAtPosition(matches, 7, 1)).toStrictEqual(matches[0]);
    expect(resolveStyleMatchAtPosition(matches, 10, -1)).toStrictEqual(matches[0]);
    expect(resolveStyleMatchAtPosition(matches, 10, 1)).toBeNull();
  });

  it("emits style matches through the editor extension for full-document ranges", async () => {
    runStyleCheckScanMock.mockResolvedValueOnce([{ from: 16, to: 25, category: "filler" }, {
      from: 39,
      to: 60,
      category: "redundancy",
      replacement: "now",
    }]).mockResolvedValueOnce([{ from: 25, to: 34, category: "filler" }, {
      from: 48,
      to: 69,
      category: "redundancy",
      replacement: "now",
    }]);

    const onMatchesChange = vi.fn();
    const state = EditorState.create({
      doc: "Prefix.\nThis is BASICALLY fine.\nLater, at this point in time we ship.",
      extensions: [
        styleCheck({
          enabled: true,
          categories: { filler: false, redundancy: false, cliche: false },
          customPatterns: [{ text: "basically", category: "filler" }, {
            text: "at this point in time",
            category: "redundancy",
            replacement: "now",
          }],
          onMatchesChange,
        }),
      ],
    });
    const view = new EditorView({ state });

    await vi.waitFor(() => {
      expect(onMatchesChange).toHaveBeenCalled();
    });

    const initialMatches = onMatchesChange.mock.lastCall?.[0] as StyleMatch[];
    expect(initialMatches).toHaveLength(2);
    expect(initialMatches[0]).toMatchObject({ text: "BASICALLY", category: "filler" });
    expect(initialMatches[1]).toMatchObject({
      text: "at this point in time",
      category: "redundancy",
      replacement: "now",
    });

    view.dispatch({ changes: { from: 0, to: 0, insert: "Actually. " } });

    await vi.waitFor(() => {
      expect(runStyleCheckScanMock).toHaveBeenCalledTimes(2);
    });

    const updatedMatches = onMatchesChange.mock.lastCall?.[0] as StyleMatch[];
    expect(updatedMatches).toHaveLength(2);

    view.destroy();
  });

  it("scans built-ins from backend and reports mixed categories", async () => {
    runStyleCheckScanMock.mockResolvedValueOnce([{ from: 0, to: 9, category: "filler" }, {
      from: 17,
      to: 28,
      category: "redundancy",
    }, { from: 46, to: 66, category: "cliche" }]);

    const onMatchesChange = vi.fn();
    const state = EditorState.create({
      doc: "Basically we act in order to ship, and we may beat around the bush.",
      extensions: [
        styleCheck({
          enabled: true,
          categories: { filler: true, redundancy: true, cliche: true },
          customPatterns: [],
          onMatchesChange,
        }),
      ],
    });
    const view = new EditorView({ state });

    await vi.waitFor(() => {
      expect(onMatchesChange).toHaveBeenCalled();
    });

    const matches = onMatchesChange.mock.lastCall?.[0] as StyleMatch[];
    const categories = new Set(matches.map((match) => match.category));
    const texts = matches.map((match) => match.text.toLowerCase());

    expect(categories.has("filler")).toBeTruthy();
    expect(categories.has("redundancy")).toBeTruthy();
    expect(categories.has("cliche")).toBeTruthy();
    expect(texts).toContain("basically");
    expect(texts).toContain("in order to");
    expect(texts).toContain("beat around the bush");

    view.destroy();
  });

  it("applies configured marker style to style decorations", async () => {
    runStyleCheckScanMock.mockResolvedValueOnce([{ from: 8, to: 17, category: "filler" }]);

    const state = EditorState.create({
      doc: "This is basically a test.",
      extensions: [
        styleCheck({
          enabled: true,
          categories: { filler: false, redundancy: false, cliche: false },
          customPatterns: [{ text: "basically", category: "filler" }],
          markerStyle: "underline",
        }),
      ],
    });
    const parent = document.createElement("div");
    document.body.append(parent);
    const view = new EditorView({ state, parent });

    await vi.waitFor(() => {
      const flagged = parent.querySelector(".style-flag");
      expect(flagged).toBeInTheDocument();
      expect(flagged).toHaveClass("style-marker-underline");
      expect(flagged).toHaveAttribute("data-marker-style", "underline");
    });

    view.destroy();
    parent.remove();
  });
});
