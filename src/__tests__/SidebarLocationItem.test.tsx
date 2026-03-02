import { canDropDocumentIntoFolder, canDropFolderIntoFolder } from "$components/Sidebar/SidebarLocationItem";
import { checkDropDocumentIntoFolder, walkUpToValidDestination } from "$dnd/sidebar";
import { describe, expect, it } from "vitest";

describe("canDropDocumentIntoFolder", () => {
  it("rejects non-document drag payloads", () => {
    expect(canDropDocumentIntoFolder(null, 1, "archive")).toBe(false);
    expect(canDropDocumentIntoFolder({ type: "tab" }, 1, "archive")).toBe(false);
  });

  it("allows cross-location drops into folders", () => {
    expect(canDropDocumentIntoFolder({ type: "document", locationId: 2, relPath: "nested/file.md" }, 1, "archive"))
      .toBe(true);
  });

  it("blocks no-op same-folder drops", () => {
    expect(canDropDocumentIntoFolder({ type: "document", locationId: 1, relPath: "archive/file.md" }, 1, "archive"))
      .toBe(false);
  });

  it("allows moving from nested folder to ancestor folder", () => {
    expect(
      canDropDocumentIntoFolder({ type: "document", locationId: 1, relPath: "archive/2026/file.md" }, 1, "archive"),
    ).toBe(true);
  });
});

describe("checkDropDocumentIntoFolder", () => {
  it("reports no-op drops explicitly", () => {
    expect(checkDropDocumentIntoFolder({ type: "document", locationId: 1, relPath: "archive/file.md" }, 1, "archive"))
      .toBe("noop");
  });
});

describe("walkUpToValidDestination", () => {
  it("returns null for same-folder document drops instead of walking up", () => {
    const sourceData = { type: "document" as const, locationId: 1, relPath: "archive/file.md", title: "file" };
    const destination = { locationId: 1, folderPath: "archive", targetType: "folder" as const };

    expect(walkUpToValidDestination(sourceData, destination)).toBeNull();
  });
});

describe("canDropFolderIntoFolder", () => {
  it("blocks folder drops into itself", () => {
    expect(canDropFolderIntoFolder({ type: "folder", locationId: 1, relPath: "samples" }, 1, "samples")).toBe(false);
  });

  it("blocks moving folder into one of its descendants", () => {
    expect(canDropFolderIntoFolder({ type: "folder", locationId: 1, relPath: "samples" }, 1, "samples/inner")).toBe(
      false,
    );
  });

  it("allows moving folder into a different sibling folder", () => {
    expect(canDropFolderIntoFolder({ type: "folder", locationId: 1, relPath: "samples" }, 1, "archive")).toBe(true);
  });

  it("allows moving folder into another location", () => {
    expect(canDropFolderIntoFolder({ type: "folder", locationId: 1, relPath: "samples" }, 2, "archive")).toBe(true);
  });
});
