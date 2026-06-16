// SPDX-License-Identifier: AGPL-3.0-or-later
import XCTest
import CryptoKit
@testable import SimurghNode

final class PairingCanonicaliseTests: XCTestCase {
    func testGoldenPairingFixtureMatchesNodeHash() throws {
        guard let payloadURL = Bundle.module.url(forResource: "golden-pairing-payload", withExtension: "json"),
              let hashURL = Bundle.module.url(forResource: "golden-pairing-payload", withExtension: "sha256") else {
            XCTFail("golden pairing fixture not found in test bundle")
            return
        }
        let payloadData = try Data(contentsOf: payloadURL)
        let expectedHex = try String(contentsOf: hashURL, encoding: .utf8)
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard var dict = try JSONSerialization.jsonObject(with: payloadData) as? [String: Any] else {
            XCTFail("fixture not a JSON object")
            return
        }
        dict.removeValue(forKey: "signature")

        let canonical = try JSONSerialization.data(
            withJSONObject: dict,
            options: [.sortedKeys, .withoutEscapingSlashes]
        )
        let actualHex = SHA256.hash(data: canonical).map { String(format: "%02x", $0) }.joined()

        XCTAssertEqual(
            actualHex,
            expectedHex,
            "Swift pairing canonicalisation must match Node golden fixture.\n" +
            "Swift canonical bytes:\n\(String(data: canonical, encoding: .utf8) ?? "<not utf8>")"
        )
    }
}
