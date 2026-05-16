using SimurghDaemon.Windows;

if (args.Length > 0 && args[0] == "doctor")
{
    Console.WriteLine("simurgh-daemon-windows doctor: loopback metadata-only prototype");
    return;
}

if (args.Length > 0 && args[0] == "start")
{
    Console.WriteLine("simurgh-daemon-windows start: LocalHttpServer skeleton is metadata-only");
    return;
}

Console.WriteLine(LocalHttpServer.HealthJson());
