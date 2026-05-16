import XCTest
@testable import SimurghDaemon

final class AffinityScannerTests: XCTestCase {
    func testEmptyScanReturnsHealthyZeroCounts() {
        let scanner = AffinityScanner(provider: MockWindowInfoProvider(windows: []))

        let result = scanner.scan()

        XCTAssertEqual(result.scannerState, "healthy")
        XCTAssertEqual(result.visibleWindowCount, 0)
        XCTAssertEqual(result.captureExcludedWindowCount, 0)
        XCTAssertEqual(result.suspiciousWindowCount, 0)
        XCTAssertEqual(result.privacyMode, "metadata_only")
    }

    func testCaptureExcludedVisibleWindowIncrementsCounts() {
        let scanner = AffinityScanner(provider: MockWindowInfoProvider(windows: [
            WindowInfo(
                isOnscreen: true,
                layer: 0,
                alpha: 1,
                width: 640,
                height: 480,
                sharingState: .none,
                localFingerprint: "visible:none:640x480"
            ),
        ]))

        let result = scanner.scan()

        XCTAssertEqual(result.scannerState, "risk_detected")
        XCTAssertEqual(result.visibleWindowCount, 1)
        XCTAssertEqual(result.captureExcludedWindowCount, 1)
        XCTAssertEqual(result.suspiciousWindowCount, 1)
    }

    func testTinyAndNonOnscreenWindowsAreIgnored() {
        let scanner = AffinityScanner(provider: MockWindowInfoProvider(windows: [
            WindowInfo(isOnscreen: true, layer: 0, alpha: 1, width: 20, height: 20, sharingState: .none, localFingerprint: "tiny"),
            WindowInfo(isOnscreen: false, layer: 0, alpha: 1, width: 640, height: 480, sharingState: .none, localFingerprint: "hidden"),
            WindowInfo(isOnscreen: true, layer: -2147483623, alpha: 1, width: 1440, height: 900, sharingState: .none, localFingerprint: "desktop"),
        ]))

        let result = scanner.scan()

        XCTAssertEqual(result.visibleWindowCount, 0)
        XCTAssertEqual(result.captureExcludedWindowCount, 0)
        XCTAssertEqual(result.scannerState, "healthy")
    }

    func testProviderPermissionDeniedReturnsPermissionDenied() {
        let scanner = AffinityScanner(provider: MockWindowInfoProvider(error: .permissionDenied))

        let result = scanner.scan()

        XCTAssertEqual(result.scannerState, "permission_denied")
        XCTAssertEqual(result.scanErrorCount, 1)
        XCTAssertEqual(result.captureExcludedWindowCount, 0)
    }

    func testProviderFailureReturnsScannerUnavailable() {
        let scanner = AffinityScanner(provider: MockWindowInfoProvider(error: .scannerUnavailable))

        let result = scanner.scan()

        XCTAssertEqual(result.scannerState, "scanner_unavailable")
        XCTAssertEqual(result.scanErrorCount, 1)
        XCTAssertEqual(result.captureExcludedWindowCount, 0)
    }
}

private struct MockWindowInfoProvider: WindowInfoProvider {
    let windows: [WindowInfo]
    let error: AffinityScannerError?

    init(windows: [WindowInfo] = [], error: AffinityScannerError? = nil) {
        self.windows = windows
        self.error = error
    }

    func listWindows() throws -> [WindowInfo] {
        if let error { throw error }
        return windows
    }
}
