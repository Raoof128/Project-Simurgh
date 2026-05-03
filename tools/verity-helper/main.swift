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

func windowListOpts() -> CGWindowListOption {
    return CGWindowListOption(rawValue:
        UInt32(kCGWindowListOptionOnScreenOnly) | UInt32(kCGWindowListExcludeDesktopElements))
}

func scanHostileWindows(infoList: [[String: Any]], verbose: Bool) -> [HostileWindow] {
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

// ───────── pixel-forensic computation (paper §III-B display fidelity) ─────────
struct ForensicSnapshot: Codable {
    let display_width: Int
    let display_height: Int
    let display_pixels: Int
    let invisible_pixels: Int
    let fidelity_deficit_pct: Double
    let visible_window_count: Int
    let hostile_window_count: Int
}

func computeForensic(hostile: [HostileWindow], allInfo: [[String: Any]]) -> ForensicSnapshot {
    let dispId = CGMainDisplayID()
    let dispW  = Int(CGDisplayPixelsWide(dispId))
    let dispH  = Int(CGDisplayPixelsHigh(dispId))
    let dispPx = dispW * dispH

    var invisiblePx = 0
    var visibleCount = 0
    let me = ProcessInfo.processInfo.processIdentifier

    // re-walk the window list to compute per-hostile pixel area
    let hostilePids = Set(hostile.map { Int($0.pid) })
    for info in allInfo {
        guard let pid = info[kCGWindowOwnerPID as String] as? Int32, pid != me else { continue }
        guard let layer = info[kCGWindowLayer as String] as? Int, layer >= 0 && layer <= 100 else { continue }
        if let b = info[kCGWindowBounds as String] as? [String: CGFloat] {
            let w = Int(b["Width"] ?? 0), h = Int(b["Height"] ?? 0)
            if w >= 40 && h >= 40 {
                visibleCount += 1
                if hostilePids.contains(Int(pid)) {
                    invisiblePx += w * h
                }
            }
        }
    }
    let pct = dispPx > 0 ? (Double(invisiblePx) / Double(dispPx)) * 100.0 : 0.0
    return ForensicSnapshot(
        display_width: dispW,
        display_height: dispH,
        display_pixels: dispPx,
        invisible_pixels: invisiblePx,
        fidelity_deficit_pct: (pct * 100).rounded() / 100,
        visible_window_count: visibleCount,
        hostile_window_count: hostile.count
    )
}

// ───────── network ─────────
func reportToServer(_ hostile: [HostileWindow], forensic: ForensicSnapshot, args: Args) {
    let body: [String: Any] = [
        "sessionId": args.sessionId,
        "helper":    "verity-helper-mac/0.2",
        "hostile":   hostile.map { ["pid": $0.pid, "name": $0.name, "type": $0.type, "since": $0.since] },
        "forensic":  [
            "display_width":         forensic.display_width,
            "display_height":        forensic.display_height,
            "display_pixels":        forensic.display_pixels,
            "invisible_pixels":      forensic.invisible_pixels,
            "fidelity_deficit_pct":  forensic.fidelity_deficit_pct,
            "visible_window_count":  forensic.visible_window_count,
            "hostile_window_count":  forensic.hostile_window_count,
        ],
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

// ───────── Screen Recording permission preflight ─────────
//
// Without Screen Recording permission, CGWindowListCreateImage returns a
// transparent buffer for every window the helper doesn't own — meaning the
// helper would flag every window as hostile (the ~0% nonZero check trips).
// Detect this state at startup and refuse to run rather than spam the
// dashboard with false positives.
//
// We probe by sampling the desktop wallpaper region with CGWindowListCreateImage
// and counting non-zero pixels in the captured frame. With permission, the
// wallpaper has many non-zero pixels. Without it, the buffer is empty.
func hasScreenRecordingPermission() -> Bool {
    let dispId = CGMainDisplayID()
    let bounds = CGRect(x: 0, y: 0,
                        width: max(64, Int(CGDisplayPixelsWide(dispId))),
                        height: max(64, Int(CGDisplayPixelsHigh(dispId))))
    let listOpts = CGWindowListOption(rawValue: UInt32(kCGWindowListOptionOnScreenBelowWindow))
    guard let img = CGWindowListCreateImage(bounds, listOpts, kCGNullWindowID, [.bestResolution]) else {
        return false
    }
    guard let prov = img.dataProvider, let data = prov.data, let bytes = CFDataGetBytePtr(data) else {
        return false
    }
    let bpr = img.bytesPerRow
    let bpp = img.bitsPerPixel / 8
    if bpp < 4 { return true } // can't tell; assume OK
    var nonZero = 0
    let samples = 24
    let w = img.width, h = img.height
    if w == 0 || h == 0 { return false }
    for i in 0..<samples {
        let x = (w * i) / samples
        let y = (h * (i % 7 + 1)) / 8
        let off = y * bpr + x * bpp
        if bytes[off] > 0 || bytes[off+1] > 0 || bytes[off+2] > 0 || bytes[off+3] > 0 {
            nonZero += 1
        }
    }
    return nonZero >= 3
}

// ───────── main loop ─────────
let args = parseArgs()
print("[verity-helper] starting · session=\(args.sessionId) · server=\(args.server) · interval=\(args.intervalMs)ms")

if !hasScreenRecordingPermission() {
    FileHandle.standardError.write(Data("""
        [verity-helper] ⚠ Screen Recording permission appears to be denied.
        [verity-helper] Without it, CGWindowListCreateImage returns empty frames for every
        [verity-helper] window — the integrity probe would flag everything as hostile.
        [verity-helper]
        [verity-helper] Grant access in System Settings → Privacy & Security → Screen
        [verity-helper] Recording (toggle 'verity-helper' on, then re-launch).
        [verity-helper]
        [verity-helper] Re-running with --skip-permission-check is not recommended; aborting.
        \n
        """.utf8))
    exit(77)
}

print("[verity-helper] Screen Recording permission OK · entering scan loop")

while true {
    let allInfo = (CGWindowListCopyWindowInfo(windowListOpts(), kCGNullWindowID) as? [[String: Any]]) ?? []
    let hostile = scanHostileWindows(infoList: allInfo, verbose: args.verbose)
    let forensic = computeForensic(hostile: hostile, allInfo: allInfo)
    reportToServer(hostile, forensic: forensic, args: args)
    if hostile.isEmpty {
        if args.verbose { print("[verity-helper] clean — no capture-excluded windows · fidelity-deficit \(forensic.fidelity_deficit_pct)%") }
    } else {
        print("[verity-helper] ⚠ \(hostile.count) capture-excluded window(s) · fidelity-deficit \(forensic.fidelity_deficit_pct)% (\(forensic.invisible_pixels) px) · " +
              hostile.map { "\($0.name)[\($0.pid)]" }.joined(separator: ", "))
    }
    Thread.sleep(forTimeInterval: Double(args.intervalMs) / 1000.0)
}
