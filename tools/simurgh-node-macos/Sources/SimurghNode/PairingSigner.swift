// SPDX-License-Identifier: AGPL-3.0-or-later
import Foundation
import CryptoKit

enum PairingSigner {

    static func canonicalisePairingPayload(_ envelope: PairingEnvelope) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(envelope)
    }

    static func signAndEncode(envelope: PairingEnvelope, identity: NodeIdentity) throws -> Data {
        let canonical = try canonicalisePairingPayload(envelope)
        let signature = try identity.privateKey.signature(for: canonical)
        let signatureB64 = signature.base64EncodedString()

        let dict: [String: Any] = [
            "version": envelope.version,
            "platform": envelope.platform,
            "session_id": envelope.session_id,
            "node_id_hash": envelope.node_id_hash,
            "node_public_key": envelope.node_public_key,
            "challenge": envelope.challenge,
            "timestamp": envelope.timestamp,
            "signature": signatureB64,
        ]
        return try JSONSerialization.data(
            withJSONObject: dict,
            options: [.prettyPrinted, .sortedKeys]
        )
    }
}
