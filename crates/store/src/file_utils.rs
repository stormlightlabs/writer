use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};

use super::text_utils;
use writer_core::AppError;

const INDEXABLE_EXTENSIONS: &[&str] = &["md", "markdown", "mdx", "txt"];

pub fn is_indexable_text_path(path: &Path) -> bool {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_lowercase();
    INDEXABLE_EXTENSIONS.contains(&extension.as_str())
}

pub fn read_file_text_with_detection(path: &Path) -> Result<String, AppError> {
    let mut file = File::open(path).map_err(|e| AppError::io(format!("Failed to open file: {}", e)))?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)
        .map_err(|e| AppError::io(format!("Failed to read file: {}", e)))?;
    let (text, _encoding) = text_utils::detect_and_decode(&bytes)?;
    Ok(text)
}

pub fn collect_file_paths_recursive(dir: &Path, files: &mut Vec<PathBuf>) -> Result<(), AppError> {
    let entries = std::fs::read_dir(dir).map_err(|e| AppError::io(format!("Failed to read directory: {}", e)))?;

    for entry in entries {
        let entry = entry.map_err(|e| AppError::io(format!("Failed to read entry: {}", e)))?;
        let path = entry.path();

        if path.is_file() {
            files.push(path);
        } else if path.is_dir() {
            collect_file_paths_recursive(&path, files)?;
        }
    }

    Ok(())
}
