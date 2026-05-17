use serde_json::{json, Value};

use crate::canonical_json::canonicalise;
use crate::config::{DAEMON_PLATFORM, DAEMON_VERSION, SCANNER_VERSION};
use crate::identity::Identity;

pub struct ProofInputs {
    pub session_id: String,
    pub exam_id: String,
    pub sequence: u64,
    pub timestamp: String,
    pub challenge: String,
    pub display_server: &'static str,
    pub scanner_state: &'static str,
    pub scanner_reason: &'static str,
    pub coverage: &'static str,
    pub portal_advertised: Option<bool>,
    pub portal_active: Option<bool>,
    pub x11_counts: [u32; 5], // managed, override_redirect, above, fullscreen, skip_taskbar
    pub xwayland_window_count: u32,
    pub suspicious_window_count: u32,
    pub visible_window_count: u32,
}

pub fn build_proof(id: &Identity, i: &ProofInputs) -> Value {
    let mut payload = json!({
        "type": "simurgh.daemon.proof",
        "session_id": i.session_id,
        "exam_id": i.exam_id,
        "sequence": i.sequence,
        "timestamp": i.timestamp,
        "node_id_hash": id.node_id_hash(),
        "daemon_version": DAEMON_VERSION,
        "platform": DAEMON_PLATFORM,
        "display_server": i.display_server,
        "scanner_state": i.scanner_state,
        "scanner_version": SCANNER_VERSION,
        "scanner_reason": i.scanner_reason,
        "coverage": i.coverage,
        "portal_advertised": i.portal_advertised,
        "portal_active": i.portal_active,
        "x11_managed_window_count": i.x11_counts[0],
        "x11_override_redirect_window_count": i.x11_counts[1],
        "x11_above_window_count": i.x11_counts[2],
        "x11_fullscreen_window_count": i.x11_counts[3],
        "x11_skip_taskbar_window_count": i.x11_counts[4],
        "xwayland_window_count": i.xwayland_window_count,
        "suspicious_window_count": i.suspicious_window_count,
        "visible_window_count": i.visible_window_count,
        "capture_excluded_window_count": 0,
        "helper_state": "healthy",
        "privacy_mode": "metadata_only",
        "challenge": i.challenge,
    });
    let canonical = canonicalise(&payload);
    let signature = id.sign(canonical.as_bytes());
    payload.as_object_mut().unwrap().insert("signature".into(), Value::String(signature));
    payload
}
