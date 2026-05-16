import Foundation

struct PrivacyNormaliser {
    static func status(nodeIdHash: String?, sessionActive: Bool, paired: Bool, scan: AffinityScanResult? = nil) -> [String: Any] {
        let scan = scan ?? AffinityScanner().scan()
        var status: [String: Any] = [
            "ok": true,
            "paired": paired,
            "session_active": sessionActive,
            "daemon_state": paired ? "healthy" : "unpaired",
            "helper_state": "healthy",
            "platform": "macos",
            "last_scan_at": scan.scanTimestamp,
            "node_id_hash": nodeIdHash as Any,
        ]
        for (key, value) in scan.asDictionary() {
            status[key] = value
        }
        if scan.captureExcludedWindowCount > 0 {
            status["daemon_state"] = "risk_detected"
            status["helper_state"] = "risk_detected"
        }
        return status
    }
}
