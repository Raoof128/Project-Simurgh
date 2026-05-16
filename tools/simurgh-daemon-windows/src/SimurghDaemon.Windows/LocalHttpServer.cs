using System.Text.Json;

namespace SimurghDaemon.Windows;

public static class LocalHttpServer
{
    public static JsonResponse HealthPayload() =>
        new(true, "simurgh-daemon-windows", "0.4.11", "windows");

    public static string HealthJson() =>
        JsonSerializer.Serialize(HealthPayload(), CanonicalJson.JsonOptions());
}
