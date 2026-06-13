// SPDX-License-Identifier: AGPL-3.0-or-later
import Foundation

final class ProofSigner {
    let identity: KeychainIdentity
    let scanner: AffinityScanner

    init(identity: KeychainIdentity, scanner: AffinityScanner = AffinityScanner()) {
        self.identity = identity
        self.scanner = scanner
    }

    func pair(sessionId: String, examId: String, challenge: String) throws -> [String: Any] {
        let payload: [String: Any] = [
            "type": "simurgh.daemon.pair",
            "session_id": sessionId,
            "exam_id": examId,
            "challenge": challenge,
            "timestamp": isoNow(),
            "node_id_hash": identity.nodeIdHash,
            "daemon_version": "0.4.7",
            "platform": "macos",
        ]
        return [
            "ok": true,
            "node_id_hash": identity.nodeIdHash,
            "public_key": identity.publicKey,
            "signature": try identity.sign(payload),
            "signed_payload": payload,
        ]
    }

    func proof(sessionId: String, examId: String, sequence: Int, challenge: String) throws -> [String: Any] {
        let scan = scanner.scan()
        var payload: [String: Any] = [
            "type": "simurgh.daemon.proof",
            "session_id": sessionId,
            "exam_id": examId,
            "sequence": sequence,
            "timestamp": isoNow(),
            "node_id_hash": identity.nodeIdHash,
            "daemon_version": "0.4.7",
            "platform": "macos",
            "helper_state": scan.scannerState == "risk_detected" ? "risk_detected" : "healthy",
            "challenge": challenge,
        ]
        for (key, value) in scan.asDictionary() {
            payload[key] = value
        }
        payload["signature"] = try identity.sign(payload)
        return ["ok": true, "daemon_proof": payload]
    }
}
