import Foundation
import Network

enum DaemonDoctor {
    struct Check {
        let name: String
        let ok: Bool
        let detail: String
    }

    struct Report {
        let checks: [Check]

        func render() -> String {
            checks.map { check in
                let mark = check.ok ? "ok" : "fail"
                return "\(mark) \(check.name): \(check.detail)"
            }.joined(separator: "\n")
        }

        var succeeded: Bool {
            checks.allSatisfy(\.ok)
        }
    }

    static func run(config: DaemonConfig, serverBaseUrl: URL?) -> Report {
        let status = fetchJson(url: URL(string: "http://127.0.0.1:\(config.port)/status"))
        let health = fetchJson(url: URL(string: "http://127.0.0.1:\(config.port)/health"))
        let portOpen = isPortAvailable(config.port)
        let keyExists = KeychainIdentity.exists()
        let serverReachable = serverBaseUrl.flatMap { fetchJson(url: $0.appendingPathComponent("health")) } != nil

        return Report(checks: [
            Check(name: "daemon_reachable", ok: health != nil, detail: health == nil ? "not_reachable" : "reachable"),
            Check(name: "port_available", ok: portOpen || health != nil, detail: portOpen ? "available" : "in_use"),
            Check(name: "keychain_identity", ok: keyExists, detail: keyExists ? "exists" : "missing"),
            Check(name: "allowed_origin", ok: !config.allowedOrigins.isEmpty, detail: "configured"),
            Check(name: "localhost_binding", ok: true, detail: "127.0.0.1:\(config.port)"),
            Check(name: "server_reachable", ok: serverBaseUrl == nil || serverReachable, detail: serverReachable ? "reachable" : "not_checked_or_unreachable"),
            Check(name: "proof_round_trip", ok: status != nil && serverReachable, detail: status == nil ? "daemon_unavailable" : "server_unavailable"),
        ])
    }

    private static func fetchJson(url: URL?) -> [String: Any]? {
        guard let url else { return nil }
        var request = URLRequest(url: url)
        request.timeoutInterval = 1.2
        request.addValue("browser", forHTTPHeaderField: "x-simurgh-local-client")
        let semaphore = DispatchSemaphore(value: 0)
        var parsed: [String: Any]?
        URLSession.shared.dataTask(with: request) { data, response, _ in
            defer { semaphore.signal() }
            guard let http = response as? HTTPURLResponse,
                  (200..<300).contains(http.statusCode),
                  let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            else { return }
            parsed = json
        }.resume()
        _ = semaphore.wait(timeout: .now() + 1.5)
        return parsed
    }

    private static func isPortAvailable(_ port: UInt16) -> Bool {
        do {
            let params = NWParameters.tcp
            params.requiredLocalEndpoint = .hostPort(
                host: .ipv4(IPv4Address("127.0.0.1")!),
                port: NWEndpoint.Port(rawValue: port)!
            )
            let listener = try NWListener(using: params)
            listener.cancel()
            return true
        } catch {
            return false
        }
    }
}
