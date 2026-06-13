// SPDX-License-Identifier: AGPL-3.0-or-later
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
