import { toImportMarkdown } from "$hooks/controllers/useAtProtoController";
import { describe, expect, it } from "vitest";

describe("toImportMarkdown", () => {
  it("passes markdown strings through unchanged", () => {
    expect(
      toImportMarkdown({
        uri: "at://did:plc:alice/sh.tangled.string/1",
        tid: "1",
        filename: "notes.md",
        description: "",
        contents: "# Hello",
        createdAt: "2026-03-19T10:00:00Z",
      }),
    ).toBe("# Hello");
  });

  it("wraps code strings in fenced code blocks", () => {
    expect(
      toImportMarkdown({
        uri: "at://did:plc:alice/sh.tangled.string/2",
        tid: "2",
        filename: "script.py",
        description: "",
        contents: "print('hi')",
        createdAt: "2026-03-19T10:00:00Z",
      }),
    ).toBe("```py\nprint('hi')\n```\n");
  });

  it("uses a longer fence when the source already contains triple backticks", () => {
    expect(
      toImportMarkdown({
        uri: "at://did:plc:alice/sh.tangled.string/3",
        tid: "3",
        filename: "script.ts",
        description: "",
        contents: "const fence = '```';",
        createdAt: "2026-03-19T10:00:00Z",
      }),
    ).toBe("````ts\nconst fence = '```';\n````\n");
  });
});
