use axum::{routing::get, Json, Router};
use serde::Serialize;

use crate::config::{DAEMON_PLATFORM, DAEMON_VERSION};

#[derive(Serialize)]
pub struct HealthResponse {
    pub ok: bool,
    pub platform: &'static str,
    pub daemon_version: &'static str,
    pub privacy_mode: &'static str,
}

pub fn router() -> Router {
    Router::new().route("/health", get(health))
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        ok: true,
        platform: DAEMON_PLATFORM,
        daemon_version: DAEMON_VERSION,
        privacy_mode: "metadata_only",
    })
}
