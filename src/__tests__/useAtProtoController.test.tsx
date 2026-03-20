import { toImportMarkdown } from "$hooks/controllers/useAtProtoController";
import { stringCreate, stringDelete, stringUpdate } from "$ports";
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

const noop = () => {};

describe("stringCreate command builder", () => {
  it("builds an invoke command with correct name and payload", () => {
    const cmd = stringCreate("notes.md", "My notes", "# Hello", noop, noop);
    expect(cmd.type).toBe("Invoke");
    if (cmd.type === "Invoke") {
      expect(cmd.command).toBe("string_create");
      expect(cmd.payload).toEqual({ filename: "notes.md", description: "My notes", contents: "# Hello" });
    }
  });
});

describe("stringUpdate command builder", () => {
  it("builds an invoke command with tid, filename, description and contents", () => {
    const cmd = stringUpdate("abc123", "updated.md", "Updated", "new body", noop, noop);
    expect(cmd.type).toBe("Invoke");
    if (cmd.type === "Invoke") {
      expect(cmd.command).toBe("string_update");
      expect(cmd.payload).toEqual({
        tid: "abc123",
        filename: "updated.md",
        description: "Updated",
        contents: "new body",
      });
    }
  });
});

describe("stringDelete command builder", () => {
  it("builds an invoke command with only the tid", () => {
    const cmd = stringDelete("abc123", noop, noop);
    expect(cmd.type).toBe("Invoke");
    if (cmd.type === "Invoke") {
      expect(cmd.command).toBe("string_delete");
      expect(cmd.payload).toEqual({ tid: "abc123" });
    }
  });
});
