use axum::{routing::get, Json, Router};
use serde::Serialize;
use tower_http::limit::RequestBodyLimitLayer;

use crate::config::{DAEMON_PLATFORM, DAEMON_VERSION, MAX_BODY_BYTES, SCANNER_VERSION};
use crate::scanner::session::{detect, SessionEnv};
use crate::scanner::x11;

#[derive(Serialize)]
pub struct HealthResponse {
    pub ok: bool,
    pub platform: &'static str,
    pub daemon_version: &'static str,
    pub privacy_mode: &'static str,
}

pub fn router() -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/status", get(status))
        .layer(RequestBodyLimitLayer::new(MAX_BODY_BYTES))
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        ok: true,
        platform: DAEMON_PLATFORM,
        daemon_version: DAEMON_VERSION,
        privacy_mode: "metadata_only",
    })
}

async fn status() -> Json<serde_json::Value> {
    let det = detect(&SessionEnv::from_process_env());
    let scanner = if det.display_server == "x11" && det.scanner_reason == "none" {
        Some(x11::scan())
    } else {
        None
    };
    let mut body = serde_json::json!({
        "platform": DAEMON_PLATFORM,
        "daemon_version": DAEMON_VERSION,
        "scanner_version": SCANNER_VERSION,
        "display_server": det.display_server,
        "scanner_state": scanner.as_ref().map(|s| s.scanner_state).unwrap_or(det.scanner_state),
        "scanner_reason": scanner.as_ref().map(|s| s.scanner_reason).unwrap_or(det.scanner_reason),
        "coverage": scanner.as_ref().map(|s| s.coverage).unwrap_or(det.coverage),
        "privacy_mode": "metadata_only",
    });
    if let Some(s) = scanner {
        let obj = body.as_object_mut().unwrap();
        obj.insert(
            "x11_managed_window_count".into(),
            s.x11_managed_window_count.into(),
        );
        obj.insert(
            "x11_override_redirect_window_count".into(),
            s.x11_override_redirect_window_count.into(),
        );
        obj.insert(
            "x11_above_window_count".into(),
            s.x11_above_window_count.into(),
        );
        obj.insert(
            "x11_fullscreen_window_count".into(),
            s.x11_fullscreen_window_count.into(),
        );
        obj.insert(
            "x11_skip_taskbar_window_count".into(),
            s.x11_skip_taskbar_window_count.into(),
        );
        obj.insert(
            "suspicious_window_count".into(),
            s.suspicious_window_count.into(),
        );
        obj.insert("visible_window_count".into(), s.visible_window_count.into());
    }
    Json(body)
}
