import { docExists, docSave, postGetMarkdown, postList, publicationList, runCmd } from "$ports";
import { useStandardSiteUiState } from "$state/selectors";
import { showErrorToast, showSuccessToast, showWarnToast } from "$state/stores/toasts";
import type { LocationDescriptor, PostRecord, PublicationRecord } from "$types";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseStandardSiteControllerOptions = {
  locations: LocationDescriptor[];
  selectedLocationId?: number;
  refreshSidebar: (locationId?: number) => void;
};

type ImportState = {
  handle: string;
  browseHandle: string;
  publications: PublicationRecord[];
  skippedInvalidPublicationCount: number;
  selectedPublicationTid: string | null;
  posts: PostRecord[];
  selectedPostTid: string | null;
  selectedPost: PostRecord | null;
  previewMarkdown: string;
  destinationLocationId: number | null;
  destinationRelPath: string;
  isListingPublications: boolean;
  isListingPosts: boolean;
  isFetchingPreview: boolean;
  isSaving: boolean;
};

function getDefaultLocationId(locations: LocationDescriptor[], selectedLocationId?: number): number | null {
  if (selectedLocationId && locations.some((location) => location.id === selectedLocationId)) {
    return selectedLocationId;
  }

  return locations[0]?.id ?? null;
}

function normalizeImportPath(value: string): string {
  return value.trim().replaceAll("\\", "/").replace(/^\/+/, "");
}

function deriveDefaultRelPath(post: PostRecord): string {
  const slug = post.title.toLowerCase().trim().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-+|-+$/g, "");
  return slug ? `${slug}.md` : "post.md";
}

