import { StyleCategory } from "$editor/types";
import type { PdfRenderResult } from "$pdf/types";
import type {
  AppError,
  CaptureMode,
  CaptureSubmitInput,
  CaptureSubmitResult,
  DocMeta,
  DocRef,
  EditorFontFamily,
  FocusDimmingMode,
  GlobalCaptureSettings,
  LocationId,
  MarkdownProfile,
  RenderResult,
  SaveStatus,
  SearchHit,
  SessionState,
  StyleCheckPattern,
  StyleMarkerStyle,
} from "$types";

export type EditorState = {
  doc_ref: DocRef | null;
  text: string;
  save_status: SaveStatus;
  cursor_line: number;
  cursor_column: number;
  selection_from: number | null;
  selection_to: number | null;
};

export type SaveResult = { success: boolean; new_meta: DocMeta | null; conflict_detected: boolean };

export type UiLayoutSettings = {
  sidebar_collapsed: boolean;
  top_bars_collapsed: boolean;
  status_bar_collapsed: boolean;
  reduce_motion: boolean;
  line_numbers_visible: boolean;
  text_wrapping_enabled: boolean;
  syntax_highlighting_enabled: boolean;
  editor_font_size: number;
  editor_font_family: EditorFontFamily;
  focus_typewriter_scrolling_enabled: boolean;
  focus_dimming_mode: FocusDimmingMode;
  focus_auto_enter_focus_mode: boolean;
  filename_visibility: boolean;
  create_readme_in_new_locations: boolean;
};

export type StyleCheckCategorySettings = { filler: boolean; redundancy: boolean; cliche: boolean };

export type PersistedStyleCheckSettings = {
  enabled: boolean;
  categories: StyleCheckCategorySettings;
  custom_patterns: StyleCheckPattern[];
  marker_style: StyleMarkerStyle;
};

export type BackendEvent =
  | { type: "LocationMissing"; location_id: LocationId; path: string }
  | { type: "LocationChanged"; location_id: LocationId; old_path: string; new_path: string }
  | { type: "ReconciliationComplete"; checked: number; missing: LocationId[] }
  | { type: "ConflictDetected"; location_id: LocationId; rel_path: string; conflict_filename: string }
  | { type: "DocModifiedExternally"; doc_id: DocRef; new_mtime: string }
  | {
    type: "FilesystemChanged";
    location_id: LocationId;
    entry_kind: "File" | "Directory";
    change_kind: "Created" | "Modified" | "Deleted" | "Renamed";
    rel_path: string;
    old_rel_path?: string | null;
  }
  | { type: "SaveStatusChanged"; doc_id: DocRef; status: SaveStatus };

export type ErrorCallback = (error: AppError) => void;
export type SuccessCallback<T> = (value: T) => void;

export type InvokeCmd = {
  type: "Invoke";
  command: string;
  payload: unknown;
  onOk: (value: unknown) => unknown;
  onErr: (error: AppError) => unknown;
};
export type StartWatchCmd = { type: "StartWatch"; locationId: LocationId };
export type StopWatchCmd = { type: "StopWatch"; locationId: LocationId };
export type BatchCmd = { type: "Batch"; commands: Cmd[] };
export type NoneCmd = { type: "None" };
export type Cmd = InvokeCmd | StartWatchCmd | StopWatchCmd | BatchCmd | NoneCmd;

export type BackendEventsSub = { type: "BackendEvents"; onEvent: (event: BackendEvent) => void };
export type NoneSub = { type: "None" };
export type Sub = BackendEventsSub | NoneSub;

export type LocParams<T> = Parameters<(onOk: SuccessCallback<T>, onErr: ErrorCallback) => void>;
export type LocationIdParams = Parameters<(locationId: LocationId) => void>;
export type LocationPathParams = Parameters<(locationId: LocationId, relPath: string) => void>;
export type LocationPathTextParams = Parameters<(locationId: LocationId, relPath: string, text: string) => void>;
export type DocListParams<T> = [...LocationIdParams, ...LocParams<T>];
export type DocOpenParams<T> = [...LocationPathParams, ...LocParams<T>];
export type DocSaveParams<T> = [...LocationPathTextParams, ...LocParams<T>];
export type DocRenameParams<T> = Parameters<
  (locationId: LocationId, relPath: string, newName: string, onOk: SuccessCallback<T>, onErr: ErrorCallback) => void
>;
export type DocMoveParams<T> = Parameters<
  (locationId: LocationId, relPath: string, newRelPath: string, onOk: SuccessCallback<T>, onErr: ErrorCallback) => void
>;
export type DocDeleteParams<T> = [...LocationPathParams, ...LocParams<T>];
export type DirCreateParams<T> = [...LocationPathParams, ...LocParams<T>];
export type DirDeleteParams<T> = [...LocationPathParams, ...LocParams<T>];
export type DirRenameParams<T> = Parameters<
  (locationId: LocationId, relPath: string, newName: string, onOk: SuccessCallback<T>, onErr: ErrorCallback) => void
