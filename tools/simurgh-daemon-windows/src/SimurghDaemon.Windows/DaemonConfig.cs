namespace SimurghDaemon.Windows;

public sealed record DaemonConfig(
    int Port = 3031,
    string AllowedOrigin = "http://localhost:3030",
    string BindAddress = "127.0.0.1");
