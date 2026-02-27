import { UiLayoutSettings } from "$ports";
import type { CalmUiSettings, FocusModeSettings } from "$types";
import type { EditorPresentationState, LayoutChromeState } from "./types";

export const stateToLayoutSettings = (
  layoutChrome: LayoutChromeState,
  presentation: EditorPresentationState,
  focusModeSettings: FocusModeSettings,
) => ({
  sidebar_collapsed: layoutChrome.sidebarCollapsed,
  top_bars_collapsed: layoutChrome.topBarsCollapsed,
  status_bar_collapsed: layoutChrome.statusBarCollapsed,
  reduce_motion: layoutChrome.reduceMotion,
  line_numbers_visible: presentation.lineNumbersVisible,
  text_wrapping_enabled: presentation.textWrappingEnabled,
  syntax_highlighting_enabled: presentation.syntaxHighlightingEnabled,
  editor_font_size: presentation.editorFontSize,
  editor_font_family: presentation.editorFontFamily,
  calm_ui_enabled: layoutChrome.calmUiSettings.enabled,
  calm_ui_focus_mode: layoutChrome.calmUiSettings.focusMode,
  focus_typewriter_scrolling_enabled: focusModeSettings.typewriterScrollingEnabled,
  focus_dimming_mode: focusModeSettings.dimmingMode,
  show_filenames_instead_of_titles: layoutChrome.showFilenamesInsteadOfTitles,
});

export const uiSettingsToCalmUI: (uiSettings: UiLayoutSettings) => CalmUiSettings = (uiSettings) => ({
  enabled: uiSettings.calm_ui_enabled,
  focusMode: uiSettings.calm_ui_focus_mode,
});

export const uiSettingsToFocusMode: (uiSettings: UiLayoutSettings) => FocusModeSettings = (uiSettings) => ({
  typewriterScrollingEnabled: uiSettings.focus_typewriter_scrolling_enabled,
  dimmingMode: uiSettings.focus_dimming_mode,
});

export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}

export function pickBy<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  predicate: (key: K) => boolean,
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of Object.keys(obj) as K[]) {
    if (predicate(key)) {
      result[key] = obj[key];
    }
  }
  return result;
}
