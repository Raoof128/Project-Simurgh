using System.Text.Json.Serialization;

namespace SimurghDaemon.Windows;

public sealed record DaemonProof(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("session_id")] string SessionId,
    [property: JsonPropertyName("exam_id")] string ExamId,
    [property: JsonPropertyName("sequence")] int Sequence,
    [property: JsonPropertyName("timestamp")] string Timestamp,
    [property: JsonPropertyName("node_id_hash")] string NodeIdHash,
    [property: JsonPropertyName("daemon_version")] string DaemonVersion,
    [property: JsonPropertyName("platform")] string Platform,
    [property: JsonPropertyName("scanner_state")] string ScannerState,
    [property: JsonPropertyName("scanner_version")] string ScannerVersion,
    [property: JsonPropertyName("visible_window_count")] int VisibleWindowCount,
    [property: JsonPropertyName("suspicious_window_count")] int SuspiciousWindowCount,
    [property: JsonPropertyName("capture_excluded_window_count")] int CaptureExcludedWindowCount,
    [property: JsonPropertyName("capture_restricted_window_count")] int CaptureRestrictedWindowCount,
    [property: JsonPropertyName("monitor_only_window_count")] int MonitorOnlyWindowCount,
    [property: JsonPropertyName("scan_error_count")] int ScanErrorCount,
    [property: JsonPropertyName("privacy_mode")] string PrivacyMode,
    [property: JsonPropertyName("helper_state")] string HelperState,
    [property: JsonPropertyName("challenge")] string Challenge,
    [property: JsonPropertyName("signature")] string Signature);
