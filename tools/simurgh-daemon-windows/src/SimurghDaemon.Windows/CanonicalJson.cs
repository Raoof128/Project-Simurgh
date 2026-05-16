using System.Text.Json;
using System.Text.Json.Nodes;

namespace SimurghDaemon.Windows;

public static class CanonicalJson
{
    public static string SerializeWithoutSignature<T>(T value)
    {
        var node = JsonSerializer.SerializeToNode(value, JsonOptions())!;
        if (node is JsonObject obj)
        {
            obj.Remove("signature");
        }
        return SerializeNode(node);
    }

    public static JsonSerializerOptions JsonOptions() => new()
    {
        PropertyNamingPolicy = null,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never,
        WriteIndented = false,
    };

    private static string SerializeNode(JsonNode? node)
    {
        if (node is JsonObject obj)
        {
            var sorted = new JsonObject();
            foreach (var property in obj.OrderBy(p => p.Key, StringComparer.Ordinal))
            {
                sorted[property.Key] = property.Value?.DeepClone();
            }
            return sorted.ToJsonString(JsonOptions());
        }
        return node?.ToJsonString(JsonOptions()) ?? "null";
    }
}
