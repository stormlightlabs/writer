import type { InvokeArgs } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import type { Event as TauriEvent, UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import type {
  DocContent,
  DocMeta,
  DocRef,
  LocationDescriptor,
  LocationId,
  MarkdownProfile,
  RenderResult,
  SaveStatus,
} from "./types";

export type ErrorCode =
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "INVALID_PATH"
  | "IO_ERROR"
  | "PARSE_ERROR"
  | "INDEX_ERROR"
  | "CONFLICT";

export interface AppError {
  code: ErrorCode;
  message: string;
  context?: string;
}

export type CommandResult<T> = { type: "ok"; value: T } | { type: "err"; error: AppError };

export function ok<T>(value: T): CommandResult<T> {
  return { type: "ok", value };
}

export function err<T>(error: AppError): CommandResult<T> {
  return { type: "err", error };
}

export function isOk<T>(result: CommandResult<T>): result is { type: "ok"; value: T } {
  return result.type === "ok";
}

export function isErr<T>(result: CommandResult<T>): result is { type: "err"; error: AppError } {
  return result.type === "err";
}

type RustCommandResult<T> = { Ok: T } | { Err: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

function unwrapCommandResult<T>(
  value: unknown,
  command: string,
): { ok: true; value: T } | { ok: false; error: AppError } {
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
  onErr: (error: AppError) => void;
};
export type StartWatchCmd = { type: "StartWatch"; locationId: LocationId };
export type StopWatchCmd = { type: "StopWatch"; locationId: LocationId };
export type BatchCmd = { type: "Batch"; commands: Cmd[] };
export type NoneCmd = { type: "None" };

export type Cmd = InvokeCmd | StartWatchCmd | StopWatchCmd | BatchCmd | NoneCmd;

export function invokeCmd<T>(
  command: string,
  payload: unknown,
  onOk: (value: T) => void,
  onErr: (error: AppError) => void,
): Cmd {
  return { type: "Invoke", command, payload, onOk: onOk as (value: unknown) => void, onErr };
}

export function startWatch(locationId: LocationId): Cmd {
  return { type: "StartWatch", locationId };
}

export function stopWatch(locationId: LocationId): Cmd {
  return { type: "StopWatch", locationId };
}

export function batch(commands: Cmd[]): Cmd {
  return { type: "Batch", commands };
}

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
 *
 * @todo implement file watcher
 */
export async function runCmd(cmd: Cmd): Promise<void> {
  switch (cmd.type) {
    case "Invoke": {
      try {
        const result = await invoke<unknown>(cmd.command, cmd.payload as InvokeArgs);
        const commandResult = unwrapCommandResult<unknown>(result, cmd.command);

        if (commandResult.ok) {
          cmd.onOk(commandResult.value);
        } else {
          cmd.onErr(commandResult.error);
        }
      } catch (error) {
        cmd.onErr({
          code: "IO_ERROR",
          message: error instanceof Error ? error.message : String(error),
          context: `Command: ${cmd.command}`,
        });
      }
      break;
    }

    case "Batch": {
      for await (const subCmd of cmd.commands) {
        await runCmd(subCmd);
      }
      break;
    }

    case "StartWatch": {
      console.warn("StartWatch not yet implemented");
      break;
    }

    case "StopWatch": {
      console.warn("StopWatch not yet implemented");
      break;
    }

    case "None": {
      break;
    }

    default: {
      console.warn("Unknown command type:", cmd);
    }
  }
}

/**
 * Manages active subscriptions and their cleanup functions.
 */
export class SubscriptionManager {
  private unlistenFns = new Map<string, UnlistenFn>();

  /**
   * Activates a subscription, returning a cleanup function.
   */
  async subscribe(sub: Sub): Promise<() => void> {
    switch (sub.type) {
      case "BackendEvents": {
        const unlisten = await listen<BackendEvent>("backend-event", (event: TauriEvent<BackendEvent>) => {
          sub.onEvent(event.payload);
        });
        this.unlistenFns.set("backend-events", unlisten);
        return () => {
          unlisten();
          this.unlistenFns.delete("backend-events");
        };
      }

      case "None": {
        return () => {};
      }

      default: {
        console.warn("Unknown subscription type:", sub);
        return () => {};
      }
    }
  }

  /**
   * Cleans up all active subscriptions.
   */
  cleanup(): void {
    for (const [, unlisten] of this.unlistenFns) {
      unlisten();
    }
    this.unlistenFns.clear();
  }
}

export function locationAddViaDialog(
  onOk: (location: LocationDescriptor) => void,
  onErr: (error: AppError) => void,
): Cmd {
  return invokeCmd<LocationDescriptor>("location_add_via_dialog", {}, onOk, onErr);
}

export function locationList(onOk: (locations: LocationDescriptor[]) => void, onErr: (error: AppError) => void): Cmd {
  return invokeCmd<LocationDescriptor[]>("location_list", {}, onOk, onErr);
}

export function locationRemove(
  locationId: LocationId,
  onOk: (removed: boolean) => void,
  onErr: (error: AppError) => void,
): Cmd {
  return invokeCmd<boolean>("location_remove", { locationId }, onOk, onErr);
}

export function locationValidate(
  onOk: (missing: Array<[LocationId, string]>) => void,
  onErr: (error: AppError) => void,
): Cmd {
  return invokeCmd<Array<[LocationId, string]>>("location_validate", {}, onOk, onErr);
}

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

export function docList(
  locationId: LocationId,
  onOk: (docs: DocMeta[]) => void,
  onErr: (error: AppError) => void,
): Cmd {
  return invokeCmd<DocMeta[]>("doc_list", { locationId }, onOk, onErr);
}

export function docOpen(
  locationId: LocationId,
  relPath: string,
  onOk: (doc: DocContent) => void,
  onErr: (error: AppError) => void,
): Cmd {
  return invokeCmd<DocContent>("doc_open", { locationId, relPath }, onOk, onErr);
}

export function docSave(
  locationId: LocationId,
  relPath: string,
  text: string,
  onOk: (result: SaveResult) => void,
  onErr: (error: AppError) => void,
): Cmd {
  return invokeCmd<SaveResult>("doc_save", { locationId, relPath, text }, onOk, onErr);
}

export type SaveResult = { success: boolean; new_meta: DocMeta | null; conflict_detected: boolean };

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
  locationId: LocationId,
  relPath: string,
  text: string,
  profile: MarkdownProfile | undefined,
  onOk: (result: RenderResult) => void,
  onErr: (error: AppError) => void,
): Cmd {
  return invokeCmd<RenderResult>("markdown_render", { locationId, relPath, text, profile }, onOk, onErr);
}
