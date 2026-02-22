use serde::{Deserialize, Serialize};

use super::StyleCheckPattern;

fn default_true() -> bool {
    true
}

fn default_editor_font_size() -> u16 {
    16
}

fn default_editor_font_family() -> String {
    "IBM Plex Mono".to_string()
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