export function useStandardSiteController(
  { locations, selectedLocationId, refreshSidebar }: UseStandardSiteControllerOptions,
) {
  const { sheetMode, openPostImportSheet, closeSheet } = useStandardSiteUiState();

  const [handle, setHandle] = useState("");
  const [browseHandle, setBrowseHandle] = useState("");
  const [publications, setPublications] = useState<PublicationRecord[]>([]);
  const [skippedInvalidPublicationCount, setSkippedInvalidPublicationCount] = useState(0);
  const [selectedPublicationTid, setSelectedPublicationTid] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [selectedPostTid, setSelectedPostTid] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostRecord | null>(null);
  const [previewMarkdown, setPreviewMarkdown] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState<number | null>(null);
  const [destinationRelPath, setDestinationRelPath] = useState("");
  const [isListingPublications, setIsListingPublications] = useState(false);
  const [isListingPosts, setIsListingPosts] = useState(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const pubListRequestIdRef = useRef(0);
  const postListRequestIdRef = useRef(0);
  const previewRequestIdRef = useRef(0);

  useEffect(() => {
    if (destinationLocationId !== null && locations.some((location) => location.id === destinationLocationId)) {
      return;
    }

    setDestinationLocationId(getDefaultLocationId(locations, selectedLocationId));
  }, [destinationLocationId, locations, selectedLocationId]);

  const openImportSheet = useCallback(() => {
    setDestinationLocationId((current) => current ?? getDefaultLocationId(locations, selectedLocationId));
    openPostImportSheet();
  }, [locations, openPostImportSheet, selectedLocationId]);

  const handleSelectPost = useCallback((tid: string, ownerHandle = browseHandle) => {
    const trimmedTid = tid.trim();
    const trimmedOwner = ownerHandle.trim();
    if (!trimmedTid || !trimmedOwner) {
      return;
    }

    setSelectedPostTid(trimmedTid);
    setIsFetchingPreview(true);
    setPreviewMarkdown("");
    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;

    void runCmd(postGetMarkdown(trimmedOwner, trimmedTid, (markdown) => {
      if (previewRequestIdRef.current !== requestId) {
        return;
      }

      setIsFetchingPreview(false);
      setPreviewMarkdown(markdown);
    }, (error) => {
      if (previewRequestIdRef.current !== requestId) {
        return;
      }

      setIsFetchingPreview(false);
      logger.error(f("Failed to fetch post markdown", { owner: trimmedOwner, tid: trimmedTid, error }));
      showErrorToast(error.message);
    }));
  }, [browseHandle]);

  const handleSelectPostWithRecord = useCallback((tid: string, allPosts: PostRecord[], ownerHandle = browseHandle) => {
    const post = allPosts.find((p) => p.tid === tid) ?? null;
    setSelectedPost(post);
    if (post) {
      setDestinationRelPath(deriveDefaultRelPath(post));
    }
    handleSelectPost(tid, ownerHandle);
  }, [browseHandle, handleSelectPost]);

  const handleSelectPublication = useCallback((publicationTid: string, ownerHandle = browseHandle) => {
    const trimmedHandle = ownerHandle.trim();
    if (!trimmedHandle || isListingPosts) {
      return;
    }

    setSelectedPublicationTid(publicationTid);
    setPosts([]);
    setSelectedPostTid(null);
    setSelectedPost(null);
    setPreviewMarkdown("");
    setDestinationRelPath("");
    setIsListingPosts(true);
    const requestId = postListRequestIdRef.current + 1;
    postListRequestIdRef.current = requestId;

    void runCmd(postList(trimmedHandle, publicationTid, (nextPosts) => {
      if (postListRequestIdRef.current !== requestId) {
        return;
      }

      setIsListingPosts(false);
      setPosts(nextPosts);

      if (nextPosts.length === 0) {
        return;
      }

      const firstPost = nextPosts[0];
      if (!firstPost) {
        return;
      }

      handleSelectPostWithRecord(firstPost.tid, nextPosts, trimmedHandle);
    }, (error) => {
      if (postListRequestIdRef.current !== requestId) {
        return;
      }

      setIsListingPosts(false);
      logger.error(f("Failed to list posts", { handle: trimmedHandle, publicationTid, error }));
      showErrorToast(error.message);
    }));
  }, [browseHandle, handleSelectPostWithRecord, isListingPosts]);

  const handleBrowsePublications = useCallback(() => {
    const trimmedHandle = handle.trim();
    if (!trimmedHandle || isListingPublications) {
      return;
    }

    setIsListingPublications(true);
    setBrowseHandle(trimmedHandle);
    setPublications([]);
    setSkippedInvalidPublicationCount(0);
    setSelectedPublicationTid(null);
    setPosts([]);
    setSelectedPostTid(null);
    setSelectedPost(null);
    setPreviewMarkdown("");
    setDestinationRelPath("");
    const requestId = pubListRequestIdRef.current + 1;
    pubListRequestIdRef.current = requestId;

    void runCmd(publicationList(trimmedHandle, (result) => {
      if (pubListRequestIdRef.current !== requestId) {
        return;
      }

      const nextPublications = result.publications;
      setIsListingPublications(false);
      setPublications(nextPublications);
      setSkippedInvalidPublicationCount(result.skippedInvalidCount);

      if (result.skippedInvalidCount > 0) {
        showWarnToast(
          `Skipped ${result.skippedInvalidCount} invalid publication${result.skippedInvalidCount === 1 ? "" : "s"}.`,
        );
      }

      if (nextPublications.length === 0) {
        return;
      }

      const firstPub = nextPublications[0];
      if (!firstPub) {
        return;
      }

      handleSelectPublication(firstPub.tid, trimmedHandle);
    }, (error) => {
      if (pubListRequestIdRef.current !== requestId) {
        return;
      }

      setIsListingPublications(false);
      setSkippedInvalidPublicationCount(0);
      logger.error(f("Failed to list publications", { handle: trimmedHandle, error }));
      showErrorToast(error.message);
    }));
  }, [handle, handleSelectPublication, isListingPublications]);

  const handleImport = useCallback(async () => {
    if (isSaving || !selectedPost || !destinationLocationId) {
      return;
    }

    const relPath = normalizeImportPath(destinationRelPath);
    if (!relPath) {
      showErrorToast("Choose a destination path before importing.");
      return;
    }

    if (!previewMarkdown) {
      showErrorToast("No post content loaded. Select a post first.");
      return;
    }

    setIsSaving(true);

    const alreadyExists = await new Promise<boolean>((resolve) => {
      void runCmd(docExists(destinationLocationId, relPath, (exists) => {
        resolve(exists);
      }, (error) => {
        logger.error(f("Failed to check import destination", { destinationLocationId, relPath, error }));
        showErrorToast(error.message);
        resolve(true);
      }));
    });

    if (alreadyExists) {
      setIsSaving(false);
      showErrorToast(`A document already exists at ${relPath}. Choose a different path.`);
      return;
    }

    const saved = await new Promise<boolean>((resolve) => {
      void runCmd(docSave(destinationLocationId, relPath, previewMarkdown, (result) => {
        resolve(result.success);
      }, (error) => {
        logger.error(f("Failed to import post", { destinationLocationId, relPath, tid: selectedPost.tid, error }));
        showErrorToast(error.message);
        resolve(false);
      }));
    });

    setIsSaving(false);
    if (!saved) {
      return;
    }

    refreshSidebar(destinationLocationId);
    closeSheet();
    showSuccessToast(`Imported "${selectedPost.title}" into ${relPath}`);
  }, [closeSheet, destinationLocationId, destinationRelPath, isSaving, previewMarkdown, refreshSidebar, selectedPost]);

  const importState = useMemo<ImportState>(
    () => ({
      handle,
      browseHandle,
      publications,
      skippedInvalidPublicationCount,
      selectedPublicationTid,
      posts,
      selectedPostTid,
      selectedPost,
      previewMarkdown,
      destinationLocationId,
      destinationRelPath,
      isListingPublications,
      isListingPosts,
      isFetchingPreview,
      isSaving,
    }),
    [
      browseHandle,
      destinationLocationId,
      destinationRelPath,
      handle,
      isFetchingPreview,
      isListingPosts,
      isListingPublications,
      isSaving,
      posts,
      previewMarkdown,
      publications,
      skippedInvalidPublicationCount,
      selectedPost,
      selectedPostTid,
      selectedPublicationTid,
    ],
  );

  return {
    sheetMode,
    importState,
    openImportSheet,
    closeSheet,
    setHandle,
    setDestinationLocationId,
    setDestinationRelPath,
    handleBrowsePublications,
    handleSelectPublication: (publicationTid: string) => handleSelectPublication(publicationTid),
    handleSelectPost: (tid: string) => {
      const post = posts.find((p) => p.tid === tid) ?? null;
      setSelectedPost(post);
      if (post) {
        setDestinationRelPath(deriveDefaultRelPath(post));
      }
      handleSelectPost(tid);
    },
    handleImport,
    locations,
    hasLocations: locations.length > 0,
  };
}
