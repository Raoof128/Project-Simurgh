using System.Security.Cryptography;
using System.Text;

namespace SimurghDaemon.Windows;

public sealed class ProofSigner(WindowsIdentityStore identity)
{
    public DaemonProof CreateProof(
        string sessionId,
        string examId,
        int sequence,
        string challenge,
        AffinityScanResult scan,
        DateTimeOffset timestamp)
    {
        var unsigned = new DaemonProof(
            Type: "simurgh.daemon.proof",
            SessionId: sessionId,
            ExamId: examId,
            Sequence: sequence,
            Timestamp: timestamp.UtcDateTime.ToString("O"),
            NodeIdHash: identity.NodeIdHash,
            DaemonVersion: "0.4.11",
            Platform: "windows",
            ScannerState: scan.ScannerState,
            ScannerVersion: scan.ScannerVersion,
            VisibleWindowCount: scan.VisibleWindowCount,
            SuspiciousWindowCount: scan.SuspiciousWindowCount,
            CaptureExcludedWindowCount: scan.CaptureExcludedWindowCount,
            CaptureRestrictedWindowCount: scan.CaptureRestrictedWindowCount,
            MonitorOnlyWindowCount: scan.MonitorOnlyWindowCount,
            ScanErrorCount: scan.ScanErrorCount,
            PrivacyMode: scan.PrivacyMode,
            HelperState: "healthy",
            Challenge: challenge,
            Signature: "");
        var canonical = CanonicalJson.SerializeWithoutSignature(unsigned);
        var signature = identity.Key.SignData(Encoding.UTF8.GetBytes(canonical), HashAlgorithmName.SHA256, DSASignatureFormat.Rfc3279DerSequence);
        return unsigned with { Signature = Base64Url.Encode(signature) };
    }

    public bool Verify(DaemonProof proof)
    {
        try
        {
            var signature = Convert.FromBase64String(proof.Signature.Replace('-', '+').Replace('_', '/').PadRight(proof.Signature.Length + (4 - proof.Signature.Length % 4) % 4, '='));
            var canonical = CanonicalJson.SerializeWithoutSignature(proof);
            return identity.Key.VerifyData(Encoding.UTF8.GetBytes(canonical), signature, HashAlgorithmName.SHA256, DSASignatureFormat.Rfc3279DerSequence);
        }
        catch
        {
            return false;
        }
    }
}
