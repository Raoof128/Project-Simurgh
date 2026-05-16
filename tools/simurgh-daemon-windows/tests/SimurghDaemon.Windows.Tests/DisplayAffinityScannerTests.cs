using SimurghDaemon.Windows;

namespace SimurghDaemon.Windows.Tests;

public sealed class DisplayAffinityScannerTests
{
    [Fact]
    public void NormalVisibleWindowsReturnZeroRisk()
    {
        var scanner = new DisplayAffinityScanner(new FakeWindowInfoProvider([
            new WindowInfo(true, 1200, 800, 0, DisplayAffinityScanner.WDA_NONE),
            new WindowInfo(true, 900, 600, 0, DisplayAffinityScanner.WDA_NONE),
        ]));

        var result = scanner.Scan();

        Assert.Equal("windows", result.Platform);
        Assert.Equal("healthy", result.ScannerState);
        Assert.Equal(2, result.VisibleWindowCount);
        Assert.Equal(0, result.CaptureExcludedWindowCount);
        Assert.Equal(0, result.MonitorOnlyWindowCount);
        Assert.Equal("metadata_only", result.PrivacyMode);
    }

    [Fact]
    public void ExcludeFromCaptureIncrementsCriticalCount()
    {
        var scanner = new DisplayAffinityScanner(new FakeWindowInfoProvider([
            new WindowInfo(true, 1200, 800, 0, DisplayAffinityScanner.WDA_EXCLUDEFROMCAPTURE),
        ]));

        var result = scanner.Scan();

        Assert.Equal("risk_detected", result.ScannerState);
        Assert.Equal(1, result.CaptureExcludedWindowCount);
        Assert.Equal(0, result.MonitorOnlyWindowCount);
        Assert.Equal(1, result.SuspiciousWindowCount);
    }

    [Fact]
    public void MonitorOnlyIncrementsWarningCount()
    {
        var scanner = new DisplayAffinityScanner(new FakeWindowInfoProvider([
            new WindowInfo(true, 1200, 800, 0, DisplayAffinityScanner.WDA_MONITOR),
        ]));

        var result = scanner.Scan();

        Assert.Equal("restricted_detected", result.ScannerState);
        Assert.Equal(0, result.CaptureExcludedWindowCount);
        Assert.Equal(1, result.MonitorOnlyWindowCount);
        Assert.Equal(1, result.CaptureRestrictedWindowCount);
        Assert.Equal(1, result.SuspiciousWindowCount);
    }

    [Fact]
    public void TinyAndCloakedWindowsAreIgnored()
    {
        var scanner = new DisplayAffinityScanner(new FakeWindowInfoProvider([
            new WindowInfo(true, 20, 20, 0, DisplayAffinityScanner.WDA_EXCLUDEFROMCAPTURE),
            new WindowInfo(true, 1200, 800, 0, DisplayAffinityScanner.WDA_EXCLUDEFROMCAPTURE, IsCloaked: true),
        ]));

        var result = scanner.Scan();

        Assert.Equal("healthy", result.ScannerState);
        Assert.Equal(0, result.VisibleWindowCount);
        Assert.Equal(0, result.CaptureExcludedWindowCount);
    }

    [Fact]
    public void ProviderExceptionReturnsScannerUnavailable()
    {
        var scanner = new DisplayAffinityScanner(new ThrowingWindowInfoProvider());

        var result = scanner.Scan();

        Assert.Equal("scanner_unavailable", result.ScannerState);
        Assert.Equal(1, result.ScanErrorCount);
        Assert.Equal("metadata_only", result.PrivacyMode);
    }

    private sealed class FakeWindowInfoProvider(IReadOnlyList<WindowInfo> windows) : IWindowInfoProvider
    {
        public IReadOnlyList<WindowInfo> ListWindows() => windows;
    }

    private sealed class ThrowingWindowInfoProvider : IWindowInfoProvider
    {
        public IReadOnlyList<WindowInfo> ListWindows() => throw new InvalidOperationException("boom");
    }
}
