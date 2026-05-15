import Foundation

let config = DaemonConfig.parse(CommandLine.arguments)

do {
    let identity = try KeychainIdentity.loadOrCreate()
    let state = SessionState()
    let signer = ProofSigner(identity: identity)
    let server = try LocalHttpServer(config: config, state: state, signer: signer)
    FileHandle.standardError.write(Data("simurgh-daemon-macos listening on 127.0.0.1:\(config.port)\n".utf8))
    server.start()
} catch {
    FileHandle.standardError.write(Data("error: \(error)\n".utf8))
    exit(1)
}
