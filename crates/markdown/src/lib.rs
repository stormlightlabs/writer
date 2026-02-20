use comrak::nodes::NodeValue;
use comrak::{Arena, Options, parse_document};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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

/// Severity level for diagnostics
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DiagnosticSeverity {
    Error,
    Warning,
    Info,
}

impl std::fmt::Display for DiagnosticSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DiagnosticSeverity::Error => write!(f, "error"),
            DiagnosticSeverity::Warning => write!(f, "warning"),
            DiagnosticSeverity::Info => write!(f, "info"),
        }
    }
}

/// A single diagnostic message (lint-like warning or error)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Diagnostic {
    pub severity: DiagnosticSeverity,
    pub code: String,
    pub message: String,
    /// Line number (1-indexed) where the issue occurs
    pub line: Option<usize>,
    /// Column number (1-indexed) where the issue occurs
    pub column: Option<usize>,
    /// Source text that triggered the diagnostic
    pub source: Option<String>,
}

impl Diagnostic {
    /// Creates a new diagnostic
    pub fn new(severity: DiagnosticSeverity, code: impl Into<String>, message: impl Into<String>) -> Self {
        Self { severity, code: code.into(), message: message.into(), line: None, column: None, source: None }
    }

    /// Adds position information to the diagnostic
    pub fn at_position(mut self, line: usize, column: usize) -> Self {
        self.line = Some(line);
        self.column = Some(column);
        self
    }

    /// Adds source text to the diagnostic
    pub fn with_source(mut self, source: impl Into<String>) -> Self {
        self.source = Some(source.into());
        self
    }

    /// Creates an error diagnostic
    pub fn error(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self::new(DiagnosticSeverity::Error, code, message)
    }

    /// Creates a warning diagnostic
    pub fn warning(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self::new(DiagnosticSeverity::Warning, code, message)
    }

    /// Creates an info diagnostic
    pub fn info(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self::new(DiagnosticSeverity::Info, code, message)
    }
}

/// Collection of all diagnostics for a document
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Diagnostics {
    pub items: Vec<Diagnostic>,
}

impl Diagnostics {
    /// Creates an empty diagnostics collection
    pub fn new() -> Self {
        Self::default()
    }

    /// Adds a diagnostic to the collection
    pub fn push(&mut self, diagnostic: Diagnostic) {
        self.items.push(diagnostic);
    }

    /// Returns true if there are no diagnostics
    pub fn is_empty(&self) -> bool {
        self.items.is_empty()
    }

    /// Returns the number of diagnostics
    pub fn len(&self) -> usize {
        self.items.len()
    }

    /// Returns all errors
    pub fn errors(&self) -> Vec<&Diagnostic> {
        self.items
            .iter()
            .filter(|d| matches!(d.severity, DiagnosticSeverity::Error))
            .collect()
    }

    /// Returns all warnings
    pub fn warnings(&self) -> Vec<&Diagnostic> {
        self.items
            .iter()
            .filter(|d| matches!(d.severity, DiagnosticSeverity::Warning))
            .collect()
    }

    /// Returns diagnostics filtered by severity
    pub fn by_severity(&self, severity: DiagnosticSeverity) -> Vec<&Diagnostic> {
        self.items.iter().filter(|d| d.severity == severity).collect()
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

/// Default CSS styles for HTML export
const DEFAULT_EXPORT_CSS: &str = r#"
    body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.6;
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        color: #333;
        background: #fff;
    }

    header {
        border-bottom: 2px solid #eee;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
    }

    header h1 {
        margin: 0 0 0.5rem 0;
        color: #222;
    }

    .metadata {
        color: #666;
        font-size: 0.9rem;
    }

    .metadata span {
        margin-right: 1rem;
    }

    main h1, main h2, main h3, main h4, main h5, main h6 {
        margin-top: 2rem;
        margin-bottom: 1rem;
        color: #222;
    }

    main p {
        margin-bottom: 1rem;
    }

    main a {
        color: #0066cc;
        text-decoration: none;
    }

    main a:hover {
        text-decoration: underline;
    }

    main code {
        background: #f4f4f4;
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-family: "SF Mono", Monaco, Inconsolata, "Fira Code", monospace;
        font-size: 0.9em;
    }

    main pre {
        background: #f4f4f4;
        padding: 1rem;
        border-radius: 5px;
        overflow-x: auto;
        margin-bottom: 1rem;
    }

    main pre code {
        background: none;
        padding: 0;
    }

    main blockquote {
        border-left: 4px solid #ddd;
        padding-left: 1rem;
        margin-left: 0;
        color: #666;
    }

