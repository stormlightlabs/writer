import { useStandardSiteController } from "$hooks/controllers/useStandardSiteController";
import type { Cmd } from "$ports";
import type { LocationDescriptor, PostRecord, PublicationListResult, PublicationRecord } from "$types";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRunCmd, mockPublicationList, mockPostList, mockPostGetMarkdown } = vi.hoisted(() => ({
  mockRunCmd: vi.fn<(cmd: Cmd) => Promise<void>>(),
  mockPublicationList: vi.fn(),
  mockPostList: vi.fn(),
  mockPostGetMarkdown: vi.fn(),
}));

vi.mock(
  "$ports",
  () => ({
    docExists: vi.fn(),
    docSave: vi.fn(),
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

    mockPublicationList.mockImplementation((didOrHandle, onOk: (value: PublicationListResult) => void) => ({
      type: "Invoke",
      command: "publication_list",
      payload: { didOrHandle },
      onOk,
      onErr: vi.fn(),
    }));

    mockPostList.mockImplementation((didOrHandle, publicationTid, onOk: (value: PostRecord[]) => void) => ({
      type: "Invoke",
      command: "post_list",
      payload: { didOrHandle, publicationTid },
      onOk,
      onErr: vi.fn(),
    }));

    mockPostGetMarkdown.mockImplementation((didOrHandle, tid, onOk: (value: string) => void) => ({
      type: "Invoke",
      command: "post_get_markdown",
      payload: { didOrHandle, tid },
      onOk,
      onErr: vi.fn(),
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
      }
    });
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
});
