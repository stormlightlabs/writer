use chrono::{DateTime, Utc};
use rusqlite::{Connection, OptionalExtension, params, params_from_iter, types::Value};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use writer_core::{
    AppError, DocContent, DocId, DocListOptions, DocMeta, DocSortField, Encoding, ErrorCode, LineEnding,
    LocationDescriptor, LocationId, SavePolicy, SaveResult, SearchFilters, SearchHit, SortOrder,
    is_conflicted_filename,
};

mod file_utils;
mod settings;
mod text_utils;

pub use settings::StyleCheckSettings;
pub use settings::UiLayoutSettings;
pub use settings::{CaptureDocRef, CaptureMode, FocusDimmingMode, GlobalCaptureSettings};

const UI_LAYOUT_SETTINGS_KEY: &str = "ui_layout";
const STYLE_CHECK_SETTINGS_KEY: &str = "style_check";
const GLOBAL_CAPTURE_SETTINGS_KEY: &str = "global_capture";
const LAST_OPEN_DOC_SETTINGS_KEY: &str = "last_open_doc";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StyleCheckPattern {
    pub text: String,
    pub category: String,
    pub replacement: Option<String>,
}

/// Manages the SQLite database for the application
pub struct Store {
    conn: Arc<Mutex<Connection>>,
}

impl Store {
    /// Opens or creates the store at the given path
    pub fn open(path: &PathBuf) -> Result<Self, AppError> {
        tracing::debug!("Opening store at {:?}", path);

        let conn = Connection::open(path).map_err(|e| AppError::io(format!("Failed to open database: {}", e)))?;

        let store = Self { conn: Arc::new(Mutex::new(conn)) };

        store.init_schema()?;
        tracing::info!("Store initialized successfully");

        Ok(store)
    }

    /// Opens the store in the default application data directory
    pub fn open_default() -> Result<Self, AppError> {
        let app_dir = dirs::data_dir()
            .ok_or_else(|| AppError::io("Could not determine data directory"))?
            .join("org.stormlightlabs.writer");

        std::fs::create_dir_all(&app_dir)
            .map_err(|e| AppError::io(format!("Failed to create app directory: {}", e)))?;

        Self::open(&app_dir.join("app.db"))
    }