    main table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 1rem;
    }

    main th, main td {
        border: 1px solid #ddd;
        padding: 0.5rem;
        text-align: left;
    }

    main th {
        background: #f8f8f8;
        font-weight: 600;
    }

    main ul, main ol {
        margin-bottom: 1rem;
        padding-left: 2rem;
    }

    main li {
        margin-bottom: 0.25rem;
    }

    main input[type="checkbox"] {
        margin-right: 0.5rem;
    }

    main del {
        text-decoration: line-through;
        color: #666;
    }

    footer {
        margin-top: 3rem;
        padding-top: 1rem;
        border-top: 1px solid #eee;
        color: #666;
        font-size: 0.9rem;
        text-align: center;
    }
"#;

/// Escapes HTML special characters
fn html_escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
}

/// The main Markdown engine for parsing and rendering
pub struct MarkdownEngine;

impl MarkdownEngine {
    /// Creates a new Markdown engine
    pub fn new() -> Self {
        Self
    }

    /// Renders Markdown text to HTML using the specified profile
    pub fn render(&self, text: &str, profile: MarkdownProfile) -> Result<RenderResult, MarkdownError> {
        let arena = Arena::new();
        let options = profile.to_options();

        let (body_text, front_matter) = if profile.supports_front_matter() {
            Self::extract_front_matter(text)
        } else {
            (text, FrontMatter::default())
        };

        let root = parse_document(&arena, body_text, &options);

        let mut metadata = DocumentMetadata {
            title: None,
            outline: Vec::new(),
            links: Vec::new(),
            task_items: TaskStats::default(),
            word_count: 0,
            front_matter,
        };

        Self::extract_metadata_from_node(&root, &mut metadata, &mut true);

        if let Some(title) = metadata.front_matter.fields.get("title") {
            metadata.title = Some(title.clone());
        }

        metadata.word_count = Self::estimate_word_count(body_text);

        let mut html_output = String::new();
        comrak::format_html(root, &options, &mut html_output).map_err(|e| MarkdownError::ParseError(e.to_string()))?;

        let diagnostics = Self::run_diagnostics(text, &metadata);
        Ok(RenderResult { html: html_output, metadata, diagnostics })
    }

    /// Extracts front matter from the beginning of the document
    ///
    /// Supports YAML (---) and TOML (+++) front matter delimiters
    fn extract_front_matter(text: &str) -> (&str, FrontMatter) {
        let trimmed = text.trim_start();

        if let Some(rest) = trimmed.strip_prefix("---")
            && let Some(end_pos) = rest.find("\n---")
        {
            let fm_content = &rest[..end_pos];
            let body_start = rest[end_pos..].find('\n').map(|p| p + 1).unwrap_or(end_pos + 4);
            let body = &rest[body_start..];

            let fields = Self::parse_yaml_like_front_matter(fm_content);

            return (
                body,
                FrontMatter { raw: Some(fm_content.to_string()), format: Some(FrontMatterFormat::Yaml), fields },
            );
        }

        if let Some(rest) = trimmed.strip_prefix("+++")
            && let Some(end_pos) = rest.find("\n+++")
        {
            let fm_content = &rest[..end_pos];
            let body_start = rest[end_pos..].find('\n').map(|p| p + 1).unwrap_or(end_pos + 4);
            let body = &rest[body_start..];

            let fields = Self::parse_toml_like_front_matter(fm_content);

            return (
                body,
                FrontMatter { raw: Some(fm_content.to_string()), format: Some(FrontMatterFormat::Toml), fields },
            );
        }

        (text, FrontMatter::default())
    }

    /// Parses YAML-like front matter into key-value pairs
    ///
    /// This is a simple parser that handles basic "key: value" pairs.
    /// For complex YAML, a full YAML parser would be needed.
    fn parse_yaml_like_front_matter(content: &str) -> HashMap<String, String> {
        let mut fields = HashMap::new();

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }

