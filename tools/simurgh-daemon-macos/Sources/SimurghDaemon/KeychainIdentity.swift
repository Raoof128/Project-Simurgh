// SPDX-License-Identifier: AGPL-3.0-or-later
import CryptoKit
import Foundation
import Security

final class KeychainIdentity {
    private static let service = "org.simurgh.daemon"
    private static let account = "p256-signing-key"

    private let key: P256.Signing.PrivateKey
    let publicKey: String
    let nodeIdHash: String

    private init(key: P256.Signing.PrivateKey) {
        self.key = key
        let publicDer = key.publicKey.derRepresentation
        self.publicKey = b64url(publicDer)
        self.nodeIdHash = "sha256:" + sha256Hex(publicDer)
    }

    static func loadOrCreate(service: String = KeychainIdentity.service) throws -> KeychainIdentity {
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

    static func exists() -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: false,
        ]
        return SecItemCopyMatching(query as CFDictionary, nil) == errSecSuccess
    }

    static func reset() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
        }
    }

    func sign(_ payload: [String: Any]) throws -> String {
        let data = jsonData(payload)
        let sig = try key.signature(for: data)
        return b64url(sig.derRepresentation)
    }
}
