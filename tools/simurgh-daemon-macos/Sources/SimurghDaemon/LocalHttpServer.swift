// SPDX-License-Identifier: AGPL-3.0-or-later
import Foundation
import Network

final class LocalHttpServer {
    private static let maxRequestBytes = 64 * 1024
    private let config: DaemonConfig
    private let state: SessionState
    private let signer: ProofSigner
    private let listener: NWListener

    init(config: DaemonConfig, state: SessionState, signer: ProofSigner) throws {
        self.config = config
        self.state = state
        self.signer = signer
        let params = NWParameters.tcp
        params.requiredLocalEndpoint = .hostPort(host: .ipv4(IPv4Address("127.0.0.1")!), port: NWEndpoint.Port(rawValue: config.port)!)
        self.listener = try NWListener(using: params)
    }

    func start() {
        listener.newConnectionHandler = { [weak self] connection in
            connection.start(queue: .global())
            self?.read(connection)
        }
        listener.start(queue: .global())
        dispatchMain()
    }

    private func read(_ connection: NWConnection) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: Self.maxRequestBytes) { [weak self] data, _, _, _ in
            guard let self, let data else { connection.cancel(); return }
            let response = self.handle(data)
            connection.send(content: response, completion: .contentProcessed { _ in connection.cancel() })
        }
    }

    private func handle(_ data: Data) -> Data {
        if data.count > Self.maxRequestBytes {
            return response(413, ["ok": false, "error": "request_too_large"], origin: nil)
        }
        let raw = String(decoding: data, as: UTF8.self)
        let headBody = raw.components(separatedBy: "\r\n\r\n")
        let lines = headBody.first?.components(separatedBy: "\r\n") ?? []
        let requestLine = lines.first?.split(separator: " ") ?? []
        let method = requestLine.first.map(String.init) ?? ""
        let path = requestLine.dropFirst().first.map(String.init) ?? "/"
        var headers: [String: String] = [:]
        for line in lines.dropFirst() {
            let parts = line.split(separator: ":", maxSplits: 1).map { String($0).trimmingCharacters(in: .whitespaces) }
            if parts.count == 2 { headers[parts[0].lowercased()] = parts[1] }
        }
        if let contentLength = headers["content-length"],
           let bytes = Int(contentLength),
           bytes > Self.maxRequestBytes {
            return response(413, ["ok": false, "error": "request_too_large"], origin: headers["origin"])
        }
        if let origin = headers["origin"], !config.allowedOrigins.contains(origin) {
            return response(403, ["ok": false, "error": "origin_not_allowed"], origin: origin)
        }
        if method == "POST", headers["x-simurgh-local-client"] != "browser" {
            return response(400, ["ok": false, "error": "local_client_header_required"], origin: headers["origin"])
        }
        let bodyData = Data((headBody.dropFirst().first ?? "").utf8)
        var body: [String: Any] = [:]
        if method == "POST", !bodyData.isEmpty {
            guard let parsed = try? JSONSerialization.jsonObject(with: bodyData) as? [String: Any] else {
                return response(400, ["ok": false, "error": "malformed_json"], origin: headers["origin"])
            }
            body = parsed
        }
        if method == "POST", ["/pair", "/proof"].contains(path), bodyData.isEmpty {
            return response(400, ["ok": false, "error": "malformed_json"], origin: headers["origin"])
        }
        let knownMethodsByPath: [String: Set<String>] = [
            "/health": ["GET"],
            "/status": ["GET"],
            "/pair": ["POST"],
            "/proof": ["POST"],
            "/session/end": ["POST"],
            "/shutdown": ["POST"],
        ]
        if let allowedMethods = knownMethodsByPath[path], !allowedMethods.contains(method), method != "OPTIONS" {
            return response(405, ["ok": false, "error": "method_not_allowed"], origin: headers["origin"])
        }
        do {
            switch (method, path) {
            case ("OPTIONS", _):
                return response(200, ["ok": true], origin: headers["origin"])
            case ("GET", "/health"):
                return response(200, ["ok": true, "daemon": "simurgh-daemon-macos", "version": "0.4.7", "platform": "macos"], origin: headers["origin"])
            case ("GET", "/status"):
                return response(200, PrivacyNormaliser.status(nodeIdHash: signer.identity.nodeIdHash, sessionActive: state.sessionActive, paired: state.paired, scan: signer.scanner.scan()), origin: headers["origin"])
            case ("POST", "/pair"):
                let session = body["session_id"] as? String ?? ""
                let exam = body["exam_id"] as? String ?? ""
                let challenge = body["challenge"] as? String ?? ""
                state.sessionId = session; state.examId = exam; state.paired = true
                return response(200, try signer.pair(sessionId: session, examId: exam, challenge: challenge), origin: headers["origin"])
            case ("POST", "/proof"):
                return response(200, try signer.proof(sessionId: body["session_id"] as? String ?? "", examId: body["exam_id"] as? String ?? "", sequence: body["sequence"] as? Int ?? 0, challenge: body["challenge"] as? String ?? ""), origin: headers["origin"])
            case ("POST", "/session/end"):
                state.sessionActive = false
                return response(200, ["ok": true, "session_active": false], origin: headers["origin"])
            case ("POST", "/shutdown"):
                DispatchQueue.global().asyncAfter(deadline: .now() + 0.1) {
                    Foundation.exit(0)
                }
                return response(200, ["ok": true, "shutdown": "requested"], origin: headers["origin"])
            default:
                return response(404, ["ok": false, "error": "not_found"], origin: headers["origin"])
            }
        } catch {
            return response(500, ["ok": false, "error": "signing_failed"], origin: headers["origin"])
        }
    }

    private func response(_ status: Int, _ json: [String: Any], origin: String?) -> Data {
        let body = jsonData(json)
        let reason = status == 200 ? "OK" : "Error"
        var headers = "HTTP/1.1 \(status) \(reason)\r\nContent-Type: application/json\r\nContent-Length: \(body.count)\r\nConnection: close\r\n"
        if let origin, config.allowedOrigins.contains(origin) {
            headers += "Access-Control-Allow-Origin: \(origin)\r\nVary: Origin\r\n"
            headers += "Access-Control-Allow-Headers: content-type,x-simurgh-local-client\r\n"
            headers += "Access-Control-Allow-Methods: GET,POST,OPTIONS\r\n"
        }
        headers += "\r\n"
        return Data(headers.utf8) + body
    }
}
