// SPDX-License-Identifier: AGPL-3.0-or-later
import Foundation
import CryptoKit

/// Loads or creates the Ed25519 private key stored as base64 of its raw
/// representation (32 bytes) at the given path. On first creation the
/// directory is made 0700 and the file 0600.
struct NodeIdentity {
    let privateKey: Curve25519.Signing.PrivateKey
    let publicKey: Curve25519.Signing.PublicKey

    var publicKeyBase64: String {
        publicKey.rawRepresentation.base64EncodedString()
    }

    var nodeIdHashHex: String {
        let digest = SHA256.hash(data: publicKey.rawRepresentation)
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    static func loadOrCreate(at path: String) throws -> NodeIdentity {
        let url = URL(fileURLWithPath: path)
        let fm = FileManager.default

        if fm.fileExists(atPath: path) {
            return try load(from: url)
        }

        // Generate fresh keypair.
        let dirURL = url.deletingLastPathComponent()
        try fm.createDirectory(at: dirURL, withIntermediateDirectories: true, attributes: [
            .posixPermissions: 0o700,
        ])

        let key = Curve25519.Signing.PrivateKey()
        let encoded = key.rawRepresentation.base64EncodedString()
        try (encoded + "\n").data(using: .utf8)?.write(to: url, options: [.atomic])
        try fm.setAttributes([.posixPermissions: 0o600], ofItemAtPath: path)

        stderr("""
        [simurgh-node] WARNING:
        [simurgh-node] - This is a development identity key.
        [simurgh-node] - It is not hardware-backed attestation.
        [simurgh-node] - Stage 2.1 does not enumerate windows, request screen recording,
        [simurgh-node]   or collect any device content.
        [simurgh-node] - Pairing with the Simurgh server is not yet implemented (Stage 2.2).
        """)

        return NodeIdentity(privateKey: key, publicKey: key.publicKey)
    }

    private static func load(from url: URL) throws -> NodeIdentity {
        let raw = try String(contentsOf: url, encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines)
        guard let data = Data(base64Encoded: raw) else {
            throw CLIError.malformedKey("not valid base64")
        }
        guard data.count == 32 else {
            throw CLIError.malformedKey("expected 32 bytes, got \(data.count)")
        }
        do {
            let key = try Curve25519.Signing.PrivateKey(rawRepresentation: data)
            return NodeIdentity(privateKey: key, publicKey: key.publicKey)
        } catch {
            throw CLIError.malformedKey(String(describing: error))
        }
    }
}
