use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Unique identifier for a document within a location
/// Combines location_id + rel_path for stable identity
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct DocId {
    pub location_id: LocationId,
    pub rel_path: PathBuf,
}

impl DocId {
    /// Creates a new DocId after validating the relative path
    pub fn new(location_id: LocationId, rel_path: PathBuf) -> Result<Self, PathError> {
        let normalized = normalize_relative_path(&rel_path)?;
        Ok(Self { location_id, rel_path: normalized })
    }

    /// Resolves this DocId against a location root path
    pub fn resolve(&self, location_root: &Path) -> PathBuf {
        location_root.join(&self.rel_path)
    }

    /// Converts to a DocRef for operations
    pub fn to_doc_ref(&self) -> DocRef {
        DocRef { location_id: self.location_id, rel_path: self.rel_path.clone() }
    }
}

impl From<DocRef> for DocId {
    fn from(doc_ref: DocRef) -> Self {
        Self { location_id: doc_ref.location_id, rel_path: doc_ref.rel_path }
    }
}

/// Metadata for a document in the catalog
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DocMeta {
    pub id: DocId,
    pub filename: String,
    pub size_bytes: u64,
    pub mtime: DateTime<Utc>,
    pub created_at: Option<DateTime<Utc>>,
    pub content_hash: Option<String>,
    pub encoding: Encoding,
    pub line_ending: LineEnding,
    pub is_conflict: bool,
    pub title: Option<String>,
    pub word_count: Option<usize>,
}

/// File encoding detection and preservation
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum Encoding {
    #[default]
    Utf8,
    Utf8WithBom,
    Utf16Le,
    Utf16Be,
}

/// Line ending style preservation
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum LineEnding {
    #[default]
    Lf,
    CrLf,
    Auto,
}

/// Document content with metadata for opening
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DocContent {
    pub text: String,
    pub meta: DocMeta,
}

/// Options for listing documents
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct DocListOptions {
    pub recursive: bool,
    pub extensions: Option<Vec<String>>,
    pub sort_by: Option<DocSortField>,
    pub sort_order: SortOrder,
}

/// Sort fields for document listing
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum DocSortField {
    Name,
    Modified,
    Created,
    Size,
}

/// Sort order
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Default)]
pub enum SortOrder {
    Ascending,
    #[default]
    Descending,
}

/// Save policy options
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Default)]
pub enum SavePolicy {
    /// Atomic save: write to temp, fsync, rename
    #[default]
    Atomic,
    /// In-place overwrite (not recommended for production)
    InPlace,
}

/// Result of a save operation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SaveResult {
    pub success: bool,
    pub new_meta: Option<DocMeta>,
    pub conflict_detected: bool,
}

/// Unique identifier for a location
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct LocationId(pub i64);

impl From<i64> for LocationId {
    fn from(id: i64) -> Self {
        LocationId(id)
    }
}

impl From<LocationId> for i64 {
    fn from(id: LocationId) -> Self {
        id.0
    }
}

/// Metadata describing a user-added location (folder)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LocationDescriptor {
    pub id: LocationId,
    pub name: String,
    pub root_path: PathBuf,
    pub added_at: DateTime<Utc>,
}

/// Reference to a document within a location
/// All document operations use this instead of raw paths
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DocRef {
    pub location_id: LocationId,
    pub rel_path: PathBuf,
}

impl DocRef {
    /// Creates a new DocRef after validating the relative path
    /// Returns an error if the path attempts directory traversal
    pub fn new(location_id: LocationId, rel_path: PathBuf) -> Result<Self, PathError> {
        let normalized = normalize_relative_path(&rel_path)?;
        Ok(Self { location_id, rel_path: normalized })
    }

    /// Resolves this DocRef against a location root path
    pub fn resolve(&self, location_root: &Path) -> PathBuf {
        location_root.join(&self.rel_path)
    }
}

