import XCTest
import CryptoKit
@testable import SimurghNode

final class CanonicaliseTests: XCTestCase {
    func testGoldenFixtureMatchesNodeHash() throws {
        // Load the shared golden fixture (Package.swift `resources:` copies it in).
        guard let proofURL = Bundle.module.url(forResource: "golden-proof", withExtension: "json"),
              let hashURL = Bundle.module.url(forResource: "golden-proof", withExtension: "sha256") else {
            XCTFail("golden fixture not found in test bundle")
            return
        }
        let proofData = try Data(contentsOf: proofURL)
        let expectedHex = try String(contentsOf: hashURL, encoding: .utf8)
            .trimmingCharacters(in: .whitespacesAndNewlines)

        // Decode the fixture into a generic JSON dict.
        guard var dict = try JSONSerialization.jsonObject(with: proofData) as? [String: Any] else {
            XCTFail("fixture not a JSON object")
            return
        }

        // Remove the top-level signature if present (fixture does not have one,
        // but be defensive — matches the JS canonicaliser rule).
        dict.removeValue(forKey: "signature")

        // Canonicalise using the same rules: sorted keys, no whitespace, recursive.
        // JSONSerialization with .sortedKeys produces sorted keys at every depth.
        let canonical = try JSONSerialization.data(
            withJSONObject: dict,
            options: [.sortedKeys, .withoutEscapingSlashes]
        )

        let digest = SHA256.hash(data: canonical)
        let actualHex = digest.map { String(format: "%02x", $0) }.joined()

        XCTAssertEqual(
            actualHex,
            expectedHex,
            "Swift canonicalisation must match Node golden fixture.\n" +
            "Swift canonical bytes:\n\(String(data: canonical, encoding: .utf8) ?? "<not utf8>")"
        )
    }
}
