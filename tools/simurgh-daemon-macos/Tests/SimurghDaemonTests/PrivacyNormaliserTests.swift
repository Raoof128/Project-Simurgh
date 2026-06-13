// SPDX-License-Identifier: AGPL-3.0-or-later
import XCTest
@testable import SimurghDaemon

final class PrivacyNormaliserTests: XCTestCase {
    func testStatusContainsOnlyPrivacySafeFields() {
        let status = PrivacyNormaliser.status(nodeIdHash: "sha256:abc", sessionActive: true, paired: true)
        XCTAssertEqual(status["paired"] as? Bool, true)
        XCTAssertEqual(status["platform"] as? String, "macos")
        XCTAssertNil(status["process_name"])
        XCTAssertNil(status["window_title"])
        XCTAssertNil(status["username"])
    }
}
