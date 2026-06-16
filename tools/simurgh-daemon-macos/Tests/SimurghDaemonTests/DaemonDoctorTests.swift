// SPDX-License-Identifier: AGPL-3.0-or-later
import XCTest
@testable import SimurghDaemon

final class DaemonDoctorTests: XCTestCase {
    func testDoctorReportRedactsSensitiveValues() {
        let report = DaemonDoctor.Report(checks: [
            .init(name: "keychain_identity", ok: true, detail: "exists"),
            .init(name: "allowed_origin", ok: true, detail: "configured"),
            .init(name: "proof_round_trip", ok: false, detail: "server_unavailable"),
        ])

        let rendered = report.render()

        XCTAssertTrue(rendered.contains("keychain_identity"))
        XCTAssertTrue(rendered.contains("server_unavailable"))
        XCTAssertFalse(rendered.localizedCaseInsensitiveContains("private"))
        XCTAssertFalse(rendered.localizedCaseInsensitiveContains("process_name"))
        XCTAssertFalse(rendered.localizedCaseInsensitiveContains("window_title"))
        XCTAssertFalse(rendered.localizedCaseInsensitiveContains(NSHomeDirectory()))
    }
}
