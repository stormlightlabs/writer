import {
  atprotoLogin,
  atprotoLogout,
  atprotoSessionStatus,
  docExists,
  docSave,
  gistGet,
  gistListPublic,
  runCmd,
  stringCreate,
  stringGet,
  stringList,
} from "$ports";
import { useAtProtoUiState } from "$state/selectors";
import { showErrorToast, showSuccessToast } from "$state/stores/toasts";
import type { GithubGistRecord, LocationDescriptor, TangledStringRecord } from "$types";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PLAINTEXT_EXTENSIONS = new Set(["md", "markdown", "mdown", "txt", "text"]);

function getFileExtension(filename: string): string | null {
  const basename = filename.trim().split("/").pop() ?? "";
  const dotIndex = basename.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === basename.length - 1) {
    return null;
  }

  return basename.slice(dotIndex + 1).toLowerCase();
}

function getLanguageTag(extension: string | null): string {
  switch (extension) {
    case "yml":
      return "yaml";
    default:
      return extension ?? "";
  }
}

function buildFence(contents: string): string {
  let fence = "```";
  while (contents.includes(fence)) {
    fence += "`";
  }
  return fence;
}

export function toImportMarkdown(record: TangledStringRecord | null): string {
  if (!record) {
    return "";
  }

  return toImportMarkdownText(record.filename, record.contents);
}

export function toGistImportMarkdown(record: GithubGistRecord | null): string {
  if (!record) {
    return "";
  }

  return toImportMarkdownText(record.filename, record.contents, record.language);
}

function toImportMarkdownText(filename: string, contents: string, languageHint?: string | null): string {
  const extension = getFileExtension(filename);
  if (!extension || PLAINTEXT_EXTENSIONS.has(extension)) {
    return contents;
  }

  const language = (languageHint ?? "").trim().toLowerCase() || getLanguageTag(extension);
  const fence = buildFence(contents);
  return `${fence}${language}\n${contents}\n${fence}\n`;
}

function normalizeImportPath(value: string): string {
  return value.trim().replaceAll("\\", "/").replace(/^\/+/, "");
}

function getDefaultLocationId(locations: LocationDescriptor[], selectedLocationId?: number): number | null {
  if (selectedLocationId && locations.some((location) => location.id === selectedLocationId)) {
    return selectedLocationId;
  }

  return locations[0]?.id ?? null;
}

type UseAtProtoControllerOptions = {
  locations: LocationDescriptor[];
  selectedLocationId?: number;
  refreshSidebar: (locationId?: number) => void;
};

type ImportState = {
  source: "tangled" | "github";
  handle: string;
  githubUsername: string;
  browseHandle: string;
  browseUsername: string;
  records: TangledStringRecord[];
  gists: GithubGistRecord[];
  selectedTid: string | null;
  selectedGistId: string | null;
  selectedRecord: TangledStringRecord | null;
  selectedGist: GithubGistRecord | null;
  destinationLocationId: number | null;
  destinationRelPath: string;
  previewText: string;
  isListing: boolean;
  isFetching: boolean;
  isSaving: boolean;
};

