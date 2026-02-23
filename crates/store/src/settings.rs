use super::StyleCheckPattern;
use serde::{Deserialize, Serialize};

fn default_true() -> bool {
    true
}

fn default_editor_font_size() -> u16 {
    16
}

fn default_editor_font_family() -> String {
    "IBM Plex Mono".to_string()
}

fn default_global_capture_shortcut() -> String {
    "CommandOrControl+Shift+Space".to_string()
}

fn default_inbox_dir() -> String {
    "inbox".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StyleCheckCategorySettings {
    pub filler: bool,
    pub redundancy: bool,
    pub cliche: bool,
}

impl Default for StyleCheckCategorySettings {
    fn default() -> Self {
        Self { filler: true, redundancy: true, cliche: true }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct StyleCheckSettings {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub categories: StyleCheckCategorySettings,
    #[serde(default)]
    pub custom_patterns: Vec<StyleCheckPattern>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UiLayoutSettings {
    pub sidebar_collapsed: bool,
    pub top_bars_collapsed: bool,
    pub status_bar_collapsed: bool,
    #[serde(default = "default_true")]
    pub line_numbers_visible: bool,
    #[serde(default = "default_true")]
    pub text_wrapping_enabled: bool,
    #[serde(default = "default_true")]
    pub syntax_highlighting_enabled: bool,
    #[serde(default = "default_editor_font_size")]
    pub editor_font_size: u16,
    #[serde(default = "default_editor_font_family")]
    pub editor_font_family: String,
}

impl Default for UiLayoutSettings {
    fn default() -> Self {
        Self {
            sidebar_collapsed: false,
            top_bars_collapsed: false,
            status_bar_collapsed: false,
            line_numbers_visible: true,
            text_wrapping_enabled: true,
            syntax_highlighting_enabled: true,
            editor_font_size: default_editor_font_size(),
            editor_font_family: default_editor_font_family(),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum CaptureMode {
    #[default]
    QuickNote,
    WritingSession,
    Append,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CaptureDocRef {
    pub location_id: i64,
    pub rel_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GlobalCaptureSettings {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_global_capture_shortcut")]
    pub shortcut: String,
    #[serde(default)]
    pub paused: bool,
    #[serde(default)]
    pub default_mode: CaptureMode,
    #[serde(default)]
    pub target_location_id: Option<i64>,
    #[serde(default = "default_inbox_dir")]
    pub inbox_relative_dir: String,
    #[serde(default)]
    pub append_target: Option<CaptureDocRef>,
    #[serde(default = "default_true")]
    pub close_after_save: bool,
    #[serde(default = "default_true")]
    pub show_tray_icon: bool,
    #[serde(default)]
    pub last_capture_target: Option<String>,
}

impl Default for GlobalCaptureSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            shortcut: default_global_capture_shortcut(),
            paused: false,
            default_mode: CaptureMode::default(),
            target_location_id: None,
            inbox_relative_dir: default_inbox_dir(),
            append_target: None,
            close_after_save: true,
            show_tray_icon: true,
            last_capture_target: None,
        }
    }
}
