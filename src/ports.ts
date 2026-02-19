import type { InvokeArgs } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import type { Event as TauriEvent, UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import { logger } from "./logger";
import type {
  AppError,
  DocContent,
  DocMeta,
  DocRef,
  ErrorCode,
  LocationDescriptor,
  LocationId,
  MarkdownProfile,
  RenderResult,
  SaveStatus,
} from "./types";

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

type RenderMarkdownParams<T> = [...LocationPathTextParams, profile: MarkdownProfile | undefined, ...LocParams<T>];

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

export type CmdResult<T> = { type: "ok"; value: T } | { type: "err"; error: AppError };

type RustCommandResult<T> = { Ok: T } | { Err: unknown };

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
export type BackendEventsSub = { type: "BackendEvents"; onEvent: (event: BackendEvent) => void };
export type NoneSub = { type: "None" };
export type Sub = BackendEventsSub | NoneSub;

export function backendEvents(onEvent: (event: BackendEvent) => void): Sub {
  return { type: "BackendEvents", onEvent };
}

export const noSub: Sub = { type: "None" };

/**
 * Executes a command, invoking the Tauri backend and routing the result
 * through the standard response envelope.
 */
export async function runCmd(cmd: Cmd): Promise<void> {
  // TODO: implement file watcher
  switch (cmd.type) {
    case "Invoke": {
      try {
        logger.debug("Invoking backend command", { command: cmd.command, payload: summarizePayload(cmd.payload) });
        const result = await invoke<unknown>(cmd.command, cmd.payload as InvokeArgs);
        const commandResult = unwrapCmdResult<unknown>(result, cmd.command);

        if (commandResult.ok) {
          logger.debug("Backend command succeeded", { command: cmd.command });
          cmd.onOk(commandResult.value);
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
      logger.warn("StartWatch not yet implemented");
      break;
    }

    case "StopWatch": {
      logger.warn("StopWatch not yet implemented");
      break;
    }

    case "None": {
      break;
    }

    default: {
      console.warn("Unknown command type:", cmd);
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
        console.warn("Unknown subscription type:", sub);
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

/**
 * Renders markdown text to HTML with metadata extraction
 *
 * @param locationId - The location ID of the document
 * @param relPath - The relative path of the document
 * @param text - The markdown text to render
 * @param profile - The markdown rendering profile (defaults to GfmSafe)
 * @param onOk - Callback for successful render
 * @param onErr - Callback for render errors
 */
export function renderMarkdown(
  ...[locationId, relPath, text, profile, onOk, onErr]: RenderMarkdownParams<RenderResult>
): Cmd {
  return invokeCmd<RenderResult>("markdown_render", { locationId, relPath, text, profile }, onOk, onErr);
}