>;
export type DirMoveParams<T> = Parameters<
  (locationId: LocationId, relPath: string, newRelPath: string, onOk: SuccessCallback<T>, onErr: ErrorCallback) => void
>;

export type SearchDateRangePayload = { from?: string; to?: string };
export type SearchFiltersPayload = {
  locations?: LocationId[];
  fileTypes?: string[];
  dateRange?: SearchDateRangePayload;
};

export type SearchParams<T> = Parameters<
  (
    query: string,
    filters: SearchFiltersPayload | undefined,
    limit: number,
    onOk: SuccessCallback<T>,
    onErr: ErrorCallback,
  ) => void
>;

export type RenderMarkdownParams<T> = [...LocationPathTextParams, profile?: MarkdownProfile, ...LocParams<T>];
export type RenderMarkdownForPdfParams<T> = [...LocationPathTextParams, profile?: MarkdownProfile, ...LocParams<T>];
export type RenderMarkdownForTextParams<T> = [...LocationPathTextParams, profile?: MarkdownProfile, ...LocParams<T>];

export type UiLayoutSetParams<T> = Parameters<
  (settings: UiLayoutSettings, onOk: SuccessCallback<T>, onErr: ErrorCallback) => void
>;

export type SessionOpenTabParams<T> = Parameters<
  (docRef: DocRef, title: string, onOk: SuccessCallback<T>, onErr: ErrorCallback) => void
>;

export type SessionTabIdParams<T> = Parameters<(tabId: string, onOk: SuccessCallback<T>, onErr: ErrorCallback) => void>;

export type SessionReorderTabsParams<T> = Parameters<
  (tabIds: string[], onOk: SuccessCallback<T>, onErr: ErrorCallback) => void
>;

export type SessionMarkTabModifiedParams<T> = Parameters<
  (tabId: string, isModified: boolean, onOk: SuccessCallback<T>, onErr: ErrorCallback) => void
>;

export type SessionUpdateTabDocParams<T> = Parameters<
  (
    locationId: number,
    oldRelPath: string,
    newDocRef: DocRef,
    title: string,
    onOk: SuccessCallback<T>,
    onErr: ErrorCallback,
  ) => void
>;

export type SessionDropDocParams<T> = Parameters<
  (locationId: number, relPath: string, onOk: SuccessCallback<T>, onErr: ErrorCallback) => void
>;

export type SessionPruneLocationsParams<T> = Parameters<
  (validLocationIds: number[], onOk: SuccessCallback<T>, onErr: ErrorCallback) => void
>;

export type SessionParams = LocParams<SessionState>;

export type StyleCheckSetParams<T> = Parameters<
  (settings: PersistedStyleCheckSettings, onOk: SuccessCallback<T>, onErr: ErrorCallback) => void
>;

export type BackendStyleCheckScanMatch = { from: number; to: number; category: StyleCategory; replacement?: string };

export type StyleCheckScanParams<T> = Parameters<
  (text: string, settings: PersistedStyleCheckSettings, onOk: SuccessCallback<T>, onErr: ErrorCallback) => void
>;

export type SearchResult = SearchHit[];
export type MarkdownRenderResult = RenderResult;
export type PdfMarkdownRenderResult = PdfRenderResult;

export type CmdResult<T> = { type: "ok"; value: T } | { type: "err"; error: AppError };

export const ok = <T>(value: T): CmdResult<T> => ({ type: "ok", value });

export const err = <T>(error: AppError): CmdResult<T> => ({ type: "err", error });

export function isOk<T>(result: CmdResult<T>): result is { type: "ok"; value: T } {
  return result.type === "ok";
}

export function isErr<T>(result: CmdResult<T>): result is { type: "err"; error: AppError } {
  return result.type === "err";
}

export type BackendCaptureDocRef = { location_id: number; rel_path: string };

export type BackendGlobalCaptureSettings = {
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

export type BackendCaptureSubmitInput = {
  mode: CaptureMode;
  text: string;
  destination?: BackendCaptureDocRef;
  open_main_after_save?: boolean;
};

export type GlobalCaptureGetParams = LocParams<GlobalCaptureSettings>;
export type GlobalCaptureSetParams = Parameters<
  (settings: GlobalCaptureSettings, onOk: SuccessCallback<boolean>, onErr: ErrorCallback) => void
>;
export type GlobalCaptureSubmitParams = Parameters<
  (input: CaptureSubmitInput, onOk: SuccessCallback<CaptureSubmitResult>, onErr: ErrorCallback) => void
>;
export type GlobalCapturePauseParams = Parameters<
  (paused: boolean, onOk: SuccessCallback<boolean>, onErr: ErrorCallback) => void
>;
export type GlobalCaptureValidateShortcutParams = Parameters<
  (shortcut: string, onOk: SuccessCallback<boolean>, onErr: ErrorCallback) => void
>;
