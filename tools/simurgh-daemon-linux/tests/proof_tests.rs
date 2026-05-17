use simurgh_daemon_linux::identity::{load_or_create_identity, IdentityPaths};
use std::fs;
use std::os::unix::fs::PermissionsExt;
use tempfile::tempdir;
use simurgh_daemon_linux::canonical_json::canonicalise;
use simurgh_daemon_linux::proof::{build_proof, ProofInputs};
use serde_json::json;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};

#[test]
fn identity_file_created_with_0600_permissions() {
    let dir = tempdir().unwrap();
    let paths = IdentityPaths {
        state_dir: dir.path().join("simurgh"),
        identity_file: dir.path().join("simurgh/daemon-identity.pem"),
    };
    let id = load_or_create_identity(&paths).unwrap();
    let meta = fs::metadata(&paths.identity_file).unwrap();
    assert_eq!(meta.permissions().mode() & 0o777, 0o600);
    let dir_meta = fs::metadata(&paths.state_dir).unwrap();
    assert_eq!(dir_meta.permissions().mode() & 0o777, 0o700);
    let node_hash = id.node_id_hash();
    assert!(node_hash.starts_with("sha256:"));
    assert_eq!(node_hash.len(), "sha256:".len() + 64);
}

#[test]
fn identity_is_stable_across_loads() {
    let dir = tempdir().unwrap();
    let paths = IdentityPaths {
        state_dir: dir.path().join("simurgh"),
        identity_file: dir.path().join("simurgh/daemon-identity.pem"),
    };
    let id1 = load_or_create_identity(&paths).unwrap();
    let id2 = load_or_create_identity(&paths).unwrap();
    assert_eq!(id1.node_id_hash(), id2.node_id_hash());
    assert_eq!(id1.public_key_b64url(), id2.public_key_b64url());
}

#[test]
fn canonicalise_sorts_keys_and_excludes_signature() {
    let v = json!({ "z": 1, "a": 2, "signature": "drop_me" });
    let s = canonicalise(&v);
    assert_eq!(s, r#"{"a":2,"z":1}"#);
}

#[test]
fn build_proof_signature_verifies_against_canonical_payload() {
    use p256::ecdsa::{signature::Verifier, Signature, VerifyingKey};
    use p256::pkcs8::DecodePublicKey;

    let dir = tempfile::tempdir().unwrap();
    let paths = IdentityPaths {
        state_dir: dir.path().join("simurgh"),
        identity_file: dir.path().join("simurgh/daemon-identity.pem"),
    };
    let id = load_or_create_identity(&paths).unwrap();

    let inputs = ProofInputs {
        session_id: "sess_test".into(),
        exam_id: "exam_test".into(),
        sequence: 1,
        timestamp: "2026-05-17T08:00:00.000Z".into(),
        challenge: URL_SAFE_NO_PAD.encode([1u8; 32]),
        display_server: "x11",
        scanner_state: "healthy",
        scanner_reason: "none",
        coverage: "x11_full",
        portal_advertised: None,
        portal_active: None,
        x11_counts: [0, 0, 0, 0, 0],
        xwayland_window_count: 0,
        suspicious_window_count: 0,
        visible_window_count: 0,
    };
    let proof = build_proof(&id, &inputs);

    // Verify signature against canonical payload (sans signature key).
    let canonical = canonicalise(&proof);
    let sig_b64 = proof["signature"].as_str().unwrap();
    let sig_bytes = URL_SAFE_NO_PAD.decode(sig_b64).unwrap();
    let sig = Signature::from_der(&sig_bytes).unwrap();
    let pk_bytes = URL_SAFE_NO_PAD.decode(id.public_key_b64url()).unwrap();
    let pk = p256::PublicKey::from_public_key_der(&pk_bytes).unwrap();
    let vk: VerifyingKey = pk.into();
    vk.verify(canonical.as_bytes(), &sig).expect("signature verifies");
}
