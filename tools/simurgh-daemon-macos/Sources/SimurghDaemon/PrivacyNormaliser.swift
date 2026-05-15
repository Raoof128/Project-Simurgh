import Foundation

struct PrivacyNormaliser {
    static func status(nodeIdHash: String?, sessionActive: Bool, paired: Bool) -> [String: Any] {
        [
            "ok": true,
            "paired": paired,
            "session_active": sessionActive,
            "daemon_state": paired ? "healthy" : "unpaired",
            "helper_state": "healthy",
            "capture_excluded_window_count": 0,
            "last_scan_at": isoNow(),
            "node_id_hash": nodeIdHash as Any,
        ]
    }
}
