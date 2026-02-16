use comrak::{Arena, Options, parse_document};
use serde::{Deserialize, Serialize};

/// Markdown rendering profiles defining feature sets and safety levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum MarkdownProfile {
    /// Strict CommonMark with no extensions
    StrictCommonMark,
    /// GitHub Flavored Markdown with safety features
    /// Enables: tables, task lists, strikethrough, autolinks
    /// Disables: raw HTML (treated as untrusted)
    #[default]
    GfmSafe,
}

impl MarkdownProfile {
    /// Converts the profile to Comrak options
    pub fn to_options(&self) -> Options<'_> {
        match self {
            MarkdownProfile::StrictCommonMark => Options {
                extension: comrak::options::Extension { ..Default::default() },
                parse: comrak::options::Parse::default(),
                render: comrak::options::Render { r#unsafe: false, sourcepos: true, ..Default::default() },
            },
            MarkdownProfile::GfmSafe => Options {
                extension: comrak::options::Extension {
                    strikethrough: true,
                    tagfilter: true,
                    table: true,
                    autolink: true,
                    tasklist: true,
                    superscript: false,
                    header_ids: None,
                    footnotes: false,
                    description_lists: false,
                    front_matter_delimiter: None,
                    multiline_block_quotes: false,
                    math_dollars: false,
                    math_code: false,
                    wikilinks_title_before_pipe: false,
                    wikilinks_title_after_pipe: false,
                    underline: false,
                    subscript: false,
                    spoiler: false,
                    greentext: false,
                    ..Default::default()
                },
                parse: comrak::options::Parse::default(),
                render: comrak::options::Render { r#unsafe: false, sourcepos: true, ..Default::default() },
            },
        }
    }
}

/// A heading in the document outline
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Heading {
    pub level: u8,
    pub text: String,
    pub anchor: Option<String>,
}

/// Extracted document metadata from Markdown parsing
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DocumentMetadata {
    /// Title extracted from first H1 heading
    pub title: Option<String>,
    /// Document outline (all headings H1-H6)
    pub outline: Vec<Heading>,
    /// All link references found in the document
    pub links: Vec<LinkRef>,
    /// Number of task list items (checked and unchecked)
    pub task_items: TaskStats,
    /// Estimated word count
    pub word_count: usize,
}

/// Statistics about task list items
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct TaskStats {
    pub total: usize,
    pub completed: usize,
}

/// A link reference found in the document
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LinkRef {
    pub url: String,
    pub title: Option<String>,
}

/// Result of rendering Markdown to HTML with metadata
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RenderResult {
    /// The rendered HTML output
    pub html: String,
    /// Document metadata extracted during rendering
    pub metadata: DocumentMetadata,
}

/// Errors that can occur during Markdown processing
#[derive(Debug, Clone, thiserror::Error, PartialEq, Eq)]
pub enum MarkdownError {
    #[error("Failed to parse markdown: {0}")]
    ParseError(String),
}

/// The main Markdown engine for parsing and rendering
pub struct MarkdownEngine;

impl MarkdownEngine {
    /// Creates a new Markdown engine
    pub fn new() -> Self {
        Self
    }

    /// Renders Markdown text to HTML using the specified profile
    ///
    /// # Arguments
    /// * `text` - The Markdown text to render
    /// * `profile` - The rendering profile to use
    ///
    /// # Returns
    /// A `RenderResult` containing the HTML and extracted metadata
    pub fn render(&self, text: &str, profile: MarkdownProfile) -> Result<RenderResult, MarkdownError> {
        let arena = Arena::new();
        let options = profile.to_options();

        let root = parse_document(&arena, text, &options);

        let mut metadata = DocumentMetadata {
            title: None,
            outline: Vec::new(),
            links: Vec::new(),
            task_items: TaskStats::default(),
            word_count: 0,
        };

        Self::extract_metadata_from_node(&root, &mut metadata, &mut true);

        metadata.word_count = Self::estimate_word_count(text);

        let mut html_output = String::new();
        comrak::format_html(root, &options, &mut html_output).map_err(|e| MarkdownError::ParseError(e.to_string()))?;

        Ok(RenderResult { html: html_output, metadata })
    }

    /// Renders Markdown using the default GfmSafe profile
    pub fn render_default(&self, text: &str) -> Result<RenderResult, MarkdownError> {
        self.render(text, MarkdownProfile::default())
    }

