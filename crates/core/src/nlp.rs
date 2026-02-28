use aho_corasick::{AhoCorasick, AhoCorasickBuilder};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum PatternCategory {
    Filler,
    Redundancy,
    Cliche,
}

impl PatternCategory {
    fn as_str(self) -> &'static str {
        match self {
            Self::Filler => "filler",
            Self::Redundancy => "redundancy",
            Self::Cliche => "cliche",
        }
    }

    fn from_raw(value: &str) -> Option<Self> {
        match value {
            "filler" => Some(Self::Filler),
            "redundancy" => Some(Self::Redundancy),
            "cliche" => Some(Self::Cliche),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StylePattern {
    pub text: String,
    pub category: PatternCategory,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub replacement: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StylePatternInput {
    pub text: String,
    pub category: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub replacement: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct StyleCategorySettings {
    pub filler: bool,
    pub redundancy: bool,
    pub cliche: bool,
}

impl StyleCategorySettings {
    fn allows(&self, category: PatternCategory) -> bool {
        match category {
            PatternCategory::Filler => self.filler,
            PatternCategory::Redundancy => self.redundancy,
            PatternCategory::Cliche => self.cliche,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StyleScanInput {
    pub text: String,
    pub categories: StyleCategorySettings,
    pub custom_patterns: Vec<StylePatternInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StyleMatch {
    pub from: usize,
    pub to: usize,
    pub category: PatternCategory,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub replacement: Option<String>,
}

#[derive(Debug, Clone)]
struct IndexedPattern {
    normalized_text: String,
    category: PatternCategory,
    replacement: Option<String>,
}

pub struct PatternMatcher {
    automaton: Option<AhoCorasick>,
    patterns: Vec<IndexedPattern>,
}

impl PatternMatcher {
    pub fn new(patterns: Vec<StylePattern>) -> Self {
        let indexed_patterns: Vec<IndexedPattern> = patterns
            .into_iter()
            .filter_map(|pattern| {
                let normalized_text = pattern.text.trim().to_lowercase();
                if normalized_text.is_empty() {
                    return None;
                }

                Some(IndexedPattern { normalized_text, category: pattern.category, replacement: pattern.replacement })
            })
            .collect();

        let pattern_texts: Vec<&str> = indexed_patterns
            .iter()
            .map(|pattern| pattern.normalized_text.as_str())
            .collect();
        let automaton =
            if pattern_texts.is_empty() { None } else { AhoCorasickBuilder::new().build(&pattern_texts).ok() };

        Self { automaton, patterns: indexed_patterns }
    }

    pub fn scan(&self, text: &str) -> Vec<StyleMatch> {
        let Some(automaton) = &self.automaton else {
            return Vec::new();
        };

        if text.is_empty() {
            return Vec::new();
        }

        let normalized_text = text.to_lowercase();
        let index = TextIndex::build(&normalized_text);
        let mut matches = Vec::new();
        let mut seen = HashSet::new();

        for found in automaton.find_overlapping_iter(&normalized_text) {
            let pattern_index = found.pattern().as_usize();
            let Some(pattern) = self.patterns.get(pattern_index) else {
                continue;
            };

            let start_byte = found.start();
            let end_byte = found.end();

            if !is_word_boundary(&index, start_byte, end_byte) {
                continue;
            }

            let Some(from) = index.utf16_offset(start_byte) else {
                continue;
            };
            let Some(to) = index.utf16_offset(end_byte) else {
                continue;
            };

            let dedupe_key = (from, to, pattern.category, pattern.replacement.clone());
            if !seen.insert(dedupe_key.clone()) {
                continue;
            }

            matches.push(StyleMatch { from, to, category: dedupe_key.2, replacement: dedupe_key.3 });
        }

        matches.sort_by(|left, right| {
            left.from
                .cmp(&right.from)
                .then(left.to.cmp(&right.to))
                .then(left.category.as_str().cmp(right.category.as_str()))
        });

        matches
    }
}

pub fn scan_style_matches(input: &StyleScanInput) -> Vec<StyleMatch> {
    let mut patterns: Vec<StylePattern> = builtin_patterns()
        .iter()
        .filter(|pattern| input.categories.allows(pattern.category))
        .cloned()
        .collect();

    for pattern in &input.custom_patterns {
        let category = PatternCategory::from_raw(pattern.category.trim().to_lowercase().as_str());
        let Some(category) = category else {
            continue;
        };

        patterns.push(StylePattern { text: pattern.text.clone(), category, replacement: pattern.replacement.clone() });
    }

    PatternMatcher::new(patterns).scan(&input.text)
}

#[derive(Deserialize)]
struct DictionaryPayload {
    fillers: Option<DictionaryEntry>,
    redundancies: Option<DictionaryEntry>,
    cliches: Option<DictionaryEntry>,
}

#[derive(Deserialize)]
struct DictionaryEntry {
    patterns: Vec<DictionaryPattern>,
}

#[derive(Deserialize)]
struct DictionaryPattern {
    text: String,
    replacement: Option<String>,
}

fn builtin_patterns() -> &'static Vec<StylePattern> {
    static BUILTIN_PATTERNS: OnceLock<Vec<StylePattern>> = OnceLock::new();
    BUILTIN_PATTERNS.get_or_init(|| {
        let payload: DictionaryPayload = serde_json::from_str(include_str!("style-dictionaries.json"))
            .unwrap_or(DictionaryPayload { fillers: None, redundancies: None, cliches: None });

        let mut patterns = Vec::new();

        if let Some(entry) = payload.fillers {
            patterns.extend(entry.patterns.into_iter().map(|pattern| StylePattern {
                text: pattern.text,
                category: PatternCategory::Filler,
                replacement: pattern.replacement,
            }));
        }

        if let Some(entry) = payload.redundancies {
            patterns.extend(entry.patterns.into_iter().map(|pattern| StylePattern {
                text: pattern.text,
                category: PatternCategory::Redundancy,
                replacement: pattern.replacement,
            }));
        }

        if let Some(entry) = payload.cliches {
            patterns.extend(entry.patterns.into_iter().map(|pattern| StylePattern {
                text: pattern.text,
                category: PatternCategory::Cliche,
                replacement: pattern.replacement,
            }));
        }

        patterns
    })
}

#[derive(Debug)]
struct TextIndex {
    utf16_by_byte: HashMap<usize, usize>,
    prev_char_by_end: HashMap<usize, char>,
    next_char_by_start: HashMap<usize, char>,
}

impl TextIndex {
    fn build(text: &str) -> Self {
        let mut utf16_by_byte = HashMap::new();
        let mut prev_char_by_end = HashMap::new();
        let mut next_char_by_start = HashMap::new();
        let mut utf16_offset = 0;

        utf16_by_byte.insert(0, 0);

        for (byte_start, ch) in text.char_indices() {
            let byte_end = byte_start + ch.len_utf8();
            next_char_by_start.insert(byte_start, ch);
            prev_char_by_end.insert(byte_end, ch);
            utf16_by_byte.insert(byte_start, utf16_offset);

            utf16_offset += ch.len_utf16();
            utf16_by_byte.insert(byte_end, utf16_offset);
        }

        Self { utf16_by_byte, prev_char_by_end, next_char_by_start }
    }

    fn utf16_offset(&self, byte_offset: usize) -> Option<usize> {
        self.utf16_by_byte.get(&byte_offset).copied()
    }

    fn prev_char(&self, byte_offset: usize) -> Option<char> {
        self.prev_char_by_end.get(&byte_offset).copied()
    }

    fn next_char(&self, byte_offset: usize) -> Option<char> {
        self.next_char_by_start.get(&byte_offset).copied()
    }
}

fn is_word_char(ch: char) -> bool {
    ch.is_alphabetic() || ch.is_numeric()
}

fn is_word_boundary(index: &TextIndex, start_byte: usize, end_byte: usize) -> bool {
    let start_boundary = index.prev_char(start_byte).is_none_or(|ch| !is_word_char(ch));
    let end_boundary = index.next_char(end_byte).is_none_or(|ch| !is_word_char(ch));
    start_boundary && end_boundary
}

#[cfg(test)]
mod tests {
    use super::*;

    fn matcher(patterns: &[(&str, PatternCategory)]) -> PatternMatcher {
        PatternMatcher::new(
            patterns
                .iter()
                .map(|(text, category)| StylePattern {
                    text: (*text).to_string(),
                    category: *category,
                    replacement: None,
                })
                .collect(),
        )
    }

    #[test]
    fn scans_single_word_patterns() {
        let matcher = matcher(&[
            ("basically", PatternCategory::Filler),
            ("actually", PatternCategory::Filler),
        ]);

        let matches = matcher.scan("This is basically just a test actually");

        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0].from, 8);
        assert_eq!(matches[0].to, 17);
        assert_eq!(matches[1].from, 30);
        assert_eq!(matches[1].to, 38);
    }

    #[test]
    fn scans_multi_word_patterns() {
        let matcher = matcher(&[
            ("in order to", PatternCategory::Redundancy),
            ("at this point in time", PatternCategory::Redundancy),
        ]);

        let matches = matcher.scan("We need to act in order to succeed. At this point in time, we are ready.");

        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0].from, 15);
        assert_eq!(matches[1].from, 36);
    }

    #[test]
    fn respects_word_boundaries() {
        let matcher = matcher(&[("just", PatternCategory::Filler)]);

        let matches = matcher.scan("This is just a test. Justice is important. Adjusting takes time.");

        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].from, 8);
        assert_eq!(matches[0].to, 12);
    }

    #[test]
    fn respects_unicode_word_boundaries() {
        let matcher = matcher(&[("just", PatternCategory::Filler)]);

        let text = "éjust should not match, but just should.";
        let matches = matcher.scan(text);
        let expected_start = text
            .split_once("just should.")
            .map(|(prefix, _)| prefix.encode_utf16().count())
            .unwrap_or(0);

        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].from, expected_start);
    }

    #[test]
    fn is_case_insensitive() {
        let matcher = matcher(&[("basically", PatternCategory::Filler)]);

        let matches = matcher.scan("This is BASICALLY a test. Basically speaking.");

        assert_eq!(matches.len(), 2);
    }

    #[test]
    fn supports_overlapping_patterns() {
        let matcher = matcher(&[
            ("at the", PatternCategory::Filler),
            ("at the end of the day", PatternCategory::Cliche),
        ]);

        let matches = matcher.scan("At the end of the day, we won.");

        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0].from, 0);
        assert_eq!(matches[1].from, 0);
    }

    #[test]
    fn deduplicates_identical_matches() {
        let matcher = PatternMatcher::new(vec![
            StylePattern { text: "actually".to_string(), category: PatternCategory::Filler, replacement: None },
            StylePattern { text: "actually".to_string(), category: PatternCategory::Filler, replacement: None },
        ]);

        let matches = matcher.scan("actually");

        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].from, 0);
        assert_eq!(matches[0].to, 8);
    }

    #[test]
    fn reports_utf16_ranges_for_multibyte_characters() {
        let matcher = matcher(&[("just", PatternCategory::Filler)]);

        let matches = matcher.scan("a🙂just");

        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].from, 3);
        assert_eq!(matches[0].to, 7);
    }

    #[test]
    fn style_scan_uses_builtins_and_custom_patterns() {
        let matches = scan_style_matches(&StyleScanInput {
            text: "Basically we act in order to ship, and we may beat around the bush.".to_string(),
            categories: StyleCategorySettings { filler: true, redundancy: true, cliche: true },
            custom_patterns: vec![],
        });

        assert!(matches.iter().any(|m| m.category == PatternCategory::Filler));
        assert!(matches.iter().any(|m| m.category == PatternCategory::Redundancy));
        assert!(matches.iter().any(|m| m.category == PatternCategory::Cliche));
    }

    #[test]
    fn style_scan_ignores_invalid_custom_categories() {
        let matches = scan_style_matches(&StyleScanInput {
            text: "A unique phrase.".to_string(),
            categories: StyleCategorySettings::default(),
            custom_patterns: vec![StylePatternInput {
                text: "unique phrase".to_string(),
                category: "unknown".to_string(),
                replacement: None,
            }],
        });

        assert!(matches.is_empty());
    }

    #[test]
    fn style_scan_applies_custom_patterns_even_when_builtin_category_disabled() {
        let matches = scan_style_matches(&StyleScanInput {
            text: "Actually we can proceed.".to_string(),
            categories: StyleCategorySettings { filler: false, redundancy: false, cliche: false },
            custom_patterns: vec![StylePatternInput {
                text: "actually".to_string(),
                category: "filler".to_string(),
                replacement: Some("".to_string()),
            }],
        });

        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].category, PatternCategory::Filler);
    }
}
