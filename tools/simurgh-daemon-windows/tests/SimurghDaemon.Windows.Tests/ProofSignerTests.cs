// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Text.Json;
using SimurghDaemon.Windows;

namespace SimurghDaemon.Windows.Tests;

public sealed class ProofSignerTests
{
    [Fact]
    public void ProofSignatureChangesWhenScannerCountChanges()
    {
        using var identity = WindowsIdentityStore.CreateEphemeral();
        var signer = new ProofSigner(identity);
        var scan = new AffinityScanResult(
            Platform: "windows",
            ScannerState: "healthy",
            ScannerVersion: "2.6.0",
            VisibleWindowCount: 2,
            SuspiciousWindowCount: 0,
            CaptureExcludedWindowCount: 0,
            CaptureRestrictedWindowCount: 0,
            MonitorOnlyWindowCount: 0,
            ScanErrorCount: 0,
            PrivacyMode: "metadata_only");

        var first = signer.CreateProof("sess_windows", "exam_windows", 1, "challenge", scan, DateTimeOffset.UnixEpoch);
        var second = signer.CreateProof(
            "sess_windows",
            "exam_windows",
            1,
            "challenge",
            scan with { MonitorOnlyWindowCount = 1, CaptureRestrictedWindowCount = 1, SuspiciousWindowCount = 1, ScannerState = "restricted_detected" },
            DateTimeOffset.UnixEpoch);

        Assert.NotEqual(first.Signature, second.Signature);
        Assert.True(signer.Verify(first));
        Assert.True(signer.Verify(second));

        var tampered = JsonSerializer.Deserialize<DaemonProof>(JsonSerializer.Serialize(first))! with
        {
            MonitorOnlyWindowCount = 1,
        };
        Assert.False(signer.Verify(tampered));
    }
}
