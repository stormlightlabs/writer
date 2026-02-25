import { logger } from "$logger";
import type { PdfRenderResult } from "$pdf/types";
import type {
  AppError,
  CaptureDocRef,
  CaptureMode,
  CaptureSubmitInput,
  CaptureSubmitResult,
  DocContent,
  DocMeta,
  DocRef,
  EditorFontFamily,
  ErrorCode,
  FocusDimmingMode,
  GlobalCaptureSettings,
  LocationDescriptor,
  LocationId,
  MarkdownProfile,
  PatternCategory,
  RenderResult,
  SaveStatus,
  SearchHit,
} from "$types";
import type { InvokeArgs } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import type { Event as TauriEvent, UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";

export type EditorState = {
  doc_ref: DocRef | null;
  text: string;
  save_status: SaveStatus;
  cursor_line: number;
  cursor_column: number;
  selection_from: number | null;
  selection_to: number | null;
};

export type EditorMsg =
  | { type: "EditorChanged"; text: string }
  | { type: "SaveRequested" }
  | { type: "SaveFinished"; success: boolean; error?: AppError }
  | { type: "DocOpened"; doc: DocContent }
  | { type: "CursorMoved"; line: number; column: number }
  | { type: "SelectionChanged"; from: number; to: number | null };

export type SaveResult = { success: boolean; new_meta: DocMeta | null; conflict_detected: boolean };

export type UiLayoutSettings = {
  sidebar_collapsed: boolean;
  top_bars_collapsed: boolean;
  status_bar_collapsed: boolean;
  line_numbers_visible: boolean;
  text_wrapping_enabled: boolean;
  syntax_highlighting_enabled: boolean;
  editor_font_size: number;
  editor_font_family: EditorFontFamily;
  calm_ui_enabled: boolean;
  calm_ui_auto_hide: boolean;
  calm_ui_focus_mode: boolean;
  focus_typewriter_scrolling_enabled: boolean;
  focus_dimming_mode: FocusDimmingMode;
};

export type StyleCheckPattern = { text: string; category: PatternCategory; replacement?: string };

export type StyleCheckCategorySettings = { filler: boolean; redundancy: boolean; cliche: boolean };

export type PersistedStyleCheckSettings = {
  enabled: boolean;
  categories: StyleCheckCategorySettings;
  custom_patterns: StyleCheckPattern[];
};

type RenderMarkdownParams<T> = [...LocationPathTextParams, profile?: MarkdownProfile, ...LocParams<T>];
type UiLayoutSetParams<T> = Parameters<
  (settings: UiLayoutSettings, onOk: SuccessCallback<T>, onErr: ErrorCallback) => void
>;

export type BackendEvent =
  | { type: "LocationMissing"; location_id: LocationId; path: string }
  | { type: "LocationChanged"; location_id: LocationId; old_path: string; new_path: string }
  | { type: "ReconciliationComplete"; checked: number; missing: LocationId[] }
  | { type: "ConflictDetected"; location_id: LocationId; rel_path: string; conflict_filename: string }
  | { type: "DocModifiedExternally"; doc_id: DocRef; new_mtime: string }
  | { type: "SaveStatusChanged"; doc_id: DocRef; status: SaveStatus };

export type InvokeCmd = {
  type: "Invoke";
  command: string;
  payload: unknown;
  onOk: (value: unknown) => void;
  onErr: ErrorCallback;
};
export type StartWatchCmd = { type: "StartWatch"; locationId: LocationId };
export type StopWatchCmd = { type: "StopWatch"; locationId: LocationId };
export type BatchCmd = { type: "Batch"; commands: Cmd[] };
export type NoneCmd = { type: "None" };
export type Cmd = InvokeCmd | StartWatchCmd | StopWatchCmd | BatchCmd | NoneCmd;

type ErrorCallback = (error: AppError) => void;
type SuccessCallback<T> = (value: T) => void;

type LocParams<T> = Parameters<(onOk: SuccessCallback<T>, onErr: ErrorCallback) => void>;
type LocationIdParams = Parameters<(locationId: LocationId) => void>;
type LocationPathParams = Parameters<(locationId: LocationId, relPath: string) => void>;
type LocationPathTextParams = Parameters<(locationId: LocationId, relPath: string, text: string) => void>;
type DocListParams<T> = [...LocationIdParams, ...LocParams<T>];
type DocOpenParams<T> = [...LocationPathParams, ...LocParams<T>];
type DocSaveParams<T> = [...LocationPathTextParams, ...LocParams<T>];
type SearchParams<T> = Parameters<
  (
    query: string,
    filters: SearchFiltersPayload | undefined,
    limit: number,
    onOk: SuccessCallback<T>,
    onErr: ErrorCallback,
  ) => void
>;

export type SearchDateRangePayload = { from?: string; to?: string };
export type SearchFiltersPayload = {
  locations?: LocationId[];
  fileTypes?: string[];
  dateRange?: SearchDateRangePayload;
};

export type CmdResult<T> = { type: "ok"; value: T } | { type: "err"; error: AppError };

type RustCommandResult<T> = { Ok: T } | { Err: unknown };

type BackendCaptureDocRef = { location_id: number; rel_path: string };

type BackendGlobalCaptureSettings = {
  enabled: boolean;
  shortcut: string;
  paused: boolean;
  default_mode: CaptureMode;
  target_location_id: number | null;
  inbox_relative_dir: string;
  append_target: BackendCaptureDocRef | null;
  close_after_save: boolean;
  show_tray_icon: boolean;
  last_capture_target: string | null;
};

type BackendCaptureSubmitInput = {
  mode: CaptureMode;
  text: string;
  destination?: BackendCaptureDocRef;
  open_main_after_save?: boolean;
};

export type BackendEventsSub = { type: "BackendEvents"; onEvent: (event: BackendEvent) => void };
export type NoneSub = { type: "None" };
export type Sub = BackendEventsSub | NoneSub;

type RenderMarkdownForPdfParams<T> = [...LocationPathTextParams, profile?: MarkdownProfile, ...LocParams<T>];

export const ok = <T>(value: T): CmdResult<T> => ({ type: "ok", value });

export const err = <T>(error: AppError): CmdResult<T> => ({ type: "err", error });

export function isOk<T>(result: CmdResult<T>): result is { type: "ok"; value: T } {
  return result.type === "ok";
}

export function isErr<T>(result: CmdResult<T>): result is { type: "err"; error: AppError } {
  return result.type === "err";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function summarizePayload(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return payload;
  }

  const summary = { ...payload };
  if (typeof summary.text === "string") {
    summary.text = `<${summary.text.length} chars>`;
  }
  return summary;
}

function normalizeErrorCode(code: unknown): ErrorCode {
  if (typeof code !== "string") {
    return "IO_ERROR";
  }

  const normalized = code.replaceAll(/[- ]/g, "_");

  switch (normalized) {
    case "NOT_FOUND":
    case "NotFound": {
      return "NOT_FOUND";
    }
    case "PERMISSION_DENIED":
    case "PermissionDenied": {
      return "PERMISSION_DENIED";
    }
    case "INVALID_PATH":
    case "InvalidPath": {
      return "INVALID_PATH";
    }
    case "IO_ERROR":
    case "Io":
    case "IO": {
      return "IO_ERROR";
    }
    case "PARSE_ERROR":
    case "Parse": {
      return "PARSE_ERROR";
    }
    case "INDEX_ERROR":
    case "Index": {
      return "INDEX_ERROR";
    }
    case "CONFLICT":
    case "Conflict": {
      return "CONFLICT";
    }
    default: {
      return "IO_ERROR";
    }
  }
}

function normalizeAppError(error: unknown, context: string): AppError {
  if (isRecord(error)) {
    const normalized: AppError = {
      code: normalizeErrorCode(error.code),
      message: typeof error.message === "string" ? error.message : "Command failed",
    };

    if (typeof error.context === "string") {
      normalized.context = error.context;
    }

    return normalized;
  }

  return { code: "IO_ERROR", message: error instanceof Error ? error.message : String(error), context };
}

function unwrapCmdResult<T>(value: unknown, command: string): { ok: true; value: T } | { ok: false; error: AppError } {
  if (isRecord(value)) {
    if (value.type === "ok" && "value" in value) {
      return { ok: true, value: value.value as T };
    }

    if (value.type === "err" && "error" in value) {
      return { ok: false, error: normalizeAppError(value.error, `Command: ${command}`) };
    }

    const rustResult = value as Partial<RustCommandResult<T>>;
    if ("Ok" in rustResult) {
      return { ok: true, value: rustResult.Ok as T };
    }

    if ("Err" in rustResult) {
      return { ok: false, error: normalizeAppError(rustResult.Err, `Command: ${command}`) };
    }
  }

  return { ok: true, value: value as T };
}

function fallbackDocMeta(): DocMeta {
  return { location_id: 0, rel_path: "", title: "Untitled", updated_at: new Date(0).toISOString(), word_count: 0 };
}

function normalizeDocMeta(value: unknown): DocMeta {
  if (!isRecord(value)) {
    return fallbackDocMeta();
  }

  const idRecord = isRecord(value.id) ? value.id : value;
  const locationId = typeof idRecord.location_id === "number" ? idRecord.location_id : 0;
  const relPath = typeof idRecord.rel_path === "string" ? idRecord.rel_path : "";
  const title = typeof value.title === "string" && value.title.trim()
    ? value.title
    : relPath.split("/").pop() || "Untitled";
  const updatedAt = typeof value.updated_at === "string"
    ? value.updated_at
    : typeof value.mtime === "string"
    ? value.mtime
    : new Date(0).toISOString();
  const wordCount = typeof value.word_count === "number" ? value.word_count : 0;

  return { location_id: locationId, rel_path: relPath, title, updated_at: updatedAt, word_count: wordCount };
}

function normalizeDocRef(value: unknown): DocRef | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.location_id !== "number" || typeof value.rel_path !== "string") {
    return null;
  }

  return { location_id: value.location_id, rel_path: value.rel_path };
}