    /// Initializes the database schema
    fn init_schema(&self) -> Result<(), AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                root_path TEXT NOT NULL UNIQUE,
                added_at TEXT NOT NULL
            )",
            [],
        )
        .map_err(|e| AppError::io(format!("Failed to create locations table: {}", e)))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_locations_path ON locations(root_path)",
            [],
        )
        .map_err(|e| AppError::io(format!("Failed to create index: {}", e)))?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS documents (
                location_id INTEGER NOT NULL,
                rel_path TEXT NOT NULL,
                filename TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                mtime TEXT NOT NULL,
                created_at TEXT,
                content_hash TEXT,
                encoding INTEGER NOT NULL DEFAULT 0,
                line_ending INTEGER NOT NULL DEFAULT 0,
                is_conflict INTEGER NOT NULL DEFAULT 0,
                title TEXT,
                word_count INTEGER,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (location_id, rel_path),
                FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
            )",
            [],
        )
        .map_err(|e| AppError::io(format!("Failed to create documents table: {}", e)))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_documents_mtime ON documents(location_id, mtime DESC)",
            [],
        )
        .map_err(|e| AppError::io(format!("Failed to create documents index: {}", e)))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_documents_conflict ON documents(is_conflict)",
            [],
        )
        .map_err(|e| AppError::io(format!("Failed to create conflict index: {}", e)))?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC)",
            [],
        )
        .map_err(|e| AppError::io(format!("Failed to create updated_at index: {}", e)))?;

        conn.execute(
            "CREATE VIRTUAL TABLE IF NOT EXISTS docs_fts USING fts5(
                location_id UNINDEXED,
                rel_path UNINDEXED,
                title,
                content,
                tokenize = 'unicode61'
            )",
            [],
        )
        .map_err(|e| AppError::io(format!("Failed to create docs_fts table: {}", e)))?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )
        .map_err(|e| AppError::io(format!("Failed to create app_settings table: {}", e)))?;

        tracing::debug!("Database schema initialized");
        Ok(())
    }

    pub fn ui_layout_get(&self) -> Result<UiLayoutSettings, AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        let maybe_value = conn
            .query_row(
                "SELECT value FROM app_settings WHERE key = ?1",
                params![UI_LAYOUT_SETTINGS_KEY],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|e| AppError::io(format!("Failed to query UI layout settings: {}", e)))?;

        match maybe_value {
            Some(value) => serde_json::from_str::<UiLayoutSettings>(&value).map_err(|e| {
                AppError::new(
                    ErrorCode::Parse,
                    format!("Failed to parse persisted UI layout settings: {}", e),
                )
            }),
            None => Ok(UiLayoutSettings::default()),
        }
    }

    pub fn ui_layout_set(&self, settings: &UiLayoutSettings) -> Result<(), AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        let settings_json = serde_json::to_string(settings).map_err(|e| {
            AppError::new(
                ErrorCode::Parse,
                format!("Failed to serialize UI layout settings: {}", e),
            )
        })?;
        let updated_at = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO app_settings (key, value, updated_at)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET
             value = excluded.value,
             updated_at = excluded.updated_at",
            params![UI_LAYOUT_SETTINGS_KEY, settings_json, updated_at],
        )
        .map_err(|e| AppError::io(format!("Failed to persist UI layout settings: {}", e)))?;

        Ok(())
    }

    pub fn style_check_get(&self) -> Result<StyleCheckSettings, AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        let maybe_value = conn
            .query_row(
                "SELECT value FROM app_settings WHERE key = ?1",
                params![STYLE_CHECK_SETTINGS_KEY],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|e| AppError::io(format!("Failed to query style check settings: {}", e)))?;

        match maybe_value {
            Some(value) => serde_json::from_str::<StyleCheckSettings>(&value).map_err(|e| {
                AppError::new(
                    ErrorCode::Parse,
                    format!("Failed to parse persisted style check settings: {}", e),
                )
            }),
            None => Ok(StyleCheckSettings::default()),
        }
    }

    pub fn style_check_set(&self, settings: &StyleCheckSettings) -> Result<(), AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        let settings_json = serde_json::to_string(settings).map_err(|e| {
            AppError::new(
                ErrorCode::Parse,
                format!("Failed to serialize style check settings: {}", e),
            )
        })?;
        let updated_at = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO app_settings (key, value, updated_at)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET
             value = excluded.value,
             updated_at = excluded.updated_at",
            params![STYLE_CHECK_SETTINGS_KEY, settings_json, updated_at],
        )
        .map_err(|e| AppError::io(format!("Failed to persist style check settings: {}", e)))?;

        Ok(())
    }

    pub fn global_capture_get(&self) -> Result<GlobalCaptureSettings, AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        let maybe_value = conn
            .query_row(
                "SELECT value FROM app_settings WHERE key = ?1",
                params![GLOBAL_CAPTURE_SETTINGS_KEY],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|e| AppError::io(format!("Failed to query global capture settings: {}", e)))?;

        match maybe_value {
            Some(value) => serde_json::from_str::<GlobalCaptureSettings>(&value).map_err(|e| {
                AppError::new(
                    ErrorCode::Parse,
                    format!("Failed to parse persisted global capture settings: {}", e),
                )
            }),
            None => Ok(GlobalCaptureSettings::default()),
        }
    }

    pub fn global_capture_set(&self, settings: &GlobalCaptureSettings) -> Result<(), AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        let settings_json = serde_json::to_string(settings).map_err(|e| {
            AppError::new(
                ErrorCode::Parse,
                format!("Failed to serialize global capture settings: {}", e),
            )
        })?;
        let updated_at = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO app_settings (key, value, updated_at)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET
             value = excluded.value,
             updated_at = excluded.updated_at",
            params![GLOBAL_CAPTURE_SETTINGS_KEY, settings_json, updated_at],
        )
        .map_err(|e| AppError::io(format!("Failed to persist global capture settings: {}", e)))?;

        Ok(())
    }

    pub fn last_open_doc_get(&self) -> Result<Option<CaptureDocRef>, AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        let maybe_value = conn
            .query_row(
                "SELECT value FROM app_settings WHERE key = ?1",
                params![LAST_OPEN_DOC_SETTINGS_KEY],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|e| AppError::io(format!("Failed to query last open doc setting: {}", e)))?;

        match maybe_value {
            Some(value) => serde_json::from_str::<CaptureDocRef>(&value).map(Some).map_err(|e| {
                AppError::new(
                    ErrorCode::Parse,
                    format!("Failed to parse persisted last open doc setting: {}", e),
                )
            }),
            None => Ok(None),
        }
    }

    pub fn last_open_doc_set(&self, doc_ref: Option<&CaptureDocRef>) -> Result<(), AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        if let Some(doc_ref) = doc_ref {
            let payload = serde_json::to_string(doc_ref).map_err(|e| {
                AppError::new(
                    ErrorCode::Parse,
                    format!("Failed to serialize last open doc setting: {}", e),
                )
            })?;
            let updated_at = Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO app_settings (key, value, updated_at)
                 VALUES (?1, ?2, ?3)
                 ON CONFLICT(key) DO UPDATE SET
                 value = excluded.value,
                 updated_at = excluded.updated_at",
                params![LAST_OPEN_DOC_SETTINGS_KEY, payload, updated_at],
            )
            .map_err(|e| AppError::io(format!("Failed to persist last open doc setting: {}", e)))?;

            return Ok(());
        }

        conn.execute(
            "DELETE FROM app_settings WHERE key = ?1",
            params![LAST_OPEN_DOC_SETTINGS_KEY],
        )
        .map_err(|e| AppError::io(format!("Failed to clear last open doc setting: {}", e)))?;

        Ok(())
    }

    /// Adds a new location
    pub fn location_add(&self, name: String, root_path: PathBuf) -> Result<LocationDescriptor, AppError> {
        let path_str = root_path.to_string_lossy().to_string();
        let added_at = Utc::now();
        let added_at_str = added_at.to_rfc3339();

        tracing::debug!("Adding location: name={}, path={}", name, path_str);

        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        conn.execute(
            "INSERT INTO locations (name, root_path, added_at) VALUES (?1, ?2, ?3)",
            params![&name, &path_str, &added_at_str],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE constraint failed") {
                AppError::new(ErrorCode::Conflict, "Location already exists")
                    .with_context(format!("Path: {}", path_str))
            } else {
                AppError::io(format!("Failed to insert location: {}", e))
            }
        })?;

        let id = conn.last_insert_rowid();
        tracing::info!("Location added successfully: id={}, name={}", id, name);

        Ok(LocationDescriptor { id: LocationId(id), name, root_path, added_at })
    }

    /// Lists all locations
    pub fn location_list(&self) -> Result<Vec<LocationDescriptor>, AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        let mut stmt = conn
            .prepare("SELECT id, name, root_path, added_at FROM locations ORDER BY added_at DESC")
            .map_err(|e| AppError::io(format!("Failed to prepare query: {}", e)))?;

        let locations = stmt
            .query_map([], |row| {
                let id: i64 = row.get(0)?;
                let name: String = row.get(1)?;
                let root_path_str: String = row.get(2)?;
                let added_at_str: String = row.get(3)?;

                let root_path = PathBuf::from(root_path_str);
                let added_at = chrono::DateTime::parse_from_rfc3339(&added_at_str)
                    .map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(3, rusqlite::types::Type::Text, Box::new(e))
                    })?
                    .with_timezone(&Utc);

                Ok(LocationDescriptor { id: LocationId(id), name, root_path, added_at })
            })
            .map_err(|e| AppError::io(format!("Failed to query locations: {}", e)))?;

        let mut result = Vec::new();
        for location in locations {
            match location {
                Ok(loc) => result.push(loc),
                Err(e) => tracing::warn!("Failed to parse location row: {}", e),
            }
        }

        tracing::debug!("Listed {} locations", result.len());
        Ok(result)
    }

    /// Gets a location by ID
    pub fn location_get(&self, location_id: LocationId) -> Result<Option<LocationDescriptor>, AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        let mut stmt = conn
            .prepare("SELECT id, name, root_path, added_at FROM locations WHERE id = ?1")
            .map_err(|e| AppError::io(format!("Failed to prepare query: {}", e)))?;

        let mut rows = stmt
            .query_map(params![location_id.0], |row| {
                let id: i64 = row.get(0)?;
                let name: String = row.get(1)?;
                let root_path_str: String = row.get(2)?;
                let added_at_str: String = row.get(3)?;

                let root_path = PathBuf::from(root_path_str);
                let added_at = chrono::DateTime::parse_from_rfc3339(&added_at_str)
                    .map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(3, rusqlite::types::Type::Text, Box::new(e))
                    })?
                    .with_timezone(&Utc);

                Ok(LocationDescriptor { id: LocationId(id), name, root_path, added_at })
            })
            .map_err(|e| AppError::io(format!("Failed to query location: {}", e)))?;

        match rows.next() {
            Some(Ok(loc)) => Ok(Some(loc)),
            Some(Err(e)) => Err(AppError::io(format!("Failed to parse location: {}", e))),
            None => Ok(None),
        }
    }

    /// Removes a location
    pub fn location_remove(&self, location_id: LocationId) -> Result<bool, AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        let rows_affected = conn
            .execute("DELETE FROM locations WHERE id = ?1", params![location_id.0])
            .map_err(|e| AppError::io(format!("Failed to remove location: {}", e)))?;

        if rows_affected > 0 {
            tracing::info!("Location removed: id={}", location_id.0);
            Ok(true)
        } else {
            tracing::warn!("Attempted to remove non-existent location: id={}", location_id.0);
            Ok(false)
        }
    }

    /// Validates that all locations still exist on disk
    /// Returns a list of location IDs whose roots no longer exist
    pub fn validate_locations(&self) -> Result<Vec<(LocationId, PathBuf)>, AppError> {
        let locations = self.location_list()?;
        let mut missing = Vec::new();

        for location in locations {
            if !location.root_path.exists() {
                tracing::warn!(
                    "Location root no longer exists: id={}, path={:?}",
                    location.id.0,
                    location.root_path
                );
                missing.push((location.id, location.root_path));
            }
        }

        Ok(missing)
    }

    /// Lists documents in a location
    pub fn doc_list(&self, location_id: LocationId, options: Option<DocListOptions>) -> Result<Vec<DocMeta>, AppError> {
        let location = self
            .location_get(location_id)?
            .ok_or_else(|| AppError::not_found(format!("Location not found: {:?}", location_id)))?;

        let options = options.unwrap_or_default();
        let root_path = &location.root_path;

        let mut docs = Vec::new();

        if options.recursive {
            self.collect_docs_recursive(root_path, root_path, location_id, &options, &mut docs)?;
        } else {
            self.collect_docs_shallow(root_path, root_path, location_id, &options, &mut docs)?;
        }

        match options.sort_by.unwrap_or(DocSortField::Modified) {
            DocSortField::Name => {
                docs.sort_by(|a, b| a.filename.cmp(&b.filename));
            }
            DocSortField::Modified => {
                docs.sort_by(|a, b| b.mtime.cmp(&a.mtime));
            }
            DocSortField::Created => {
                docs.sort_by(|a, b| match (&a.created_at, &b.created_at) {
                    (Some(a), Some(b)) => b.cmp(a),
                    (Some(_), None) => std::cmp::Ordering::Less,
                    (None, Some(_)) => std::cmp::Ordering::Greater,
                    (None, None) => std::cmp::Ordering::Equal,
                });
            }
            DocSortField::Size => {
                docs.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
            }
        }

        if matches!(options.sort_order, SortOrder::Ascending) {
            docs.reverse();
        }

        tracing::debug!("Listed {} documents in location {:?}", docs.len(), location_id);
        Ok(docs)
    }

    fn collect_docs_shallow(
        &self, root: &Path, current: &Path, location_id: LocationId, options: &DocListOptions, docs: &mut Vec<DocMeta>,
    ) -> Result<(), AppError> {
        let entries =
            std::fs::read_dir(current).map_err(|e| AppError::io(format!("Failed to read directory: {}", e)))?;

        let extensions = options
            .extensions
            .as_ref()
            .map(|exts| exts.iter().map(|e| e.to_lowercase()).collect::<Vec<_>>());

        for entry in entries {
            let entry = entry.map_err(|e| AppError::io(format!("Failed to read entry: {}", e)))?;
            let path = entry.path();

            if path.is_file() {
                let filename = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                if let Some(ref exts) = extensions {
                    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
                    if !exts.contains(&ext) {
                        continue;
                    }
                }

                let rel_path = path
                    .strip_prefix(root)
                    .map_err(|_| AppError::io("Path not within root"))?
                    .to_path_buf();

                let meta = self.read_doc_metadata(&path, location_id, rel_path, &filename)?;
                docs.push(meta);
            }
        }

        Ok(())
    }

    fn collect_docs_recursive(
        &self, root: &Path, current: &Path, location_id: LocationId, options: &DocListOptions, docs: &mut Vec<DocMeta>,
    ) -> Result<(), AppError> {
        let entries =
            std::fs::read_dir(current).map_err(|e| AppError::io(format!("Failed to read directory: {}", e)))?;

        let extensions = options
            .extensions
            .as_ref()
            .map(|exts| exts.iter().map(|e| e.to_lowercase()).collect::<Vec<_>>());

        for entry in entries {
            let entry = entry.map_err(|e| AppError::io(format!("Failed to read entry: {}", e)))?;
            let path = entry.path();

            if path.is_file() {
                let filename = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                if let Some(ref exts) = extensions {
                    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
                    if !exts.contains(&ext) {
                        continue;
                    }
                }

                let rel_path = path
                    .strip_prefix(root)
                    .map_err(|_| AppError::io("Path not within root"))?
                    .to_path_buf();

                let meta = self.read_doc_metadata(&path, location_id, rel_path, &filename)?;
                docs.push(meta);
            } else if path.is_dir() {
                self.collect_docs_recursive(root, &path, location_id, options, docs)?;
            }
        }

        Ok(())
    }

    fn read_doc_metadata(
        &self, path: &Path, location_id: LocationId, rel_path: PathBuf, filename: &str,
    ) -> Result<DocMeta, AppError> {
        let metadata = std::fs::metadata(path).map_err(|e| AppError::io(format!("Failed to read metadata: {}", e)))?;

        let size_bytes = metadata.len();
        let mtime = metadata
            .modified()
            .map_err(|e| AppError::io(format!("Failed to get mtime: {}", e)))?;
        let mtime: DateTime<Utc> = mtime.into();

        let created_at = metadata.created().ok().map(DateTime::<Utc>::from);

        let is_conflict = is_conflicted_filename(filename);
        let text_content =
            if file_utils::is_indexable_text_path(path) { std::fs::read_to_string(path).ok() } else { None };

        let word_count = text_content.as_ref().map(|content| text_utils::count_words(content));
        let title = text_content
            .as_ref()
            .and_then(|content| text_utils::extract_title(content, &rel_path))
            .or_else(|| text_utils::extract_title("", &rel_path));
        let content_hash = text_content.as_ref().map(|content| text_utils::hash_text(content));

        Ok(DocMeta {
            id: DocId { location_id, rel_path },
            filename: filename.to_string(),
            size_bytes,
            mtime,
            created_at,
            content_hash,
            encoding: Encoding::default(),
            line_ending: LineEnding::default(),
            is_conflict,
            title,
            word_count,
        })
    }

    /// Opens a document and returns its content with metadata
    pub fn doc_open(&self, doc_id: &DocId) -> Result<DocContent, AppError> {
        let location = self
            .location_get(doc_id.location_id)?
            .ok_or_else(|| AppError::not_found(format!("Location not found: {:?}", doc_id.location_id)))?;

        let full_path = doc_id.resolve(&location.root_path);

        if !full_path.exists() {
            return Err(AppError::not_found(format!("Document not found: {:?}", full_path)));
        }

        let mut file = File::open(&full_path).map_err(|e| AppError::io(format!("Failed to open file: {}", e)))?;
        let mut bytes = Vec::new();
        file.read_to_end(&mut bytes)
            .map_err(|e| AppError::io(format!("Failed to read file: {}", e)))?;

        let (text, encoding) = text_utils::detect_and_decode(&bytes)?;

        let line_ending = LineEnding::detect(&text);
        let word_count = text_utils::count_words(&text);
        let title = text_utils::extract_title(&text, &doc_id.rel_path);

        let metadata =
            std::fs::metadata(&full_path).map_err(|e| AppError::io(format!("Failed to read metadata: {}", e)))?;
        let mtime = metadata
            .modified()
            .map_err(|e| AppError::io(format!("Failed to get mtime: {}", e)))?;

        let mtime: DateTime<Utc> = mtime.into();
        let created_at = metadata.created().ok().map(DateTime::<Utc>::from);
        let is_conflict = is_conflicted_filename(&doc_id.rel_path.to_string_lossy());

        let doc_meta = DocMeta {
            id: doc_id.clone(),
            filename: doc_id
                .rel_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string(),
            size_bytes: metadata.len(),
            mtime,
            created_at,
            content_hash: Some(text_utils::hash_text(&text)),
            encoding,
            line_ending,
            is_conflict,
            title,
            word_count: Some(word_count),
        };

        tracing::info!("Opened document: {:?}", doc_id.rel_path);

        Ok(DocContent { text, meta: doc_meta })
    }

    /// Saves a document with atomic write semantics
    pub fn doc_save(&self, doc_id: &DocId, text: &str, policy: Option<SavePolicy>) -> Result<SaveResult, AppError> {
        let policy = policy.unwrap_or_default();
        let location = self
            .location_get(doc_id.location_id)?
            .ok_or_else(|| AppError::not_found(format!("Location not found: {:?}", doc_id.location_id)))?;

        let full_path = doc_id.resolve(&location.root_path);

        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| AppError::io(format!("Failed to create directory: {}", e)))?;
        }

        let is_conflict = is_conflicted_filename(&doc_id.rel_path.to_string_lossy());

        match policy {
            SavePolicy::Atomic => {
                self.save_atomic(&full_path, text)?;
            }
            SavePolicy::InPlace => {
                let mut file =
                    File::create(&full_path).map_err(|e| AppError::io(format!("Failed to create file: {}", e)))?;
                file.write_all(text.as_bytes())
                    .map_err(|e| AppError::io(format!("Failed to write file: {}", e)))?;
            }
        }

        let metadata =
            std::fs::metadata(&full_path).map_err(|e| AppError::io(format!("Failed to read metadata: {}", e)))?;
        let mtime = metadata
            .modified()
            .map_err(|e| AppError::io(format!("Failed to get mtime: {}", e)))?;
        let mtime: DateTime<Utc> = mtime.into();

        let created_at = metadata.created().ok().map(DateTime::<Utc>::from);

        let line_ending = LineEnding::detect(text);
        let word_count = text_utils::count_words(text);
        let title = text_utils::extract_title(text, &doc_id.rel_path);

        let new_meta = DocMeta {
            id: doc_id.clone(),
            filename: doc_id
                .rel_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string(),
            size_bytes: metadata.len(),
            mtime,
            created_at,
            content_hash: Some(text_utils::hash_text(text)),
            encoding: Encoding::Utf8,
            line_ending,
            is_conflict,
            title,
            word_count: Some(word_count),
        };

        self.update_doc_in_catalog(doc_id, &new_meta)?;
        self.index_document_text(doc_id, &new_meta, text)?;

        tracing::info!("Saved document: {:?}", doc_id.rel_path);

        Ok(SaveResult { success: true, new_meta: Some(new_meta), conflict_detected: is_conflict })
    }

    /// Atomic save implementation: write to temp file, fsync, rename
    fn save_atomic(&self, target_path: &Path, text: &str) -> Result<(), AppError> {
        let parent_dir = target_path
            .parent()
            .ok_or_else(|| AppError::invalid_path("Target path has no parent directory"))?;

        let temp_file = tempfile::NamedTempFile::new_in(parent_dir)
            .map_err(|e| AppError::io(format!("Failed to create temp file: {}", e)))?;

        let temp_path = temp_file.path();

        let mut file = temp_file.as_file();
        file.write_all(text.as_bytes())
            .map_err(|e| AppError::io(format!("Failed to write temp file: {}", e)))?;

        file.sync_all()
            .map_err(|e| AppError::io(format!("Failed to fsync temp file: {}", e)))?;

        if target_path.exists()
            && let Ok(orig_metadata) = std::fs::metadata(target_path)
        {
            let permissions = orig_metadata.permissions();
            let _ = std::fs::set_permissions(temp_path, permissions);
        }

        temp_file
            .persist(target_path)
            .map_err(|e| AppError::io(format!("Failed to persist file: {}", e)))?;

        tracing::debug!("Atomic save completed: {:?}", target_path);
        Ok(())
    }

    /// Updates document entry in catalog
    fn update_doc_in_catalog(&self, doc_id: &DocId, meta: &DocMeta) -> Result<(), AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        let rel_path_str = doc_id.rel_path.to_string_lossy().to_string();
        let mtime_str = meta.mtime.to_rfc3339();
        let created_at_str = meta.created_at.map(|timestamp| timestamp.to_rfc3339());
        let updated_at_str = Utc::now().to_rfc3339();
        let encoding: i32 = meta.encoding.into();
        let line_ending: i32 = meta.line_ending.into();

        conn.execute(
            "INSERT INTO documents
             (
                location_id,
                rel_path,
                filename,
                size_bytes,
                mtime,
                created_at,
                content_hash,
                encoding,
                line_ending,
                is_conflict,
                title,
                word_count,
                updated_at
             )
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
             ON CONFLICT(location_id, rel_path) DO UPDATE SET
             filename = excluded.filename,
             size_bytes = excluded.size_bytes,
             mtime = excluded.mtime,
             created_at = COALESCE(documents.created_at, excluded.created_at),
             content_hash = excluded.content_hash,
             encoding = excluded.encoding,
             line_ending = excluded.line_ending,
             is_conflict = excluded.is_conflict,
             title = excluded.title,
             word_count = excluded.word_count,
             updated_at = excluded.updated_at",
            params![
                doc_id.location_id.0,
                rel_path_str,
                meta.filename,
                meta.size_bytes as i64,
                mtime_str,
                created_at_str,
                meta.content_hash.clone(),
                encoding,
                line_ending,
                meta.is_conflict as i32,
                meta.title,
                meta.word_count.map(|n| n as i64),
                updated_at_str,
            ],
        )
        .map_err(|e| AppError::io(format!("Failed to update document catalog: {}", e)))?;

        Ok(())
    }

    fn index_document_text(&self, doc_id: &DocId, meta: &DocMeta, text: &str) -> Result<(), AppError> {
        if !file_utils::is_indexable_text_path(&doc_id.rel_path) {
            self.remove_fts_entry(doc_id)?;
            return Ok(());
        }

        let title = meta.title.clone().unwrap_or_else(|| {
            text_utils::extract_title(text, &doc_id.rel_path).unwrap_or_else(|| "Untitled".to_string())
        });
        self.upsert_fts_entry(doc_id, &title, text)
    }

    fn upsert_fts_entry(&self, doc_id: &DocId, title: &str, content: &str) -> Result<(), AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        let rel_path = doc_id.rel_path.to_string_lossy().to_string();

        conn.execute(
            "DELETE FROM docs_fts WHERE location_id = ?1 AND rel_path = ?2",
            params![doc_id.location_id.0, rel_path],
        )
        .map_err(|e| AppError::new(ErrorCode::Index, format!("Failed to remove existing FTS row: {}", e)))?;

        conn.execute(
            "INSERT INTO docs_fts (location_id, rel_path, title, content) VALUES (?1, ?2, ?3, ?4)",
            params![
                doc_id.location_id.0,
                doc_id.rel_path.to_string_lossy().to_string(),
                title,
                content
            ],
        )
        .map_err(|e| AppError::new(ErrorCode::Index, format!("Failed to insert FTS row: {}", e)))?;

        Ok(())
    }

    fn remove_fts_entry(&self, doc_id: &DocId) -> Result<(), AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        conn.execute(
            "DELETE FROM docs_fts WHERE location_id = ?1 AND rel_path = ?2",
            params![doc_id.location_id.0, doc_id.rel_path.to_string_lossy().to_string()],
        )
        .map_err(|e| AppError::new(ErrorCode::Index, format!("Failed to remove FTS row: {}", e)))?;

        Ok(())
    }

    pub fn remove_document_from_index(&self, doc_id: &DocId) -> Result<(), AppError> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        let rel_path = doc_id.rel_path.to_string_lossy().to_string();

        conn.execute(
            "DELETE FROM documents WHERE location_id = ?1 AND rel_path = ?2",
            params![doc_id.location_id.0, rel_path.clone()],
        )
        .map_err(|e| AppError::new(ErrorCode::Index, format!("Failed to remove document row: {}", e)))?;

        conn.execute(
            "DELETE FROM docs_fts WHERE location_id = ?1 AND rel_path = ?2",
            params![doc_id.location_id.0, rel_path],
        )
        .map_err(|e| AppError::new(ErrorCode::Index, format!("Failed to remove FTS row: {}", e)))?;

        Ok(())
    }

    pub fn reindex_document(&self, doc_id: &DocId) -> Result<(), AppError> {
        let location = self
            .location_get(doc_id.location_id)?
            .ok_or_else(|| AppError::not_found(format!("Location not found: {:?}", doc_id.location_id)))?;
        let full_path = doc_id.resolve(&location.root_path);

        if !full_path.exists() {
            self.remove_document_from_index(doc_id)?;
            return Ok(());
        }

        let filename = full_path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("unknown")
            .to_string();
        let meta = self.read_doc_metadata(&full_path, doc_id.location_id, doc_id.rel_path.clone(), &filename)?;
        self.update_doc_in_catalog(doc_id, &meta)?;

        if file_utils::is_indexable_text_path(&full_path) {
            let text = file_utils::read_file_text_with_detection(&full_path)?;
            self.index_document_text(doc_id, &meta, &text)?;
        } else {
            self.remove_fts_entry(doc_id)?;
        }

        Ok(())
    }

    pub fn reconcile_location_index(&self, location_id: LocationId) -> Result<usize, AppError> {
        let location = self
            .location_get(location_id)?
            .ok_or_else(|| AppError::not_found(format!("Location not found: {:?}", location_id)))?;

        if !location.root_path.exists() {
            return Ok(0);
        }

        let mut file_paths = Vec::new();
        file_utils::collect_file_paths_recursive(&location.root_path, &mut file_paths)?;

        let mut seen_rel_paths = HashSet::new();
        let mut indexed = 0usize;

        for full_path in file_paths {
            if !full_path.is_file() {
                continue;
            }

            let rel_path = full_path
                .strip_prefix(&location.root_path)
                .map_err(|_| AppError::invalid_path("File path escaped location root"))?
                .to_path_buf();
            let doc_id = DocId::new(location_id, rel_path.clone())?;
            let rel_path_str = rel_path.to_string_lossy().to_string();
            seen_rel_paths.insert(rel_path_str);

            let filename = rel_path
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("unknown")
                .to_string();
            let meta = self.read_doc_metadata(&full_path, location_id, rel_path, &filename)?;
            self.update_doc_in_catalog(&doc_id, &meta)?;

            if file_utils::is_indexable_text_path(&full_path) {
                match file_utils::read_file_text_with_detection(&full_path) {
                    Ok(text) => {
                        self.index_document_text(&doc_id, &meta, &text)?;
                        indexed += 1;
                    }
                    Err(error) => {
                        tracing::warn!("Skipping FTS index for {:?} after decode failure: {}", full_path, error);
                        self.remove_fts_entry(&doc_id)?;
                    }
                }
            } else {
                self.remove_fts_entry(&doc_id)?;
            }
        }

        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        let mut stmt = conn
            .prepare("SELECT rel_path FROM documents WHERE location_id = ?1")
            .map_err(|e| AppError::new(ErrorCode::Index, format!("Failed to read catalog rows: {}", e)))?;
        let existing = stmt
            .query_map(params![location_id.0], |row| row.get::<_, String>(0))
            .map_err(|e| AppError::new(ErrorCode::Index, format!("Failed to query catalog rows: {}", e)))?;

        let mut stale_rel_paths = Vec::new();
        for row in existing {
            let rel_path = row.map_err(|e| AppError::new(ErrorCode::Index, format!("Invalid rel_path row: {}", e)))?;
            if !seen_rel_paths.contains(&rel_path) {
                stale_rel_paths.push(rel_path);
            }
        }
        drop(stmt);

        for rel_path in stale_rel_paths {
            conn.execute(
                "DELETE FROM documents WHERE location_id = ?1 AND rel_path = ?2",
                params![location_id.0, rel_path.clone()],
            )
            .map_err(|e| AppError::new(ErrorCode::Index, format!("Failed to remove stale document row: {}", e)))?;
            conn.execute(
                "DELETE FROM docs_fts WHERE location_id = ?1 AND rel_path = ?2",
                params![location_id.0, rel_path],
            )
            .map_err(|e| AppError::new(ErrorCode::Index, format!("Failed to remove stale FTS row: {}", e)))?;
        }

        Ok(indexed)
    }

    pub fn reconcile_indexes(&self) -> Result<usize, AppError> {
        let locations = self.location_list()?;
        let mut indexed = 0usize;

        for location in locations {
            indexed += self.reconcile_location_index(location.id)?;
        }

        Ok(indexed)
    }

    pub fn search(
        &self, query: &str, filters: Option<SearchFilters>, limit: usize,
    ) -> Result<Vec<SearchHit>, AppError> {
        let normalized_query = query.trim();
        if normalized_query.is_empty() {
            return Ok(Vec::new());
        }

        let filters = filters.unwrap_or_default();
        let SearchFilters { locations, file_types, date_range } = filters;
        let mut sql = String::from(
            "SELECT
                d.location_id,
                d.rel_path,
                COALESCE(NULLIF(d.title, ''), d.filename, d.rel_path) AS title,
                snippet(docs_fts, 3, '<<', '>>', ' ... ', 12) AS snippet,
                docs_fts.content AS content
             FROM docs_fts
             JOIN documents d
               ON d.location_id = CAST(docs_fts.location_id AS INTEGER)
              AND d.rel_path = docs_fts.rel_path
             WHERE docs_fts MATCH ?",
        );

        let mut query_params: Vec<Value> = vec![Value::from(normalized_query.to_string())];

        if let Some(locations) = locations.filter(|items| !items.is_empty()) {
            sql.push_str(" AND d.location_id IN (");
            sql.push_str(&vec!["?"; locations.len()].join(", "));
            sql.push(')');
            query_params.extend(locations.into_iter().map(|id| Value::from(id.0)));
        }

        if let Some(file_types) = file_types {
            let normalized_types = file_types
                .into_iter()
                .map(|extension| extension.trim().trim_start_matches('.').to_lowercase())
                .filter(|extension| !extension.is_empty())
                .collect::<Vec<_>>();

            if !normalized_types.is_empty() {
                let mut clauses = Vec::new();
                for extension in normalized_types {
                    clauses.push("LOWER(d.filename) LIKE ?".to_string());
                    query_params.push(Value::from(format!("%.{}", extension)));
                }

                sql.push_str(" AND (");
                sql.push_str(&clauses.join(" OR "));
                sql.push(')');
            }
        }

        if let Some(date_range) = date_range {
            if let Some(from) = date_range.from.filter(|value| !value.is_empty()) {
                sql.push_str(" AND d.updated_at >= ?");
                query_params.push(Value::from(from));
            }
            if let Some(to) = date_range.to.filter(|value| !value.is_empty()) {
                sql.push_str(" AND d.updated_at <= ?");
                query_params.push(Value::from(to));
            }
        }

        let bounded_limit = limit.clamp(1, 200);
        sql.push_str(" ORDER BY bm25(docs_fts), d.mtime DESC LIMIT ?");
        query_params.push(Value::from(bounded_limit as i64));

        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock database connection"))?;

        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| AppError::new(ErrorCode::Index, format!("Failed to prepare search query: {}", e)))?;

        let rows = stmt
            .query_map(params_from_iter(query_params.iter()), |row| {
                let location_id: i64 = row.get(0)?;
                let rel_path: String = row.get(1)?;
                let title: String = row.get(2)?;
                let snippet_marked: String = row.get(3)?;
                let full_content: String = row.get(4)?;
                let (snippet, matches) = text_utils::extract_highlight_matches(&snippet_marked);
                let (line, column) = text_utils::locate_query_position(&full_content, normalized_query);

                Ok(SearchHit { location_id: LocationId(location_id), rel_path, title, snippet, line, column, matches })
            })
            .map_err(|e| AppError::new(ErrorCode::Index, format!("Search query failed: {}", e)))?;

        let mut hits = Vec::new();
        for row in rows {
            let hit = row.map_err(|e| AppError::new(ErrorCode::Index, format!("Failed to parse search hit: {}", e)))?;
            hits.push(hit);
        }

        Ok(hits)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_store() -> (Store, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let store = Store::open(&db_path).unwrap();
        (store, temp_dir)
    }

    #[test]
    fn test_location_add_and_list() {
        let (store, _temp) = create_test_store();
        let location_dir = TempDir::new().unwrap();
        let location_path = location_dir.path().to_path_buf();
        let location = store
            .location_add("Test Location".to_string(), location_path.clone())
            .unwrap();

        assert_eq!(location.name, "Test Location");
        assert_eq!(location.root_path, location_path);

        let locations = store.location_list().unwrap();
        assert_eq!(locations.len(), 1);
        assert_eq!(locations[0].name, "Test Location");
        assert_eq!(locations[0].root_path, location_path);
    }

    #[test]
    fn test_location_duplicate() {
        let (store, _temp) = create_test_store();
        let location_dir = TempDir::new().unwrap();
        let location_path = location_dir.path().to_path_buf();

        store.location_add("First".to_string(), location_path.clone()).unwrap();

        let result = store.location_add("Second".to_string(), location_path);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err().code, ErrorCode::Conflict);
    }

    #[test]
    fn test_location_remove() {
        let (store, _temp) = create_test_store();
        let location_dir = TempDir::new().unwrap();
        let location_path = location_dir.path().to_path_buf();
        let location = store.location_add("Test".to_string(), location_path).unwrap();
        let removed = store.location_remove(location.id).unwrap();
        assert!(removed);

        let locations = store.location_list().unwrap();
        assert!(locations.is_empty());

        let removed_again = store.location_remove(location.id).unwrap();
        assert!(!removed_again);
    }

    #[test]
    fn test_location_get() {
        let (store, _temp) = create_test_store();
        let location_dir = TempDir::new().unwrap();
        let location_path = location_dir.path().to_path_buf();

        let location = store.location_add("Test".to_string(), location_path.clone()).unwrap();
        let retrieved = store.location_get(location.id).unwrap();
        assert!(retrieved.is_some());

        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.name, "Test");
        assert_eq!(retrieved.root_path, location_path);

        let not_found = store.location_get(LocationId(999)).unwrap();
        assert!(not_found.is_none());
    }

    #[test]
    fn test_validate_locations() {
        let (store, _temp) = create_test_store();

        let existing_dir = TempDir::new().unwrap();
        let _ = store
            .location_add("Existing".to_string(), existing_dir.path().to_path_buf())
            .unwrap();

        let non_existent_path = PathBuf::from("/non/existent/path/12345");
        let non_existent = store
            .location_add("NonExistent".to_string(), non_existent_path.clone())
            .unwrap();

        let missing = store.validate_locations().unwrap();
        assert_eq!(missing.len(), 1);
        assert_eq!(missing[0].0, non_existent.id);
        assert_eq!(missing[0].1, non_existent_path);
    }

    #[test]
    fn test_doc_list_shallow() {
        let (store, _temp) = create_test_store();
        let location_dir = TempDir::new().unwrap();
        let location_path = location_dir.path().to_path_buf();

        let location = store
            .location_add("Test Location".to_string(), location_path.clone())
            .unwrap();

        std::fs::write(location_path.join("file1.md"), "# File 1").unwrap();
        std::fs::write(location_path.join("file2.txt"), "File 2 content").unwrap();

        let docs = store.doc_list(location.id, None).unwrap();
        assert_eq!(docs.len(), 2);
    }

    #[test]
    fn test_doc_list_recursive() {
        let (store, _temp) = create_test_store();
        let location_dir = TempDir::new().unwrap();
        let location_path = location_dir.path().to_path_buf();

        let location = store
            .location_add("Test Location".to_string(), location_path.clone())
            .unwrap();

        std::fs::write(location_path.join("file1.md"), "# File 1").unwrap();
        std::fs::create_dir(location_path.join("subdir")).unwrap();
        std::fs::write(location_path.join("subdir/file2.md"), "# File 2").unwrap();

        let options = DocListOptions { recursive: true, ..Default::default() };
        let docs = store.doc_list(location.id, Some(options)).unwrap();
        assert_eq!(docs.len(), 2);
    }

    #[test]
    fn test_doc_list_with_extension_filter() {
        let (store, _temp) = create_test_store();
        let location_dir = TempDir::new().unwrap();
        let location_path = location_dir.path().to_path_buf();

        let location = store
            .location_add("Test Location".to_string(), location_path.clone())
            .unwrap();

        std::fs::write(location_path.join("file1.md"), "# File 1").unwrap();
        std::fs::write(location_path.join("file2.txt"), "File 2").unwrap();
        std::fs::write(location_path.join("file3.rs"), "fn main() {}").unwrap();

        let options =
            DocListOptions { recursive: false, extensions: Some(vec!["md".to_string()]), ..Default::default() };
        let docs = store.doc_list(location.id, Some(options)).unwrap();
        assert_eq!(docs.len(), 1);
        assert_eq!(docs[0].filename, "file1.md");
    }

    #[test]
    fn test_doc_open() {
        let (store, _temp) = create_test_store();
        let location_dir = TempDir::new().unwrap();
        let location_path = location_dir.path().to_path_buf();

        let location = store
            .location_add("Test Location".to_string(), location_path.clone())
            .unwrap();

        let content = "# Test Document\n\nThis is a test.";
        std::fs::write(location_path.join("test.md"), content).unwrap();

        let doc_id = DocId::new(location.id, PathBuf::from("test.md")).unwrap();
        let doc_content = store.doc_open(&doc_id).unwrap();

        assert_eq!(doc_content.text, content);
        assert_eq!(doc_content.meta.filename, "test.md");
        assert_eq!(doc_content.meta.word_count, Some(7));
        assert_eq!(doc_content.meta.title, Some("Test Document".to_string()));
    }

    #[test]
    fn test_doc_save_atomic() {
        let (store, _temp) = create_test_store();
        let location_dir = TempDir::new().unwrap();
        let location_path = location_dir.path().to_path_buf();

        let location = store
            .location_add("Test Location".to_string(), location_path.clone())
            .unwrap();

        let doc_id = DocId::new(location.id, PathBuf::from("new_file.md")).unwrap();
        let content = "# New Document\n\nContent here.";
        let result = store.doc_save(&doc_id, content, None).unwrap();
        assert!(result.success);
        assert!(result.new_meta.is_some());
        assert!(!result.conflict_detected);

        let saved_path = location_path.join("new_file.md");
        assert!(saved_path.exists());
        let saved_content = std::fs::read_to_string(saved_path).unwrap();
        assert_eq!(saved_content, content);
    }

    #[test]
    fn test_doc_save_overwrite() {
        let (store, _temp) = create_test_store();
        let location_dir = TempDir::new().unwrap();
        let location_path = location_dir.path().to_path_buf();

        let location = store
            .location_add("Test Location".to_string(), location_path.clone())
            .unwrap();

        let doc_id = DocId::new(location.id, PathBuf::from("overwrite.md")).unwrap();
        store.doc_save(&doc_id, "Initial content", None).unwrap();

        let new_content = "Updated content here";
        let result = store.doc_save(&doc_id, new_content, None).unwrap();

        assert!(result.success);

        let saved_path = location_path.join("overwrite.md");
        let saved_content = std::fs::read_to_string(saved_path).unwrap();
        assert_eq!(saved_content, new_content);
    }

    #[test]
    fn test_doc_save_creates_directories() {
        let (store, _temp) = create_test_store();
        let location_dir = TempDir::new().unwrap();
        let location_path = location_dir.path().to_path_buf();

        let location = store
            .location_add("Test Location".to_string(), location_path.clone())
            .unwrap();

        let doc_id = DocId::new(location.id, PathBuf::from("level1/level2/file.md")).unwrap();
        let result = store.doc_save(&doc_id, "Nested content", None);

        assert!(result.is_ok());
        assert!(location_path.join("level1/level2/file.md").exists());
    }

    #[test]
    fn test_search_returns_indexed_results() {
        let (store, _temp) = create_test_store();
        let location_dir = TempDir::new().unwrap();
        let location = store
            .location_add("Search Location".to_string(), location_dir.path().to_path_buf())
            .unwrap();

        let doc_id = DocId::new(location.id, PathBuf::from("chapter-1.md")).unwrap();
        store
            .doc_save(&doc_id, "# Chapter One\nThe stormlight archives begin here.", None)
            .unwrap();

        let results = store.search("stormlight", None, 10).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].location_id, location.id);
        assert_eq!(results[0].rel_path, "chapter-1.md");
        assert!(!results[0].snippet.is_empty());
    }

    #[test]
    fn test_reconcile_location_index_removes_deleted_docs_from_search() {
        let (store, _temp) = create_test_store();
        let location_dir = TempDir::new().unwrap();
        let location_path = location_dir.path().to_path_buf();
        let location = store
            .location_add("Reconcile Location".to_string(), location_path.clone())
            .unwrap();

        let full_path = location_path.join("notes.md");
        std::fs::write(&full_path, "# Notes\nIndex me").unwrap();

        let indexed = store.reconcile_location_index(location.id).unwrap();
        assert_eq!(indexed, 1);
        assert_eq!(store.search("Index", None, 10).unwrap().len(), 1);

        std::fs::remove_file(full_path).unwrap();

        let indexed_after_delete = store.reconcile_location_index(location.id).unwrap();
        assert_eq!(indexed_after_delete, 0);
        assert!(store.search("Index", None, 10).unwrap().is_empty());
    }

    #[test]
    fn test_detect_encoding_utf8() {
        let bytes = b"Hello, World!";
        let (text, enc) = text_utils::detect_and_decode(bytes).unwrap();
        assert_eq!(text, "Hello, World!");
        assert!(matches!(enc, Encoding::Utf8));
    }

    #[test]
    fn test_detect_encoding_utf8_bom() {
        let bytes = vec![0xef, 0xbb, 0xbf, b'H', b'i'];
        let (text, enc) = text_utils::detect_and_decode(&bytes).unwrap();
        assert_eq!(text, "Hi");
        assert!(matches!(enc, Encoding::Utf8WithBom));
    }

    #[test]
    /// TODO: move to core
    fn test_detect_line_ending_lf() {
        let text = "line1\nline2\nline3";
        let le = LineEnding::detect(text);
        assert!(matches!(le, LineEnding::Lf));
    }

    #[test]
    /// TODO: move to core
    fn test_detect_line_ending_crlf() {
        let text = "line1\r\nline2\r\nline3";
        let le = LineEnding::detect(text);
        assert!(matches!(le, LineEnding::CrLf));
    }

    #[test]
    fn test_ui_layout_settings_defaults() {
        let (store, _temp) = create_test_store();
        let settings = store.ui_layout_get().unwrap();

        assert_eq!(settings, UiLayoutSettings::default());
    }

    #[test]
    fn test_ui_layout_settings_round_trip() {
        let (store, _temp) = create_test_store();
        let settings = UiLayoutSettings {
            sidebar_collapsed: true,
            top_bars_collapsed: false,
            status_bar_collapsed: true,
            line_numbers_visible: false,
            text_wrapping_enabled: false,
            syntax_highlighting_enabled: false,
            editor_font_size: 18,
            editor_font_family: "Monaspace Neon".to_string(),
            calm_ui_enabled: false,
            calm_ui_focus_mode: false,
            focus_typewriter_scrolling_enabled: false,
            focus_dimming_mode: FocusDimmingMode::Paragraph,
        };

        store.ui_layout_set(&settings).unwrap();
        let loaded = store.ui_layout_get().unwrap();

        assert_eq!(loaded, settings);
    }

    #[test]
    fn test_ui_layout_settings_backfills_line_numbers_visibility() {
        let (store, _temp) = create_test_store();
        let conn = store
            .conn
            .lock()
            .expect("expected to lock database connection for test");

        conn.execute(
            "INSERT INTO app_settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
            params![
                UI_LAYOUT_SETTINGS_KEY,
                "{\"sidebar_collapsed\":true,\"top_bars_collapsed\":false,\"status_bar_collapsed\":false}",
                Utc::now().to_rfc3339(),
            ],
        )
        .unwrap();
        drop(conn);

        let loaded = store.ui_layout_get().unwrap();
        assert!(loaded.line_numbers_visible);
        assert!(loaded.text_wrapping_enabled);
        assert!(loaded.syntax_highlighting_enabled);
        assert_eq!(loaded.editor_font_size, 16);
        assert_eq!(loaded.editor_font_family, "IBM Plex Mono");
        assert!(loaded.calm_ui_enabled);
        assert!(loaded.calm_ui_focus_mode);
        assert!(loaded.focus_typewriter_scrolling_enabled);
        assert_eq!(loaded.focus_dimming_mode, FocusDimmingMode::Sentence);
    }

    #[test]
    fn test_global_capture_settings_defaults() {
        let (store, _temp) = create_test_store();
        let settings = store.global_capture_get().unwrap();

        assert_eq!(settings, GlobalCaptureSettings::default());
        assert!(settings.enabled);
        assert_eq!(settings.shortcut, "CommandOrControl+Shift+Space");
        assert!(!settings.paused);
        assert_eq!(settings.default_mode, CaptureMode::QuickNote);
        assert!(settings.target_location_id.is_none());
        assert_eq!(settings.inbox_relative_dir, "inbox");
        assert!(settings.append_target.is_none());
        assert!(settings.close_after_save);
        assert!(settings.show_tray_icon);
        assert!(settings.last_capture_target.is_none());
    }

    #[test]
    fn test_global_capture_settings_round_trip() {
        let (store, _temp) = create_test_store();
        let settings = GlobalCaptureSettings {
            enabled: true,
            shortcut: "CommandOrControl+Shift+N".to_string(),
            paused: false,
            default_mode: CaptureMode::Append,
            target_location_id: Some(42),
            inbox_relative_dir: "captures".to_string(),
            append_target: Some(CaptureDocRef { location_id: 42, rel_path: "notes/daily.md".to_string() }),
            close_after_save: false,
            show_tray_icon: false,
            last_capture_target: Some("Inbox/Daily".to_string()),
        };

        store.global_capture_set(&settings).unwrap();
        let loaded = store.global_capture_get().unwrap();

        assert_eq!(loaded, settings);
    }

    #[test]
    fn test_global_capture_settings_backfills_defaults() {
        let (store, _temp) = create_test_store();
        let conn = store
            .conn
            .lock()
            .expect("expected to lock database connection for test");

        conn.execute(
            "INSERT INTO app_settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
            params![
                GLOBAL_CAPTURE_SETTINGS_KEY,
                "{\"enabled\":true}",
                Utc::now().to_rfc3339(),
            ],
        )
        .unwrap();
        drop(conn);

        let loaded = store.global_capture_get().unwrap();
        assert!(loaded.enabled);
        assert_eq!(loaded.shortcut, "CommandOrControl+Shift+Space");
        assert!(!loaded.paused);
        assert_eq!(loaded.inbox_relative_dir, "inbox");
        assert!(loaded.close_after_save);
        assert!(loaded.show_tray_icon);
    }

    #[test]
    fn test_last_open_doc_defaults_to_none() {
        let (store, _temp) = create_test_store();
        let loaded = store.last_open_doc_get().unwrap();
        assert!(loaded.is_none());
    }

    #[test]
    fn test_last_open_doc_round_trip() {
        let (store, _temp) = create_test_store();
        let doc_ref = CaptureDocRef { location_id: 5, rel_path: "notes/today.md".to_string() };

        store.last_open_doc_set(Some(&doc_ref)).unwrap();
        let loaded = store.last_open_doc_get().unwrap();

        assert_eq!(loaded, Some(doc_ref));
    }

    #[test]
    fn test_last_open_doc_can_be_cleared() {
        let (store, _temp) = create_test_store();
        let doc_ref = CaptureDocRef { location_id: 9, rel_path: "draft.md".to_string() };

        store.last_open_doc_set(Some(&doc_ref)).unwrap();
        store.last_open_doc_set(None).unwrap();
        let loaded = store.last_open_doc_get().unwrap();

        assert!(loaded.is_none());
    }
}
