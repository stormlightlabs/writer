import type { PdfRenderResult } from "$pdf/types";
import type {
  CaptureDocRef,
  CaptureSubmitInput,
  CaptureSubmitResult,
  DocContent,
  DocMeta,
  GlobalCaptureSettings,
  LocationDescriptor,
  LocationId,
  MarkdownProfile,
  RenderResult,
  SearchHit,
  SessionState,
} from "$types";
import { info } from "@tauri-apps/plugin-log";
import { invokeCmd, runCmd } from "./invoke";
import type {
  BackendCaptureDocRef,
  BackendCaptureSubmitInput,
  BackendGlobalCaptureSettings,
  BackendStyleCheckScanMatch,
  Cmd,
  DirCreateParams,
  DirDeleteParams,
  DirMoveParams,
  DirRenameParams,
  DocDeleteParams,
  DocListParams,
  DocMoveParams,
  DocOpenParams,
  DocRenameParams,
  DocSaveParams,
  GlobalCaptureGetParams,
  GlobalCapturePauseParams,
  GlobalCaptureSetParams,
  GlobalCaptureSubmitParams,
  GlobalCaptureValidateShortcutParams,
  LocParams,
  PersistedStyleCheckSettings,
  RenderMarkdownForPdfParams,
  RenderMarkdownParams,
  SaveResult,
  SearchFiltersPayload,
  SearchParams,
  SessionDropDocParams,
  SessionMarkTabModifiedParams,
  SessionOpenTabParams,
  SessionParams,
  SessionPruneLocationsParams,
  SessionReorderTabsParams,
  SessionTabIdParams,
  SessionUpdateTabDocParams,
  StyleCheckScanParams,
  StyleCheckSetParams,
  UiLayoutSetParams,
  UiLayoutSettings,
} from "./types";

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

function normalizeMarkdownProfile(profile: unknown): MarkdownProfile | undefined {
  if (profile === "StrictCommonMark" || profile === "GfmSafe") {
    return profile;
  }
  return undefined;
}

function toSafeMarkdownPayload(
  locationId: unknown,
  relPath: unknown,
  text: unknown,
  profile: unknown,
): { locationId: number; relPath: string; text: string; profile?: MarkdownProfile } {
  const normalizedProfile = normalizeMarkdownProfile(profile);
  return {
    locationId: typeof locationId === "number" ? locationId : 0,
    relPath: typeof relPath === "string" ? relPath : "",
    text: typeof text === "string" ? text : "",
    ...(normalizedProfile ? { profile: normalizedProfile } : {}),
  };
}

