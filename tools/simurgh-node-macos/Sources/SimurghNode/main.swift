import Foundation

// CLI entry — argument parsing + dispatch.
//
// This file stays small. Keypair lifecycle lives in NodeIdentity.swift.
// Canonical-JSON + signing lives in ProofSigner.swift.
// Envelope shape lives in ProofEnvelope.swift.

enum CLIError: Error {
    case malformedKey(String)
    case missingSession
    case unknownFlag(String)
}

struct CLIOptions {
    var sessionId: String
    var keyPath: String
    var printKeyInfo: Bool
}

func parseArgs(_ args: [String]) throws -> CLIOptions {
    var sessionId: String? = ProcessInfo.processInfo.environment["SIMURGH_SESSION_ID"]
    var keyPath: String = ProcessInfo.processInfo.environment["SIMURGH_NODE_KEY_PATH"]
        ?? (NSHomeDirectory() + "/.simurgh/node-key")
    var printKeyInfo = false

    var i = 1
    while i < args.count {
        let a = args[i]
        switch a {
        case "--session":
            i += 1
            guard i < args.count else { throw CLIError.unknownFlag(a) }
            sessionId = args[i]
        case "--key-path":
            i += 1
            guard i < args.count else { throw CLIError.unknownFlag(a) }
            keyPath = args[i]
        case "--print-key-info":
            printKeyInfo = true
        case "--help", "-h":
            printUsage()
            exit(0)
        default:
            throw CLIError.unknownFlag(a)
        }
        i += 1
    }

    if !printKeyInfo, sessionId == nil {
        throw CLIError.missingSession
    }
    return CLIOptions(sessionId: sessionId ?? "", keyPath: keyPath, printKeyInfo: printKeyInfo)
}

func printUsage() {
    let msg = """
    Usage: swift run SimurghNode [options]

      --session <ID>       Session ID (or env SIMURGH_SESSION_ID)
      --key-path <path>    Override key file location (default ~/.simurgh/node-key)
      --print-key-info     Print { node_id_hash, node_public_key, key_path }
      --help               Show usage
    """
    FileHandle.standardError.write(Data((msg + "\n").utf8))
}

func stderr(_ s: String) {
    FileHandle.standardError.write(Data((s + "\n").utf8))
}

let arguments = CommandLine.arguments
let options: CLIOptions
do {
    options = try parseArgs(arguments)
} catch CLIError.missingSession {
    stderr("error: --session is required (or set SIMURGH_SESSION_ID)")
    exit(3)
} catch CLIError.unknownFlag(let f) {
    stderr("error: unknown flag: \(f)")
    exit(64)
} catch {
    stderr("error: \(error)")
    exit(1)
}

do {
    let identity = try NodeIdentity.loadOrCreate(at: options.keyPath)

    if options.printKeyInfo {
        let info: [String: String] = [
            "node_id_hash": identity.nodeIdHashHex,
            "node_public_key": identity.publicKeyBase64,
            "key_path": options.keyPath,
        ]
        let data = try JSONSerialization.data(withJSONObject: info, options: [.prettyPrinted, .sortedKeys])
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
        exit(0)
    }

    let envelope = ProofEnvelope.build(sessionId: options.sessionId, identity: identity)
    let signed = try ProofSigner.signAndEncode(envelope: envelope, identity: identity)
    FileHandle.standardOutput.write(signed)
    FileHandle.standardOutput.write(Data("\n".utf8))
    exit(0)
} catch CLIError.malformedKey(let why) {
    stderr("error: key file at \(options.keyPath) is malformed: \(why)")
    exit(2)
} catch {
    stderr("error: \(error)")
    exit(1)
}
