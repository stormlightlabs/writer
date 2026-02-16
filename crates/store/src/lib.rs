use chrono::Utc;
use rusqlite::{Connection, params};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use writer_core::{AppError, ErrorCode, LocationDescriptor, LocationId};

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

        tracing::debug!("Database schema initialized");
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
}
