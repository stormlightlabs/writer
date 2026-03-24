import { useStandardSiteController } from "$hooks/controllers/useStandardSiteController";
import type { Cmd } from "$ports";
import type { LocationDescriptor, PostRecord, PublicationListResult, PublicationRecord } from "$types";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRunCmd,
  mockPublicationList,
  mockPostList,
  mockPostGetMarkdown,
  mockBlobDownload,
  mockDocExists,
  mockDocSave,
} = vi.hoisted(() => ({
  mockRunCmd: vi.fn<(cmd: Cmd) => Promise<void>>(),
  mockPublicationList: vi.fn(),
  mockPostList: vi.fn(),
  mockPostGetMarkdown: vi.fn(),
  mockBlobDownload: vi.fn(),
  mockDocExists: vi.fn(),
  mockDocSave: vi.fn(),
}));

vi.mock(
  "$ports",
  () => ({
    blobDownload: mockBlobDownload,
    docExists: mockDocExists,
    docSave: mockDocSave,
    postGetMarkdown: mockPostGetMarkdown,
    postList: mockPostList,
    publicationList: mockPublicationList,
    runCmd: mockRunCmd,
  }),
);

vi.mock(
  "$state/selectors",
  () => ({
    useStandardSiteUiState: vi.fn(() => ({ sheetMode: "closed", openPostImportSheet: vi.fn(), closeSheet: vi.fn() })),
  }),
);

const LOCATIONS: LocationDescriptor[] = [{
  id: 1,
  name: "Notes",
  root_path: "/tmp/notes",
  added_at: "2026-03-20T00:00:00Z",
}];

const PUBLICATIONS: PublicationRecord[] = [{
  uri: "at://did:plc:alice/site.standard.publication/3pub",
  tid: "3pub",
  name: "Example Publication",
  description: "",
  url: "https://example.com",
}];

const POSTS: PostRecord[] = [{
  uri: "at://did:plc:alice/site.standard.document/3post1",
  tid: "3post1",
  title: "First Post",
  description: "",
  textContent: "",
  publishedAt: "2026-03-20T00:00:00Z",
  updatedAt: "",
  tags: [],
  publicationUri: PUBLICATIONS[0].uri,
}, {
  uri: "at://did:plc:alice/site.standard.document/3post2",
  tid: "3post2",
  title: "Second Post",
  description: "",
  textContent: "",
  publishedAt: "2026-03-20T00:00:00Z",
  updatedAt: "",
  tags: [],
  publicationUri: PUBLICATIONS[0].uri,
}];

function publicationListResult(): PublicationListResult {
  return { publications: PUBLICATIONS, skippedInvalidCount: 0 };
}

