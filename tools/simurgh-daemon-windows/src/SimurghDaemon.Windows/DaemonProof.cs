// SPDX-License-Identifier: AGPL-3.0-or-later
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
    [property: JsonPropertyName("scan_timestamp")] string ScanTimestamp,
    [property: JsonPropertyName("scan_duration_ms")] int ScanDurationMs,
    [property: JsonPropertyName("visible_window_count")] int VisibleWindowCount,
    [property: JsonPropertyName("suspicious_window_count")] int SuspiciousWindowCount,
    [property: JsonPropertyName("capture_excluded_window_count")] int CaptureExcludedWindowCount,
    [property: JsonPropertyName("capture_restricted_window_count")] int CaptureRestrictedWindowCount,
    [property: JsonPropertyName("monitor_only_window_count")] int MonitorOnlyWindowCount,
    [property: JsonPropertyName("scan_error_count")] int ScanErrorCount,
    [property: JsonPropertyName("privacy_mode")] string PrivacyMode,
    [property: JsonPropertyName("window_fingerprint_hashes")] IReadOnlyList<string> WindowFingerprintHashes,
    [property: JsonPropertyName("helper_state")] string HelperState,
    [property: JsonPropertyName("challenge")] string Challenge,
    [property: JsonPropertyName("signature")] string Signature);

public sealed record DaemonPairSignedPayload(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("session_id")] string SessionId,
    [property: JsonPropertyName("exam_id")] string ExamId,
    [property: JsonPropertyName("challenge")] string Challenge,
    [property: JsonPropertyName("timestamp")] string Timestamp,
    [property: JsonPropertyName("node_id_hash")] string NodeIdHash,
    [property: JsonPropertyName("daemon_version")] string DaemonVersion,
    [property: JsonPropertyName("platform")] string Platform);

public sealed record DaemonPairResponse(
    [property: JsonPropertyName("ok")] bool Ok,
    [property: JsonPropertyName("node_id_hash")] string NodeIdHash,
    [property: JsonPropertyName("public_key")] string PublicKey,
    [property: JsonPropertyName("signed_payload")] DaemonPairSignedPayload SignedPayload,
    [property: JsonPropertyName("signature")] string Signature);
