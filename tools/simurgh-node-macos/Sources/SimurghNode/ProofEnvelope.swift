// SPDX-License-Identifier: AGPL-3.0-or-later
import Foundation
import Security

/// v1 proof envelope shape. Matches the server's accepted schema 1:1.
struct ProofEnvelope: Encodable {
    let version: String
    let platform: String
    let session_id: String
    let node_id_hash: String
    let node_public_key: String
    let nonce: String
    let timestamp: String
    let capabilities: Capabilities
    let signals: Signals
    let privacy_mode: String

    struct Capabilities: Encodable {
        let screencapturekit_available: Bool
        let window_enumeration: Bool
        let sharing_state_scan: Bool
        let helper_bridge: Bool
    }

    struct Signals: Encodable {
        let node_uptime_ms: Int
        let window_count: Int
        let capture_excluded_window_count: Int
        let helper_status: String
    }

    static func build(sessionId: String, identity: NodeIdentity) -> ProofEnvelope {
        return ProofEnvelope(
            version: "simurgh-integrity-proof-v1",
            platform: "macos",
            session_id: sessionId,
            node_id_hash: identity.nodeIdHashHex,
            node_public_key: identity.publicKeyBase64,
            nonce: generateNonce(),
            timestamp: nowIso8601(),
            capabilities: Capabilities(
                screencapturekit_available: false,
                window_enumeration: false,
                sharing_state_scan: false,
                helper_bridge: false
            ),
            signals: Signals(
                node_uptime_ms: 0,
                window_count: 0,
                capture_excluded_window_count: 0,
                helper_status: "not_configured"
            ),
            privacy_mode: "metadata_only"
        )
    }
}

private func generateNonce() -> String {
    var bytes = [UInt8](repeating: 0, count: 16)
    let result = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
    precondition(result == errSecSuccess, "SecRandomCopyBytes failed")
    return Data(bytes).base64EncodedString()
}

private func nowIso8601() -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    f.timeZone = TimeZone(secondsFromGMT: 0)
    return f.string(from: Date())
}
