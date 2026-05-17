use simurgh_daemon_linux::identity::{load_or_create_identity, IdentityPaths};
use std::fs;
use std::os::unix::fs::PermissionsExt;
use tempfile::tempdir;

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
