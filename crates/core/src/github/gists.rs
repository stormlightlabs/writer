use crate::{AppError, ErrorCode};
use octocrab::Octocrab;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GistRecord {
    pub id: String,
    pub filename: String,
    pub description: String,
    pub contents: String,
    pub language: Option<String>,
    pub public: bool,
    pub html_url: String,
    pub owner: String,
    pub created_at: String,
    pub updated_at: String,
    pub file_count: usize,
}

#[derive(Debug, Clone, Default)]
pub struct GithubState;

impl GithubState {
    pub fn new() -> Self {
        Self
    }

    pub async fn gist_list_public(&self, username: &str) -> Result<Vec<GistRecord>, AppError> {
        let trimmed_username = username.trim();
        if trimmed_username.is_empty() {
            return Err(AppError::new(ErrorCode::InvalidPath, "GitHub username is required"));
        }

        let client = build_client()?;

        let route = format!("/users/{trimmed_username}/gists");
        let params = [("per_page", "100")];

        let gists = client
            .get::<Vec<ApiGist>, _, _>(route, Some(&params))
            .await
            .map_err(|error| map_github_error("Failed to list public gists", error))?;

        gists.into_iter().map(|gist| gist.into_record()).collect()
    }

    pub async fn gist_get(&self, gist_id: &str) -> Result<GistRecord, AppError> {
        let trimmed_gist_id = gist_id.trim();
        if trimmed_gist_id.is_empty() {
            return Err(AppError::new(ErrorCode::InvalidPath, "Gist ID is required"));
        }

        let client = build_client()?;

        let route = format!("/gists/{trimmed_gist_id}");
        let gist = client
            .get::<ApiGist, _, _>(route, None::<&[(&str, &str)]>)
            .await
            .map_err(|error| map_github_error("Failed to fetch gist", error))?;

        gist.into_record()
    }
}

fn build_client() -> Result<Octocrab, AppError> {
    Octocrab::builder()
        .build()
        .map_err(|error| AppError::io(format!("Failed to initialize GitHub client: {}", error)))
}

#[derive(Debug, Deserialize)]
struct ApiGist {
    id: String,
    description: Option<String>,
    public: bool,
    html_url: String,
    files: HashMap<String, ApiGistFile>,
    owner: Option<ApiOwner>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
struct ApiGistFile {
    filename: Option<String>,
    language: Option<String>,
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ApiOwner {
    login: String,
}

impl ApiGist {
    fn into_record(self) -> Result<GistRecord, AppError> {
        let file_count = self.files.len();
        let primary_file = select_primary_file(&self.files)
            .ok_or_else(|| AppError::new(ErrorCode::Parse, "Gist does not contain any files"))?;

        Ok(GistRecord {
            id: self.id,
            filename: primary_file.filename.clone().unwrap_or_else(|| "untitled".to_string()),
            description: self.description.unwrap_or_default(),
            contents: primary_file.content.clone().unwrap_or_default(),
            language: primary_file.language.clone(),
            public: self.public,
            html_url: self.html_url,
            owner: self
                .owner
                .map(|owner| owner.login)
                .unwrap_or_else(|| "unknown".to_string()),
            created_at: self.created_at,
            updated_at: self.updated_at,
            file_count,
        })
    }
}

fn select_primary_file(files: &HashMap<String, ApiGistFile>) -> Option<&ApiGistFile> {
    let mut entries: Vec<(&String, &ApiGistFile)> = files.iter().collect();
    entries.sort_by(|left, right| left.0.cmp(right.0));
    entries.first().map(|(_, file)| *file)
}

fn map_github_error(context: &str, error: octocrab::Error) -> AppError {
    let message = error.to_string();
    let lower = message.to_ascii_lowercase();

    if message.contains("404") {
        return AppError::not_found(format!("{}: not found", context));
    }

    if lower.contains("rate limit") || message.contains("403") {
        return AppError::permission_denied(format!("{}: GitHub rate limit exceeded", context));
    }

    AppError::io(format!("{}: {}", context, message))
}