/// Errors that can occur during path operations
#[derive(Debug, Clone, PartialEq)]
pub enum PathError {
    PathTraversalAttempt,
    EmptyPath,
    InvalidPath(String),
}

impl std::fmt::Display for PathError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PathError::PathTraversalAttempt => write!(f, "Path traversal attempt detected"),
            PathError::EmptyPath => write!(f, "Empty path is not allowed"),
            PathError::InvalidPath(msg) => write!(f, "Invalid path: {}", msg),
        }
    }
}

impl std::error::Error for PathError {}

/// Standard error codes for the application command layer
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErrorCode {
    NotFound,
    PermissionDenied,
    InvalidPath,
    Io,
    Parse,
    Index,
    Conflict,
}

impl std::fmt::Display for ErrorCode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ErrorCode::NotFound => write!(f, "NOT_FOUND"),
            ErrorCode::PermissionDenied => write!(f, "PERMISSION_DENIED"),
            ErrorCode::InvalidPath => write!(f, "INVALID_PATH"),
            ErrorCode::Io => write!(f, "IO_ERROR"),
            ErrorCode::Parse => write!(f, "PARSE_ERROR"),
            ErrorCode::Index => write!(f, "INDEX_ERROR"),
            ErrorCode::Conflict => write!(f, "CONFLICT"),
        }
    }
}

/// Standard error response for all commands
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppError {
    pub code: ErrorCode,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<String>,
}

impl AppError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self { code, message: message.into(), context: None }
    }

    pub fn with_context(mut self, context: impl Into<String>) -> Self {
        self.context = Some(context.into());
        self
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::NotFound, message)
    }

    pub fn permission_denied(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::PermissionDenied, message)
    }

    pub fn invalid_path(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::InvalidPath, message)
    }

    pub fn io(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::Io, message)
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)?;
        if let Some(ref ctx) = self.context {
            write!(f, " (context: {})", ctx)?;
        }
        Ok(())
    }
}

impl std::error::Error for AppError {}

impl From<PathError> for AppError {
    fn from(err: PathError) -> Self {
        match err {
            PathError::PathTraversalAttempt => Self::invalid_path("Path traversal attempt detected")
                .with_context("Access denied: path escapes location root"),
            PathError::EmptyPath => Self::invalid_path("Empty path is not allowed"),
            PathError::InvalidPath(msg) => Self::invalid_path(msg),
        }
    }
}

/// Standard response envelope for all commands
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CommandResult<T> {
    Ok(T),
    Err(AppError),
}

impl<T> CommandResult<T> {
    pub fn ok(value: T) -> Self {
        Self::Ok(value)
    }

    pub fn err(error: AppError) -> Self {
        Self::Err(error)
    }

    pub fn is_ok(&self) -> bool {
        matches!(self, Self::Ok(_))
    }

    pub fn is_err(&self) -> bool {
        matches!(self, Self::Err(_))
    }
}

/// Events emitted by the backend to the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BackendEvent {
    /// Emitted when a location's root path no longer exists
    LocationMissing { location_id: LocationId, path: PathBuf },
    /// Emitted when a location's root path has changed
    LocationChanged {
        location_id: LocationId,
        old_path: PathBuf,
        new_path: PathBuf,
    },
    /// Emitted during startup reconciliation
    ReconciliationComplete { checked: usize, missing: Vec<LocationId> },
    /// Emitted when a conflicted copy is detected
    ConflictDetected {
        location_id: LocationId,
        rel_path: PathBuf,
        conflict_filename: String,
    },
    /// Emitted when a document is modified externally
    DocModifiedExternally { doc_id: DocId, new_mtime: DateTime<Utc> },
    /// Emitted when save status changes (for UI feedback)
    SaveStatusChanged { doc_id: DocId, status: SaveStatus },
}

/// Save status for UI feedback loop
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum SaveStatus {
    Idle,
    Dirty,
    Saving,
    Saved,
    Error,
}

/// Filters for full-text search
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct SearchFilters {
    pub locations: Option<Vec<LocationId>>,
    pub file_types: Option<Vec<String>>,
    pub date_range: Option<SearchDateRange>,
}

