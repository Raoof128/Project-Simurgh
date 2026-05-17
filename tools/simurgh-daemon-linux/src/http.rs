use axum::{routing::get, Json, Router};
use serde::Serialize;

use crate::config::{DAEMON_PLATFORM, DAEMON_VERSION, SCANNER_VERSION};
use crate::scanner::session::{detect, SessionEnv};

#[derive(Serialize)]
pub struct HealthResponse {
    pub ok: bool,
    pub platform: &'static str,
    pub daemon_version: &'static str,
    pub privacy_mode: &'static str,
}

#[derive(Serialize)]
pub struct StatusResponse {
    pub platform: &'static str,
    pub daemon_version: &'static str,
    pub scanner_version: &'static str,
    pub display_server: &'static str,
    pub scanner_state: &'static str,
    pub scanner_reason: &'static str,
    pub coverage: &'static str,
    pub privacy_mode: &'static str,
}

pub fn router() -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/status", get(status))
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        ok: true,
        platform: DAEMON_PLATFORM,
        daemon_version: DAEMON_VERSION,
        privacy_mode: "metadata_only",
    })
}

async fn status() -> Json<StatusResponse> {
    let det = detect(&SessionEnv::from_process_env());
    Json(StatusResponse {
        platform: DAEMON_PLATFORM,
        daemon_version: DAEMON_VERSION,
        scanner_version: SCANNER_VERSION,
        display_server: det.display_server,
        scanner_state: det.scanner_state,
        scanner_reason: det.scanner_reason,
        coverage: det.coverage,
        privacy_mode: "metadata_only",
    })
}
