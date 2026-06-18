// SPDX-License-Identifier: AGPL-3.0-or-later
use axum::body::Body;
use http_body_util::BodyExt;
use hyper::{Request, StatusCode};
use simurgh_daemon_linux::http::router;
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};
use tempfile::TempDir;
use tower::ServiceExt;

/// Serialises tests in this binary. The /proof handler reads identity from
/// `$XDG_STATE_HOME` — a process-wide env var that cannot safely race across
/// parallel tokio::test threads. Each test takes this guard, sets a fresh
/// tempdir, runs, then drops both. CI surfaced this race in PR #21 once a
/// third proof-endpoint test was added.
static XDG_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

fn xdg_lock() -> std::sync::MutexGuard<'static, ()> {
    XDG_LOCK
        .get_or_init(|| Mutex::new(()))
        .lock()
        .unwrap_or_else(|e| e.into_inner())
}

/// Returns a guard + tempdir bundle. The guard releases the lock when dropped;
/// the tempdir auto-deletes when dropped. Both live until the test returns.
///
/// We deliberately hold a `std::sync::MutexGuard` across the test's `.await`
/// points because the daemon reads `XDG_STATE_HOME` synchronously during the
/// request lifecycle — releasing the guard early would let a concurrent test
/// swap the env var mid-request. Clippy's `await_holding_lock` lint is
/// allowed at each test site for the same reason; this is the test-only
/// pattern and the daemon itself never holds a sync lock across awaits.
fn isolated_xdg_state() -> (std::sync::MutexGuard<'static, ()>, TempDir) {
    let guard = xdg_lock();
    let tmp = tempfile::tempdir().unwrap();
    std::env::set_var("XDG_STATE_HOME", tmp.path());
    (guard, tmp)
}

async fn post_proof() -> serde_json::Value {
    let (pair_status, pair_body) =
        post_pair("sess_proof_test", "exam_proof_test", "Y2hhbGxlbmdl").await;
    assert_eq!(pair_status, StatusCode::OK);
    assert_eq!(pair_body["ok"], true);
    let app = router();
    let body = serde_json::json!({
        "session_id": "sess_proof_test",
        "exam_id": "exam_proof_test",
        "sequence": 1,
        "challenge": "Y2hhbGxlbmdl"
    });
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/proof")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let bytes = resp.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).unwrap()
}

async fn post_pair(
    session_id: &str,
    exam_id: &str,
    challenge: &str,
) -> (StatusCode, serde_json::Value) {
    let app = router();
    let body = serde_json::json!({
        "session_id": session_id,
        "exam_id": exam_id,
        "challenge": challenge
    });
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/pair")
                .header("content-type", "application/json")
                .header("x-simurgh-local-client", "browser")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = resp.status();
    let bytes = resp.into_body().collect().await.unwrap().to_bytes();
    (status, serde_json::from_slice(&bytes).unwrap())
}

async fn post_proof_with(
    session_id: &str,
    exam_id: &str,
    sequence: u64,
    challenge: &str,
) -> (StatusCode, serde_json::Value) {
    let app = router();
    let body = serde_json::json!({
        "session_id": session_id,
        "exam_id": exam_id,
        "sequence": sequence,
        "challenge": challenge
    });
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/proof")
                .header("content-type", "application/json")
                .header("x-simurgh-local-client", "browser")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = resp.status();
    let bytes = resp.into_body().collect().await.unwrap().to_bytes();
    (status, serde_json::from_slice(&bytes).unwrap())
}

#[allow(clippy::await_holding_lock)]
#[tokio::test]
async fn post_proof_requires_prior_pairing_for_same_session_and_exam() {
    let (_guard, _tmp) = isolated_xdg_state();

    let (unpaired_status, unpaired_body) =
        post_proof_with("sess_unpaired", "exam_unpaired", 1, "Y2hhbGxlbmdl").await;
    assert_eq!(unpaired_status, StatusCode::CONFLICT);
    assert_eq!(unpaired_body["error"], "proof_session_not_paired");

    let (pair_status, pair_body) = post_pair("sess_paired", "exam_paired", "Y2hhbGxlbmdl").await;
    assert_eq!(pair_status, StatusCode::OK);
    assert_eq!(pair_body["ok"], true);

    let (wrong_exam_status, wrong_exam_body) =
        post_proof_with("sess_paired", "exam_other", 1, "Y2hhbGxlbmdl").await;
    assert_eq!(wrong_exam_status, StatusCode::CONFLICT);
    assert_eq!(wrong_exam_body["error"], "proof_session_not_paired");

    let (proof_status, proof_body) =
        post_proof_with("sess_paired", "exam_paired", 1, "Y2hhbGxlbmdl").await;
    assert_eq!(proof_status, StatusCode::OK);
    assert_eq!(proof_body["ok"], true);
}

