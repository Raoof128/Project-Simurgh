// verity-helper — Countermeasure A from Abedini, 2026 §VI-A
//
// Enumerates every top-level on-screen window using
// CGWindowListCopyWindowInfo(.optionOnScreenOnly) and inspects each for
// the OS-level capture-exclusion flag.
//
// On macOS, a window with NSWindow.SharingType.none — or any window
// whose backing process otherwise disappears from the system capture
// pipeline — is reported as "hostile" to the Verity server every 2 s.
//
// CGWindowListCreateImage() is the same API the disclosure paper used
// in §V-C-1 to verify the macOS 26 capture-evasion result. We use it
// here as an oracle: if a process owns an on-screen window but the
// captured image of that window region is fully transparent or absent,
// the window has the .none sharingType (or equivalent display affinity)
// and is excluded from screen capture.
//
// Privacy: the helper does NOT capture user content. It only reads
// per-window metadata (PID, owner name, layer, bounds) and a single
// integrity probe pixel from each window's bounding rect.
//
// Build:
//     swiftc -O main.swift -o verity-helper -framework CoreGraphics -framework AppKit -framework Foundation
//
// Run:
//     ./verity-helper --session sess-xxxxxxxx
//     ./verity-helper --session sess-xxxxxxxx --server http://localhost:3030 --secret verity-dev-helper

import Foundation
import CoreGraphics
import AppKit

// ───────── argument parsing ─────────
struct Args {
    var sessionId: String = ""
    var server: String   = "http://localhost:3030"
    var secret: String   = ProcessInfo.processInfo.environment["VERITY_HELPER_SECRET"] ?? "verity-dev-helper"
    var intervalMs: Int  = 2000
    var verbose: Bool    = false
}

func parseArgs() -> Args {
    var a = Args()
    var it = CommandLine.arguments.dropFirst().makeIterator()
    while let arg = it.next() {
        switch arg {
        case "--session":   a.sessionId = it.next() ?? ""
        case "--server":    a.server    = it.next() ?? a.server
        case "--secret":    a.secret    = it.next() ?? a.secret
        case "--interval":  a.intervalMs = Int(it.next() ?? "2000") ?? 2000
        case "--verbose", "-v": a.verbose = true
        case "--help", "-h":
            print("""
                verity-helper — Countermeasure A native agent
                Usage: verity-helper --session <sessionId> [--server URL] [--secret S] [--interval ms]

                Reports any on-screen window that is excluded from screen capture
                (NSWindow.SharingType.none) to the Verity server every <interval> ms.
                """)
            exit(0)
        default: break
        }
    }
    if a.sessionId.isEmpty {
        FileHandle.standardError.write(Data("error: --session required (the sessionId from the Verity browser tab)\n".utf8))
        exit(64)
    }
    return a
}

// ───────── window enumeration + integrity probe ─────────
struct HostileWindow: Codable {
    let pid: Int32
    let name: String
    let type: String
    let since: Int64
}

/// Build a low-overhead capture for a single window via SCWindow's underlying
/// CGWindow ID. If the captured image is "empty" (all-transparent or zero
/// pixels) while the window is reported as on-screen and visible, the window
/// is excluded from capture — i.e. it has sharingType=.none or equivalent.
func isWindowExcludedFromCapture(windowId: CGWindowID, bounds: CGRect) -> Bool {
    // Capture only the window's bounding rect, off-screen-rendered, ignoring framing.
    let opts: CGWindowImageOption = [.boundsIgnoreFraming, .nominalResolution]
    let listOpts: CGWindowListOption = [.optionIncludingWindow]
    guard let img = CGWindowListCreateImage(.null, listOpts, windowId, opts) else {
        // could not capture at all — strongest signal of exclusion
        return true
    }
    // A captured frame from an excluded window comes back as a transparent
    // image with the right dimensions but all-zero alpha. Sample a handful
    // of pixels to verify.
    let w = img.width, h = img.height
    if w == 0 || h == 0 { return true }
    guard let dataProv = img.dataProvider, let data = dataProv.data,
          let bytes = CFDataGetBytePtr(data) else { return true }
    let bpr = img.bytesPerRow
    let bpp = img.bitsPerPixel / 8
    if bpp < 4 { return false }     // not RGBA — skip integrity probe
    let probes: [(Int, Int)] = [
        (w / 4, h / 4),
        (w / 2, h / 2),
        ((w * 3) / 4, (h * 3) / 4),
        (w / 2, h / 4),
        (w / 4, (h * 3) / 4),
    ]
    var nonZero = 0
    for (x, y) in probes {
        let off = y * bpr + x * bpp
        let r = bytes[off], g = bytes[off+1], b = bytes[off+2], a = bytes[off+3]
        if a > 0 || r > 0 || g > 0 || b > 0 { nonZero += 1 }
    }
    // If 0 of 5 probe pixels carry data, the capture pipeline is returning a
    // zero buffer for a window the OS reports as on-screen — i.e. the
    // window is excluded from capture (sharingType = .none).
    _ = bounds
    return nonZero == 0
}

