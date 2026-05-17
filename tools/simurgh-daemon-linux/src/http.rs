use axum::{routing::get, routing::post, Json, Router};
use serde::{Deserialize, Serialize};
use tower_http::limit::RequestBodyLimitLayer;

use crate::config::{DAEMON_PLATFORM, DAEMON_VERSION, MAX_BODY_BYTES, SCANNER_VERSION};
use crate::identity::{load_or_create_identity, IdentityPaths};
use crate::proof::{build_proof, ProofInputs};
use crate::scanner::privacy::X11ScannerSummary;
use crate::scanner::session::{detect, SessionDetection, SessionEnv};
use crate::scanner::x11;

#[derive(Serialize)]
pub struct HealthResponse {
    pub ok: bool,
    pub platform: &'static str,
    pub daemon_version: &'static str,
    pub privacy_mode: &'static str,
}

pub struct CurrentScan {
    pub detection: SessionDetection,
    pub x11: Option<X11ScannerSummary>,
}

pub(crate) fn current_scanner_summary() -> CurrentScan {
    let det = detect(&SessionEnv::from_process_env());
    let x11 = if det.display_server == "x11" && det.scanner_reason == "none" {
        Some(x11::scan())
    } else {
        None
    };
    CurrentScan {
        detection: det,
        x11,
    }
}

pub fn router() -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/status", get(status))
        .route("/proof", post(proof))
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
    let scan = current_scanner_summary();
    let det = &scan.detection;
    let mut body = serde_json::json!({
        "platform": DAEMON_PLATFORM,
        "daemon_version": DAEMON_VERSION,
        "scanner_version": SCANNER_VERSION,
        "display_server": det.display_server,
        "scanner_state": scan.x11.as_ref().map(|s| s.scanner_state).unwrap_or(det.scanner_state),
        "scanner_reason": scan.x11.as_ref().map(|s| s.scanner_reason).unwrap_or(det.scanner_reason),
        "coverage": scan.x11.as_ref().map(|s| s.coverage).unwrap_or(det.coverage),
        "privacy_mode": "metadata_only",
    });
    if let Some(s) = scan.x11 {
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

#[derive(Deserialize)]
pub struct ProofRequest {
    pub session_id: String,
    pub exam_id: String,
    pub sequence: u64,
    pub challenge: String,
}

async fn proof(
    Json(req): Json<ProofRequest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let identity = load_or_create_identity(&IdentityPaths::from_xdg()).map_err(|_| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            "identity_unavailable".into(),
        )
    })?;
    let scan = current_scanner_summary();
    let display_server: &'static str = match scan.detection.display_server {
        "x11" => "x11",
        "wayland" => "wayland",
        "xwayland" => "xwayland",
        "headless" => "headless",
        _ => "unknown",
    };
    let (scanner_state, scanner_reason, coverage, counts, visible) = match &scan.x11 {
        Some(s) => (
            s.scanner_state,
            s.scanner_reason,
            s.coverage,
            [
                s.x11_managed_window_count,
                s.x11_override_redirect_window_count,
                s.x11_above_window_count,
                s.x11_fullscreen_window_count,
                s.x11_skip_taskbar_window_count,
            ],
            s.visible_window_count,
        ),
        None => (
            scan.detection.scanner_state,
            scan.detection.scanner_reason,
            scan.detection.coverage,
            [0, 0, 0, 0, 0],
            0,
        ),
    };
    let inputs = ProofInputs {
        session_id: req.session_id,
        exam_id: req.exam_id,
        sequence: req.sequence,
        timestamp: iso8601_utc_now(),
        challenge: req.challenge,
        display_server,
        scanner_state,
        scanner_reason,
        coverage,
        portal_advertised: None,
        portal_active: None,
        x11_counts: counts,
        xwayland_window_count: 0,
        suspicious_window_count: 0,
        visible_window_count: visible,
    };
    Ok(Json(build_proof(&identity, &inputs)))
}

fn iso8601_utc_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let d = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = d.as_secs() as i64;
    let millis = d.subsec_millis();
    let days = secs / 86_400;
    let secs_of_day = (secs % 86_400) as u64;
    let h = secs_of_day / 3600;
    let m = (secs_of_day % 3600) / 60;
    let s = secs_of_day % 60;
    let (y, mo, da) = days_to_ymd(days + 719_468);
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        y, mo, da, h, m, s, millis
    )
}

fn days_to_ymd(z: i64) -> (i32, u32, u32) {
    let z = z - 60;
    let era = if z >= 0 {
        z / 146_097
    } else {
        (z - 146_096) / 146_097
    };
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = (yoe as i64) + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y as i32, m as u32, d as u32)
}