/// Optional updated-at range filter for search
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct SearchDateRange {
    pub from: Option<String>,
    pub to: Option<String>,
}

/// Highlight range in a snippet
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SearchMatch {
    pub start: usize,
    pub end: usize,
}

/// Search hit returned by the backend
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SearchHit {
    pub location_id: LocationId,
    pub rel_path: String,
    pub title: String,
    pub snippet: String,
    pub line: usize,
    pub column: usize,
    pub matches: Vec<SearchMatch>,
}

/// Normalizes a relative path and rejects any path traversal attempts
///
/// This function ensures that:
/// - The path is not empty
/// - The path does not contain ".." components that would escape the root
/// - The path is normalized (no redundant separators, no "." components)
pub fn normalize_relative_path(path: &Path) -> Result<PathBuf, PathError> {
    if path.as_os_str().is_empty() {
        return Err(PathError::EmptyPath);
    }

    let mut normalized = PathBuf::new();

    for component in path.components() {
        match component {
            std::path::Component::Normal(name) => normalized.push(name),
            std::path::Component::CurDir => continue,
            std::path::Component::ParentDir => {
                if !normalized.pop() {
                    return Err(PathError::PathTraversalAttempt);
                }
            }
            std::path::Component::RootDir | std::path::Component::Prefix(_) => {
                return Err(PathError::InvalidPath(
                    "Absolute paths are not allowed as relative paths".to_string(),
                ));
            }
        }
    }

    if normalized.as_os_str().is_empty() {
        return Err(PathError::EmptyPath);
    }

    Ok(normalized)
}

/// Validates that a resolved path is within the location root
///
/// This is a defense-in-depth check to ensure that even if path resolution
/// has edge cases, we never access files outside the scoped location.
pub fn is_path_within_location(resolved_path: &PathBuf, location_root: &PathBuf) -> bool {
    let resolved_canonical = match std::fs::canonicalize(resolved_path) {
        Ok(p) => p,
        Err(_) => resolved_path.clone(),
    };

    let root_canonical = match std::fs::canonicalize(location_root) {
        Ok(p) => p,
        Err(_) => location_root.clone(),
    };

    resolved_canonical.starts_with(&root_canonical)
}

/// Pattern for detecting cloud provider conflicted copies
/// Examples:
/// - "My Document (conflict).md"
/// - "My Document (John's conflicted copy 2024-01-15).md"
/// - "My Document (Case conflicted copy).md"
pub static CONFLICT_PATTERNS: &[&str] = &[
    "(conflict)",
    "'s conflicted copy",
    ".conflicted copy",
    " (conflicted copy",
    " conflicted copy)",
    "(conflicted copy",
    "conflicted copy",
];