describe("useStandardSiteController", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPublicationList.mockImplementation((didOrHandle, onOk: (value: PublicationListResult) => void, onErr) => ({
      type: "Invoke",
      command: "publication_list",
      payload: { didOrHandle },
      onOk,
      onErr,
    }));

    mockPostList.mockImplementation((didOrHandle, publicationTid, onOk: (value: PostRecord[]) => void, onErr) => ({
      type: "Invoke",
      command: "post_list",
      payload: { didOrHandle, publicationTid },
      onOk,
      onErr,
    }));

    mockPostGetMarkdown.mockImplementation((didOrHandle, tid, onOk: (value: string) => void, onErr) => ({
      type: "Invoke",
      command: "post_get_markdown",
      payload: { didOrHandle, tid },
      onOk,
      onErr,
    }));

    mockBlobDownload.mockImplementation((locationId, did, cid, targetDir, onOk: (value: string) => void, onErr) => ({
      type: "Invoke",
      command: "blob_download",
      payload: { locationId, did, cid, targetDir },
      onOk,
      onErr,
    }));

    mockDocExists.mockImplementation((locationId, relPath, onOk: (value: boolean) => void, onErr) => ({
      type: "Invoke",
      command: "doc_exists",
      payload: { locationId, relPath },
      onOk,
      onErr,
    }));

    mockDocSave.mockImplementation((locationId, relPath, text, onOk: (value: { success: boolean }) => void, onErr) => ({
      type: "Invoke",
      command: "doc_save",
      payload: { locationId, relPath, text },
      onOk,
      onErr,
    }));

    mockRunCmd.mockImplementation(async (cmd) => {
      if (cmd.type !== "Invoke") {
        return;
      }

      if (cmd.command === "publication_list") {
        await Promise.resolve();
        cmd.onOk(publicationListResult());
        return;
      }

      if (cmd.command === "post_list") {
        await Promise.resolve();
        cmd.onOk(POSTS);
        return;
      }

      if (cmd.command === "post_get_markdown") {
        await Promise.resolve();
        const payload = cmd.payload as { tid?: string };
        cmd.onOk(`# ${payload.tid ?? ""}`);
        return;
      }

      if (cmd.command === "doc_exists") {
        await Promise.resolve();
        cmd.onOk(false);
        return;
      }

      if (cmd.command === "blob_download") {
        await Promise.resolve();
        const payload = cmd.payload as { cid?: string };
        cmd.onOk(`${payload.cid ?? "blob"}.png`);
        return;
      }

      if (cmd.command === "doc_save") {
        await Promise.resolve();
        cmd.onOk({ success: true });
      }
    });

    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("updates the destination path when selecting a different post", async () => {
    const { result } = renderHook(() =>
      useStandardSiteController({ locations: LOCATIONS, selectedLocationId: 1, refreshSidebar: vi.fn() })
    );

    act(() => {
      result.current.setHandle("alice.bsky.social");
    });

    act(() => {
      result.current.handleBrowsePublications();
    });

    await waitFor(() => {
      expect(result.current.importState.selectedPostTid).toBe("3post1");
    });

    expect(result.current.importState.destinationRelPath).toBe("first-post.md");

    act(() => {
      result.current.handleSelectPost("3post2");
    });

    await waitFor(() => {
      expect(result.current.importState.selectedPostTid).toBe("3post2");
    });

    expect(result.current.importState.destinationRelPath).toBe("second-post.md");
  });

  it("downloads blob images and rewrites markdown before save", async () => {
    mockRunCmd.mockImplementation(async (cmd) => {
      if (cmd.type !== "Invoke") {
        return await Promise.resolve(void 0);
      }

      if (cmd.command === "publication_list") {
        cmd.onOk(publicationListResult());
        return await Promise.resolve(void 0);
      }

      if (cmd.command === "post_list") {
        cmd.onOk(POSTS);
        return await Promise.resolve(void 0);
      }

      if (cmd.command === "post_get_markdown") {
        cmd.onOk("![hero](at://blob/bafkrei123)");
        return await Promise.resolve(void 0);
      }

      if (cmd.command === "doc_exists") {
        cmd.onOk(false);
        return await Promise.resolve(void 0);
      }

      if (cmd.command === "blob_download") {
        cmd.onOk("images/bafkrei123.png");
        return await Promise.resolve(void 0);
      }

      if (cmd.command === "doc_save") {
        cmd.onOk({ success: true });
        return await Promise.resolve(void 0);
      }
    });

    const refreshSidebar = vi.fn();
    const { result } = renderHook(() =>
      useStandardSiteController({ locations: LOCATIONS, selectedLocationId: 1, refreshSidebar })
    );

    act(() => {
      result.current.setHandle("alice.bsky.social");
    });

    act(() => {
      result.current.handleBrowsePublications();
    });

    await waitFor(() => {
      expect(result.current.importState.selectedPostTid).toBe("3post1");
      expect(result.current.importState.previewMarkdown).toContain("at://blob/bafkrei123");
    });

    await act(async () => {
      await result.current.handleImport();
    });

    expect(mockBlobDownload).toHaveBeenCalledWith(
      1,
      "did:plc:alice",
      "bafkrei123",
      "images",
      expect.any(Function),
      expect.any(Function),
    );

    const docSaveCall = mockDocSave.mock.calls.at(-1);
    expect(docSaveCall).toBeDefined();
    expect(docSaveCall?.[2]).toBe("![hero](images/bafkrei123.png)");
    expect(refreshSidebar).toHaveBeenCalledWith(1);
  });

  it("cancels import when blob download fails and user chooses stop", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));

    mockRunCmd.mockImplementation(async (cmd) => {
      if (cmd.type !== "Invoke") {
        return await Promise.resolve(void 0);
      }

      if (cmd.command === "publication_list") {
        cmd.onOk(publicationListResult());
        return await Promise.resolve(void 0);
      }

      if (cmd.command === "post_list") {
        cmd.onOk(POSTS);
        return await Promise.resolve(void 0);
      }

      if (cmd.command === "post_get_markdown") {
        cmd.onOk("![hero](at://blob/bafkrei123)");
        return await Promise.resolve(void 0);
      }

      if (cmd.command === "doc_exists") {
        cmd.onOk(false);
        return await Promise.resolve(void 0);
      }

      if (cmd.command === "blob_download") {
        cmd.onErr({ code: "IO_ERROR", message: "download failed" });
        return await Promise.resolve(void 0);
      }
    });

    const { result } = renderHook(() =>
      useStandardSiteController({ locations: LOCATIONS, selectedLocationId: 1, refreshSidebar: vi.fn() })
    );

    act(() => {
      result.current.setHandle("alice.bsky.social");
    });

    act(() => {
      result.current.handleBrowsePublications();
    });

    await waitFor(() => {
      expect(result.current.importState.selectedPostTid).toBe("3post1");
    });

    await act(async () => {
      await result.current.handleImport();
    });

    expect(mockDocSave).not.toHaveBeenCalled();
  });
});