    /// Extracts metadata by traversing the AST
    fn extract_metadata_from_node(node: &comrak::nodes::Node, metadata: &mut DocumentMetadata, first_h1: &mut bool) {
        use comrak::nodes::NodeValue;

        match &node.data.borrow().value {
            NodeValue::Heading(heading) => {
                let level = heading.level;
                let text = Self::extract_text_from_node(node);

                if level == 1 && *first_h1 {
                    metadata.title = Some(text.clone());
                    *first_h1 = false;
                }

                metadata.outline.push(Heading { level, text, anchor: None });
            }
            NodeValue::Link(link) => {
                metadata.links.push(LinkRef {
                    url: link.url.clone(),
                    title: if link.title.is_empty() { None } else { Some(link.title.clone()) },
                });
            }
            NodeValue::TaskItem(task_item) => {
                metadata.task_items.total += 1;
                if let Some(symbol) = task_item.symbol
                    && (symbol == 'x' || symbol == 'X')
                {
                    metadata.task_items.completed += 1;
                }
            }
            _ => {}
        }

        for child in node.children() {
            Self::extract_metadata_from_node(&child, metadata, first_h1);
        }
    }

    /// Extracts plain text from a node and its children
    fn extract_text_from_node(node: &comrak::nodes::Node) -> String {
        use comrak::nodes::NodeValue;

        let mut text = String::new();

        match &node.data.borrow().value {
            NodeValue::Text(t) => {
                text.push_str(t);
            }
            NodeValue::Code(code) => {
                text.push_str(&code.literal);
            }
            _ => {
                for child in node.children() {
                    text.push_str(&Self::extract_text_from_node(&child));
                }
            }
        }

        text
    }

    /// Estimates word count from Markdown text
    ///
    /// This is a simple estimation that counts whitespace-separated tokens
    fn estimate_word_count(text: &str) -> usize {
        text.split_whitespace().filter(|s| !s.is_empty()).count()
    }