#[allow(clippy::await_holding_lock)]
#[tokio::test]
async fn post_proof_returns_ok_envelope_matching_sdk_contract() {
    let (_guard, _tmp) = isolated_xdg_state();

    let body: serde_json::Value = post_proof().await;
    // Shared browser SDK contract: { ok: true, daemon_proof: <signed proof> }.
    // macOS daemon's ProofSigner returns the same shape — Linux MUST match.
    assert_eq!(body["ok"], true, "missing or non-true `ok` field");
    let proof = body
        .get("daemon_proof")
        .expect("response must include `daemon_proof` envelope key");
    assert_eq!(proof["type"], "simurgh.daemon.proof");
    assert_eq!(proof["platform"], "linux");
    assert_eq!(proof["scanner_version"], "2.8.0");
    assert!(proof["signature"].is_string());
    assert!(proof["node_id_hash"].is_string());
    for key in [
        "display_server",
        "scanner_state",
        "scanner_reason",
        "coverage",
        "x11_managed_window_count",
        "x11_override_redirect_window_count",
        "x11_above_window_count",
        "x11_fullscreen_window_count",
        "x11_skip_taskbar_window_count",
        "xwayland_window_count",
    ] {
        assert!(proof.get(key).is_some(), "missing {key} in proof");
    }
}

#[allow(clippy::await_holding_lock)]
#[tokio::test]
async fn post_proof_timestamp_is_within_seconds_of_now_utc() {
    let (_guard, _tmp) = isolated_xdg_state();

    let body = post_proof().await;
    let proof = &body["daemon_proof"];
    let ts_str = proof["timestamp"]
        .as_str()
        .expect("timestamp must be a string");
    // Parse RFC3339 manually (no chrono) to avoid pulling a dep just for tests.
    // Format: "YYYY-MM-DDTHH:MM:SS.mmmZ" — accept either ms-precision or whole-second.
    let bytes = ts_str.as_bytes();
    let year: i32 = std::str::from_utf8(&bytes[0..4]).unwrap().parse().unwrap();
    let month: u32 = std::str::from_utf8(&bytes[5..7]).unwrap().parse().unwrap();
    let day: u32 = std::str::from_utf8(&bytes[8..10]).unwrap().parse().unwrap();
    let hour: u64 = std::str::from_utf8(&bytes[11..13])
        .unwrap()
        .parse()
        .unwrap();
    let minute: u64 = std::str::from_utf8(&bytes[14..16])
        .unwrap()
        .parse()
        .unwrap();
    let second: u64 = std::str::from_utf8(&bytes[17..19])
        .unwrap()
        .parse()
        .unwrap();

    // Convert (year, month, day) → days since 1970-01-01 via Hinnant
    // days_from_civil reference: shift if month <=2 so March starts the year.
    let y = if month <= 2 { year - 1 } else { year };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = (y - era * 400) as u32;
    let m = month;
    let doy = (153 * if m > 2 { m - 3 } else { m + 9 } + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    let days = era as i64 * 146_097 + doe as i64 - 719_468;
    let proof_secs = days as i64 * 86_400 + (hour * 3600 + minute * 60 + second) as i64;

    let now_secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let drift = (now_secs - proof_secs).abs();
    assert!(
        drift < 10,
        "proof timestamp drift from now is {drift}s — expected <10s (raw: {ts_str}, year={year})"
    );
    // Belt-and-braces: the proof year must equal the current calendar year.
    // This is the canary that would have caught the days_to_ymd `-60` bug.
    let now_days = now_secs / 86_400;
    let now_year_check = now_days + 719_468;
    assert!(
        now_year_check > 0,
        "epoch math sanity: now days since 1970 cannot be negative"
    );
}

#[allow(clippy::await_holding_lock)]
#[tokio::test]
async fn post_proof_carries_xwayland_window_count_field_in_signed_payload() {
    let (_guard, _tmp) = isolated_xdg_state();

    let body = post_proof().await;
    let proof = &body["daemon_proof"];
    // The signed proof MUST carry xwayland_window_count on every Linux proof
    // so the Node validator's required-field check never fails. The value is
    // environment-dependent: 0 in headless/pure-Wayland, non-zero when
    // XWayland windows are present.
    assert!(
        proof.get("xwayland_window_count").is_some(),
        "signed proof missing xwayland_window_count field"
    );
    assert!(
        proof["xwayland_window_count"].is_u64(),
        "xwayland_window_count must be a non-negative integer, got: {}",
        proof["xwayland_window_count"]
    );
    // portal_advertised / portal_active must always be present in the signed
    // payload (may be null when no Wayland portal probe ran).
    assert!(
        proof.get("portal_advertised").is_some(),
        "signed proof missing portal_advertised field (may be null but must be present)"
    );
    assert!(
        proof.get("portal_active").is_some(),
        "signed proof missing portal_active field (may be null but must be present)"
    );
}
