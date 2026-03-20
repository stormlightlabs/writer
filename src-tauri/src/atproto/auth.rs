use jacquard::client::FileAuthStore;
use jacquard::oauth::client::{OAuthClient, OAuthSession};
use jacquard::oauth::loopback::{LoopbackConfig, LoopbackPort};
use jacquard::types::did::Did;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::Mutex;
use writer_core::{AppError, ErrorCode};

type OAuthResolver = jacquard::identity::JacquardResolver;
type AtProtoSession = OAuthSession<OAuthResolver, FileAuthStore>;

const AUTH_STORE_FILENAME: &str = "atproto-auth.json";
const SESSION_META_FILENAME: &str = "atproto-session.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub did: String,
    pub handle: String,
    pub session_id: String,
    pub endpoint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PersistedSessionMeta {
    did: String,
    handle: String,
    session_id: String,
}

#[derive(Debug, Deserialize)]
struct OAuthSessionRecord {
    account_did: String,
    session_id: String,
}

#[derive(Debug, Deserialize)]
struct StoredOAuthEntry {
    #[serde(rename = "OAuth")]
    oauth: OAuthSessionRecord,
}

pub struct AtProtoState {
    oauth: Arc<OAuthClient<OAuthResolver, FileAuthStore>>,
    auth_store_path: PathBuf,
    session_meta_path: PathBuf,
    session_info: Mutex<Option<SessionInfo>>,
}

impl AtProtoState {
    pub fn new(app_dir: &Path) -> Result<Self, AppError> {
        fs::create_dir_all(app_dir)
            .map_err(|error| AppError::io(format!("Failed to create AT Protocol data directory: {}", error)))?;

        let auth_store_path = app_dir.join(AUTH_STORE_FILENAME);
        let session_meta_path = app_dir.join(SESSION_META_FILENAME);
        let oauth = OAuthClient::with_default_config(FileAuthStore::new(&auth_store_path));

        Ok(Self { oauth: Arc::new(oauth), auth_store_path, session_meta_path, session_info: Mutex::new(None) })
    }

    pub async fn restore_session(&self) -> Result<Option<SessionInfo>, AppError> {
        let persisted = self
            .read_session_meta()
            .or_else(|| self.read_session_meta_from_auth_store());

        let Some(persisted) = persisted else {
            self.clear_in_memory()?;
            return Ok(None);
        };

        let did = Did::new(&persisted.did)
            .map_err(|error| AppError::new(ErrorCode::Parse, format!("Invalid persisted DID: {}", error)))?;
        let session = match self.oauth.restore(&did, &persisted.session_id).await {
            Ok(session) => session,
            Err(error) => {
                self.clear_persisted()?;
                self.clear_in_memory()?;
                return Err(AppError::io(format!(
                    "Failed to restore AT Protocol session: {}",
                    error
                )));
            }
        };

        let endpoint = session.endpoint().await.to_string();
        let info =
            SessionInfo { did: persisted.did, handle: persisted.handle, session_id: persisted.session_id, endpoint };

        self.set_active_session(session, info.clone()).await?;
        Ok(Some(info))
    }

    pub async fn login(&self, handle: &str) -> Result<SessionInfo, AppError> {
        let normalized_handle = handle.trim();
        if normalized_handle.is_empty() {
            return Err(AppError::new(
                ErrorCode::InvalidPath,
                "Handle is required to log into AT Protocol",
            ));
        }

        let session = self
            .oauth
            .login_with_local_server(
                normalized_handle,
                Default::default(),
                LoopbackConfig {
                    host: "127.0.0.1".into(),
                    port: LoopbackPort::Ephemeral,
                    open_browser: true,
                    timeout_ms: 5 * 60 * 1000,
                },
            )
            .await
            .map_err(|error| AppError::io(format!("AT Protocol login failed: {}", error)))?;

        let (did, session_id) = session.session_info().await;
        let info = SessionInfo {
            did: did.to_string(),
            handle: normalized_handle.to_string(),
            session_id: session_id.to_string(),
            endpoint: session.endpoint().await.to_string(),
        };

        self.set_active_session(session, info.clone()).await?;
        Ok(info)
    }

