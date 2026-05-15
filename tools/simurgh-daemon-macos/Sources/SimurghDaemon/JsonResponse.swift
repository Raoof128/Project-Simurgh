import Foundation

func jsonData(_ value: Any) -> Data {
    (try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])) ?? Data("{}".utf8)
}

func isoNow() -> String {
    ISO8601DateFormatter().string(from: Date())
}

func b64url(_ data: Data) -> String {
    data.base64EncodedString()
        .replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_")
        .replacingOccurrences(of: "=", with: "")
}

func sha256Hex(_ data: Data) -> String {
    let digest = SHA256Compat.hash(data)
    return digest.map { String(format: "%02x", $0) }.joined()
}
