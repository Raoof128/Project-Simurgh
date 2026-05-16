using SimurghDaemon.Windows;

namespace SimurghDaemon.Windows.Tests;

public sealed class LocalHttpServerTests
{
    [Fact]
    public void HealthPayloadUsesLoopbackWindowsMetadata()
    {
        var payload = LocalHttpServer.HealthPayload();

        Assert.True(payload.Ok);
        Assert.Equal("simurgh-daemon-windows", payload.Daemon);
        Assert.Equal("0.4.11", payload.Version);
        Assert.Equal("windows", payload.Platform);
    }

    [Fact]
    public void StatusPayloadIncludesPrivacySafeScannerSummary()
    {
        var scan = new AffinityScanResult(
            Platform: "windows",
            ScannerState: "restricted_detected",
            ScannerVersion: "2.6.0",
            VisibleWindowCount: 3,
            SuspiciousWindowCount: 1,
            CaptureExcludedWindowCount: 0,
            CaptureRestrictedWindowCount: 1,
            MonitorOnlyWindowCount: 1,
            ScanErrorCount: 0,
            PrivacyMode: "metadata_only");

        var payload = LocalHttpServer.StatusPayload(scan);

        Assert.True(payload.Ok);
        Assert.Equal("windows", payload.Platform);
        Assert.Equal("restricted_detected", payload.ScannerState);
        Assert.Equal("2.6.0", payload.ScannerVersion);
        Assert.Equal("metadata_only", payload.PrivacyMode);
        Assert.Equal(1, payload.MonitorOnlyWindowCount);
        Assert.Equal(0, payload.CaptureExcludedWindowCount);
    }

    [Fact]
    public void ProofPayloadSignsScannerCounts()
    {
        using var identity = WindowsIdentityStore.CreateEphemeral();
        var scan = new AffinityScanResult(
            Platform: "windows",
            ScannerState: "risk_detected",
            ScannerVersion: "2.6.0",
            VisibleWindowCount: 4,
            SuspiciousWindowCount: 1,
            CaptureExcludedWindowCount: 1,
            CaptureRestrictedWindowCount: 1,
            MonitorOnlyWindowCount: 0,
            ScanErrorCount: 0,
            PrivacyMode: "metadata_only");

        var proof = LocalHttpServer.ProofPayload(
            identity,
            scan,
            "sess_windows",
            "exam_windows",
            "challenge_windows",
            DateTimeOffset.UnixEpoch);

        Assert.Equal("windows", proof.Platform);
        Assert.Equal("risk_detected", proof.ScannerState);
        Assert.Equal(1, proof.CaptureExcludedWindowCount);
        Assert.True(new ProofSigner(identity).Verify(proof));
    }
}
