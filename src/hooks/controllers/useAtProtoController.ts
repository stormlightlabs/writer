import {
  atprotoLogin,
  atprotoLogout,
  atprotoSessionStatus,
  docExists,
  docSave,
  runCmd,
  stringGet,
  stringList,
} from "$ports";
import { useAtProtoUiState } from "$state/selectors";
import { showErrorToast, showSuccessToast } from "$state/stores/toasts";
import type { LocationDescriptor, TangledStringRecord } from "$types";
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

  const extension = getFileExtension(record.filename);
  if (!extension || PLAINTEXT_EXTENSIONS.has(extension)) {
    return record.contents;
  }

  const language = getLanguageTag(extension);
  const fence = buildFence(record.contents);
  return `${fence}${language}\n${record.contents}\n${fence}\n`;
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
  handle: string;
  browseHandle: string;
  records: TangledStringRecord[];
  selectedTid: string | null;
  selectedRecord: TangledStringRecord | null;
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
    closeSheet,
    setSession,
    setHydrated,
    setPending,
  } = useAtProtoUiState();
  const [importHandle, setImportHandle] = useState("");
  const [browseHandle, setBrowseHandle] = useState("");
  const [records, setRecords] = useState<TangledStringRecord[]>([]);
  const [selectedTid, setSelectedTid] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<TangledStringRecord | null>(null);
  const [destinationLocationId, setDestinationLocationId] = useState<number | null>(null);
  const [destinationRelPath, setDestinationRelPath] = useState("");
  const [isListing, setIsListing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const listRequestIdRef = useRef(0);
  const getRequestIdRef = useRef(0);

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
    setImportHandle((currentHandle) => currentHandle.trim() ? currentHandle : session?.handle ?? "");
    setDestinationLocationId((currentLocationId) =>
      currentLocationId ?? getDefaultLocationId(locations, selectedLocationId)
    );
    openImportSheetState();
  }, [locations, openImportSheetState, selectedLocationId, session?.handle]);

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

  const handleImport = useCallback(async () => {
    if (isSaving || !selectedRecord || !destinationLocationId) {
      return;
    }

    const relPath = normalizeImportPath(destinationRelPath);
    if (!relPath) {
      showErrorToast("Choose a destination path before importing.");
      return;
    }

    setIsSaving(true);
    const targetContents = toImportMarkdown(selectedRecord);

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
          f("Failed to import Tangled string", { destinationLocationId, relPath, tid: selectedRecord.tid, error }),
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
    showSuccessToast(`Imported ${selectedRecord.filename} into ${relPath}`);
  }, [closeSheet, destinationLocationId, destinationRelPath, isSaving, refreshSidebar, selectedRecord]);

  const importState = useMemo<ImportState>(
    () => ({
      handle: importHandle,
      browseHandle,
      records,
      selectedTid,
      selectedRecord,
      destinationLocationId,
      destinationRelPath,
      previewText: toImportMarkdown(selectedRecord),
      isListing,
      isFetching,
      isSaving,
    }),
    [
      browseHandle,
      destinationLocationId,
      destinationRelPath,
      importHandle,
      isFetching,
      isListing,
      isSaving,
      records,
      selectedRecord,
      selectedTid,
    ],
  );

  return {
    sheetMode,
    session,
    isHydrated,
    isPending,
    locations,
    importState,
    openAuthSheet,
    openLoginSheet,
    openSessionSheet,
    openImportSheet,
    closeSheet,
    handleLogin,
    handleLogout,
    handleBrowseStrings,
    handleSelectString,
    handleImport,
    setImportHandle,
    setDestinationLocationId,
    setDestinationRelPath,
    hasLocations: locations.length > 0,
  };
}