function normalizeSearchHit(value: unknown): SearchHit {
  if (!isRecord(value)) {
    return { location_id: 0, rel_path: "", title: "Untitled", snippet: "", line: 1, column: 1, matches: [] };
  }

  return {
    location_id: typeof value.location_id === "number" ? value.location_id : 0,
    rel_path: typeof value.rel_path === "string" ? value.rel_path : "",
    title: typeof value.title === "string" ? value.title : "Untitled",
    snippet: typeof value.snippet === "string" ? value.snippet : "",
    line: typeof value.line === "number" ? value.line : 1,
    column: typeof value.column === "number" ? value.column : 1,
    matches: Array.isArray(value.matches)
      ? value.matches.filter((match): match is { start: number; end: number } =>
        isRecord(match) && typeof match.start === "number" && typeof match.end === "number"
      )
      : [],
  };
}

function normalizeCaptureDocRef(value: unknown): CaptureDocRef | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.location_id !== "number" || typeof value.rel_path !== "string") {
    return null;
  }

  return { locationId: value.location_id, relPath: value.rel_path };
}

function normalizeGlobalCaptureSettings(value: unknown): GlobalCaptureSettings {
  if (!isRecord(value)) {
    return {
      enabled: true,
      shortcut: "CommandOrControl+Shift+Space",
      paused: false,
      defaultMode: "QuickNote",
      targetLocationId: null,
      inboxRelativeDir: "inbox",
      appendTarget: null,
      closeAfterSave: true,
      showTrayIcon: true,
      lastCaptureTarget: null,
    };
  }

  const defaultMode = value.default_mode;
  const normalizedMode: CaptureMode =
    defaultMode === "QuickNote" || defaultMode === "WritingSession" || defaultMode === "Append"
      ? defaultMode
      : "QuickNote";

  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : true,
    shortcut: typeof value.shortcut === "string" ? value.shortcut : "CommandOrControl+Shift+Space",
    paused: typeof value.paused === "boolean" ? value.paused : false,
    defaultMode: normalizedMode,
    targetLocationId: typeof value.target_location_id === "number" ? value.target_location_id : null,
    inboxRelativeDir: typeof value.inbox_relative_dir === "string" ? value.inbox_relative_dir : "inbox",
    appendTarget: normalizeCaptureDocRef(value.append_target),
    closeAfterSave: typeof value.close_after_save === "boolean" ? value.close_after_save : true,
    showTrayIcon: typeof value.show_tray_icon === "boolean" ? value.show_tray_icon : true,
    lastCaptureTarget: typeof value.last_capture_target === "string" ? value.last_capture_target : null,
  };
}

