using System.Text.Json;

namespace SimurghDaemon.Windows;

public sealed class LocalHttpServer
{
    private readonly DaemonConfig config;
    private readonly DisplayAffinityScanner scanner;
    private readonly WindowsIdentityStore identity;
    private readonly ProofSigner signer;
    private SessionState session = new(null, null, 0);

    public LocalHttpServer(DaemonConfig config, IWindowInfoProvider windowInfoProvider, WindowsIdentityStore identity)
    {
        this.config = config;
        scanner = new DisplayAffinityScanner(windowInfoProvider);
        this.identity = identity;
        signer = new ProofSigner(identity);
    }

    public static JsonResponse HealthPayload() =>
        new(true, "simurgh-daemon-windows", "0.4.11", "windows");

    public static string HealthJson() =>
        JsonSerializer.Serialize(HealthPayload(), CanonicalJson.JsonOptions());

    public static StatusResponse StatusPayload(AffinityScanResult scan, bool paired = false, string? nodeIdHash = null) =>
        new(
            Ok: true,
            Platform: scan.Platform,
            ScannerState: scan.ScannerState,
            ScannerVersion: scan.ScannerVersion,
            PrivacyMode: scan.PrivacyMode,
            VisibleWindowCount: scan.VisibleWindowCount,
            SuspiciousWindowCount: scan.SuspiciousWindowCount,
            CaptureExcludedWindowCount: scan.CaptureExcludedWindowCount,
            CaptureRestrictedWindowCount: scan.CaptureRestrictedWindowCount,
            MonitorOnlyWindowCount: scan.MonitorOnlyWindowCount,
            ScanErrorCount: scan.ScanErrorCount,
            Paired: paired,
            NodeIdHash: nodeIdHash);

    public static DaemonProof ProofPayload(
        WindowsIdentityStore identity,
        AffinityScanResult scan,
        string sessionId,
        string examId,
        string challenge,
        DateTimeOffset timestamp,
        int sequence = 1) =>
        new ProofSigner(identity).CreateProof(sessionId, examId, sequence, challenge, scan, timestamp);

    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        using var listener = new System.Net.HttpListener();
        listener.Prefixes.Add($"http://{config.BindAddress}:{config.Port}/");
        listener.Start();
        Console.WriteLine($"simurgh-daemon-windows listening on http://{config.BindAddress}:{config.Port}");

        while (!cancellationToken.IsCancellationRequested)
        {
            var context = await listener.GetContextAsync().WaitAsync(cancellationToken);
            await HandleAsync(context);
        }
    }

    private async Task HandleAsync(System.Net.HttpListenerContext context)
    {
        AddCorsHeaders(context);
        if (context.Request.HttpMethod == "OPTIONS")
        {
            context.Response.StatusCode = 204;
            context.Response.Close();
            return;
        }

        try
        {
            var path = context.Request.Url?.AbsolutePath ?? "/";
            if (context.Request.HttpMethod == "GET" && path == "/health")
            {
                await WriteJsonAsync(context, HealthPayload());
                return;
            }
            if (context.Request.HttpMethod == "GET" && path == "/status")
            {
                await WriteJsonAsync(context, StatusPayload(scanner.Scan(), session.SessionId is not null, identity.NodeIdHash));
                return;
            }
            if (context.Request.HttpMethod == "POST" && path == "/pair")
            {
                var request = await JsonSerializer.DeserializeAsync<PairRequest>(
                    context.Request.InputStream,
                    CanonicalJson.JsonOptions());
                if (request is null)
                {
                    await WriteJsonAsync(context, new { ok = false, error = "invalid_pair_request" }, 400);
                    return;
                }
                var pair = signer.CreatePair(request.SessionId, request.ExamId, request.Challenge, DateTimeOffset.UtcNow);
                session = new(request.SessionId, request.ExamId, 0);
                await WriteJsonAsync(context, pair);
                return;
            }
            if (context.Request.HttpMethod == "POST" && path == "/proof")
            {
                var request = await JsonSerializer.DeserializeAsync<ProofRequest>(
                    context.Request.InputStream,
                    CanonicalJson.JsonOptions());
                if (request is null)
                {
                    await WriteJsonAsync(context, new { ok = false, error = "invalid_proof_request" }, 400);
                    return;
                }
                var proof = ProofPayload(
                    identity,
                    scanner.Scan(),
                    request.SessionId,
                    request.ExamId,
                    request.Challenge,
                    DateTimeOffset.UtcNow,
                    request.Sequence);
                session = new(request.SessionId, request.ExamId, request.Sequence);
                await WriteJsonAsync(context, new ProofResponse(true, proof));
                return;
            }

            await WriteJsonAsync(context, new { ok = false, error = "not_found" }, 404);
        }
        catch
        {
            await WriteJsonAsync(context, new { ok = false, error = "daemon_error" }, 500);
        }
    }

    private void AddCorsHeaders(System.Net.HttpListenerContext context)
    {
        context.Response.Headers["access-control-allow-origin"] = config.AllowedOrigin;
        context.Response.Headers["access-control-allow-methods"] = "GET,POST,OPTIONS";
        context.Response.Headers["access-control-allow-headers"] = "content-type,x-simurgh-local-client";
        context.Response.Headers["cache-control"] = "no-store";
    }

    private static async Task WriteJsonAsync(System.Net.HttpListenerContext context, object payload, int statusCode = 200)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        var bytes = JsonSerializer.SerializeToUtf8Bytes(payload, CanonicalJson.JsonOptions());
        context.Response.ContentLength64 = bytes.Length;
        await context.Response.OutputStream.WriteAsync(bytes);
        context.Response.Close();
    }

    private sealed record PairRequest(
        [property: System.Text.Json.Serialization.JsonPropertyName("session_id")] string SessionId,
        [property: System.Text.Json.Serialization.JsonPropertyName("exam_id")] string ExamId,
        [property: System.Text.Json.Serialization.JsonPropertyName("challenge")] string Challenge);

    private sealed record ProofRequest(
        [property: System.Text.Json.Serialization.JsonPropertyName("session_id")] string SessionId,
        [property: System.Text.Json.Serialization.JsonPropertyName("exam_id")] string ExamId,
        [property: System.Text.Json.Serialization.JsonPropertyName("sequence")] int Sequence,
        [property: System.Text.Json.Serialization.JsonPropertyName("challenge")] string Challenge);

    private sealed record ProofResponse(
        [property: System.Text.Json.Serialization.JsonPropertyName("ok")] bool Ok,
        [property: System.Text.Json.Serialization.JsonPropertyName("daemon_proof")] DaemonProof DaemonProof);
}
