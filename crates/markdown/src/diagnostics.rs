use super::DocumentMetadata;
use serde::{Deserialize, Serialize};

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

    /// Runs all diagnostic checks on the document
    pub fn run(text: &str, metadata: &DocumentMetadata) -> Self {
        let mut diagnostics = Self::new();

        diagnostics.check_duplicate_heading_ids(metadata);
        diagnostics.check_malformed_links(metadata);
        diagnostics.check_mixed_line_endings(text);

        diagnostics
    }

    /// Checks for duplicate heading IDs
    fn check_duplicate_heading_ids(&mut self, metadata: &DocumentMetadata) {
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
                        self.push(
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
    fn check_malformed_links(&mut self, metadata: &DocumentMetadata) {
        for link in &metadata.links {
            if link.url.is_empty() {
                self.push(
                    Diagnostic::warning("empty-link-url", "Link has empty URL")
                        .with_source(format!("[{}]", link.title.as_deref().unwrap_or("text"))),
                );
            } else if link.url.starts_with("javascript:") {
                self.push(
                    Diagnostic::error("javascript-link", format!("JavaScript URL detected: {}", link.url))
                        .with_source(link.url.clone()),
                );
            }
        }
    }

    /// Checks for mixed line endings (CRLF and LF)
    fn check_mixed_line_endings(&mut self, text: &str) {
        let has_crlf = text.contains("\r\n");
        let has_lf = text.contains('\n') && text.replace("\r\n", "").contains('\n');

        if has_crlf && has_lf {
            self.push(Diagnostic::warning(
                "mixed-line-endings",
                "Document contains mixed line endings (CRLF and LF)",
            ));
        }
    }
}
