import XCTest
@testable import SimurghDaemon

final class ScannerProofTests: XCTestCase {
    func testProofPayloadIncludesScannerSummaryInsideSignedPayload() throws {
        let identity = try KeychainIdentity.loadOrCreate(service: "dev.raouf.simurgh.daemon.tests.scanner-proof")
        let scanner = AffinityScanner(provider: MockProofWindowInfoProvider(windows: [
            WindowInfo(isOnscreen: true, layer: 0, alpha: 1, width: 320, height: 240, sharingState: .none, localFingerprint: "excluded")
        ]))
        let signer = ProofSigner(identity: identity, scanner: scanner)

        let response = try signer.proof(sessionId: "sess_scan", examId: "exam_scan", sequence: 4, challenge: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
        let proof = try XCTUnwrap(response["daemon_proof"] as? [String: Any])

        XCTAssertEqual(proof["scanner_state"] as? String, "risk_detected")
        XCTAssertEqual(proof["scanner_version"] as? String, "2.5.0")
        XCTAssertEqual(proof["privacy_mode"] as? String, "metadata_only")
        XCTAssertEqual(proof["capture_excluded_window_count"] as? Int, 1)
        XCTAssertEqual(proof["visible_window_count"] as? Int, 1)
        XCTAssertNotNil(proof["signature"])
        XCTAssertNil(proof["window_title"])
        XCTAssertNil(proof["process_name"])
        XCTAssertNil(proof["pid"])
    }
}

private struct MockProofWindowInfoProvider: WindowInfoProvider {
    let windows: [WindowInfo]

    func listWindows() throws -> [WindowInfo] {
        windows
    }
}