function describeValueShape(value: unknown): string {
  if (value === null) {
    return "null";
  }

  const valueType = typeof value;
  if (valueType !== "object") {
    return valueType;
  }

  if (Array.isArray(value)) {
    return `array(len=${value.length})`;
  }

  const constructorName = value?.constructor?.name;
  return constructorName ? `object(${constructorName})` : "object";
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

export function docRename(...[locationId, relPath, newName, onOk, onErr]: DocRenameParams<DocMeta>): Cmd {
  return invokeCmd<DocMeta>("doc_rename", { locationId, relPath, newName }, onOk, onErr);
}

export function docMove(...[locationId, relPath, newRelPath, onOk, onErr]: DocMoveParams<DocMeta>): Cmd {
  return invokeCmd<DocMeta>("doc_move", { locationId, relPath, newRelPath }, onOk, onErr);
}

export function docDelete(...[locationId, relPath, onOk, onErr]: DocDeleteParams<boolean>): Cmd {
  return invokeCmd<boolean>("doc_delete", { locationId, relPath }, onOk, onErr);
}

export function dirCreate(...[locationId, relPath, onOk, onErr]: DirCreateParams<boolean>): Cmd {
  return invokeCmd<boolean>("dir_create", { locationId, relPath }, onOk, onErr);
}

export function dirRename(...[locationId, relPath, newName, onOk, onErr]: DirRenameParams<string>): Cmd {
  return invokeCmd<string>("dir_rename", { locationId, relPath, newName }, onOk, onErr);
}

export function dirMove(...[locationId, relPath, newRelPath, onOk, onErr]: DirMoveParams<string>): Cmd {
  return invokeCmd<string>("dir_move", { locationId, relPath, newRelPath }, onOk, onErr);
}

export function dirDelete(...[locationId, relPath, onOk, onErr]: DirDeleteParams<boolean>): Cmd {
  return invokeCmd<boolean>("dir_delete", { locationId, relPath }, onOk, onErr);
}

export function searchDocuments(...[query, filters, limit, onOk, onErr]: SearchParams<SearchHit[]>): Cmd {
  return invokeCmd<SearchHit[]>("search", { query, filters, limit }, onOk, onErr);
}

export function renderMarkdown(
  ...[locationId, relPath, text, profile, onOk, onErr]: RenderMarkdownParams<RenderResult>
): Cmd {
  const payload = toSafeMarkdownPayload(locationId, relPath, text, profile);
  void info(
    JSON.stringify({
      event: "renderMarkdown_payload",
      raw: {
        locationId: describeValueShape(locationId),
        relPath: describeValueShape(relPath),
        text: describeValueShape(text),
        profile: describeValueShape(profile),
      },
      normalized: { ...payload, text: `<${payload.text.length} chars>` },
    }),
  ).catch(() => {});

  return invokeCmd<RenderResult>("markdown_render", payload, onOk, onErr);
}

export function renderMarkdownForPdf(
  ...[locationId, relPath, text, profile, onOk, onErr]: RenderMarkdownForPdfParams<PdfRenderResult>
): Cmd {
  const payload = toSafeMarkdownPayload(locationId, relPath, text, profile);
  void info(
    JSON.stringify({
      event: "renderMarkdownForPdf_payload",
      raw: {
        locationId: describeValueShape(locationId),
        relPath: describeValueShape(relPath),
        text: describeValueShape(text),
        profile: describeValueShape(profile),
      },
      normalized: { ...payload, text: `<${payload.text.length} chars>` },
    }),
  ).catch(() => {});

  return invokeCmd<PdfRenderResult>("markdown_render_for_pdf", payload, onOk, onErr);
}

export function uiLayoutGet(...[onOk, onErr]: LocParams<UiLayoutSettings>): Cmd {
  return invokeCmd<UiLayoutSettings>("ui_layout_get", {}, onOk, onErr);
}

export function uiLayoutSet(...[settings, onOk, onErr]: UiLayoutSetParams<boolean>): Cmd {
  return invokeCmd<boolean>("ui_layout_set", { settings }, onOk, onErr);
}

export function sessionGet(...[onOk, onErr]: SessionParams): Cmd {
  return invokeCmd<SessionState>("session_get", {}, onOk, onErr);
}

export function sessionOpenTab(...[docRef, title, onOk, onErr]: SessionOpenTabParams<SessionState>): Cmd {
  return invokeCmd<SessionState>("session_open_tab", { docRef, title }, onOk, onErr);
}

export function sessionSelectTab(...[tabId, onOk, onErr]: SessionTabIdParams<SessionState>): Cmd {
  return invokeCmd<SessionState>("session_select_tab", { tabId }, onOk, onErr);
}

export function sessionCloseTab(...[tabId, onOk, onErr]: SessionTabIdParams<SessionState>): Cmd {
  return invokeCmd<SessionState>("session_close_tab", { tabId }, onOk, onErr);
}

export function sessionReorderTabs(...[tabIds, onOk, onErr]: SessionReorderTabsParams<SessionState>): Cmd {
  return invokeCmd<SessionState>("session_reorder_tabs", { tabIds }, onOk, onErr);
}

export function sessionMarkTabModified(
  ...[tabId, isModified, onOk, onErr]: SessionMarkTabModifiedParams<SessionState>
): Cmd {
  return invokeCmd<SessionState>("session_mark_tab_modified", { tabId, isModified }, onOk, onErr);
}

export function sessionUpdateTabDoc(
  ...[locationId, oldRelPath, newDocRef, title, onOk, onErr]: SessionUpdateTabDocParams<SessionState>
): Cmd {
  return invokeCmd<SessionState>("session_update_tab_doc", { locationId, oldRelPath, newDocRef, title }, onOk, onErr);
}

export function sessionDropDoc(...[locationId, relPath, onOk, onErr]: SessionDropDocParams<SessionState>): Cmd {
  return invokeCmd<SessionState>("session_drop_doc", { locationId, relPath }, onOk, onErr);
}

export function sessionPruneLocations(
  ...[validLocationIds, onOk, onErr]: SessionPruneLocationsParams<SessionState>
): Cmd {
  return invokeCmd<SessionState>("session_prune_locations", { validLocationIds }, onOk, onErr);
}

export function styleCheckGet(...[onOk, onErr]: LocParams<PersistedStyleCheckSettings>): Cmd {
  return invokeCmd<PersistedStyleCheckSettings>("style_check_get", {}, onOk, onErr);
}

export function styleCheckSet(...[settings, onOk, onErr]: StyleCheckSetParams<boolean>): Cmd {
  return invokeCmd<boolean>("style_check_set", { settings }, onOk, onErr);
}

export function styleCheckScan(
  ...[text, settings, onOk, onErr]: StyleCheckScanParams<BackendStyleCheckScanMatch[]>
): Cmd {
  return invokeCmd<BackendStyleCheckScanMatch[]>("style_check_scan", { text, settings }, onOk, onErr);
}

export function runStyleCheckScan(
  text: string,
  settings: PersistedStyleCheckSettings,
): Promise<BackendStyleCheckScanMatch[]> {
  return new Promise((resolve, reject) => {
    void runCmd(styleCheckScan(text, settings, resolve, reject)).catch(reject);
  });
}

export function globalCaptureGet(...[onOk, onErr]: GlobalCaptureGetParams): Cmd {
  return invokeCmd<GlobalCaptureSettings>("global_capture_get", {}, onOk, onErr);
}

export function globalCaptureSet(...[settings, onOk, onErr]: GlobalCaptureSetParams): Cmd {
  return invokeCmd<boolean>("global_capture_set", { settings: toBackendGlobalCaptureSettings(settings) }, onOk, onErr);
}

export function globalCaptureOpen(...[onOk, onErr]: LocParams<boolean>): Cmd {
  return invokeCmd<boolean>("global_capture_open", {}, onOk, onErr);
}

export function globalCaptureSubmit(...[input, onOk, onErr]: GlobalCaptureSubmitParams): Cmd {
  return invokeCmd<CaptureSubmitResult>("global_capture_submit", toBackendCaptureSubmitInput(input), onOk, onErr);
}

export function globalCapturePause(...[paused, onOk, onErr]: GlobalCapturePauseParams): Cmd {
  return invokeCmd<boolean>("global_capture_pause", { paused }, onOk, onErr);
}

export function globalCaptureValidateShortcut(...[shortcut, onOk, onErr]: GlobalCaptureValidateShortcutParams): Cmd {
  return invokeCmd<boolean>("global_capture_validate_shortcut", { shortcut }, onOk, onErr);
}

export function markdownHelpGet(...[onOk, onErr]: LocParams<string>): Cmd {
  return invokeCmd<string>("markdown_help_get", {}, onOk, onErr);
}

export function appVersionGet(...[onOk, onErr]: LocParams<string>): Cmd {
  return invokeCmd<string>("app_version_get", {}, onOk, onErr);
}

export type { MarkdownProfile, SearchFiltersPayload };