    pub async fn logout(&self) -> Result<(), AppError> {
        let info = self.session_info.lock().ok().and_then(|guard| guard.clone());
        let persisted = self.read_session_meta();

        if let Some(info) = info {
            if let Ok(did) = Did::new(&info.did) {
                if let Err(error) = self.oauth.revoke(&did, &info.session_id).await {
                    log::warn!("Failed to revoke AT Protocol session: {}", error);
                }
            }
        } else if let Some(meta) = persisted {
            if let Ok(did) = Did::new(&meta.did) {
                if let Err(error) = self.oauth.revoke(&did, &meta.session_id).await {
                    log::warn!("Failed to revoke AT Protocol session: {}", error);
                }
            }
        }

        self.clear_persisted()?;
        self.clear_in_memory()?;
        Ok(())
    }

    pub async fn session_status(&self) -> Option<SessionInfo> {
        self.session_info.lock().ok().and_then(|guard| guard.clone())
    }

    async fn set_active_session(&self, session: AtProtoSession, info: SessionInfo) -> Result<(), AppError> {
        self.write_session_meta(&PersistedSessionMeta {
            did: info.did.clone(),
            handle: info.handle.clone(),
            session_id: info.session_id.clone(),
        })?;

        let _ = session;
        let mut guard = self
            .session_info
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock AT Protocol session state"))?;
        *guard = Some(info);
        Ok(())
    }

    fn clear_in_memory(&self) -> Result<(), AppError> {
        let mut guard = self
            .session_info
            .lock()
            .map_err(|_| AppError::new(ErrorCode::Io, "Failed to lock AT Protocol session state"))?;
        *guard = None;
        Ok(())
    }

    fn clear_persisted(&self) -> Result<(), AppError> {
        if self.auth_store_path.exists() {
            fs::remove_file(&self.auth_store_path)
                .map_err(|error| AppError::io(format!("Failed to remove AT Protocol auth store: {}", error)))?;
        }
        if self.session_meta_path.exists() {
            fs::remove_file(&self.session_meta_path)
                .map_err(|error| AppError::io(format!("Failed to remove AT Protocol session metadata: {}", error)))?;
        }
        Ok(())
    }

    fn read_session_meta(&self) -> Option<PersistedSessionMeta> {
        let bytes = fs::read(&self.session_meta_path).ok()?;
        serde_json::from_slice::<PersistedSessionMeta>(&bytes).ok()
    }

    fn write_session_meta(&self, meta: &PersistedSessionMeta) -> Result<(), AppError> {
        let bytes = serde_json::to_vec_pretty(meta)
            .map_err(|error| AppError::io(format!("Failed to encode AT Protocol session metadata: {}", error)))?;
        fs::write(&self.session_meta_path, bytes)
            .map_err(|error| AppError::io(format!("Failed to persist AT Protocol session metadata: {}", error)))
    }

    fn read_session_meta_from_auth_store(&self) -> Option<PersistedSessionMeta> {
        let bytes = fs::read(&self.auth_store_path).ok()?;
        let map = serde_json::from_slice::<HashMap<String, StoredOAuthEntry>>(&bytes).ok()?;
        let (_, entry) = map.into_iter().find(|(_, entry)| !entry.oauth.account_did.is_empty())?;
        let did = entry.oauth.account_did;

        Some(PersistedSessionMeta { did: did.clone(), handle: did, session_id: entry.oauth.session_id })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn reads_session_meta_from_auth_store_when_sidecar_file_is_missing() {
        let dir = tempdir().expect("tempdir");
        let state = AtProtoState::new(dir.path()).expect("state");

        fs::write(
            dir.path().join(AUTH_STORE_FILENAME),
            r#"{
              "did:plc:alice_writer-session": {
                "OAuth": {
                  "account_did": "did:plc:alice",
                  "session_id": "writer-session"
                }
              }
            }"#,
        )
        .expect("write auth store");

        let meta = state.read_session_meta_from_auth_store().expect("meta");
        assert_eq!(meta.did, "did:plc:alice");
        assert_eq!(meta.handle, "did:plc:alice");
        assert_eq!(meta.session_id, "writer-session");
    }

    #[test]
    fn logout_clears_persisted_session_metadata_without_touching_other_app_state() {
        let dir = tempdir().expect("tempdir");
        let state = AtProtoState::new(dir.path()).expect("state");

        state
            .write_session_meta(&PersistedSessionMeta {
                did: "did:plc:alice".into(),
                handle: "alice.bsky.social".into(),
                session_id: "writer-session".into(),
            })
            .expect("write meta");
        fs::write(dir.path().join(AUTH_STORE_FILENAME), "{}").expect("write auth store");

        tauri::async_runtime::block_on(state.logout()).expect("logout");

        assert!(!state.session_meta_path.exists());
        assert!(!state.auth_store_path.exists());
        assert!(tauri::async_runtime::block_on(state.session_status()).is_none());
    }
}
