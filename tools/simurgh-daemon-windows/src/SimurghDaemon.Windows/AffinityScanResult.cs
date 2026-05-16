using System.Text.Json.Serialization;

namespace SimurghDaemon.Windows;

public sealed record AffinityScanResult(
    [property: JsonPropertyName("platform")] string Platform,
    [property: JsonPropertyName("scanner_state")] string ScannerState,
    [property: JsonPropertyName("scanner_version")] string ScannerVersion,
    [property: JsonPropertyName("visible_window_count")] int VisibleWindowCount,
    [property: JsonPropertyName("suspicious_window_count")] int SuspiciousWindowCount,
    [property: JsonPropertyName("capture_excluded_window_count")] int CaptureExcludedWindowCount,
    [property: JsonPropertyName("capture_restricted_window_count")] int CaptureRestrictedWindowCount,
    [property: JsonPropertyName("monitor_only_window_count")] int MonitorOnlyWindowCount,
    [property: JsonPropertyName("scan_error_count")] int ScanErrorCount,
    [property: JsonPropertyName("privacy_mode")] string PrivacyMode);