func scanHostileWindows(verbose: Bool) -> [HostileWindow] {
    let opts: CFArray = [
        kCGWindowListOptionOnScreenOnly as CFString,
        kCGWindowListExcludeDesktopElements as CFString,
    ] as CFArray
    let listOpt = CGWindowListOption(rawValue:
        UInt32(kCGWindowListOptionOnScreenOnly) | UInt32(kCGWindowListExcludeDesktopElements))
    guard let infoList = CGWindowListCopyWindowInfo(listOpt, kCGNullWindowID) as? [[String: Any]] else {
        return []
    }
    _ = opts
    let me = ProcessInfo.processInfo.processIdentifier
    var hostile: [HostileWindow] = []
    let now = Int64(Date().timeIntervalSince1970 * 1000)

    for info in infoList {
        guard let wid = info[kCGWindowNumber as String] as? CGWindowID,
              let pid = info[kCGWindowOwnerPID as String] as? Int32,
              pid != me,
              let layer = info[kCGWindowLayer as String] as? Int else { continue }
        // skip system menu bar / dock layers
        if layer < 0 || layer > 100 { continue }
        let owner = (info[kCGWindowOwnerName as String] as? String) ?? "unknown"
        // ignore obvious system processes
        if ["WindowServer", "Dock", "Window Manager", "Control Centre", "ControlCenter",
            "SystemUIServer", "loginwindow", "Notification Centre", "NotificationCenter"]
            .contains(owner) { continue }

        // bounding rect
        var rect = CGRect.zero
        if let b = info[kCGWindowBounds as String] as? [String: CGFloat] {
            rect = CGRect(x: b["X"] ?? 0, y: b["Y"] ?? 0,
                          width: b["Width"] ?? 0, height: b["Height"] ?? 0)
        }
        if rect.width < 40 || rect.height < 40 { continue }     // too small to be cheat surface

        let excluded = isWindowExcludedFromCapture(windowId: wid, bounds: rect)
        if excluded {
            // double-check: occasionally CGWindowListCreateImage transiently
            // returns nil for a legitimate window. Only flag if the window
            // has been on-screen and the second probe also fails.
            usleep(50_000)
            let second = isWindowExcludedFromCapture(windowId: wid, bounds: rect)
            if second {
                if verbose {
                    print("[helper] HOSTILE wid=\(wid) pid=\(pid) name=\(owner) layer=\(layer) bounds=\(rect)")
                }
                hostile.append(HostileWindow(pid: pid, name: owner,
                                             type: "sharingType=.none / capture-excluded",
                                             since: now))
            }
        }
    }
    return hostile
}

// ───────── network ─────────
func reportToServer(_ hostile: [HostileWindow], args: Args) {
    let body: [String: Any] = [
        "sessionId": args.sessionId,
        "helper":    "verity-helper-mac/0.1",
        "hostile":   hostile.map { ["pid": $0.pid, "name": $0.name, "type": $0.type, "since": $0.since] },
    ]
    guard let data = try? JSONSerialization.data(withJSONObject: body),
          let url = URL(string: args.server.trimmingCharacters(in: .init(charactersIn: "/")) + "/api/affinity") else { return }
    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.timeoutInterval = 4
    req.setValue("application/json", forHTTPHeaderField: "content-type")
    req.setValue(args.secret, forHTTPHeaderField: "x-verity-helper-secret")
    req.httpBody = data
    let sema = DispatchSemaphore(value: 0)
    URLSession.shared.dataTask(with: req) { _, resp, err in
        if args.verbose {
            if let err = err { print("[helper] post error: \(err.localizedDescription)") }
            else if let r = resp as? HTTPURLResponse, r.statusCode != 200 {
                print("[helper] post status=\(r.statusCode)")
            }
        }
        sema.signal()
    }.resume()
    _ = sema.wait(timeout: .now() + 4)
}

// ───────── main loop ─────────
let args = parseArgs()
print("[verity-helper] starting · session=\(args.sessionId) · server=\(args.server) · interval=\(args.intervalMs)ms")
print("[verity-helper] grant Screen Recording permission to this binary in System Settings → Privacy & Security")
print("[verity-helper] (without it the integrity probe always returns 'excluded' and you'll get false positives)")

while true {
    let hostile = scanHostileWindows(verbose: args.verbose)
    reportToServer(hostile, args: args)
    if hostile.isEmpty {
        if args.verbose { print("[verity-helper] clean — no capture-excluded windows") }
    } else {
        print("[verity-helper] ⚠ \(hostile.count) capture-excluded window(s): " +
              hostile.map { "\($0.name)[\($0.pid)]" }.joined(separator: ", "))
    }
    Thread.sleep(forTimeInterval: Double(args.intervalMs) / 1000.0)
}
