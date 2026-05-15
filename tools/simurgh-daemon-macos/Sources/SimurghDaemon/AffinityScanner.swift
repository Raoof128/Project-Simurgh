import ApplicationServices
import Foundation

enum WindowSharingState: Int {
    case none = 0
    case readOnly = 1
    case readWrite = 2
    case unknown = -1
}

struct WindowInfo {
    let isOnscreen: Bool
    let layer: Int
    let alpha: Double
    let width: Double
    let height: Double
    let sharingState: WindowSharingState
    let localFingerprint: String
}

enum AffinityScannerError: Error {
    case permissionDenied
    case scannerUnavailable
}

protocol WindowInfoProvider {
    func listWindows() throws -> [WindowInfo]
}

struct CoreGraphicsWindowInfoProvider: WindowInfoProvider {
    func listWindows() throws -> [WindowInfo] {
        guard let rawWindows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else {
            throw AffinityScannerError.scannerUnavailable
        }

        return rawWindows.compactMap { raw in
            let isOnscreen = (raw[kCGWindowIsOnscreen as String] as? Bool) ?? false
            let layer = (raw[kCGWindowLayer as String] as? Int) ?? 0
            let alpha = (raw[kCGWindowAlpha as String] as? Double) ?? 1
            let sharingRaw = (raw[kCGWindowSharingState as String] as? Int) ?? WindowSharingState.unknown.rawValue
            let sharingState = WindowSharingState(rawValue: sharingRaw) ?? .unknown
            let bounds = raw[kCGWindowBounds as String] as? [String: Any] ?? [:]
            let width = (bounds["Width"] as? Double) ?? (bounds["width"] as? Double) ?? 0
            let height = (bounds["Height"] as? Double) ?? (bounds["height"] as? Double) ?? 0

            return WindowInfo(
                isOnscreen: isOnscreen,
                layer: layer,
                alpha: alpha,
                width: width,
                height: height,
                sharingState: sharingState,
                localFingerprint: "layer:\(layer)|size:\(Int(width))x\(Int(height))|sharing:\(sharingRaw)"
            )
        }
    }
}

struct AffinityScanResult {
    static let scannerVersion = "2.5.0"

    let scannerState: String
    let scannerVersion: String
    let scanTimestamp: String
    let scanDurationMs: Int
    let visibleWindowCount: Int
    let suspiciousWindowCount: Int
    let captureExcludedWindowCount: Int
    let scanErrorCount: Int
    let privacyMode: String
    let windowFingerprintHashes: [String]

    func asDictionary() -> [String: Any] {
        [
            "scanner_state": scannerState,
            "scanner_version": scannerVersion,
            "scan_timestamp": scanTimestamp,
            "scan_duration_ms": scanDurationMs,
            "visible_window_count": visibleWindowCount,
            "suspicious_window_count": suspiciousWindowCount,
            "capture_excluded_window_count": captureExcludedWindowCount,
            "scan_error_count": scanErrorCount,
            "privacy_mode": privacyMode,
            "window_fingerprint_hashes": windowFingerprintHashes,
        ]
    }
}

struct AffinityScanner {
    private let provider: WindowInfoProvider
    private let minimumWindowSize: Double

    init(provider: WindowInfoProvider = CoreGraphicsWindowInfoProvider(), minimumWindowSize: Double = 80) {
        self.provider = provider
        self.minimumWindowSize = minimumWindowSize
    }

    func scan() -> AffinityScanResult {
        let started = Date()
        do {
            let visibleWindows = try provider.listWindows().filter(isMeaningfulVisibleWindow)
            let suspicious = visibleWindows.filter { $0.sharingState == .none }
            return AffinityScanResult(
                scannerState: suspicious.isEmpty ? "healthy" : "risk_detected",
                scannerVersion: AffinityScanResult.scannerVersion,
                scanTimestamp: isoNow(),
                scanDurationMs: max(0, Int(Date().timeIntervalSince(started) * 1000)),
                visibleWindowCount: visibleWindows.count,
                suspiciousWindowCount: suspicious.count,
                captureExcludedWindowCount: suspicious.count,
                scanErrorCount: 0,
                privacyMode: "metadata_only",
                windowFingerprintHashes: suspicious.map { "sha256:" + sha256Hex(Data($0.localFingerprint.utf8)) }
            )
        } catch AffinityScannerError.permissionDenied {
            return failedResult(state: "permission_denied", started: started)
        } catch {
            return failedResult(state: "scanner_unavailable", started: started)
        }
    }

    func captureExcludedWindowCount() -> Int {
        scan().captureExcludedWindowCount
    }

    private func isMeaningfulVisibleWindow(_ window: WindowInfo) -> Bool {
        window.isOnscreen &&
            window.alpha > 0 &&
            window.width >= minimumWindowSize &&
            window.height >= minimumWindowSize &&
            window.layer >= 0 &&
            window.layer < 100
    }

    private func failedResult(state: String, started: Date) -> AffinityScanResult {
        AffinityScanResult(
            scannerState: state,
            scannerVersion: AffinityScanResult.scannerVersion,
            scanTimestamp: isoNow(),
            scanDurationMs: max(0, Int(Date().timeIntervalSince(started) * 1000)),
            visibleWindowCount: 0,
            suspiciousWindowCount: 0,
            captureExcludedWindowCount: 0,
            scanErrorCount: 1,
            privacyMode: "metadata_only",
            windowFingerprintHashes: []
        )
    }
}
