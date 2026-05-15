import Foundation

final class ProofSigner {
    let identity: KeychainIdentity
    let scanner = AffinityScanner()

    init(identity: KeychainIdentity) {
        self.identity = identity
    }

    func pair(sessionId: String, examId: String, challenge: String) throws -> [String: Any] {
        let payload: [String: Any] = [
            "type": "simurgh.daemon.pair",
            "session_id": sessionId,
            "exam_id": examId,
            "challenge": challenge,
            "timestamp": isoNow(),
            "node_id_hash": identity.nodeIdHash,
            "daemon_version": "0.4.5",
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
        var payload: [String: Any] = [
            "type": "simurgh.daemon.proof",
            "session_id": sessionId,
            "exam_id": examId,
            "sequence": sequence,
            "timestamp": isoNow(),
            "node_id_hash": identity.nodeIdHash,
            "daemon_version": "0.4.5",
            "platform": "macos",
            "capture_excluded_window_count": scanner.captureExcludedWindowCount(),
            "helper_state": "healthy",
            "challenge": challenge,
        ]
        payload["signature"] = try identity.sign(payload)
        return ["ok": true, "daemon_proof": payload]
    }
}