/// Detects if a filename indicates a conflicted copy from cloud providers
pub fn is_conflicted_filename(filename: &str) -> bool {
    let lower = filename.to_lowercase();
    CONFLICT_PATTERNS.iter().any(|pattern| lower.contains(pattern))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_location_id_conversions() {
        let id = LocationId(42);
        let raw: i64 = id.into();
        assert_eq!(raw, 42);

        let back: LocationId = raw.into();
        assert_eq!(back, id);
    }

    #[test]
    fn test_normalize_relative_path_basic() {
        let path = PathBuf::from("docs/file.md");
        let result = normalize_relative_path(&path).unwrap();
        assert_eq!(result, PathBuf::from("docs/file.md"));
    }

    #[test]
    fn test_normalize_relative_path_with_current_dir() {
        let path = PathBuf::from("./docs/./file.md");
        let result = normalize_relative_path(&path).unwrap();
        assert_eq!(result, PathBuf::from("docs/file.md"));
    }

    #[test]
    fn test_normalize_relative_path_with_parent_dir() {
        let path = PathBuf::from("docs/../file.md");
        let result = normalize_relative_path(&path).unwrap();
        assert_eq!(result, PathBuf::from("file.md"));
    }

    #[test]
    fn test_normalize_relative_path_traversal_attempt() {
        let path = PathBuf::from("../secret.txt");
        let result = normalize_relative_path(&path);
        assert!(matches!(result, Err(PathError::PathTraversalAttempt)));
    }

    #[test]
    fn test_normalize_relative_path_deep_traversal() {
        let path = PathBuf::from("docs/../../secret.txt");
        let result = normalize_relative_path(&path);
        assert!(matches!(result, Err(PathError::PathTraversalAttempt)));
    }

    #[test]
    fn test_normalize_relative_path_empty() {
        let path = PathBuf::from("");
        let result = normalize_relative_path(&path);
        assert!(matches!(result, Err(PathError::EmptyPath)));
    }

    #[test]
    fn test_doc_ref_new() {
        let location_id = LocationId(1);
        let rel_path = PathBuf::from("docs/file.md");
        let doc_ref = DocRef::new(location_id, rel_path).unwrap();

        assert_eq!(doc_ref.location_id, location_id);
        assert_eq!(doc_ref.rel_path, PathBuf::from("docs/file.md"));
    }

    #[test]
    fn test_doc_ref_resolve() {
        let doc_ref = DocRef { location_id: LocationId(1), rel_path: PathBuf::from("docs/file.md") };
        let location_root = PathBuf::from("/home/user/writing");
        let resolved = doc_ref.resolve(&location_root);
        assert_eq!(resolved, PathBuf::from("/home/user/writing/docs/file.md"));
    }

    #[test]
    fn test_doc_ref_traversal_rejected() {
        let location_id = LocationId(1);
        let rel_path = PathBuf::from("../../../secret.txt");
        let result = DocRef::new(location_id, rel_path);
        assert!(matches!(result, Err(PathError::PathTraversalAttempt)));
    }

    #[test]
    fn test_doc_id_creation() {
        let location_id = LocationId(1);
        let rel_path = PathBuf::from("docs/file.md");
        let doc_id = DocId::new(location_id, rel_path.clone()).unwrap();

        assert_eq!(doc_id.location_id, location_id);
        assert_eq!(doc_id.rel_path, rel_path);
    }

    #[test]
    fn test_doc_id_to_doc_ref() {
        let location_id = LocationId(1);
        let rel_path = PathBuf::from("docs/file.md");
        let doc_id = DocId::new(location_id, rel_path.clone()).unwrap();

        let doc_ref = doc_id.to_doc_ref();
        assert_eq!(doc_ref.location_id, location_id);
        assert_eq!(doc_ref.rel_path, rel_path);
    }

    #[test]
    fn test_is_conflicted_filename_basic() {
        assert!(is_conflicted_filename("My Doc (conflict).md"));
        assert!(is_conflicted_filename("My Doc conflicted copy.md"));
        assert!(is_conflicted_filename("My Doc (John's conflicted copy).md"));
        assert!(is_conflicted_filename("My Doc (Case conflicted copy 2024-01-15).md"));
    }

    #[test]
    fn test_is_conflicted_filename_false() {
        assert!(!is_conflicted_filename("My Doc.md"));
        assert!(!is_conflicted_filename("Conflict Resolution.md"));
        assert!(!is_conflicted_filename("regular-file.txt"));
    }

    #[test]
    fn test_default_encoding() {
        let enc: Encoding = Default::default();
        assert!(matches!(enc, Encoding::Utf8));
    }

    #[test]
    fn test_default_line_ending() {
        let le: LineEnding = Default::default();
        assert!(matches!(le, LineEnding::Lf));
    }

    #[test]
    fn test_default_save_policy() {
        let policy: SavePolicy = Default::default();
        assert!(matches!(policy, SavePolicy::Atomic));
    }

    #[test]
    fn test_default_sort_order() {
        let order: SortOrder = Default::default();
        assert!(matches!(order, SortOrder::Descending));
    }
}
