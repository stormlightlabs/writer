use super::{AppState, CommandResponse};
use std::path::PathBuf;
use tauri::State;
use writer_core::{AppError, CommandResult, LocationId};
use writer_md::{DocxExportResult, MarkdownEngine, MarkdownProfile, PdfRenderResult, RenderResult, TextExportResult};

/// Returns the markdown help guide content
#[tauri::command]
pub fn markdown_help_get() -> CommandResponse<String> {
    log::debug!("Fetching markdown help content");
    Ok(CommandResult::ok(writer_store::get_markdown_help().to_string()))
}

/// Renders markdown text to HTML with metadata extraction
///
/// This command takes document reference, text content, and a rendering profile,
/// returning HTML with source position attributes for editor-preview sync.
#[tauri::command]
pub fn markdown_render(
    _: State<'_, AppState>, location_id: i64, rel_path: String, text: String, profile: Option<MarkdownProfile>,
) -> CommandResponse<RenderResult> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    log::debug!(
        "Rendering markdown: location={:?}, path={:?}, profile={:?}, text_len={}",
        location_id,
        rel_path,
        profile,
        text.len()
    );

    let engine = MarkdownEngine::new();
    let profile = profile.unwrap_or_default();

    match engine.render(&text, profile) {
        Ok(result) => {
            log::debug!(
                "Markdown rendered successfully: html_len={}, outline_items={}",
                result.html.len(),
                result.metadata.outline.len()
            );
            Ok(CommandResult::ok(result))
        }
        Err(e) => {
            log::error!("Failed to render markdown: {}", e);
            Ok(CommandResult::err(AppError::new(
                writer_core::ErrorCode::Parse,
                format!("Failed to render markdown: {}", e),
            )))
        }
    }
}

/// Renders markdown text to a PDF-compatible AST
///
/// This command takes document text and returns a structured AST
/// suitable for rendering to PDF on the frontend with @react-pdf/renderer.
#[tauri::command]
pub fn markdown_render_for_pdf(
    _: State<'_, AppState>, location_id: i64, rel_path: String, text: String, profile: Option<MarkdownProfile>,
) -> CommandResponse<PdfRenderResult> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    log::debug!(
        "Rendering markdown for PDF: location={:?}, path={:?}, profile={:?}, text_len={}",
        location_id,
        rel_path,
        profile,
        text.len()
    );

    let engine = MarkdownEngine::new();
    let profile = profile.unwrap_or(MarkdownProfile::Extended);

    match engine.render_for_pdf(&text, profile) {
        Ok(result) => {
            log::debug!(
                "Markdown rendered for PDF successfully: nodes={}, word_count={}",
                result.nodes.len(),
                result.word_count
            );
            Ok(CommandResult::ok(result))
        }
        Err(e) => {
            log::error!("Failed to render markdown for PDF: {}", e);
            Ok(CommandResult::err(AppError::new(
                writer_core::ErrorCode::Parse,
                format!("Failed to render markdown for PDF: {}", e),
            )))
        }
    }
}

/// Renders markdown text to plaintext format
///
/// This command takes document text and returns plain text with
/// Markdown formatting stripped but logical structure preserved.
#[tauri::command]
pub fn markdown_render_for_text(
    _: State<'_, AppState>, location_id: i64, rel_path: String, text: String, profile: Option<MarkdownProfile>,
) -> CommandResponse<TextExportResult> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    log::debug!(
        "Rendering markdown for text export: location={:?}, path={:?}, profile={:?}, text_len={}",
        location_id,
        rel_path,
        profile,
        text.len()
    );

    let engine = MarkdownEngine::new();
    let profile = profile.unwrap_or(MarkdownProfile::Extended);

    match engine.render_for_text(&text, profile) {
        Ok(result) => {
            log::debug!(
                "Markdown rendered for text export successfully: text_len={}, word_count={}",
                result.text.len(),
                result.word_count
            );
            Ok(CommandResult::ok(result))
        }
        Err(e) => {
            log::error!("Failed to render markdown for text export: {}", e);
            Ok(CommandResult::err(AppError::new(
                writer_core::ErrorCode::Parse,
                format!("Failed to render markdown for text export: {}", e),
            )))
        }
    }
}

/// Renders markdown text to DOCX format
///
/// This command takes document text and returns DOCX bytes
/// generated via docx-rs with support for headings, bold, italic,
/// code font, ordered/unordered lists, blockquotes, and code blocks.
#[tauri::command]
pub fn markdown_render_for_docx(
    _: State<'_, AppState>, location_id: i64, rel_path: String, text: String, profile: Option<MarkdownProfile>,
) -> CommandResponse<DocxExportResult> {
    let location_id = LocationId(location_id);
    let rel_path = PathBuf::from(&rel_path);

    log::debug!(
        "Rendering markdown for DOCX: location={:?}, path={:?}, profile={:?}, text_len={}",
        location_id,
        rel_path,
        profile,
        text.len()
    );

    let engine = MarkdownEngine::new();
    let profile = profile.unwrap_or(MarkdownProfile::Extended);

    match engine.render_for_docx(&text, profile) {
        Ok(result) => {
            log::debug!(
                "Markdown rendered for DOCX successfully: data_len={}, word_count={}",
                result.data.len(),
                result.word_count
            );
            Ok(CommandResult::ok(result))
        }
        Err(e) => {
            log::error!("Failed to render markdown for DOCX: {}", e);
            Ok(CommandResult::err(AppError::new(
                writer_core::ErrorCode::Parse,
                format!("Failed to render markdown for DOCX: {}", e),
            )))
        }
    }
}