function normalizeCaptureSubmitResult(value: unknown): CaptureSubmitResult {
  if (!isRecord(value)) {
    return { success: false, savedTo: null, locationId: 0, shouldClose: true, lastCaptureTarget: null };
  }

  return {
    success: Boolean(value.success),
    savedTo: typeof value.saved_to === "string" ? value.saved_to : null,
    locationId: typeof value.location_id === "number" ? value.location_id : 0,
    shouldClose: typeof value.should_close === "boolean" ? value.should_close : true,
    lastCaptureTarget: typeof value.last_capture_target === "string" ? value.last_capture_target : null,
  };
}

function toBackendCaptureDocRef(value: CaptureDocRef | null): BackendCaptureDocRef | null {
  if (!value) {
    return null;
  }

  return { location_id: value.locationId, rel_path: value.relPath };
}

function toBackendGlobalCaptureSettings(settings: GlobalCaptureSettings): BackendGlobalCaptureSettings {
  return {
    enabled: settings.enabled,
    shortcut: settings.shortcut,
    paused: settings.paused,
    default_mode: settings.defaultMode,
    target_location_id: settings.targetLocationId,
    inbox_relative_dir: settings.inboxRelativeDir,
    append_target: toBackendCaptureDocRef(settings.appendTarget),
    close_after_save: settings.closeAfterSave,
    show_tray_icon: settings.showTrayIcon,
    last_capture_target: settings.lastCaptureTarget,
  };
}

