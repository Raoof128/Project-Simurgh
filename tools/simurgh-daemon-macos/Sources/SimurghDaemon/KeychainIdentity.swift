import CryptoKit
import Foundation
import Security

final class KeychainIdentity {
    private let key: P256.Signing.PrivateKey
    let publicKey: String
    let nodeIdHash: String

    private init(key: P256.Signing.PrivateKey) {
        self.key = key
        let publicDer = key.publicKey.derRepresentation
        self.publicKey = b64url(publicDer)
        self.nodeIdHash = "sha256:" + sha256Hex(publicDer)
    }

    static func loadOrCreate() throws -> KeychainIdentity {
        let service = "org.simurgh.daemon"
        let account = "p256-signing-key"
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
        ]
        var item: CFTypeRef?
        if SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
           let data = item as? Data,
           let key = try? P256.Signing.PrivateKey(rawRepresentation: data) {
            return KeychainIdentity(key: key)
        }
        let key = P256.Signing.PrivateKey()
        let data = key.rawRepresentation
        let add: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        SecItemDelete(add as CFDictionary)
        let status = SecItemAdd(add as CFDictionary, nil)
        guard status == errSecSuccess else { throw NSError(domain: NSOSStatusErrorDomain, code: Int(status)) }
        return KeychainIdentity(key: key)
    }

    func sign(_ payload: [String: Any]) throws -> String {
        let data = jsonData(payload)
        let sig = try key.signature(for: data)
        return b64url(sig.derRepresentation)
    }
}
