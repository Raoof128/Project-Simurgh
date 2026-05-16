using System.Security.Cryptography;

namespace SimurghDaemon.Windows;

public sealed class WindowsIdentityStore : IDisposable
{
    public ECDsa Key { get; }
    public string PublicKey { get; }
    public string NodeIdHash { get; }

    private WindowsIdentityStore(ECDsa key)
    {
        Key = key;
        PublicKey = Base64Url.Encode(key.ExportSubjectPublicKeyInfo());
        NodeIdHash = $"sha256:{Convert.ToHexString(SHA256.HashData(key.ExportSubjectPublicKeyInfo())).ToLowerInvariant()}";
    }

    public static WindowsIdentityStore CreateEphemeral() =>
        new(ECDsa.Create(ECCurve.NamedCurves.nistP256));

    public void Dispose() => Key.Dispose();
}