function toBackendCaptureSubmitInput(input: CaptureSubmitInput): BackendCaptureSubmitInput {
  return {
    mode: input.mode,
    text: input.text,
    destination: input.destination
      ? { location_id: input.destination.locationId, rel_path: input.destination.relPath }
      : void 0,
    open_main_after_save: input.openMainAfterSave,
  };
}

function normalizeCommandValue(command: string, value: unknown): unknown {
  switch (command) {
    case "doc_list": {
      if (!Array.isArray(value)) {
        return [];
      }
      return value.map((doc) => normalizeDocMeta(doc));
    }
    case "doc_open": {
      if (!isRecord(value)) {
        return value;
      }
      return { ...value, meta: normalizeDocMeta(value.meta) };
    }
    case "doc_save": {
      if (!isRecord(value)) {
        return value;
      }
      return { ...value, new_meta: value.new_meta ? normalizeDocMeta(value.new_meta) : null };
    }
    case "search": {
      if (!Array.isArray(value)) {
        return [];
      }
      return value.map((hit) => normalizeSearchHit(hit));
    }
    case "global_capture_get": {
      return normalizeGlobalCaptureSettings(value);
    }
    case "global_capture_submit": {
      return normalizeCaptureSubmitResult(value);
    }
    case "session_last_doc_get": {
      return normalizeDocRef(value);
    }
    default: {
      return value;
    }
  }
}

export function invokeCmd<T>(
  command: string,
  payload: unknown,
  onOk: (value: T) => void,
  onErr: (error: AppError) => void,
): Cmd {
  return { type: "Invoke", command, payload, onOk: onOk as (value: unknown) => void, onErr };
}

export const startWatch = (locationId: LocationId): Cmd => ({ type: "StartWatch", locationId });

export const stopWatch = (locationId: LocationId): Cmd => ({ type: "StopWatch", locationId });

export const batch = (commands: Cmd[]): Cmd => ({ type: "Batch", commands });

export const none: Cmd = { type: "None" };

export function backendEvents(onEvent: (event: BackendEvent) => void): Sub {
  return { type: "BackendEvents", onEvent };
}

export const noSub: Sub = { type: "None" };

/**
 * Executes a command, invoking the Tauri backend and routing the result
 * through the standard response envelope.
 */
