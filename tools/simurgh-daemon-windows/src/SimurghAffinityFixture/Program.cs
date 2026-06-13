// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Runtime.InteropServices;

namespace SimurghAffinityFixture;

public static class Program
{
    private const uint WDA_NONE = 0x00000000;
    private const uint WDA_MONITOR = 0x00000001;
    private const uint WDA_EXCLUDEFROMCAPTURE = 0x00000011;

    public static async Task<int> Main(string[] args)
    {
        if (!OperatingSystem.IsWindows())
        {
            Console.Error.WriteLine("SimurghAffinityFixture requires Windows.");
            return 1;
        }

        var mode = args.FirstOrDefault()?.ToLowerInvariant() ?? "none";
        var affinity = mode switch
        {
            "none" => WDA_NONE,
            "monitor" => WDA_MONITOR,
            "exclude" => WDA_EXCLUDEFROMCAPTURE,
            _ => throw new ArgumentException("Mode must be one of: none, monitor, exclude."),
        };

        var title = $"Simurgh test fixture - {mode}";
        var window = FixtureWindow.Create(title);
        ShowWindow(window, 5);
        UpdateWindow(window);
        if (!SetWindowDisplayAffinity(window, affinity))
        {
            Console.Error.WriteLine($"SetWindowDisplayAffinity failed for mode '{mode}' with Win32 error {Marshal.GetLastWin32Error()}.");
            return 2;
        }

        using var cts = new CancellationTokenSource();
        var pump = Task.Run(() => MessageLoop(cts.Token));
        Console.WriteLine($"SimurghAffinityFixture running mode '{mode}'. Press Enter or Ctrl+C to close.");
        Console.CancelKeyPress += (_, eventArgs) =>
        {
            eventArgs.Cancel = true;
            cts.Cancel();
        };
        if (Console.IsInputRedirected)
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, cts.Token).ContinueWith(_ => { });
        }
        else
        {
            Console.ReadLine();
        }
        cts.Cancel();
        DestroyWindow(window);
        await pump;
        return 0;
    }

    private static void MessageLoop(CancellationToken token)
    {
        while (!token.IsCancellationRequested && GetMessage(out var message, IntPtr.Zero, 0, 0) > 0)
        {
            TranslateMessage(ref message);
            DispatchMessage(ref message);
        }
    }

    private static class FixtureWindow
    {
        private const string ClassName = "SimurghAffinityFixtureWindow";
        private static readonly WndProc Proc = WindowProc;

        public static IntPtr Create(string title)
        {
            var module = GetModuleHandle(null);
            var wc = new WNDCLASS
            {
                lpfnWndProc = Proc,
                hInstance = module,
                lpszClassName = ClassName,
            };
            RegisterClass(ref wc);
            const uint WS_OVERLAPPEDWINDOW = 0x00CF0000;
            var hwnd = CreateWindowEx(
                0,
                ClassName,
                title,
                WS_OVERLAPPEDWINDOW,
                120,
                120,
                640,
                360,
                IntPtr.Zero,
                IntPtr.Zero,
                module,
                IntPtr.Zero);
            if (hwnd == IntPtr.Zero)
            {
                throw new InvalidOperationException($"CreateWindowEx failed with Win32 error {Marshal.GetLastWin32Error()}.");
            }
            return hwnd;
        }

        private static IntPtr WindowProc(IntPtr hwnd, uint msg, IntPtr wParam, IntPtr lParam)
        {
            const uint WM_DESTROY = 0x0002;
            if (msg == WM_DESTROY)
            {
                PostQuitMessage(0);
                return IntPtr.Zero;
            }
            return DefWindowProc(hwnd, msg, wParam, lParam);
        }
    }

    private delegate IntPtr WndProc(IntPtr hwnd, uint msg, IntPtr wParam, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct WNDCLASS
    {
        public uint style;
        public WndProc lpfnWndProc;
        public int cbClsExtra;
        public int cbWndExtra;
        public IntPtr hInstance;
        public IntPtr hIcon;
        public IntPtr hCursor;
        public IntPtr hbrBackground;
        public string? lpszMenuName;
        public string lpszClassName;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MSG
    {
        public IntPtr hwnd;
        public uint message;
        public IntPtr wParam;
        public IntPtr lParam;
        public uint time;
        public int ptX;
        public int ptY;
    }

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern ushort RegisterClass(ref WNDCLASS lpWndClass);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern IntPtr CreateWindowEx(
        uint dwExStyle,
        string lpClassName,
        string lpWindowName,
        uint dwStyle,
        int x,
        int y,
        int nWidth,
        int nHeight,
        IntPtr hWndParent,
        IntPtr hMenu,
        IntPtr hInstance,
        IntPtr lpParam);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    private static extern bool UpdateWindow(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool DestroyWindow(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SetWindowDisplayAffinity(IntPtr hWnd, uint dwAffinity);

    [DllImport("user32.dll")]
    private static extern IntPtr DefWindowProc(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern int GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);

    [DllImport("user32.dll")]
    private static extern bool TranslateMessage(ref MSG lpMsg);

    [DllImport("user32.dll")]
    private static extern IntPtr DispatchMessage(ref MSG lpMsg);

    [DllImport("user32.dll")]
    private static extern void PostQuitMessage(int nExitCode);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr GetModuleHandle(string? lpModuleName);
}
