using SimurghDaemon.Windows;

namespace SimurghDaemon.Windows.Tests;

public sealed class LocalHttpServerTests
{
    [Fact]
    public void HealthPayloadUsesLoopbackWindowsMetadata()
    {
        var payload = LocalHttpServer.HealthPayload();

        Assert.True(payload.Ok);
        Assert.Equal("simurgh-daemon-windows", payload.Daemon);
        Assert.Equal("0.4.11", payload.Version);
        Assert.Equal("windows", payload.Platform);
    }
}