            if let Some(pos) = trimmed.find(':') {
                let key = trimmed[..pos].trim().to_string();
                let value = trimmed[pos + 1..]
                    .trim()
                    .trim_matches('"')
                    .trim_matches('\'')
                    .to_string();
                if !key.is_empty() {
                    fields.insert(key, value);
                }
            }
        }

        fields
    }

    /// Parses TOML-like front matter into key-value pairs
    ///
    /// This is a simple parser that handles basic "key = value" pairs.
    /// For complex TOML, a full TOML parser would be needed.
    fn parse_toml_like_front_matter(content: &str) -> HashMap<String, String> {
        let mut fields = HashMap::new();

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }

            if let Some(pos) = trimmed.find('=') {
                let key = trimmed[..pos].trim().to_string();
                let value = trimmed[pos + 1..]
                    .trim()
                    .trim_matches('"')
                    .trim_matches('\'')
                    .to_string();
                if !key.is_empty() {
                    fields.insert(key, value);
                }
            }
        }

        fields
    }

    /// Runs all diagnostic checks on the document
    fn run_diagnostics(text: &str, metadata: &DocumentMetadata) -> Diagnostics {
        let mut diagnostics = Diagnostics::new();

        Self::check_duplicate_heading_ids(&mut diagnostics, metadata);
        Self::check_malformed_links(&mut diagnostics, metadata);
        Self::check_mixed_line_endings(&mut diagnostics, text);

        diagnostics
    }

    /// Checks for duplicate heading IDs
    fn check_duplicate_heading_ids(diagnostics: &mut Diagnostics, metadata: &DocumentMetadata) {
        let mut seen_anchors: std::collections::HashMap<String, Vec<usize>> = std::collections::HashMap::new();

        for (idx, heading) in metadata.outline.iter().enumerate() {
            if let Some(anchor) = &heading.anchor {
                seen_anchors.entry(anchor.clone()).or_default().push(idx);
            }
        }

        for (anchor, indices) in seen_anchors {
            if indices.len() > 1 {
                for idx in &indices {
                    if let Some(heading) = metadata.outline.get(*idx) {
                        diagnostics.push(
                            Diagnostic::warning("dup-heading-id", format!("Duplicate heading ID: {}", anchor))
                                .at_position(*idx + 1, 1)
                                .with_source(format!("{} {}", "#".repeat(heading.level as usize), heading.text)),
                        );
                    }
                }
            }
        }
    }

    /// Checks for malformed links (empty URLs, invalid protocols)
    fn check_malformed_links(diagnostics: &mut Diagnostics, metadata: &DocumentMetadata) {
        for link in &metadata.links {
            if link.url.is_empty() {
                diagnostics.push(
                    Diagnostic::warning("empty-link-url", "Link has empty URL")
                        .with_source(format!("[{}]", link.title.as_deref().unwrap_or("text"))),
                );
            } else if link.url.starts_with("javascript:") {
                diagnostics.push(
                    Diagnostic::error("javascript-link", format!("JavaScript URL detected: {}", link.url))
                        .with_source(link.url.clone()),
                );
            }
        }
    }

    /// Checks for mixed line endings (CRLF and LF)
    fn check_mixed_line_endings(diagnostics: &mut Diagnostics, text: &str) {
        let has_crlf = text.contains("\r\n");
        let has_lf = text.contains('\n') && text.replace("\r\n", "").contains('\n');

        if has_crlf && has_lf {
            diagnostics.push(Diagnostic::warning(
                "mixed-line-endings",
                "Document contains mixed line endings (CRLF and LF)",
            ));
        }
    }

    /// Renders Markdown using the default GfmSafe profile
    pub fn render_default(&self, text: &str) -> Result<RenderResult, MarkdownError> {
        self.render(text, MarkdownProfile::default())
    }

    /// Extracts metadata by traversing the AST
    fn extract_metadata_from_node(node: &comrak::nodes::Node, metadata: &mut DocumentMetadata, first_h1: &mut bool) {
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
        output.push_str(&format!("  <title>{}</title>\n", html_escape(&title)));

        if options.include_default_styles {
            output.push_str("  <style>\n");
            output.push_str(DEFAULT_EXPORT_CSS);
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
                html_escape(css_url)
            ));
        }

        output.push_str("</head>\n");

        output.push_str("<body>\n");

        if options.include_header && !title.is_empty() {
            output.push_str("  <header>\n");
            output.push_str(&format!("    <h1>{}</h1>\n", html_escape(&title)));

            if options.include_metadata {
                output.push_str("    <div class=\"metadata\">\n");

                if let Some(author) = render_result.metadata.front_matter.fields.get("author") {
                    output.push_str(&format!(
                        "      <span class=\"author\">{}</span>\n",
                        html_escape(author)
                    ));
                }

                if let Some(date) = render_result.metadata.front_matter.fields.get("date") {
                    output.push_str(&format!("      <span class=\"date\">{}</span>\n", html_escape(date)));
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
    fn test_golden_frontmatter_yaml() {
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
    fn test_golden_frontmatter_toml() {
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
        assert_eq!(html_escape("<script>"), "&lt;script&gt;");
        assert_eq!(html_escape("&"), "&amp;");
        assert_eq!(html_escape("\""), "&quot;");
        assert_eq!(html_escape("'"), "&#x27;");
        assert_eq!(html_escape(">"), "&gt;");
    }
}
