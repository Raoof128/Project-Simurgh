// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Text.Json.Serialization;

namespace SimurghDaemon.Windows;

public sealed record JsonResponse(
    [property: JsonPropertyName("ok")] bool Ok,
    [property: JsonPropertyName("daemon")] string Daemon,
    [property: JsonPropertyName("version")] string Version,
    [property: JsonPropertyName("platform")] string Platform);

public sealed record StatusResponse(
    [property: JsonPropertyName("ok")] bool Ok,
    [property: JsonPropertyName("platform")] string Platform,
    [property: JsonPropertyName("scanner_state")] string ScannerState,
    [property: JsonPropertyName("scanner_version")] string ScannerVersion,
    [property: JsonPropertyName("privacy_mode")] string PrivacyMode,
    [property: JsonPropertyName("visible_window_count")] int VisibleWindowCount,
    [property: JsonPropertyName("suspicious_window_count")] int SuspiciousWindowCount,
    [property: JsonPropertyName("capture_excluded_window_count")] int CaptureExcludedWindowCount,
    [property: JsonPropertyName("capture_restricted_window_count")] int CaptureRestrictedWindowCount,
    [property: JsonPropertyName("monitor_only_window_count")] int MonitorOnlyWindowCount,
    [property: JsonPropertyName("scan_error_count")] int ScanErrorCount,
    [property: JsonPropertyName("paired")] bool Paired = false,
    [property: JsonPropertyName("node_id_hash")] string? NodeIdHash = null);

public sealed record OkResponse([property: JsonPropertyName("ok")] bool Ok);
