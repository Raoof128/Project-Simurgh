// SPDX-License-Identifier: AGPL-3.0-or-later
import Foundation
import CryptoKit

/// Canonical JSON serializer mirroring src/integrity/proofCanonicalise.js.
/// - sorted keys, recursive
/// - no whitespace
/// - top-level "signature" excluded
///
/// Implementation strategy: encode the Encodable struct via JSONEncoder with
/// .sortedKeys + .withoutEscapingSlashes, then return those exact UTF-8 bytes.
/// Because ProofEnvelope (and its nested types) declares its CodingKeys via
/// the default behaviour, JSONEncoder + .sortedKeys produces deterministic
/// output that matches the JS canonicaliser. The golden-fixture test locks
/// this guarantee.
enum ProofSigner {

    /// Serialise the envelope to canonical UTF-8 bytes (no signature).
    static func canonicaliseProofPayload(_ envelope: ProofEnvelope) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(envelope)
    }

    /// Sign the canonical bytes and return the full proof JSON (with signature
    /// attached) pretty-printed for human readability. The signature is
    /// computed over the canonical bytes, not the pretty bytes.
    static func signAndEncode(envelope: ProofEnvelope, identity: NodeIdentity) throws -> Data {
        let canonical = try canonicaliseProofPayload(envelope)
        let signature = try identity.privateKey.signature(for: canonical)
        let signatureB64 = signature.base64EncodedString()

        // Re-encode the full proof (with signature) for stdout.
        let dict: [String: Any] = [
            "version": envelope.version,
            "platform": envelope.platform,
            "session_id": envelope.session_id,
            "node_id_hash": envelope.node_id_hash,
            "node_public_key": envelope.node_public_key,
            "nonce": envelope.nonce,
            "timestamp": envelope.timestamp,
            "capabilities": [
                "screencapturekit_available": envelope.capabilities.screencapturekit_available,
                "window_enumeration": envelope.capabilities.window_enumeration,
                "sharing_state_scan": envelope.capabilities.sharing_state_scan,
                "helper_bridge": envelope.capabilities.helper_bridge,
            ],
            "signals": [
                "node_uptime_ms": envelope.signals.node_uptime_ms,
                "window_count": envelope.signals.window_count,
                "capture_excluded_window_count": envelope.signals.capture_excluded_window_count,
                "helper_status": envelope.signals.helper_status,
            ],
            "privacy_mode": envelope.privacy_mode,
            "signature": signatureB64,
        ]
        let pretty = try JSONSerialization.data(
            withJSONObject: dict,
            options: [.prettyPrinted, .sortedKeys]
        )
        return pretty
    }
}
