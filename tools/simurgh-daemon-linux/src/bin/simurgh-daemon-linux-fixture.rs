// SPDX-License-Identifier: AGPL-3.0-or-later
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use simurgh_daemon_linux::identity::{load_or_create_identity, IdentityPaths};
use simurgh_daemon_linux::proof::{build_proof, ProofInputs};
use simurgh_daemon_linux::scanner::session::{detect, SessionEnv};
use simurgh_daemon_linux::scanner::x11;
use tempfile::tempdir;

fn main() {
    let dir = tempdir().unwrap();
    let paths = IdentityPaths {
        state_dir: dir.path().join("simurgh"),
        identity_file: dir.path().join("simurgh/daemon-identity.pem"),
    };
    let id = load_or_create_identity(&paths).unwrap();

    let det = detect(&SessionEnv::from_process_env());
    let scanned = if det.display_server == "x11" && det.scanner_reason == "none" {
        Some(x11::scan())
    } else {
        None
    };
    let x11_counts = match &scanned {
        Some(s) if s.scanner_state == "healthy" => [
            s.x11_managed_window_count,
            s.x11_override_redirect_window_count,
            s.x11_above_window_count,
            s.x11_fullscreen_window_count,
            s.x11_skip_taskbar_window_count,
        ],
        _ => [3, 0, 0, 0, 0],
    };
    let visible_window_count = match &scanned {
        Some(s) if s.scanner_state == "healthy" => s.visible_window_count,
        _ => 3,
    };

    let inputs = ProofInputs {
        session_id: "sess_fixture".into(),
        exam_id: "exam_fixture".into(),
        sequence: 1,
        timestamp: "2026-05-17T08:00:00.000Z".into(),
        challenge: URL_SAFE_NO_PAD.encode([1u8; 32]),
        display_server: "x11",
        scanner_state: "healthy",
        scanner_reason: "none",
        coverage: "x11_full",
        portal_advertised: None,
        portal_active: None,
        x11_counts,
        xwayland_window_count: 0,
        suspicious_window_count: 0,
        visible_window_count,
    };
    let proof = build_proof(&id, &inputs);
    let wrapper = serde_json::json!({
        "proof": proof,
        "public_key": id.public_key_b64url(),
    });
    println!("{}", wrapper);
}
