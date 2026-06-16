// SPDX-License-Identifier: AGPL-3.0-or-later
import Foundation

enum DaemonCommand {
    static func run(arguments: [String]) -> Int32 {
        let command = arguments.dropFirst().first ?? "start"
        let config = DaemonConfig.parse(arguments)

        switch command {
        case "start":
            return start(config: config)
        case "stop":
            return postControl(config: config, path: "/shutdown")
        case "status":
            return printJson(config: config, path: "/status")
        case "doctor":
            let report = DaemonDoctor.run(config: config, serverBaseUrl: serverBaseUrl(arguments))
            FileHandle.standardOutput.write(Data((report.render() + "\n").utf8))
            return report.succeeded ? 0 : 1
        case "reset-identity":
            do {
                try KeychainIdentity.reset()
                FileHandle.standardOutput.write(Data("ok identity_reset\n".utf8))
                return 0
            } catch {
                FileHandle.standardError.write(Data("error identity_reset_failed\n".utf8))
                return 1
            }
        case "--help", "help":
            FileHandle.standardOutput.write(Data(helpText.utf8))
            return 0
        default:
            FileHandle.standardError.write(Data("error unknown_command\n\(helpText)".utf8))
            return 64
        }
    }

    private static func start(config: DaemonConfig) -> Int32 {
        do {
            let identity = try KeychainIdentity.loadOrCreate()
            let state = SessionState()
            let signer = ProofSigner(identity: identity)
            let server = try LocalHttpServer(config: config, state: state, signer: signer)
            FileHandle.standardError.write(
                Data("simurgh-daemon-macos listening on 127.0.0.1:\(config.port)\n".utf8)
            )
            server.start()
            return 0
        } catch {
            FileHandle.standardError.write(
                Data("error port_unavailable: 127.0.0.1:\(config.port) may already be in use; run simurgh-daemon doctor\n".utf8)
            )
            return 1
        }
    }

    private static func printJson(config: DaemonConfig, path: String) -> Int32 {
        request(config: config, path: path, method: "GET") { status, body in
            guard (200..<300).contains(status), let body else {
                FileHandle.standardError.write(Data("error daemon_unreachable\n".utf8))
                return 1
            }
            FileHandle.standardOutput.write(body)
            FileHandle.standardOutput.write(Data("\n".utf8))
            return 0
        }
    }

    private static func postControl(config: DaemonConfig, path: String) -> Int32 {
        request(config: config, path: path, method: "POST") { status, _ in
            if (200..<300).contains(status) {
                FileHandle.standardOutput.write(Data("ok daemon_stop_requested\n".utf8))
                return 0
            }
            FileHandle.standardError.write(Data("error daemon_unreachable\n".utf8))
            return 1
        }
    }

    private static func request(
        config: DaemonConfig,
        path: String,
        method: String,
        completion: @escaping (Int, Data?) -> Int32
    ) -> Int32 {
        guard let url = URL(string: "http://127.0.0.1:\(config.port)\(path)") else { return 1 }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 1.5
        request.addValue("application/json", forHTTPHeaderField: "content-type")
        request.addValue("browser", forHTTPHeaderField: "x-simurgh-local-client")
        let semaphore = DispatchSemaphore(value: 0)
        var exitCode: Int32 = 1
        URLSession.shared.dataTask(with: request) { data, response, _ in
            defer { semaphore.signal() }
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            exitCode = completion(status, data)
        }.resume()
        _ = semaphore.wait(timeout: .now() + 2)
        return exitCode
    }

    private static func serverBaseUrl(_ arguments: [String]) -> URL? {
        guard let index = arguments.firstIndex(of: "--server-base-url"),
              arguments.indices.contains(index + 1)
        else { return nil }
        return URL(string: arguments[index + 1])
    }

    private static let helpText = """
    simurgh-daemon start [--port 3031] [--allowed-origin http://localhost:3030]
    simurgh-daemon stop [--port 3031]
    simurgh-daemon status [--port 3031]
    simurgh-daemon doctor [--port 3031] [--server-base-url http://localhost:3030]
    simurgh-daemon reset-identity

    Development-only local daemon controls. Not notarised. Not production endpoint management. Not MDM deployment.
    """
}
