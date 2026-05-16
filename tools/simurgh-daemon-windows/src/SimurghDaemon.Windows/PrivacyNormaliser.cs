using System.Text.Json;

namespace SimurghDaemon.Windows;

public static class PrivacyNormaliser
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = null,
        WriteIndented = false,
    };

    public static string ToScannerJson(AffinityScanResult result) =>
        JsonSerializer.Serialize(result, Options);
}