export function useAtProtoController({ locations, selectedLocationId, refreshSidebar }: UseAtProtoControllerOptions) {
  const {
    sheetMode,
    session,
    isHydrated,
    isPending,
    openLoginSheet,
    openSessionSheet,
    openImportSheet: openImportSheetState,
    openPublishSheet: openPublishSheetState,
    closeSheet,
    setSession,
    setHydrated,
    setPending,
  } = useAtProtoUiState();
  const [importHandle, setImportHandle] = useState("");
  const [importSource, setImportSource] = useState<"tangled" | "github">("tangled");
  const [githubUsername, setGithubUsername] = useState("");
  const [browseHandle, setBrowseHandle] = useState("");
  const [browseUsername, setBrowseUsername] = useState("");
  const [records, setRecords] = useState<TangledStringRecord[]>([]);
  const [gists, setGists] = useState<GithubGistRecord[]>([]);
  const [selectedTid, setSelectedTid] = useState<string | null>(null);
  const [selectedGistId, setSelectedGistId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<TangledStringRecord | null>(null);
  const [selectedGist, setSelectedGist] = useState<GithubGistRecord | null>(null);
  const [destinationLocationId, setDestinationLocationId] = useState<number | null>(null);
  const [destinationRelPath, setDestinationRelPath] = useState("");
  const [isListing, setIsListing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const listRequestIdRef = useRef(0);
  const getRequestIdRef = useRef(0);
  const gistListRequestIdRef = useRef(0);
  const gistGetRequestIdRef = useRef(0);

  const [publishFilename, setPublishFilename] = useState("");
  const [publishDescription, setPublishDescription] = useState("");
  const [publishContents, setPublishContents] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedRecord, setPublishedRecord] = useState<TangledStringRecord | null>(null);

  useEffect(() => {
    let isCancelled = false;

    void runCmd(atprotoSessionStatus((nextSession) => {
      if (isCancelled) {
        return;
      }

      setSession(nextSession);
      setHydrated(true);
      if (nextSession && !importHandle.trim()) {
        setImportHandle(nextSession.handle);
      }
    }, (error) => {
      if (isCancelled) {
        return;
      }

      logger.error(f("Failed to load AT Protocol session status", { error }));
      setSession(null);
      setHydrated(true);
    }));

    return () => {
      isCancelled = true;
    };
  }, [importHandle, setHydrated, setSession]);

  useEffect(() => {
    if (destinationLocationId !== null && locations.some((location) => location.id === destinationLocationId)) {
      return;
    }

    setDestinationLocationId(getDefaultLocationId(locations, selectedLocationId));
  }, [destinationLocationId, locations, selectedLocationId]);

  const openAuthSheet = useCallback(() => {
    if (session) {
      openSessionSheet();
      return;
    }

    openLoginSheet();
  }, [openLoginSheet, openSessionSheet, session]);

  const openImportSheet = useCallback(() => {
    setImportSource("tangled");
    setImportHandle((currentHandle) => currentHandle.trim() ? currentHandle : session?.handle ?? "");
    setDestinationLocationId((currentLocationId) =>
      currentLocationId ?? getDefaultLocationId(locations, selectedLocationId)
    );
    openImportSheetState();
  }, [locations, openImportSheetState, selectedLocationId, session?.handle]);

  const openGithubImportSheet = useCallback(() => {
    setImportSource("github");
    setDestinationLocationId((currentLocationId) =>
      currentLocationId ?? getDefaultLocationId(locations, selectedLocationId)
    );
    openImportSheetState();
  }, [locations, openImportSheetState, selectedLocationId]);

  const handleLogin = useCallback((handle: string) => {
    const trimmedHandle = handle.trim();
    if (!trimmedHandle || isPending) {
      return;
    }

    setPending(true);
    void runCmd(atprotoLogin(trimmedHandle, (nextSession) => {
      setPending(false);
      setSession(nextSession);
      setImportHandle(nextSession.handle);
      openSessionSheet();
      showSuccessToast(`Connected to Tangled as ${nextSession.handle}`);
    }, (error) => {
      setPending(false);
      logger.error(f("AT Protocol login failed", { handle: trimmedHandle, error }));
      showErrorToast(error.message);
    }));
  }, [isPending, openSessionSheet, setPending, setSession]);

  const handleLogout = useCallback(() => {
    if (isPending) {
      return;
    }

    setPending(true);
    void runCmd(atprotoLogout(() => {
      setPending(false);
      setSession(null);
      closeSheet();
      showSuccessToast("Disconnected from Tangled");
    }, (error) => {
      setPending(false);
      logger.error(f("AT Protocol logout failed", { error }));
      showErrorToast(error.message);
    }));
  }, [closeSheet, isPending, setPending, setSession]);

  const handleSelectString = useCallback((tid: string, ownerHandle = browseHandle) => {
    const trimmedTid = tid.trim();
    const trimmedOwner = ownerHandle.trim();
    if (!trimmedTid || !trimmedOwner) {
      return;
    }

    setSelectedTid(trimmedTid);
    setIsFetching(true);
    const requestId = getRequestIdRef.current + 1;
    getRequestIdRef.current = requestId;

    void runCmd(stringGet(trimmedOwner, trimmedTid, (record) => {
      if (getRequestIdRef.current !== requestId) {
        return;
      }

      setIsFetching(false);
      setSelectedRecord(record);
      setDestinationRelPath(record.filename);
    }, (error) => {
      if (getRequestIdRef.current !== requestId) {
        return;
      }

      setIsFetching(false);
      logger.error(f("Failed to load Tangled string", { browseHandle: trimmedOwner, tid: trimmedTid, error }));
      showErrorToast(error.message);
    }));
  }, [browseHandle]);

  const handleBrowseStrings = useCallback(() => {
    const trimmedHandle = importHandle.trim();
    if (!trimmedHandle || isListing) {
      return;
    }

    setIsListing(true);
    setBrowseHandle(trimmedHandle);
    const requestId = listRequestIdRef.current + 1;
    listRequestIdRef.current = requestId;

    void runCmd(stringList(trimmedHandle, (nextRecords) => {
      if (listRequestIdRef.current !== requestId) {
        return;
      }

      setIsListing(false);
      setRecords(nextRecords);

      if (nextRecords.length === 0) {
        setSelectedTid(null);
        setSelectedRecord(null);
        setDestinationRelPath("");
        return;
      }

      const nextSelectedTid = nextRecords.some((record) => record.tid === selectedTid)
        ? selectedTid
        : nextRecords[0]?.tid ?? null;

      if (!nextSelectedTid) {
        return;
      }

      handleSelectString(nextSelectedTid, trimmedHandle);
    }, (error) => {
      if (listRequestIdRef.current !== requestId) {
        return;
      }

      setIsListing(false);
      logger.error(f("Failed to list Tangled strings", { handle: trimmedHandle, error }));
      showErrorToast(error.message);
    }));
  }, [handleSelectString, importHandle, isListing, selectedTid]);

  const handleSelectGist = useCallback((gistId: string) => {
    const trimmedGistId = gistId.trim();
    if (!trimmedGistId) {
      return;
    }

    setSelectedGistId(trimmedGistId);
    setIsFetching(true);
    const requestId = gistGetRequestIdRef.current + 1;
    gistGetRequestIdRef.current = requestId;

    void runCmd(gistGet(trimmedGistId, (record) => {
      if (gistGetRequestIdRef.current !== requestId) {
        return;
      }

      setIsFetching(false);
      setSelectedGist(record);
      setDestinationRelPath(record.filename);
    }, (error) => {
      if (gistGetRequestIdRef.current !== requestId) {
        return;
      }

      setIsFetching(false);
      logger.error(f("Failed to load GitHub gist", { gistId: trimmedGistId, error }));
      showErrorToast(error.message);
    }));
  }, []);

  const handleBrowseGists = useCallback(() => {
    const trimmedUsername = githubUsername.trim();
    if (!trimmedUsername || isListing) {
      return;
    }

    setIsListing(true);
    setBrowseUsername(trimmedUsername);
    const requestId = gistListRequestIdRef.current + 1;
    gistListRequestIdRef.current = requestId;

    void runCmd(gistListPublic(trimmedUsername, (nextGists) => {
      if (gistListRequestIdRef.current !== requestId) {
        return;
      }

      setIsListing(false);
      setGists(nextGists);

      if (nextGists.length === 0) {
        setSelectedGistId(null);
        setSelectedGist(null);
        setDestinationRelPath("");
        return;
      }

      const nextSelectedGistId = nextGists.some((record) => record.id === selectedGistId)
        ? selectedGistId
        : nextGists[0]?.id ?? null;

      if (!nextSelectedGistId) {
        return;
      }

      handleSelectGist(nextSelectedGistId);
    }, (error) => {
      if (gistListRequestIdRef.current !== requestId) {
        return;
      }

      setIsListing(false);
      logger.error(f("Failed to list GitHub gists", { username: trimmedUsername, error }));
      showErrorToast(error.message);
    }));
  }, [githubUsername, handleSelectGist, isListing, selectedGistId]);

  const handleImport = useCallback(async () => {
    const selectedImport = importSource === "github" ? selectedGist : selectedRecord;
    if (isSaving || !selectedImport || !destinationLocationId) {
      return;
    }

    const relPath = normalizeImportPath(destinationRelPath);
    if (!relPath) {
      showErrorToast("Choose a destination path before importing.");
      return;
    }

    setIsSaving(true);
    const targetContents = importSource === "github"
      ? toGistImportMarkdown(selectedGist)
      : toImportMarkdown(selectedRecord);

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
      void runCmd(docSave(destinationLocationId, relPath, targetContents, (result) => {
        resolve(result.success);
      }, (error) => {
        logger.error(
          f("Failed to import remote document", {
            destinationLocationId,
            relPath,
            source: importSource,
            sourceId: importSource === "github" ? selectedGist?.id : selectedRecord?.tid,
            error,
          }),
        );
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
    showSuccessToast(`Imported ${selectedImport.filename} into ${relPath}`);
  }, [
    closeSheet,
    destinationLocationId,
    destinationRelPath,
    importSource,
    isSaving,
    refreshSidebar,
    selectedGist,
    selectedRecord,
  ]);

  const openPublishSheet = useCallback((filename: string, contents: string) => {
    setPublishFilename(filename);
    setPublishContents(contents);
    setPublishDescription("");
    setPublishedRecord(null);
    openPublishSheetState();
  }, [openPublishSheetState]);

  const handlePublish = useCallback(() => {
    const trimFilename = publishFilename.trim();
    const trimContents = publishContents.trim();
    if (isPublishing || !session) {
      return;
    }

    if (!trimFilename) {
      showErrorToast("Filename is required.");
      return;
    }

    if (!trimContents) {
      showErrorToast("Document has no content to publish.");
      return;
    }

    setIsPublishing(true);
    void runCmd(stringCreate(trimFilename, publishDescription.trim(), publishContents, (record) => {
      setIsPublishing(false);
      setPublishedRecord(record);
      showSuccessToast(`Published "${trimFilename}" to Tangled`);
    }, (error) => {
      setIsPublishing(false);
      logger.error(f("Failed to publish Tangled string", { filename: trimFilename, error }));
      showErrorToast(error.message);
    }));
  }, [isPublishing, publishContents, publishDescription, publishFilename, session]);

  const importState = useMemo<ImportState>(
    () => ({
      source: importSource,
      handle: importHandle,
      githubUsername,
      browseHandle,
      browseUsername,
      records,
      gists,
      selectedTid,
      selectedGistId,
      selectedRecord,
      selectedGist,
      destinationLocationId,
      destinationRelPath,
      previewText: importSource === "github" ? toGistImportMarkdown(selectedGist) : toImportMarkdown(selectedRecord),
      isListing,
      isFetching,
      isSaving,
    }),
    [
      browseHandle,
      destinationLocationId,
      destinationRelPath,
      importHandle,
      githubUsername,
      gists,
      importSource,
      isFetching,
      isListing,
      isSaving,
      records,
      selectedGist,
      selectedGistId,
      selectedRecord,
      selectedTid,
      browseUsername,
    ],
  );

  const publishState = useMemo(
    () => ({
      filename: publishFilename,
      description: publishDescription,
      contents: publishContents,
      isPublishing,
      publishedRecord,
    }),
    [isPublishing, publishContents, publishDescription, publishFilename, publishedRecord],
  );

  return {
    sheetMode,
    session,
    isHydrated,
    isPending,
    locations,
    importState,
    publishState,
    openAuthSheet,
    openLoginSheet,
    openSessionSheet,
    openImportSheet,
    openGithubImportSheet,
    openPublishSheet,
    closeSheet,
    handleLogin,
    handleLogout,
    handleBrowseStrings,
    handleBrowseGists,
    handleSelectString,
    handleSelectGist,
    handleImport,
    handlePublish,
    setImportHandle,
    setImportSource,
    setGithubUsername,
    setDestinationLocationId,
    setDestinationRelPath,
    setPublishFilename,
    setPublishDescription,
    hasLocations: locations.length > 0,
  };
}
