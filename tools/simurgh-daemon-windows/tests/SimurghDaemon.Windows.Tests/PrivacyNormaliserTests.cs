using System.Text.Json;
using SimurghDaemon.Windows;

namespace SimurghDaemon.Windows.Tests;

public sealed class PrivacyNormaliserTests
{
    [Fact]
    public void ScannerJsonContainsOnlyMetadataFields()
    {
        var result = new AffinityScanResult(
            Platform: "windows",
            ScannerState: "restricted_detected",
            ScannerVersion: "2.6.0",
            VisibleWindowCount: 4,
            SuspiciousWindowCount: 1,
            CaptureExcludedWindowCount: 0,
            CaptureRestrictedWindowCount: 1,
            MonitorOnlyWindowCount: 1,
            ScanErrorCount: 0,
            PrivacyMode: "metadata_only");

        var json = PrivacyNormaliser.ToScannerJson(result);
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        Assert.Equal("windows", root.GetProperty("platform").GetString());
        Assert.Equal(1, root.GetProperty("monitor_only_window_count").GetInt32());
        foreach (var forbidden in new[] { "hwnd", "pid", "process_name", "window_title", "executable_path", "username" })
        {
            Assert.DoesNotContain(forbidden, json, StringComparison.OrdinalIgnoreCase);
        }
    }
}
