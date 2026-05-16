using System.Text.Json.Serialization;

namespace SimurghDaemon.Windows;

public sealed record JsonResponse(
    [property: JsonPropertyName("ok")] bool Ok,
    [property: JsonPropertyName("daemon")] string Daemon,
    [property: JsonPropertyName("version")] string Version,
    [property: JsonPropertyName("platform")] string Platform);
