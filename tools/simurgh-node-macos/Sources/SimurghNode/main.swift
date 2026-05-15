import Foundation

enum CLIError: Error {
    case malformedKey(String)
    case missingSession
    case missingChallenge
    case unknownFlag(String)
    case unknownSubcommand(String)
}

enum CLIMode {
    case proof
    case pair
    case printKeyInfo
}

struct CLIOptions {
    var mode: CLIMode
    var sessionId: String
    var challenge: String?
    var keyPath: String
}

func parseArgs(_ args: [String]) throws -> CLIOptions {
    var sessionId: String? = ProcessInfo.processInfo.environment["SIMURGH_SESSION_ID"]
    var keyPath: String = ProcessInfo.processInfo.environment["SIMURGH_NODE_KEY_PATH"]
        ?? (NSHomeDirectory() + "/.simurgh/node-key")
    var challenge: String? = nil
    var mode: CLIMode = .proof

    var i = 1
    if args.count > 1 && !args[1].hasPrefix("-") {
        switch args[1] {
        case "proof": mode = .proof; i = 2
        case "pair":  mode = .pair;  i = 2
        default: throw CLIError.unknownSubcommand(args[1])
        }
    }

    while i < args.count {
        let a = args[i]
        switch a {
        case "--session":
            i += 1
            guard i < args.count else { throw CLIError.unknownFlag(a) }
            sessionId = args[i]
        case "--challenge":
            i += 1
            guard i < args.count else { throw CLIError.unknownFlag(a) }
            challenge = args[i]
        case "--key-path":
            i += 1
            guard i < args.count else { throw CLIError.unknownFlag(a) }
            keyPath = args[i]
        case "--print-key-info":
            mode = .printKeyInfo
        case "--help", "-h":
            printUsage()
            exit(0)
        default:
            throw CLIError.unknownFlag(a)
        }
        i += 1
    }

    if mode != .printKeyInfo, sessionId == nil {
        throw CLIError.missingSession
    }
    if mode == .pair, (challenge == nil || challenge!.isEmpty) {
        throw CLIError.missingChallenge
    }
    return CLIOptions(mode: mode, sessionId: sessionId ?? "", challenge: challenge, keyPath: keyPath)
}

func printUsage() {
    let msg = """
    Usage: swift run SimurghNode [proof|pair] [options]

      proof                    Emit a Stage 2 integrity proof (default if no subcommand)
      pair                     Emit a Stage 2.2 pairing payload signed against --challenge

    Options:
      --session <ID>           Session ID (or env SIMURGH_SESSION_ID)
      --challenge <BASE64>     32-byte server challenge (pair mode only)
      --key-path <path>        Override key file location (default ~/.simurgh/node-key)
      --print-key-info         Print { node_id_hash, node_public_key, key_path } and exit
      --help                   Show usage
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
} catch CLIError.missingChallenge {
    stderr("error: pair mode requires --challenge")
    exit(4)
} catch CLIError.unknownSubcommand(let s) {
    stderr("error: unknown subcommand: \(s)")
    exit(64)
} catch CLIError.unknownFlag(let f) {
    stderr("error: unknown flag: \(f)")
    exit(64)
} catch {
    stderr("error: \(error)")
    exit(1)
}

do {
    let identity = try NodeIdentity.loadOrCreate(at: options.keyPath)

    switch options.mode {
    case .printKeyInfo:
        let info: [String: String] = [
            "node_id_hash": identity.nodeIdHashHex,
            "node_public_key": identity.publicKeyBase64,
            "key_path": options.keyPath,
        ]
        let data = try JSONSerialization.data(withJSONObject: info, options: [.prettyPrinted, .sortedKeys])
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
        exit(0)

    case .proof:
        let envelope = ProofEnvelope.build(sessionId: options.sessionId, identity: identity)
        let signed = try ProofSigner.signAndEncode(envelope: envelope, identity: identity)
        FileHandle.standardOutput.write(signed)
        FileHandle.standardOutput.write(Data("\n".utf8))
        exit(0)

    case .pair:
        let envelope = PairingEnvelope.build(
            sessionId: options.sessionId,
            challenge: options.challenge!,
            identity: identity,
            timestamp: currentIso8601()
        )
        let signed = try PairingSigner.signAndEncode(envelope: envelope, identity: identity)
        FileHandle.standardOutput.write(signed)
        FileHandle.standardOutput.write(Data("\n".utf8))
        exit(0)
    }
} catch CLIError.malformedKey(let why) {
    stderr("error: key file at \(options.keyPath) is malformed: \(why)")
    exit(2)
} catch {
    stderr("error: \(error)")
    exit(1)
}
