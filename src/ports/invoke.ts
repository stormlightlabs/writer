import { logger } from "$logger";
import type {
  AppError,
  CaptureDocRef,
  CaptureMode,
  CaptureSubmitResult,
  DocMeta,
  DocRef,
  ErrorCode,
  GlobalCaptureSettings,
  SearchHit,
} from "$types";
import type { InvokeArgs } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import type { Event as TauriEvent, UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import type { BackendEvent, Cmd, CmdResult, Sub } from "./types";

type RustCommandResult<T> = { Ok: T } | { Err: unknown };

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
  onOk: (value: T) => unknown,
  onErr: (error: AppError) => unknown,
): Cmd {
  return { type: "Invoke", command, payload, onOk: onOk as (value: unknown) => unknown, onErr };
}

export const startWatch = (locationId: number): Cmd => ({ type: "StartWatch", locationId });

export const stopWatch = (locationId: number): Cmd => ({ type: "StopWatch", locationId });

export const batch = (commands: Cmd[]): Cmd => ({ type: "Batch", commands });

export const none: Cmd = { type: "None" };

export function backendEvents(onEvent: (event: BackendEvent) => void): Sub {
  return { type: "BackendEvents", onEvent };
}

export const noSub: Sub = { type: "None" };

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

export function toCmdResult<T>(value: T): CmdResult<T> {
  return { type: "ok", value };
}
