using SimurghDaemon.Windows;

if (args.Length > 0 && args[0] == "doctor")
{
    Console.WriteLine("simurgh-daemon-windows doctor: loopback metadata-only prototype");
    Console.WriteLine("no private key");
    Console.WriteLine("no token");
    Console.WriteLine("no process name");
    Console.WriteLine("no window title");
    Console.WriteLine("no PID/HWND");
    Console.WriteLine("no username");
    Console.WriteLine("no home path");
    Console.WriteLine("no MAC/serial");
    return;
}

if (args.Length > 0 && args[0] == "start")
{
    var port = ReadIntOption("--port", 3031);
    var allowedOrigin = ReadStringOption("--allowed-origin", "http://localhost:3030");
    using var identity = WindowsIdentityStore.CreateEphemeral();
    var server = new LocalHttpServer(
        new DaemonConfig(Port: port, AllowedOrigin: allowedOrigin),
        new Win32WindowInfoProvider(),
        identity);
    await server.RunAsync();
    return;
}

Console.WriteLine(LocalHttpServer.HealthJson());

int ReadIntOption(string name, int fallback)
{
    var index = Array.IndexOf(args, name);
    return index >= 0 && index + 1 < args.Length && int.TryParse(args[index + 1], out var value)
        ? value
        : fallback;
}

string ReadStringOption(string name, string fallback)
{
    var index = Array.IndexOf(args, name);
    return index >= 0 && index + 1 < args.Length ? args[index + 1] : fallback;
}