export async function runCmd(cmd: Cmd): Promise<void> {
  switch (cmd.type) {
    case "Invoke": {
      try {
        logger.debug("Invoking backend command", { command: cmd.command, payload: summarizePayload(cmd.payload) });
        const result = await invoke<unknown>(cmd.command, cmd.payload as InvokeArgs);
        const commandResult = unwrapCmdResult<unknown>(result, cmd.command);

        if (commandResult.ok) {
          logger.debug("Backend command succeeded", { command: cmd.command });
          cmd.onOk(normalizeCommandValue(cmd.command, commandResult.value));
        } else {
          logger.warn("Backend command returned application error", {
            command: cmd.command,
            error: commandResult.error,
          });
          cmd.onErr(commandResult.error);
        }
      } catch (error) {
        logger.error("Backend command failed at transport layer", {
          command: cmd.command,
          message: error instanceof Error ? error.message : String(error),
        });
        cmd.onErr({
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
          context: `Command: ${cmd.command}`,
        });
      }
      break;
    }

    case "Batch": {
      logger.debug("Running command batch", { count: cmd.commands.length });
      for await (const subCmd of cmd.commands) {
        await runCmd(subCmd);
      }
      break;
    }

    case "StartWatch": {
      try {
        await invoke<unknown>("watch_enable", { locationId: cmd.locationId });
        logger.info("Started location watcher", { locationId: cmd.locationId });
      } catch (error) {
        logger.error("Failed to start location watcher", {
          locationId: cmd.locationId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
      break;
    }

    case "StopWatch": {
      try {
        await invoke<unknown>("watch_disable", { locationId: cmd.locationId });
        logger.info("Stopped location watcher", { locationId: cmd.locationId });
      } catch (error) {
        logger.error("Failed to stop location watcher", {
          locationId: cmd.locationId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
      break;
    }

    case "None": {
      break;
    }

    default: {
      logger.warn("Unknown command type", { cmd });
    }
  }
}

export class SubscriptionManager {
  private unlistenFns = new Map<string, UnlistenFn>();

  /**
   * Activates a subscription, returning a cleanup function.
   */
  async subscribe(sub: Sub): Promise<() => void> {
    switch (sub.type) {
      case "BackendEvents": {
        logger.info("Subscribing to backend events");
        const unlisten = await listen<BackendEvent>("backend-event", (event: TauriEvent<BackendEvent>) => {
          logger.debug("Received backend event", { type: event.payload.type });
          sub.onEvent(event.payload);
        });
        this.unlistenFns.set("backend-events", unlisten);
        return () => {
          logger.info("Unsubscribing from backend events");
          unlisten();
          this.unlistenFns.delete("backend-events");
        };
      }

      case "None": {
        return () => {};
      }

      default: {
        logger.warn("Unknown subscription type", { sub });
        return () => {};
      }
    }
  }

  cleanup(): void {
    for (const [, unlisten] of this.unlistenFns) {
      unlisten();
    }
    logger.info("Cleaned up subscriptions", { count: this.unlistenFns.size });
    this.unlistenFns.clear();
  }
}

export function locationAddViaDialog(...[onOk, onErr]: LocParams<LocationDescriptor>): Cmd {
  return invokeCmd<LocationDescriptor>("location_add_via_dialog", {}, onOk, onErr);
}

export function locationList(...[onOk, onErr]: LocParams<LocationDescriptor[]>): Cmd {
  return invokeCmd<LocationDescriptor[]>("location_list", {}, onOk, onErr);
}

export function locationRemove(...[locationId, onOk, onErr]: DocListParams<boolean>): Cmd {
  return invokeCmd<boolean>("location_remove", { locationId }, onOk, onErr);
}

export function locationValidate(...[onOk, onErr]: LocParams<Array<[LocationId, string]>>): Cmd {
  return invokeCmd<Array<[LocationId, string]>>("location_validate", {}, onOk, onErr);
}

export function docList(...[locationId, onOk, onErr]: DocListParams<DocMeta[]>): Cmd {
  return invokeCmd<DocMeta[]>("doc_list", { locationId }, onOk, onErr);
}

export function docOpen(...[locationId, relPath, onOk, onErr]: DocOpenParams<DocContent>): Cmd {
  return invokeCmd<DocContent>("doc_open", { locationId, relPath }, onOk, onErr);
}

export function docSave(...[locationId, relPath, text, onOk, onErr]: DocSaveParams<SaveResult>): Cmd {
  return invokeCmd<SaveResult>("doc_save", { locationId, relPath, text }, onOk, onErr);
}

export function docExists(...[locationId, relPath, onOk, onErr]: DocOpenParams<boolean>): Cmd {
  return invokeCmd<boolean>("doc_exists", { locationId, relPath }, onOk, onErr);
}

export function searchDocuments(...[query, filters, limit, onOk, onErr]: SearchParams<SearchHit[]>): Cmd {
  return invokeCmd<SearchHit[]>("search", { query, filters, limit }, onOk, onErr);
}

export function renderMarkdown(
  ...[locationId, relPath, text, profile, onOk, onErr]: RenderMarkdownParams<RenderResult>
): Cmd {
  return invokeCmd<RenderResult>("markdown_render", { locationId, relPath, text, profile }, onOk, onErr);
}

export function renderMarkdownForPdf(
  ...[locationId, relPath, text, profile, onOk, onErr]: RenderMarkdownForPdfParams<PdfRenderResult>
): Cmd {
  return invokeCmd<PdfRenderResult>("markdown_render_for_pdf", { locationId, relPath, text, profile }, onOk, onErr);
}

export function uiLayoutGet(...[onOk, onErr]: LocParams<UiLayoutSettings>): Cmd {
  return invokeCmd<UiLayoutSettings>("ui_layout_get", {}, onOk, onErr);
}

export function uiLayoutSet(...[settings, onOk, onErr]: UiLayoutSetParams<boolean>): Cmd {
  return invokeCmd<boolean>("ui_layout_set", { settings }, onOk, onErr);
}

type SessionLastDocSetParams<T> = Parameters<
  (docRef: DocRef | null, onOk: SuccessCallback<T>, onErr: ErrorCallback) => void
>;

export function sessionLastDocGet(...[onOk, onErr]: LocParams<DocRef | null>): Cmd {
  return invokeCmd<DocRef | null>("session_last_doc_get", {}, onOk, onErr);
}

export function sessionLastDocSet(...[docRef, onOk, onErr]: SessionLastDocSetParams<boolean>): Cmd {
  return invokeCmd<boolean>("session_last_doc_set", { docRef }, onOk, onErr);
}

type StyleCheckSetParams<T> = Parameters<
  (settings: PersistedStyleCheckSettings, onOk: SuccessCallback<T>, onErr: ErrorCallback) => void
>;

export function styleCheckGet(...[onOk, onErr]: LocParams<PersistedStyleCheckSettings>): Cmd {
  return invokeCmd<PersistedStyleCheckSettings>("style_check_get", {}, onOk, onErr);
}

export function styleCheckSet(...[settings, onOk, onErr]: StyleCheckSetParams<boolean>): Cmd {
  return invokeCmd<boolean>("style_check_set", { settings }, onOk, onErr);
}

export function globalCaptureGet(...[onOk, onErr]: LocParams<GlobalCaptureSettings>): Cmd {
  return invokeCmd<GlobalCaptureSettings>("global_capture_get", {}, onOk, onErr);
}

export function globalCaptureSet(
  ...[settings, onOk, onErr]: Parameters<
    (settings: GlobalCaptureSettings, onOk: SuccessCallback<boolean>, onErr: ErrorCallback) => void
  >
): Cmd {
  return invokeCmd<boolean>("global_capture_set", { settings: toBackendGlobalCaptureSettings(settings) }, onOk, onErr);
}

export function globalCaptureOpen(...[onOk, onErr]: LocParams<boolean>): Cmd {
  return invokeCmd<boolean>("global_capture_open", {}, onOk, onErr);
}

export function globalCaptureSubmit(
  ...[input, onOk, onErr]: Parameters<
    (input: CaptureSubmitInput, onOk: SuccessCallback<CaptureSubmitResult>, onErr: ErrorCallback) => void
  >
): Cmd {
  return invokeCmd<CaptureSubmitResult>("global_capture_submit", toBackendCaptureSubmitInput(input), onOk, onErr);
}

export function globalCapturePause(
  ...[paused, onOk, onErr]: Parameters<(paused: boolean, onOk: SuccessCallback<boolean>, onErr: ErrorCallback) => void>
): Cmd {
  return invokeCmd<boolean>("global_capture_pause", { paused }, onOk, onErr);
}

export function globalCaptureValidateShortcut(
  ...[shortcut, onOk, onErr]: Parameters<
    (shortcut: string, onOk: SuccessCallback<boolean>, onErr: ErrorCallback) => void
  >
): Cmd {
  return invokeCmd<boolean>("global_capture_validate_shortcut", { shortcut }, onOk, onErr);
}
