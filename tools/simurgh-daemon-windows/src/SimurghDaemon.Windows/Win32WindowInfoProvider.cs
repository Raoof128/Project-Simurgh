// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Runtime.InteropServices;

namespace SimurghDaemon.Windows;

public sealed class Win32WindowInfoProvider : IWindowInfoProvider
{
    public IReadOnlyList<WindowInfo> ListWindows()
    {
        if (!OperatingSystem.IsWindows())
        {
            throw new PlatformNotSupportedException("Win32 display-affinity scanning requires Windows.");
        }

        var windows = new List<WindowInfo>();
        EnumWindows((hWnd, _) =>
        {
            if (!IsWindowVisible(hWnd)) return true;
            if (!GetWindowRect(hWnd, out var rect)) return true;
            GetWindowDisplayAffinity(hWnd, out var affinity);
            windows.Add(new WindowInfo(
                IsVisible: true,
                Width: Math.Max(0, rect.Right - rect.Left),
                Height: Math.Max(0, rect.Bottom - rect.Top),
                Layer: 0,
                DisplayAffinity: affinity,
                IsCloaked: IsCloaked(hWnd)));
            return true;
        }, IntPtr.Zero);
        return windows;
    }

    private static bool IsCloaked(IntPtr hWnd)
    {
        const int DWMWA_CLOAKED = 14;
        return DwmGetWindowAttribute(hWnd, DWMWA_CLOAKED, out int cloaked, sizeof(int)) == 0 && cloaked != 0;
    }

    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hWnd, out Rect lpRect);

    [DllImport("user32.dll")]
    private static extern bool GetWindowDisplayAffinity(IntPtr hWnd, out uint affinity);

    [DllImport("dwmapi.dll")]
    private static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out int pvAttribute, int cbAttribute);

    private readonly struct Rect
    {
        public readonly int Left;
        public readonly int Top;
        public readonly int Right;
        public readonly int Bottom;
    }
}
