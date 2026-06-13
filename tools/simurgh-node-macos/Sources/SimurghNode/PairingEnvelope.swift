// SPDX-License-Identifier: AGPL-3.0-or-later
import Foundation

struct PairingEnvelope: Encodable {
    let version: String
    let platform: String
    let session_id: String
    let node_id_hash: String
    let node_public_key: String
    let challenge: String
    let timestamp: String

    static func build(sessionId: String, challenge: String, identity: NodeIdentity, timestamp: String) -> PairingEnvelope {
        return PairingEnvelope(
            version: "simurgh-pairing-proof-v1",
            platform: "macos",
            session_id: sessionId,
            node_id_hash: identity.nodeIdHashHex,
            node_public_key: identity.publicKeyBase64,
            challenge: challenge,
            timestamp: timestamp
        )
    }
}

func currentIso8601() -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    f.timeZone = TimeZone(secondsFromGMT: 0)
    return f.string(from: Date())
}
