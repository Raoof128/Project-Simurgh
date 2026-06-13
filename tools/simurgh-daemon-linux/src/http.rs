// SPDX-License-Identifier: AGPL-3.0-or-later
use axum::{routing::get, routing::post, Json, Router};
use serde::{Deserialize, Serialize};
use tower_http::limit::RequestBodyLimitLayer;

use crate::config::{DAEMON_PLATFORM, DAEMON_VERSION, MAX_BODY_BYTES, SCANNER_VERSION};
use crate::identity::{load_or_create_identity, IdentityPaths};
use crate::proof::{build_proof, ProofInputs};
use crate::scanner::privacy::{x11_to_linux_summary, LinuxScannerSummary};
use crate::scanner::session::{detect, SessionDetection, SessionEnv};

#[derive(Serialize)]
pub struct HealthResponse {
    pub ok: bool,
    pub platform: &'static str,
    pub daemon_version: &'static str,
    pub privacy_mode: &'static str,
}

pub struct LinuxScannerSnapshot {
    pub detection: SessionDetection,
    pub scanner: Option<LinuxScannerSummary>,
}

pub(crate) fn current_scanner_summary() -> LinuxScannerSnapshot {
    use crate::scanner::wayland::{probe as wayland_probe, wayland_summary};
    let det = detect(&SessionEnv::from_process_env());
    let scanner: Option<LinuxScannerSummary> = match det.display_server {
        "x11" if det.scanner_reason == "none" => {
            Some(x11_to_linux_summary(crate::scanner::x11::scan()))
        }
        "wayland" => Some(wayland_summary(wayland_probe())),
        "xwayland" => Some(crate::scanner::xwayland::scan()),
        _ => None,
    };
    LinuxScannerSnapshot {
        detection: det,
        scanner,
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
        "scanner_state": scan.scanner.as_ref().map(|s| s.scanner_state).unwrap_or(det.scanner_state),
        "scanner_reason": scan.scanner.as_ref().map(|s| s.scanner_reason).unwrap_or(det.scanner_reason),
        "coverage": scan.scanner.as_ref().map(|s| s.coverage).unwrap_or(det.coverage),
        "privacy_mode": "metadata_only",
    });
    if let Some(s) = scan.scanner {
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
            "xwayland_window_count".into(),
            s.xwayland_window_count.into(),
        );
        obj.insert(
            "suspicious_window_count".into(),
            s.suspicious_window_count.into(),
        );
        obj.insert("visible_window_count".into(), s.visible_window_count.into());
        if let Some(pa) = s.portal_advertised {
            obj.insert("portal_advertised".into(), pa.into());
        }
        if let Some(pa) = s.portal_active {
            obj.insert("portal_active".into(), pa.into());
        }
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
    let (
        scanner_state,
        scanner_reason,
        coverage,
        counts,
        xwayland_count,
        visible,
        portal_advertised,
        portal_active,
    ) = match &scan.scanner {
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
            s.xwayland_window_count,
            s.visible_window_count,
            s.portal_advertised,
            s.portal_active,
        ),
        None => (
            scan.detection.scanner_state,
            scan.detection.scanner_reason,
            scan.detection.coverage,
            [0, 0, 0, 0, 0],
            0,
            0,
            None,
            None,
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
        portal_advertised,
        portal_active,
        x11_counts: counts,
        xwayland_window_count: xwayland_count,
        suspicious_window_count: 0,
        visible_window_count: visible,
    };
    let proof = build_proof(&identity, &inputs);
    Ok(Json(
        serde_json::json!({ "ok": true, "daemon_proof": proof }),
    ))
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

// Howard Hinnant's civil-from-days. Input `z` is days since 1970-01-01
// pre-shifted by +719_468 by the caller (so the algorithm's internal civil-day
// epoch alignment is satisfied). Do NOT subtract anything inside this function —
// that shifted the date by ~60 days in earlier revisions.
fn days_to_ymd(z: i64) -> (i32, u32, u32) {
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
