namespace SimurghDaemon.Windows;

public sealed class DisplayAffinityScanner(IWindowInfoProvider provider)
{
    public const uint WDA_NONE = 0x00000000;
    public const uint WDA_MONITOR = 0x00000001;
    public const uint WDA_EXCLUDEFROMCAPTURE = 0x00000011;

    public const string ScannerVersion = "2.6.0";

    public AffinityScanResult Scan()
    {
        try
        {
            var visible = provider.ListWindows()
                .Where(IsMeaningfulVisibleWindow)
                .ToArray();
            var excluded = visible.Count(w => w.DisplayAffinity == WDA_EXCLUDEFROMCAPTURE);
            var monitorOnly = visible.Count(w => w.DisplayAffinity == WDA_MONITOR);
            var restricted = excluded + monitorOnly;
            var state = excluded > 0
                ? "risk_detected"
                : monitorOnly > 0
                    ? "restricted_detected"
                    : "healthy";

            return new AffinityScanResult(
                Platform: "windows",
                ScannerState: state,
                ScannerVersion: ScannerVersion,
                VisibleWindowCount: visible.Length,
                SuspiciousWindowCount: restricted,
                CaptureExcludedWindowCount: excluded,
                CaptureRestrictedWindowCount: restricted,
                MonitorOnlyWindowCount: monitorOnly,
                ScanErrorCount: 0,
                PrivacyMode: "metadata_only");
        }
        catch
        {
            return new AffinityScanResult(
                Platform: "windows",
                ScannerState: "scanner_unavailable",
                ScannerVersion: ScannerVersion,
                VisibleWindowCount: 0,
                SuspiciousWindowCount: 0,
                CaptureExcludedWindowCount: 0,
                CaptureRestrictedWindowCount: 0,
                MonitorOnlyWindowCount: 0,
                ScanErrorCount: 1,
                PrivacyMode: "metadata_only");
        }
    }

    private static bool IsMeaningfulVisibleWindow(WindowInfo window) =>
        window.IsVisible && !window.IsCloaked && window.Width >= 64 && window.Height >= 64;
}
