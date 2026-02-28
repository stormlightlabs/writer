use comrak::{Arena, Options, parse_document};
use diagnostics::Diagnostics;
use parser::MarkdownParser;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use transformer::{DocxTransformer, MarkdownTransformer};

mod diagnostics;
mod parser;
mod transformer;
mod utils;

/// Front matter format for documents
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum FrontMatterFormat {
    #[default]
    Yaml,
    Toml,
}

impl FrontMatterFormat {
    /// Returns the delimiter string for this format
    pub fn delimiter(&self) -> &'static str {
        match self {
            FrontMatterFormat::Yaml => "---",
            FrontMatterFormat::Toml => "+++",
        }
    }
}

/// Markdown rendering profiles defining feature sets and safety levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum MarkdownProfile {
    /// Strict CommonMark with no extensions
    StrictCommonMark,
    /// GitHub Flavored Markdown with safety features
    /// Enables: tables, task lists, strikethrough, autolinks, footnotes, description lists
    /// Disables: raw HTML (treated as untrusted)
    #[default]
    GfmSafe,
    /// Extended profile with all safe features including front matter
    /// Enables: GFM features + footnotes + description lists + front matter
    Extended,
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
                    header_ids: Some("heading-".to_string()),
                    footnotes: true,
                    description_lists: true,
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
            MarkdownProfile::Extended => Options {
                extension: comrak::options::Extension {
                    strikethrough: true,
                    tagfilter: true,
                    table: true,
                    autolink: true,
                    tasklist: true,
                    superscript: false,
                    header_ids: Some("heading-".to_string()),
                    footnotes: true,
                    description_lists: true,
                    front_matter_delimiter: Some("---".to_string()),
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

    /// Returns true if this profile supports front matter
    pub fn supports_front_matter(&self) -> bool {
        matches!(self, MarkdownProfile::Extended)
    }
}

/// A heading in the document outline
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Heading {
    pub level: u8,
    pub text: String,
    pub anchor: Option<String>,
}

/// Parsed front matter data
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct FrontMatter {
    pub raw: Option<String>,
    pub format: Option<FrontMatterFormat>,
    pub fields: HashMap<String, String>,
}

/// Extracted document metadata from Markdown parsing
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DocumentMetadata {
    /// Title extracted from first H1 heading or front matter
    pub title: Option<String>,
    /// Document outline (all headings H1-H6)
    pub outline: Vec<Heading>,
    /// All link references found in the document
    pub links: Vec<LinkRef>,
    /// Number of task list items (checked and unchecked)
    pub task_items: TaskStats,
    /// Estimated word count
    pub word_count: usize,
    /// Front matter data if present
    pub front_matter: FrontMatter,
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

/// Result of rendering Markdown to HTML with metadata and diagnostics
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RenderResult {
    /// The rendered HTML output
    pub html: String,
    /// Document metadata extracted during rendering
    pub metadata: DocumentMetadata,
    /// Diagnostics (lint warnings/errors) found in the document
    pub diagnostics: Diagnostics,
}

/// Errors that can occur during Markdown processing
#[derive(Debug, Clone, thiserror::Error, PartialEq, Eq)]
pub enum MarkdownError {
    #[error("Failed to parse markdown: {0}")]
    ParseError(String),
}

/// PDF node types for structured PDF export
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum PdfNode {
    /// Heading with level and content
    Heading { level: u8, content: String },
    /// Paragraph text
    Paragraph { content: String },
    /// Code block with optional language
    Code { content: String, language: Option<String> },
    /// List with items and ordering flag
    List { items: Vec<PdfNode>, ordered: bool },
    /// Blockquote content
    Blockquote { content: String },
    /// Footnote with id and content
    Footnote { id: String, content: String },
}

/// Result of rendering Markdown for PDF export
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PdfRenderResult {
    /// The PDF AST nodes
    pub nodes: Vec<PdfNode>,
    /// Document title from metadata
    pub title: Option<String>,
    /// Word count
    pub word_count: usize,
}

/// Result of rendering Markdown for plaintext export
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TextExportResult {
    /// The plaintext content
    pub text: String,
    /// Document title from metadata
    pub title: Option<String>,
    /// Word count
    pub word_count: usize,
}

/// Result of rendering Markdown for DOCX export
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DocxExportResult {
    /// The DOCX file bytes
    pub data: Vec<u8>,
    /// Document title from metadata
    pub title: Option<String>,
    /// Word count
    pub word_count: usize,
}

/// A list item for PDF export
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PdfListItem {
    /// Content of the list item (typically a paragraph)
    pub content: String,
}

/// Options for HTML export
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ExportOptions {
    /// Document title (overrides metadata title if set)
    pub title: Option<String>,
    /// Language code for the document (default: "en")
    pub language: String,
    /// Include default CSS styles
    pub include_default_styles: bool,
    /// Include header section with title
    pub include_header: bool,
    /// Include footer section
    pub include_footer: bool,
    /// Include metadata (author, date, word count) in header
    pub include_metadata: bool,
    /// Custom CSS to include in the head
    pub custom_css: Option<String>,
    /// External CSS URLs to link
    pub external_css_urls: Vec<String>,
}

impl Default for ExportOptions {
    fn default() -> Self {
        Self {
            title: None,
            language: "en".to_string(),
            include_default_styles: true,
            include_header: true,
            include_footer: false,
            include_metadata: true,
            custom_css: None,
            external_css_urls: Vec::new(),
        }
    }
}

impl ExportOptions {
    /// Creates options for standalone export with all features
    pub fn standalone() -> Self {
        Self {
            title: None,
            language: "en".to_string(),
            include_default_styles: true,
            include_header: true,
            include_footer: true,
            include_metadata: true,
            custom_css: None,
            external_css_urls: Vec::new(),
        }
    }

    /// Creates options for embedding (no wrapper)
    pub fn embed() -> Self {
        Self {
            title: None,
            language: "en".to_string(),
            include_default_styles: false,
            include_header: false,
            include_footer: false,
            include_metadata: false,
            custom_css: None,
            external_css_urls: Vec::new(),
        }
    }
}

/// The main Markdown engine for parsing and rendering
pub struct MarkdownEngine;

impl Default for MarkdownEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl MarkdownEngine {
    /// Creates a new Markdown engine
    pub fn new() -> Self {
        Self
    }

    /// Extracts document metadata from Markdown without rendering HTML.
    pub fn metadata(&self, text: &str, profile: MarkdownProfile) -> Result<DocumentMetadata, MarkdownError> {
        let arena = Arena::new();
        let options = profile.to_options();

        let (body_text, front_matter) = if profile.supports_front_matter() {
            MarkdownParser::extract_front_matter(text)
        } else {
            (text, FrontMatter::default())
        };

        let root = parse_document(&arena, body_text, &options);
        Ok(MarkdownParser::build_metadata(root, body_text, front_matter))
    }

    /// Renders Markdown text to HTML using the specified profile
    pub fn render(&self, text: &str, profile: MarkdownProfile) -> Result<RenderResult, MarkdownError> {
        let arena = Arena::new();
        let options = profile.to_options();

        let (body_text, front_matter) = if profile.supports_front_matter() {
            MarkdownParser::extract_front_matter(text)
        } else {
            (text, FrontMatter::default())
        };

        let root = parse_document(&arena, body_text, &options);
        let metadata = MarkdownParser::build_metadata(root, body_text, front_matter);

        let mut html_output = String::new();
        comrak::format_html(root, &options, &mut html_output).map_err(|e| MarkdownError::ParseError(e.to_string()))?;

        let diagnostics = Diagnostics::run(text, &metadata);
        Ok(RenderResult { html: html_output, metadata, diagnostics })
    }

    /// Renders Markdown using the default GfmSafe profile
    pub fn render_default(&self, text: &str) -> Result<RenderResult, MarkdownError> {
        self.render(text, MarkdownProfile::default())
    }

    /// Exports Markdown to a complete HTML document
    pub fn export_html(
        &self, text: &str, profile: MarkdownProfile, options: &ExportOptions,
    ) -> Result<String, MarkdownError> {
        let render_result = self.render(text, profile)?;

        let mut output = String::new();

        output.push_str("<!DOCTYPE html>\n");
        output.push_str("<html lang=\"");
        output.push_str(&options.language);
        output.push_str("\">\n");

        output.push_str("<head>\n");
        output.push_str("  <meta charset=\"UTF-8\">\n");
        output.push_str("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n");

        let title = options
            .title
            .clone()
            .or_else(|| render_result.metadata.title.clone())
            .unwrap_or_else(|| "Exported Document".to_string());
        output.push_str(&format!("  <title>{}</title>\n", utils::html_escape(&title)));

        if options.include_default_styles {
            output.push_str("  <style>\n");
            output.push_str(include_str!("assets/export.css"));
            output.push_str("  </style>\n");
        }

        if let Some(ref custom_css) = options.custom_css {
            output.push_str("  <style>\n");
            output.push_str(custom_css);
            output.push_str("  </style>\n");
        }

        for css_url in &options.external_css_urls {
            output.push_str(&format!(
                "  <link rel=\"stylesheet\" href=\"{}\">\n",
                utils::html_escape(css_url)
            ));
        }

        output.push_str("</head>\n");

        output.push_str("<body>\n");

        if options.include_header && !title.is_empty() {
            output.push_str("  <header>\n");
            output.push_str(&format!("    <h1>{}</h1>\n", utils::html_escape(&title)));

            if options.include_metadata {
                output.push_str("    <div class=\"metadata\">\n");

                if let Some(author) = render_result.metadata.front_matter.fields.get("author") {
                    output.push_str(&format!(
                        "      <span class=\"author\">{}</span>\n",
                        utils::html_escape(author)
                    ));
                }

                if let Some(date) = render_result.metadata.front_matter.fields.get("date") {
                    output.push_str(&format!(
                        "      <span class=\"date\">{}</span>\n",
                        utils::html_escape(date)
                    ));
                }

                if render_result.metadata.word_count > 0 {
                    output.push_str(&format!(
                        "      <span class=\"word-count\">{} words</span>\n",
                        render_result.metadata.word_count
                    ));
                }

                output.push_str("    </div>\n");
            }

            output.push_str("  </header>\n");
        }

        output.push_str("  <main>\n");
        output.push_str(&render_result.html);
        output.push_str("  </main>\n");

        if options.include_footer {
            output.push_str("  <footer>\n");
            output.push_str("    <p>Exported from Writer</p>\n");
            output.push_str("  </footer>\n");
        }

        output.push_str("</body>\n");
        output.push_str("</html>\n");

        Ok(output)
    }

    /// Exports only the body HTML without document wrapper
    ///
    /// This is useful for embedding the content in an existing HTML page
    pub fn export_html_body(&self, text: &str, profile: MarkdownProfile) -> Result<String, MarkdownError> {
        let render_result = self.render(text, profile)?;
        Ok(render_result.html)
    }

    /// Renders Markdown text to a PDF-compatible AST
    ///
    /// Parses the markdown and transforms it into a structured format
    /// suitable for rendering to PDF on the frontend.
    pub fn render_for_pdf(&self, text: &str, profile: MarkdownProfile) -> Result<PdfRenderResult, MarkdownError> {
        let arena = Arena::new();
        let options = profile.to_options();

        let (body_text, front_matter) = if profile.supports_front_matter() {
            MarkdownParser::extract_front_matter(text)
        } else {
            (text, FrontMatter::default())
        };

        let root = parse_document(&arena, body_text, &options);
        let metadata = MarkdownParser::build_metadata(root, body_text, front_matter);
        let nodes = MarkdownTransformer::transform_to_pdf_nodes(root);

        Ok(PdfRenderResult { nodes, title: metadata.title, word_count: metadata.word_count })
    }

    /// Renders Markdown text to plaintext format
    ///
    /// Parses the markdown and transforms it into plain text with preserved
    /// logical structure (paragraph breaks, list indentation, horizontal rules).
    pub fn render_for_text(&self, text: &str, profile: MarkdownProfile) -> Result<TextExportResult, MarkdownError> {
        let arena = Arena::new();
        let options = profile.to_options();

        let (body_text, front_matter) = if profile.supports_front_matter() {
            MarkdownParser::extract_front_matter(text)
        } else {
            (text, FrontMatter::default())
        };

        let root = parse_document(&arena, body_text, &options);
        let metadata = MarkdownParser::build_metadata(root, body_text, front_matter);

        let plain_text = MarkdownTransformer::transform_to_plaintext(root);

        Ok(TextExportResult { text: plain_text, title: metadata.title, word_count: metadata.word_count })
    }

    /// Renders Markdown text to DOCX format
    ///
    /// Parses the markdown and transforms it into a DOCX byte buffer
    /// using docx-rs, supporting headings, bold, italic, code font,
    /// ordered/unordered lists, blockquotes, and code blocks.
    pub fn render_for_docx(&self, text: &str, profile: MarkdownProfile) -> Result<DocxExportResult, MarkdownError> {
        let arena = Arena::new();
        let options = profile.to_options();

        let (body_text, front_matter) = if profile.supports_front_matter() {
            MarkdownParser::extract_front_matter(text)
        } else {
            (text, FrontMatter::default())
        };

        let root = parse_document(&arena, body_text, &options);
        let metadata = MarkdownParser::build_metadata(root, body_text, front_matter);

        let data = DocxTransformer::transform_to_docx(root)
            .map_err(|e| MarkdownError::ParseError(format!("DOCX generation failed: {}", e)))?;

        Ok(DocxExportResult { data, title: metadata.title, word_count: metadata.word_count })
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

        assert!(utils::has_sourcepos(&result.html));
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
    fn test_metadata_extracts_front_matter_title_without_rendering_html() {
        let engine = MarkdownEngine::new();
        let markdown = "---\ntitle: Metadata Title\n---\n\nBody text only";
        let metadata = engine.metadata(markdown, MarkdownProfile::Extended).unwrap();

        assert_eq!(metadata.title, Some("Metadata Title".to_string()));
        assert_eq!(metadata.word_count, 3);
    }

    #[test]
    fn test_render_for_pdf_extracts_title_and_nodes() {
        let engine = MarkdownEngine::new();
        let markdown = "---\ntitle: Export Title\n---\n\n# Heading\n\nParagraph text.";
        let result = engine.render_for_pdf(markdown, MarkdownProfile::Extended).unwrap();

        assert_eq!(result.title, Some("Export Title".to_string()));
        assert!(result.word_count > 0);
        assert!(
            result
                .nodes
                .iter()
                .any(|node| matches!(node, PdfNode::Heading { level: 1, content } if content == "Heading"))
        );
        assert!(
            result
                .nodes
                .iter()
                .any(|node| matches!(node, PdfNode::Paragraph { content } if content == "Paragraph text."))
        );
    }

    #[test]
    fn test_render_for_pdf_handles_lists() {
        let engine = MarkdownEngine::new();
        let markdown = "- One\n- Two";
        let result = engine.render_for_pdf(markdown, MarkdownProfile::GfmSafe).unwrap();

        let list = result.nodes.iter().find_map(|node| match node {
            PdfNode::List { items, ordered } => Some((items, ordered)),
            _ => None,
        });

        assert!(list.is_some());
        let (items, ordered) = list.unwrap();
        assert!(!ordered);
        assert_eq!(items.len(), 2);
        assert!(matches!(items[0], PdfNode::Paragraph { ref content } if content == "One"));
        assert!(matches!(items[1], PdfNode::Paragraph { ref content } if content == "Two"));
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
    fn test_basic_markdown() {
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
    fn test_basic_outline() {
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
    fn test_basic_task_stats() {
        let engine = MarkdownEngine::new();
        let fixtures = fixtures_dir();
        let markdown = fs::read_to_string(fixtures.join("basic.md")).expect("Failed to read basic.md");
        let result = engine.render(&markdown, MarkdownProfile::GfmSafe).unwrap();
        assert_eq!(result.metadata.task_items.total, 2);
        assert_eq!(result.metadata.task_items.completed, 1);
    }

    #[test]
    fn test_sourcepos_present_in_fixture() {
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
    fn test_xss_safety() {
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

    #[test]
    fn test_footnotes_rendering() {
        let engine = MarkdownEngine::new();
        let markdown = "Text with a footnote[^1].\n\n[^1]: This is the footnote.";
        let result = engine.render(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(result.html.contains("footnote"));
        assert!(result.html.contains("sup"));
    }

    #[test]
    fn test_description_lists() {
        let engine = MarkdownEngine::new();
        let markdown = "Term 1\n: Definition 1\n\nTerm 2\n: Definition 2";
        let result = engine.render(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(result.html.contains("<dl"));
        assert!(result.html.contains("<dt"));
        assert!(result.html.contains("<dd"));
    }

    #[test]
    fn test_extended_profile_front_matter() {
        let engine = MarkdownEngine::new();
        let markdown = "---\ntitle: My Post\nauthor: John\n---\n\n# Content";
        let result = engine.render(markdown, MarkdownProfile::Extended).unwrap();

        assert_eq!(result.metadata.title, Some("My Post".to_string()));
        assert_eq!(result.metadata.front_matter.format, Some(FrontMatterFormat::Yaml));
        assert!(result.metadata.front_matter.fields.contains_key("title"));
        assert!(result.metadata.front_matter.fields.contains_key("author"));
    }

    #[test]
    fn test_front_matter_not_parsed_in_gfm_safe() {
        let engine = MarkdownEngine::new();
        let markdown = "---\ntitle: My Post\n---\n\n# Content";
        let result = engine.render(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(!result.metadata.front_matter.fields.contains_key("title"));
    }

    #[test]
    fn test_toml_front_matter() {
        let engine = MarkdownEngine::new();
        let markdown = "+++\ntitle = \"TOML Post\"\n+++\n\n# Content";
        let result = engine.render(markdown, MarkdownProfile::Extended).unwrap();

        assert_eq!(result.metadata.title, Some("TOML Post".to_string()));
        assert_eq!(result.metadata.front_matter.format, Some(FrontMatterFormat::Toml));
    }

    #[test]
    fn test_yaml_front_matter_parses_scalar_fields_only() {
        let engine = MarkdownEngine::new();
        let markdown =
            "---\ntitle: \"YAML Post: 2026\"\ndraft: false\nrevision: 3\ntags:\n  - writing\n---\n\n# Content";
        let result = engine.render(markdown, MarkdownProfile::Extended).unwrap();

        assert_eq!(result.metadata.title, Some("YAML Post: 2026".to_string()));
        assert_eq!(
            result.metadata.front_matter.fields.get("draft"),
            Some(&"false".to_string())
        );
        assert_eq!(
            result.metadata.front_matter.fields.get("revision"),
            Some(&"3".to_string())
        );
        assert!(!result.metadata.front_matter.fields.contains_key("tags"));
    }

    #[test]
    fn test_toml_front_matter_parses_scalar_fields_only() {
        let engine = MarkdownEngine::new();
        let markdown =
            "+++\ntitle = \"TOML Post\"\ndraft = true\nrevision = 2\n[nested]\nkey = \"ignored\"\n+++\n\n# Content";
        let result = engine.render(markdown, MarkdownProfile::Extended).unwrap();

        assert_eq!(result.metadata.title, Some("TOML Post".to_string()));
        assert_eq!(
            result.metadata.front_matter.fields.get("draft"),
            Some(&"true".to_string())
        );
        assert_eq!(
            result.metadata.front_matter.fields.get("revision"),
            Some(&"2".to_string())
        );
        assert!(!result.metadata.front_matter.fields.contains_key("nested"));
    }

    #[test]
    fn test_diagnostics_empty_link_url() {
        let engine = MarkdownEngine::new();
        let markdown = "[Empty link]()";
        let result = engine.render(markdown, MarkdownProfile::GfmSafe).unwrap();

        let empty_link_warnings: Vec<_> = result
            .diagnostics
            .warnings()
            .into_iter()
            .filter(|d| d.code == "empty-link-url")
            .collect();
        assert!(!empty_link_warnings.is_empty(), "Should detect empty link URL");
    }

    #[test]
    fn test_diagnostics_mixed_line_endings() {
        let engine = MarkdownEngine::new();
        let markdown = "Line 1\r\nLine 2\nLine 3";
        let result = engine.render(markdown, MarkdownProfile::GfmSafe).unwrap();

        let mixed_line_warnings: Vec<_> = result
            .diagnostics
            .warnings()
            .into_iter()
            .filter(|d| d.code == "mixed-line-endings")
            .collect();
        assert!(!mixed_line_warnings.is_empty(), "Should detect mixed line endings");
    }

    #[test]
    fn test_diagnostics_javascript_link() {
        let engine = MarkdownEngine::new();
        let markdown = "[Click me](javascript:alert('XSS'))";
        let result = engine.render(markdown, MarkdownProfile::GfmSafe).unwrap();

        let js_errors: Vec<_> = result
            .diagnostics
            .errors()
            .into_iter()
            .filter(|d| d.code == "javascript-link")
            .collect();
        assert!(!js_errors.is_empty(), "Should detect JavaScript URL");
    }

    #[test]
    fn test_frontmatter_yaml() {
        let engine = MarkdownEngine::new();
        let fixtures = fixtures_dir();

        let markdown =
            fs::read_to_string(fixtures.join("frontmatter-yaml.md")).expect("Failed to read frontmatter-yaml.md");
        let result = engine.render(&markdown, MarkdownProfile::Extended).unwrap();

        assert_eq!(result.metadata.title, Some("My Blog Post".to_string()));
        assert!(result.metadata.front_matter.fields.contains_key("author"));
        assert!(result.metadata.front_matter.fields.contains_key("date"));
        assert!(result.html.contains("footnote"));
        assert!(result.html.contains("<dl"));
    }

    #[test]
    fn test_frontmatter_toml() {
        let engine = MarkdownEngine::new();
        let fixtures = fixtures_dir();

        let markdown =
            fs::read_to_string(fixtures.join("frontmatter-toml.md")).expect("Failed to read frontmatter-toml.md");
        let result = engine.render(&markdown, MarkdownProfile::Extended).unwrap();

        assert_eq!(result.metadata.title, Some("TOML Front Matter".to_string()));
        assert!(result.metadata.front_matter.fields.contains_key("author"));
        assert_eq!(result.metadata.front_matter.format, Some(FrontMatterFormat::Toml));
    }

    #[test]
    fn test_extended_profile_enables_all_features() {
        let engine = MarkdownEngine::new();

        let markdown =
            "---\ntitle: Test\n---\n\n| Col |\n|-----|\n| Val |\n\nFootnote[^1].\n\nTerm\n: Def\n\n[^1]: Note.";
        let result = engine.render(markdown, MarkdownProfile::Extended).unwrap();

        assert!(result.html.contains("<table"));
        assert!(result.html.contains("footnote"));
        assert!(result.html.contains("<dl"));
        assert_eq!(result.metadata.title, Some("Test".to_string()));
    }

    #[test]
    fn test_export_html_standalone() {
        let engine = MarkdownEngine::new();
        let markdown = "# Hello World\n\nThis is a test.";
        let options = ExportOptions::standalone();
        let html = engine
            .export_html(markdown, MarkdownProfile::GfmSafe, &options)
            .unwrap();

        assert!(html.starts_with("<!DOCTYPE html>"));
        assert!(html.contains("<html"));
        assert!(html.contains("<head>"));
        assert!(html.contains("<body>"));
        assert!(html.contains("<main>"));
        assert!(html.contains("<h1"));
        assert!(html.contains("Hello World"));
        assert!(html.contains("</html>"));
    }

    #[test]
    fn test_export_html_body_only() {
        let engine = MarkdownEngine::new();
        let markdown = "# Hello World";
        let html = engine.export_html_body(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(!html.contains("<!DOCTYPE html>"));
        assert!(!html.contains("<html"));
        assert!(html.contains("<h1"));
        assert!(html.contains("Hello World"));
    }

    #[test]
    fn test_export_html_with_front_matter_title() {
        let engine = MarkdownEngine::new();
        let markdown = "---\ntitle: My Document\n---\n\n# Content";
        let options = ExportOptions::standalone();
        let html = engine
            .export_html(markdown, MarkdownProfile::Extended, &options)
            .unwrap();

        assert!(html.contains("<title>My Document</title>"));
        assert!(html.contains("<h1>My Document</h1>"));
    }

    #[test]
    fn test_export_html_with_custom_title() {
        let engine = MarkdownEngine::new();
        let markdown = "# Hello";
        let mut options = ExportOptions::standalone();
        options.title = Some("Custom Title".to_string());
        let html = engine
            .export_html(markdown, MarkdownProfile::GfmSafe, &options)
            .unwrap();

        assert!(html.contains("<title>Custom Title</title>"));
    }

    #[test]
    fn test_export_html_includes_default_styles() {
        let engine = MarkdownEngine::new();
        let markdown = "# Test";
        let options = ExportOptions::standalone();
        let html = engine
            .export_html(markdown, MarkdownProfile::GfmSafe, &options)
            .unwrap();

        assert!(html.contains("<style>"));
        assert!(html.contains("body {"));
        assert!(html.contains("font-family"));
    }

    #[test]
    fn test_export_html_without_styles() {
        let engine = MarkdownEngine::new();
        let markdown = "# Test";
        let mut options = ExportOptions::standalone();
        options.include_default_styles = false;
        let html = engine
            .export_html(markdown, MarkdownProfile::GfmSafe, &options)
            .unwrap();

        assert!(!html.contains("<style>"));
    }

    #[test]
    fn test_export_html_with_custom_css() {
        let engine = MarkdownEngine::new();
        let markdown = "# Test";
        let mut options = ExportOptions::standalone();
        options.custom_css = Some(".custom { color: red; }".to_string());
        let html = engine
            .export_html(markdown, MarkdownProfile::GfmSafe, &options)
            .unwrap();

        assert!(html.contains(".custom { color: red; }"));
    }

    #[test]
    fn test_export_html_with_external_css() {
        let engine = MarkdownEngine::new();
        let markdown = "# Test";
        let mut options = ExportOptions::standalone();
        options.external_css_urls = vec!["https://example.com/style.css".to_string()];
        let html = engine
            .export_html(markdown, MarkdownProfile::GfmSafe, &options)
            .unwrap();

        assert!(html.contains("<link rel=\"stylesheet\" href=\"https://example.com/style.css\">"));
    }

    #[test]
    fn test_export_html_escapes_title() {
        let engine = MarkdownEngine::new();
        let markdown = "# Test <script>alert('xss')</script>";
        let options = ExportOptions::standalone();
        let html = engine
            .export_html(markdown, MarkdownProfile::GfmSafe, &options)
            .unwrap();

        assert!(!html.contains("<script>"));
        assert!(!html.to_lowercase().contains("<script") && !html.contains("</script>"));
    }

    #[test]
    fn test_export_options_embed() {
        let opts = ExportOptions::embed();
        assert!(!opts.include_default_styles);
        assert!(!opts.include_header);
        assert!(!opts.include_footer);
    }

    #[test]
    fn test_export_html_with_footer() {
        let engine = MarkdownEngine::new();
        let markdown = "# Test";
        let options = ExportOptions::standalone();
        let html = engine
            .export_html(markdown, MarkdownProfile::GfmSafe, &options)
            .unwrap();

        assert!(html.contains("<footer>"));
        assert!(html.contains("Exported from Writer"));
    }

    #[test]
    fn test_export_html_metadata_display() {
        let engine = MarkdownEngine::new();
        let markdown = "---\ntitle: Doc\nauthor: John Doe\ndate: 2024-01-15\n---\n\n# Content";
        let options = ExportOptions::standalone();
        let html = engine
            .export_html(markdown, MarkdownProfile::Extended, &options)
            .unwrap();

        assert!(html.contains("class=\"author\""));
        assert!(html.contains("John Doe"));
        assert!(html.contains("class=\"date\""));
        assert!(html.contains("2024-01-15"));
    }

    #[test]
    fn test_html_escape_function() {
        assert_eq!(utils::html_escape("<script>"), "&lt;script&gt;");
        assert_eq!(utils::html_escape("&"), "&amp;");
        assert_eq!(utils::html_escape("\""), "&quot;");
        assert_eq!(utils::html_escape("'"), "&#x27;");
        assert_eq!(utils::html_escape(">"), "&gt;");
    }

    #[test]
    fn test_render_for_text_basic() {
        let engine = MarkdownEngine::new();
        let markdown = "# Hello World\n\nThis is a paragraph with **bold** and _italic_ text.";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(result.text.contains("Hello World"));
        assert!(result.text.contains("This is a paragraph with bold and italic text."));
        assert!(!result.text.contains("**"));
        assert!(!result.text.contains("_"));
        assert!(!result.text.contains("#"));
        assert_eq!(result.title, Some("Hello World".to_string()));
    }

    #[test]
    fn test_render_for_text_preserves_structure() {
        let engine = MarkdownEngine::new();
        let markdown = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();
        let lines: Vec<&str> = result.text.lines().collect();
        assert!(lines.contains(&"First paragraph."));
        assert!(lines.contains(&"Second paragraph."));
        assert!(lines.contains(&"Third paragraph."));
    }

    #[test]
    fn test_render_for_text_unordered_list() {
        let engine = MarkdownEngine::new();
        let markdown = "- Item 1\n- Item 2\n- Item 3";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(result.text.contains("- Item 1"));
        assert!(result.text.contains("- Item 2"));
        assert!(result.text.contains("- Item 3"));
        assert!(!result.text.contains("* "));
    }

    #[test]
    fn test_render_for_text_ordered_list() {
        let engine = MarkdownEngine::new();
        let markdown = "1. First\n2. Second\n3. Third";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(result.text.contains("1. First"));
        assert!(result.text.contains("2. Second"));
        assert!(result.text.contains("3. Third"));
    }

    #[test]
    fn test_render_for_text_codeblock() {
        let engine = MarkdownEngine::new();
        let markdown = "```rust\nfn main() {\n    println!(\"Hello\");\n}\n```";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(result.text.contains("fn main()"));
        assert!(result.text.contains("println!"));
        assert!(!result.text.contains("```"));
        assert!(!result.text.contains("rust"));
    }

    #[test]
    fn test_render_for_text_blockquote() {
        let engine = MarkdownEngine::new();
        let markdown = "> This is a quote\n> with multiple lines";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(result.text.contains("> This is a quote"));
        assert!(result.text.contains("> with multiple lines") || result.text.contains("with multiple lines"));
        assert!(!result.text.contains("> This is a quote\n> "));
    }

    #[test]
    fn test_render_for_text_horizontal_rule() {
        let engine = MarkdownEngine::new();
        let markdown = "Before\n\n---\n\nAfter";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(result.text.contains("---"));
        assert!(result.text.contains("Before"));
        assert!(result.text.contains("After"));
    }

    #[test]
    fn test_render_for_text_links() {
        let engine = MarkdownEngine::new();
        let markdown = "Check out [this link](https://example.com) for more info.";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(result.text.contains("Check out this link for more info."));
        assert!(!result.text.contains("["));
        assert!(!result.text.contains("]"));
        assert!(!result.text.contains("https://example.com"));
    }

    #[test]
    fn test_render_for_text_inline_code() {
        let engine = MarkdownEngine::new();
        let markdown = "Use the `print()` function to output text.";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(result.text.contains("Use the print() function to output text."));
        assert!(!result.text.contains("`"));
    }

    #[test]
    fn test_render_for_text_strikethrough() {
        let engine = MarkdownEngine::new();
        let markdown = "This is ~~deleted~~ text.";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(result.text.contains("This is deleted text."));
        assert!(!result.text.contains("~~"));
    }

    #[test]
    fn test_render_for_text_with_front_matter() {
        let engine = MarkdownEngine::new();
        let markdown = "---\ntitle: My Document\nauthor: John Doe\n---\n\n# Introduction\n\nThis is the content.";
        let result = engine.render_for_text(markdown, MarkdownProfile::Extended).unwrap();

        assert_eq!(result.title, Some("My Document".to_string()));
        assert!(result.text.contains("Introduction"));
        assert!(result.text.contains("This is the content."));
        assert!(!result.text.contains("---"));
        assert!(!result.text.contains("title:"));
    }

    #[test]
    fn test_render_for_text_word_count() {
        let engine = MarkdownEngine::new();
        let markdown = "One two three four five.";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert_eq!(result.word_count, 5);
    }

    #[test]
    fn test_render_for_text_nested_lists() {
        let engine = MarkdownEngine::new();
        let markdown = "- Parent 1\n  - Child 1\n  - Child 2\n- Parent 2";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(result.text.contains("- Parent 1"));
        assert!(result.text.contains("- Child 1") || result.text.contains("  - Child 1"));
        assert!(result.text.contains("- Child 2") || result.text.contains("  - Child 2"));
        assert!(result.text.contains("- Parent 2"));
    }

    #[test]
    fn test_render_for_text_footnotes() {
        let engine = MarkdownEngine::new();
        let markdown = "Text with a footnote[^1].\n\n[^1]: This is the footnote.";
        let result = engine.render_for_text(markdown, MarkdownProfile::Extended).unwrap();

        assert!(result.text.contains("Text with a footnote"));
        assert!(result.text.contains("[^1]: This is the footnote."));

        let text_before_def = result.text.split("[^1]:").next().unwrap_or("");
        assert!(
            !text_before_def.contains("[^1]"),
            "Footnote reference should be removed from text, got: {}",
            text_before_def
        );
    }

    #[test]
    fn test_render_for_text_tables() {
        let engine = MarkdownEngine::new();
        let markdown = "| Name | Value |\n|------|-------|\n| Foo  | 123   |\n| Bar  | 456   |";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(
            result.text.contains("Name\tValue"),
            "Table header should be tab-separated, got: {}",
            result.text
        );
        assert!(
            result.text.contains("Foo\t123") || result.text.contains("Foo  \t123"),
            "Table row should be tab-separated, got: {}",
            result.text
        );
        assert!(!result.text.contains("|"), "Table markers should be stripped");
    }

    #[test]
    fn test_render_for_text_task_items() {
        let engine = MarkdownEngine::new();
        let markdown = "- [x] Completed task\n- [ ] Incomplete task\n- Regular item";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(
            result.text.contains("Completed task"),
            "Checked task content should be preserved"
        );
        assert!(
            result.text.contains("Incomplete task"),
            "Unchecked task content should be preserved"
        );
        assert!(
            result.text.contains("Regular item"),
            "Regular list item content should be preserved"
        );
    }

    #[test]
    fn test_render_for_text_html_block() {
        let engine = MarkdownEngine::new();
        let markdown = "<div>Some HTML content</div>\n\nRegular paragraph.";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(
            result.text.contains("<div>Some HTML content</div>") || result.text.contains("Some HTML content"),
            "HTML block content should be included"
        );
        assert!(result.text.contains("Regular paragraph."));
    }

    #[test]
    fn test_render_for_text_images() {
        let engine = MarkdownEngine::new();
        let markdown = "Here is an ![alt text](image.png) image.";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(
            result.text.contains("Here is an alt text image."),
            "Image alt text should be included"
        );
        assert!(!result.text.contains("!["), "Image markdown should be stripped");
        assert!(!result.text.contains("image.png"), "Image URL should be stripped");
    }

    #[test]
    fn test_render_for_text_empty_document() {
        let engine = MarkdownEngine::new();
        let markdown = "";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert_eq!(result.text, "");
        assert_eq!(result.word_count, 0);
        assert_eq!(result.title, None);
    }

    #[test]
    fn test_render_for_text_mixed_formatting() {
        let engine = MarkdownEngine::new();
        let markdown = "# Title with **bold** and _italic_\n\nParagraph with `code` and ~~strikethrough~~.";
        let result = engine.render_for_text(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(
            result.text.contains("Title with bold and italic"),
            "Heading content should have formatting stripped"
        );
        assert!(
            result.text.contains("Paragraph with code and strikethrough"),
            "Paragraph content should have formatting stripped"
        );
        assert!(!result.text.contains("**"), "Bold markers should be stripped");
        assert!(!result.text.contains("_"), "Italic markers should be stripped");
        assert!(!result.text.contains("`"), "Code markers should be stripped");
        assert!(!result.text.contains("~~"), "Strikethrough markers should be stripped");
    }

    #[test]
    fn test_render_for_docx_basic() {
        let engine = MarkdownEngine::new();
        let markdown = "# Hello World\n\nThis is a paragraph.";
        let result = engine.render_for_docx(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert!(!result.data.is_empty());
        assert_eq!(&result.data[0..2], b"PK");
        assert_eq!(result.title, Some("Hello World".to_string()));
        assert!(result.word_count > 0);
    }

    #[test]
    fn test_render_for_docx_with_front_matter() {
        let engine = MarkdownEngine::new();
        let markdown = "---\ntitle: My Document\n---\n\n# Content\n\nBody text.";
        let result = engine.render_for_docx(markdown, MarkdownProfile::Extended).unwrap();

        assert_eq!(&result.data[0..2], b"PK");
        assert_eq!(result.title, Some("My Document".to_string()));
    }

    #[test]
    fn test_render_for_docx_empty() {
        let engine = MarkdownEngine::new();
        let result = engine.render_for_docx("", MarkdownProfile::GfmSafe).unwrap();

        assert_eq!(&result.data[0..2], b"PK");
        assert_eq!(result.title, None);
        assert_eq!(result.word_count, 0);
    }

    #[test]
    fn test_render_for_docx_all_formatting() {
        let engine = MarkdownEngine::new();
        let markdown = "\
# Heading 1

## Heading 2

### Heading 3

Paragraph with **bold**, *italic*, `code`, and ~~strikethrough~~.

1. Ordered item one
2. Ordered item two

- Bullet one
- Bullet two

> A blockquote

```
code block
```

---
";
        let result = engine.render_for_docx(markdown, MarkdownProfile::GfmSafe).unwrap();

        assert_eq!(&result.data[0..2], b"PK");
        assert!(
            result.data.len() > 500,
            "Mixed doc should produce a reasonably sized DOCX"
        );
    }
}
