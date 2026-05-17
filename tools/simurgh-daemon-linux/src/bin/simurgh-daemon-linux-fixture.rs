use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use simurgh_daemon_linux::identity::{load_or_create_identity, IdentityPaths};
use simurgh_daemon_linux::proof::{build_proof, ProofInputs};
use tempfile::tempdir;

fn main() {
    let dir = tempdir().unwrap();
    let paths = IdentityPaths {
        state_dir: dir.path().join("simurgh"),
        identity_file: dir.path().join("simurgh/daemon-identity.pem"),
    };
    let id = load_or_create_identity(&paths).unwrap();
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
        x11_counts: [3, 0, 0, 0, 0],
        xwayland_window_count: 0,
        suspicious_window_count: 0,
        visible_window_count: 3,
    };
    let proof = build_proof(&id, &inputs);
    let wrapper = serde_json::json!({
        "proof": proof,
        "public_key": id.public_key_b64url(),
    });
    println!("{}", wrapper);
}