    /// Validates that HTML output contains source position attributes
    ///
    /// This is useful for testing that sourcepos is enabled
    pub fn has_sourcepos(html: &str) -> bool {
        html.contains("data-sourcepos")
    }
}

impl Default for MarkdownEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    #[test]
    fn test_gfm_safe_blocks_raw_html() {
        let engine = MarkdownEngine::new();
        let markdown = "<script>alert('xss')</script>\n\nHello world";
        let result = engine.render(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(!result.html.contains("<script>"));
        assert!(!result.html.contains("alert"));
    }

    #[test]
    fn test_strict_common_mark_basic() {
        let engine = MarkdownEngine::new();
        let markdown = "# Hello\n\nThis is a paragraph.";
        let result = engine.render(markdown, MarkdownProfile::StrictCommonMark).unwrap();

        assert!(result.html.contains("<h1"));
        assert!(result.html.contains("Hello"));
        assert!(result.metadata.title == Some("Hello".to_string()));
    }

    #[test]
    fn test_gfm_tables() {
        let engine = MarkdownEngine::new();
        let markdown = "| A | B |\n|---|---|\n| 1 | 2 |";
        let result = engine.render(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(result.html.contains("<table"));
    }

    #[test]
    fn test_gfm_task_lists() {
        let engine = MarkdownEngine::new();
        let markdown = "- [x] Done\n- [ ] Not done";
        let result = engine.render(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert_eq!(result.metadata.task_items.total, 2);
        assert_eq!(result.metadata.task_items.completed, 1);
    }

    #[test]
    fn test_sourcepos_present() {
        let engine = MarkdownEngine::new();
        let markdown = "# Hello\n\nParagraph here.";
        let result = engine.render(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(MarkdownEngine::has_sourcepos(&result.html));
        assert!(result.html.contains("data-sourcepos"));
    }

    #[test]
    fn test_outline_extraction() {
        let engine = MarkdownEngine::new();
        let markdown = "# Title\n\n## Section 1\n\n### Subsection\n\n## Section 2";
        let result = engine.render(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert_eq!(result.metadata.outline.len(), 4);
        assert_eq!(result.metadata.outline[0].level, 1);
        assert_eq!(result.metadata.outline[0].text, "Title");
        assert_eq!(result.metadata.outline[1].level, 2);
        assert_eq!(result.metadata.outline[1].text, "Section 1");
    }

    #[test]
    fn test_word_count() {
        let engine = MarkdownEngine::new();
        let markdown = "This has five words total.";
        let result = engine.render(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert_eq!(result.metadata.word_count, 5);
    }

    #[test]
    fn test_strikethrough() {
        let engine = MarkdownEngine::new();
        let markdown = "~~deleted~~";
        let result = engine.render(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(result.html.contains("<del") || result.html.contains("<s>"));
    }

    #[test]
    fn test_autolinks() {
        let engine = MarkdownEngine::new();
        let markdown = "Visit https://example.com for info";
        let result = engine.render(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(result.html.contains("<a ") || result.html.contains("<a>"));
        assert!(result.html.contains("href="));
        assert!(result.html.contains("example.com"));
    }

    fn fixtures_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("..")
            .join("fixtures")
            .join("markdown")
    }

    fn render_fixtures_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("..")
            .join("fixtures")
            .join("render")
    }

    #[test]
    fn test_golden_basic_markdown() {
        let engine = MarkdownEngine::new();
        let fixtures = fixtures_dir();
        let markdown = fs::read_to_string(fixtures.join("basic.md")).expect("Failed to read basic.md");
        let expected_html = fs::read_to_string(fixtures.join("basic.html")).expect("Failed to read basic.html");
        let result = engine.render(&markdown, MarkdownProfile::GfmSafe).unwrap();
        let actual_html = result.html.trim();
        let expected_html = expected_html.trim();
        assert_eq!(
            actual_html, expected_html,
            "HTML output does not match expected fixture"
        );
    }

    #[test]
    fn test_golden_basic_outline() {
        let engine = MarkdownEngine::new();
        let fixtures = fixtures_dir();
        let markdown = fs::read_to_string(fixtures.join("basic.md")).expect("Failed to read basic.md");
        let result = engine.render(&markdown, MarkdownProfile::GfmSafe).unwrap();
        assert_eq!(result.metadata.title, Some("Test Document".to_string()));
        assert_eq!(result.metadata.outline.len(), 4);
        assert_eq!(result.metadata.outline[0].level, 1);
        assert_eq!(result.metadata.outline[0].text, "Test Document");
        assert_eq!(result.metadata.outline[1].level, 2);
        assert_eq!(result.metadata.outline[1].text, "Section 1");
        assert_eq!(result.metadata.outline[2].level, 3);
        assert_eq!(result.metadata.outline[2].text, "Subsection");
        assert_eq!(result.metadata.outline[3].level, 2);
        assert_eq!(result.metadata.outline[3].text, "Section 2");
    }

    #[test]
    fn test_golden_basic_task_stats() {
        let engine = MarkdownEngine::new();
        let fixtures = fixtures_dir();
        let markdown = fs::read_to_string(fixtures.join("basic.md")).expect("Failed to read basic.md");
        let result = engine.render(&markdown, MarkdownProfile::GfmSafe).unwrap();
        assert_eq!(result.metadata.task_items.total, 2);
        assert_eq!(result.metadata.task_items.completed, 1);
    }

    #[test]
    fn test_golden_sourcepos_present_in_fixture() {
        let engine = MarkdownEngine::new();
        let fixtures = fixtures_dir();
        let markdown = fs::read_to_string(fixtures.join("basic.md")).expect("Failed to read basic.md");
        let result = engine.render(&markdown, MarkdownProfile::GfmSafe).unwrap();
        assert!(
            result.html.contains("data-sourcepos"),
            "Expected data-sourcepos attributes in output"
        );

        let block_elements = ["<h1", "<h2", "<h3", "<p", "<ul", "<li", "<table", "<pre"];
        for element in &block_elements {
            if result.html.contains(element) {
                let pattern = format!("{} data-sourcepos=", element);
                assert!(
                    result.html.contains(&pattern),
                    "Expected {} to have data-sourcepos attribute",
                    element
                );
            }
        }
    }

    #[test]
    fn test_golden_xss_safety() {
        let engine = MarkdownEngine::new();
        let fixtures = render_fixtures_dir();

        let markdown = fs::read_to_string(fixtures.join("xss-safety.md")).expect("Failed to read xss-safety.md");
        let expected_html =
            fs::read_to_string(fixtures.join("xss-safety.html")).expect("Failed to read xss-safety.html");

        let result = engine.render(&markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(
            !result.html.contains("<script>"),
            "Script tags should be escaped or removed"
        );
        assert!(
            !result.html.contains("javascript:"),
            "JavaScript URLs should be removed"
        );

        let actual_html = result.html.trim();
        let expected_html = expected_html.trim();
        assert_eq!(
            actual_html, expected_html,
            "XSS safety output does not match expected fixture"
        );
    }
}
