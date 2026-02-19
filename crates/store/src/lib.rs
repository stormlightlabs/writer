use chrono::{DateTime, Utc};
use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use writer_core::{
    AppError, DocContent, DocId, DocListOptions, DocMeta, DocSortField, Encoding, ErrorCode, LineEnding,
    LocationDescriptor, LocationId, SavePolicy, SaveResult, SortOrder, is_conflicted_filename,
};

/// Manages the SQLite database for the application
pub struct Store {
    conn: Arc<Mutex<Connection>>,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UiLayoutSettings {
    pub sidebar_collapsed: bool,
    pub top_bars_collapsed: bool,
    pub status_bar_collapsed: bool,
    #[serde(default = "default_true")]
    pub line_numbers_visible: bool,
}

impl Default for UiLayoutSettings {
    fn default() -> Self {
        Self {
            sidebar_collapsed: false,
            top_bars_collapsed: false,
            status_bar_collapsed: false,
            line_numbers_visible: true,
        }
    }
}

const UI_LAYOUT_SETTINGS_KEY: &str = "ui_layout";

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

        let word_count = if filename.ends_with(".md") || filename.ends_with(".txt") {
            std::fs::read_to_string(path).ok().map(|content| count_words(&content))
        } else {
            None
        };

        Ok(DocMeta {
            id: DocId { location_id, rel_path },
            filename: filename.to_string(),
            size_bytes,
            mtime,
            created_at,
            content_hash: None,
            encoding: Encoding::default(),
            line_ending: LineEnding::default(),
            is_conflict,
            title: None,
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

        let (text, encoding) = detect_and_decode(&bytes)?;

        let line_ending = detect_line_ending(&text);

        let word_count = count_words(&text);

        let title = extract_title(&text, &doc_id.rel_path);

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
            content_hash: None,
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

        let line_ending = detect_line_ending(text);
        let word_count = count_words(text);
        let title = extract_title(text, &doc_id.rel_path);

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
            content_hash: None,
            encoding: Encoding::Utf8,
            line_ending,
            is_conflict,
            title,
            word_count: Some(word_count),
        };

        self.update_doc_in_catalog(doc_id, &new_meta)?;

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
        let updated_at_str = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO documents
             (location_id, rel_path, filename, size_bytes, mtime, encoding, line_ending, is_conflict, title, word_count, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
             ON CONFLICT(location_id, rel_path) DO UPDATE SET
             filename = excluded.filename,
             size_bytes = excluded.size_bytes,
             mtime = excluded.mtime,
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
                encoding_to_i32(meta.encoding),
                line_ending_to_i32(meta.line_ending),
                meta.is_conflict as i32,
                meta.title,
                meta.word_count.map(|n| n as i64),
                updated_at_str,
            ],
        ).map_err(|e| AppError::io(format!("Failed to update document catalog: {}", e)))?;

        Ok(())
    }
}

/// Detects encoding from byte BOM and decodes to string
fn detect_and_decode(bytes: &[u8]) -> Result<(String, Encoding), AppError> {
    if bytes.starts_with(&[0xef, 0xbb, 0xbf]) {
        let text = String::from_utf8_lossy(&bytes[3..]).into_owned();
        Ok((text, Encoding::Utf8WithBom))
    } else if bytes.starts_with(&[0xff, 0xfe]) {
        let u16_vec: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|c| u16::from_le_bytes([c[0], c[1]]))
            .collect();
        let text = String::from_utf16(&u16_vec).map_err(|e| AppError::io(format!("Invalid UTF-16 LE: {}", e)))?;
        Ok((text, Encoding::Utf16Le))
    } else if bytes.starts_with(&[0xfe, 0xff]) {
        let u16_vec: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|c| u16::from_be_bytes([c[0], c[1]]))
            .collect();
        let text = String::from_utf16(&u16_vec).map_err(|e| AppError::io(format!("Invalid UTF-16 BE: {}", e)))?;
        Ok((text, Encoding::Utf16Be))
    } else {
        let text = String::from_utf8_lossy(bytes).into_owned();
        Ok((text, Encoding::Utf8))
    }
}

/// Detects line ending style from text content
fn detect_line_ending(text: &str) -> LineEnding {
    let crlf_count = text.matches("\r\n").count();
    let lf_count = text.matches('\n').count() - crlf_count;
    if crlf_count > lf_count { LineEnding::CrLf } else { LineEnding::Lf }
}

/// Counts words in text (simple whitespace-based)
fn count_words(text: &str) -> usize {
    text.split_whitespace().count()
}

/// Extracts title from markdown (first H1) or filename
fn extract_title(text: &str, rel_path: &Path) -> Option<String> {
    for line in text.lines() {
        let trimmed = line.trim();
        if let Some(title) = trimmed.strip_prefix("# ") {
            return Some(title.trim().to_string());
        }
    }

    rel_path.file_stem().and_then(|s| s.to_str()).map(|s| s.to_string())
}

/// Converts Encoding to i32 for database storage
fn encoding_to_i32(enc: Encoding) -> i32 {
    match enc {
        Encoding::Utf8 => 0,
        Encoding::Utf8WithBom => 1,
        Encoding::Utf16Le => 2,
        Encoding::Utf16Be => 3,
    }
}

/// Converts LineEnding to i32 for database storage
fn line_ending_to_i32(le: LineEnding) -> i32 {
    match le {
        LineEnding::Lf => 0,
        LineEnding::CrLf => 1,
        LineEnding::Auto => 2,
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
    fn test_detect_encoding_utf8() {
        let bytes = b"Hello, World!";
        let (text, enc) = detect_and_decode(bytes).unwrap();
        assert_eq!(text, "Hello, World!");
        assert!(matches!(enc, Encoding::Utf8));
    }

    #[test]
    fn test_detect_encoding_utf8_bom() {
        let bytes = vec![0xef, 0xbb, 0xbf, b'H', b'i'];
        let (text, enc) = detect_and_decode(&bytes).unwrap();
        assert_eq!(text, "Hi");
        assert!(matches!(enc, Encoding::Utf8WithBom));
    }

    #[test]
    fn test_detect_line_ending_lf() {
        let text = "line1\nline2\nline3";
        let le = detect_line_ending(text);
        assert!(matches!(le, LineEnding::Lf));
    }

    #[test]
    fn test_detect_line_ending_crlf() {
        let text = "line1\r\nline2\r\nline3";
        let le = detect_line_ending(text);
        assert!(matches!(le, LineEnding::CrLf));
    }

    #[test]
    fn test_count_words() {
        assert_eq!(count_words("Hello world"), 2);
        assert_eq!(count_words("One two three four"), 4);
        assert_eq!(count_words(""), 0);
        assert_eq!(count_words("  multiple   spaces  "), 2);
    }

    #[test]
    fn test_extract_title_from_heading() {
        let text = "# My Title\n\nSome content";
        let path = Path::new("file.md");
        let title = extract_title(text, path);
        assert_eq!(title, Some("My Title".to_string()));
    }

    #[test]
    fn test_extract_title_from_filename() {
        let text = "No heading here";
        let path = Path::new("my_document.md");
        let title = extract_title(text, path);
        assert_eq!(title, Some("my_document".to_string()));
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
    }
}
