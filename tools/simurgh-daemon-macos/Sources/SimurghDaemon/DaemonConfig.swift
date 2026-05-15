import Foundation

struct DaemonConfig {
    let port: UInt16
    let allowedOrigins: Set<String>

    static func parse(_ args: [String]) -> DaemonConfig {
        var port = UInt16(ProcessInfo.processInfo.environment["SIMURGH_DAEMON_PORT"] ?? "") ?? 3031
        var origins: Set<String> = ["http://localhost:3030"]
        var i = 1
        while i < args.count {
            switch args[i] {
            case "--port":
                i += 1
                if i < args.count, let p = UInt16(args[i]) { port = p }
            case "--allowed-origin":
                i += 1
                if i < args.count { origins.insert(args[i]) }
            default:
                break
            }
            i += 1
        }
        return DaemonConfig(port: port, allowedOrigins: origins)
    }
}
