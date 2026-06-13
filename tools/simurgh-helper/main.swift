// SPDX-License-Identifier: AGPL-3.0-or-later
// simurgh-helper — Countermeasure A from Abedini, 2026 §VI-A
//
// Detects on-screen windows that are excluded from screen capture
// (NSWindow.SharingType.none / WDA_EXCLUDEFROMCAPTURE on Windows) and
// reports them to the Simurgh server every <interval> ms.
//
// DETECTION STRATEGY (ScreenCaptureKit, macOS 14+)
//
// We combine two signals:
//
//   (1) Diff: windows in CGWindowListCopyWindowInfo (on-screen) but NOT in
//       SCShareableContent.windows. macOS sometimes filters capture-excluded
//       windows out of the shareable list — when that happens, a window
//       being on-screen but absent from SCK is a strong hostile signal.
//
//   (2) Probe: for every window that IS in SCShareableContent, ask
//       SCScreenshotManager.captureImage(...) for the window's pixels.
//       A capture-excluded window comes back as a transparent image with
//       all-zero alpha. We sample 5 probe pixels — if every one is zero,
//       the window is hostile.
//
// The probe is the load-bearing test (signal 2). The diff is a defence-in-
// depth backstop in case macOS evolves to hide such windows entirely.
//
// SCScreenshotManager is the Apple-blessed replacement for
// CGWindowListCreateImage (which Apple obsoleted in macOS 15).
//
// Privacy: the helper does NOT capture user content. It only reads
// per-window metadata (PID, owner name, layer, bounds, capturability) and
// 5 probe pixels per suspect window strictly to test transparency.
//
// Build:
//     make             # produces ./simurgh-helper
//     make sign        # ad-hoc sign with the hardened-runtime entitlements
//
// Run:
//     export SIMURGH_HELPER_SECRET=$(openssl rand -hex 32)
//     ./simurgh-helper --session sess-xxxxxxxx
//     ./simurgh-helper --session sess-xxxxxxxx --server http://localhost:3030 --secret "$SIMURGH_HELPER_SECRET"

import Foundation
import CoreGraphics
import AppKit
import ScreenCaptureKit

// ───────── argument parsing ─────────
struct Args {
    var sessionId: String = ""
    var server: String   = "http://localhost:3030"
    // No default secret — refusing to default keeps the helper from silently
    // authenticating with a publicly known string.
    var secret: String   = ProcessInfo.processInfo.environment["SIMURGH_HELPER_SECRET"] ?? ""
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
                simurgh-helper — Countermeasure A native agent
                Usage: simurgh-helper --session <sessionId> [--server URL] [--secret S] [--interval ms]

                Reports any on-screen window the OS hides from screen capture
                (NSWindow.SharingType.none) to the Simurgh server every <interval> ms.
                Detection: SCShareableContent diff + SCScreenshotManager pixel probe.
                """)
            exit(0)
        default: break
        }
    }
    if a.sessionId.isEmpty {
        FileHandle.standardError.write(Data("error: --session required (the sessionId from the Simurgh browser tab)\n".utf8))
        exit(64)
    }
    if a.secret.isEmpty {
        FileHandle.standardError.write(Data(
            "error: --secret or SIMURGH_HELPER_SECRET required. Use the same value the server is started with.\n".utf8
        ))
        exit(64)
    }
    return a
}

// ───────── data shapes ─────────
struct HostileWindow {
    let wid: CGWindowID       // internal; not serialised
    let pid: Int32
    let name: String
    let type: String
    let since: Int64
    let pixelArea: Int
}

struct ForensicSnapshot: Codable {
    let display_width: Int
    let display_height: Int
    let display_pixels: Int
    let invisible_pixels: Int
    let fidelity_deficit_pct: Double
    let visible_window_count: Int
    let hostile_window_count: Int
}

let SYSTEM_OWNERS: Set<String> = [
    "WindowServer", "Dock", "Window Manager",
    "Control Centre", "ControlCenter",
    "SystemUIServer", "loginwindow",
    "Notification Centre", "NotificationCenter",
    "Spotlight", "TextInputMenuAgent", "Wallpaper",
]

// ───────── pixel probe via SCScreenshotManager ─────────
// Returns true if the captured image of `scWindow` is all-transparent /
// zero-alpha across all probe samples (i.e. capture-excluded).
@available(macOS 14.0, *)
func isWindowExcluded(scWindow: SCWindow) async -> Bool {
    let filter = SCContentFilter(desktopIndependentWindow: scWindow)
    let cfg = SCStreamConfiguration()
    let frame = scWindow.frame
    cfg.width  = max(64, Int(frame.width))
    cfg.height = max(64, Int(frame.height))
    cfg.showsCursor = false
    cfg.scalesToFit = false
    cfg.pixelFormat = kCVPixelFormatType_32BGRA
    cfg.queueDepth = 3

    let img: CGImage
    do {
        img = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: cfg)
    } catch {
        // Capture failed outright — strongest possible "excluded" signal.
        return true
    }

    let w = img.width, h = img.height
    if w == 0 || h == 0 { return true }
    guard let dataProv = img.dataProvider, let data = dataProv.data,
          let bytes = CFDataGetBytePtr(data) else { return true }
    let bpr = img.bytesPerRow
    let bpp = img.bitsPerPixel / 8
    if bpp < 4 { return false }   // can't tell — assume capturable

    // Sample 5 probe points. A capture-excluded window returns a buffer of
    // the right dimensions but with all bytes zero.
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
        let bb = bytes[off], gg = bytes[off+1], rr = bytes[off+2], aa = bytes[off+3]
        if aa > 0 || rr > 0 || gg > 0 || bb > 0 { nonZero += 1 }
    }
    return nonZero == 0
}

// ───────── scan ─────────
@available(macOS 14.0, *)
func scanOnce(args: Args) async -> (hostile: [HostileWindow], forensic: ForensicSnapshot)? {
    // SCShareableContent: every window the OS will surface to a capture pipeline.
    let content: SCShareableContent
    do {
        content = try await SCShareableContent.excludingDesktopWindows(true, onScreenWindowsOnly: true)
    } catch {
        if args.verbose { print("[helper] SCK error: \(error.localizedDescription)") }
        return nil
    }

    // Map wid → SCWindow for the probe phase.
    var scByWid: [CGWindowID: SCWindow] = [:]
    for w in content.windows { scByWid[w.windowID] = w }

    // CGWindowList: every window actually on-screen (CGWindowList still
    // works in 15+ — only CGWindowListCreateImage was obsoleted).
    let listOpts: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
    let allInfo = (CGWindowListCopyWindowInfo(listOpts, kCGNullWindowID) as? [[String: Any]]) ?? []

    let me = ProcessInfo.processInfo.processIdentifier
    let now = Int64(Date().timeIntervalSince1970 * 1000)

    struct Candidate {
        let wid: CGWindowID
        let pid: Int32
        let name: String
        let layer: Int
        let rect: CGRect
        let scWindow: SCWindow?       // nil → window is in CGWindowList but not SCShareableContent
    }

    var candidates: [Candidate] = []
    var visibleCount = 0
    for info in allInfo {
        guard let wid = info[kCGWindowNumber as String] as? CGWindowID,
              let pid = info[kCGWindowOwnerPID as String] as? Int32,
              pid != me,
              let layer = info[kCGWindowLayer as String] as? Int else { continue }
        if layer < 0 || layer > 100 { continue }
        let owner = (info[kCGWindowOwnerName as String] as? String) ?? "unknown"
        if SYSTEM_OWNERS.contains(owner) { continue }
        var rect = CGRect.zero
        if let b = info[kCGWindowBounds as String] as? [String: CGFloat] {
            rect = CGRect(x: b["X"] ?? 0, y: b["Y"] ?? 0,
                          width: b["Width"] ?? 0, height: b["Height"] ?? 0)
        }
        if rect.width < 40 || rect.height < 40 { continue }
        visibleCount += 1
        candidates.append(Candidate(
            wid: wid, pid: pid, name: owner, layer: layer, rect: rect,
            scWindow: scByWid[wid]
        ))
    }

    // Probe phase — run all SCScreenshotManager probes in parallel via
    // a TaskGroup so a slow window doesn't stall the rest.
    let probeResults: [Bool] = await withTaskGroup(of: (Int, Bool).self) { group in
        for (i, c) in candidates.enumerated() {
            group.addTask {
                // Backstop signal: window is on-screen but absent from
                // SCShareableContent → treat as hostile without probing.
                guard let sc = c.scWindow else { return (i, true) }
                let excluded = await isWindowExcluded(scWindow: sc)
                return (i, excluded)
            }
        }
        var out = [Bool](repeating: false, count: candidates.count)
        for await (i, excluded) in group { out[i] = excluded }
        return out
    }

    // Double-check: if the first probe trips, run it once more after a short
    // settle to filter transient SCK failures on legitimate windows.
    var firstHits: [Int] = []
    for (i, hit) in probeResults.enumerated() where hit { firstHits.append(i) }

    var confirmed = [Bool](repeating: false, count: candidates.count)
    if !firstHits.isEmpty {
        try? await Task.sleep(nanoseconds: 50_000_000)   // 50ms
        let confirmedResults: [(Int, Bool)] = await withTaskGroup(of: (Int, Bool).self) { group in
            for i in firstHits {
                group.addTask {
                    guard let sc = candidates[i].scWindow else { return (i, true) }
                    return (i, await isWindowExcluded(scWindow: sc))
                }
            }
            var out: [(Int, Bool)] = []
            for await r in group { out.append(r) }
            return out
        }
        for (i, hit) in confirmedResults { confirmed[i] = hit }
    }

    var hostile: [HostileWindow] = []
    for (i, c) in candidates.enumerated() where confirmed[i] {
        if args.verbose {
            print("[helper] HOSTILE wid=\(c.wid) pid=\(c.pid) name=\(c.name) layer=\(c.layer) bounds=\(c.rect) inSCK=\(c.scWindow != nil)")
        }
        hostile.append(HostileWindow(
            wid: c.wid, pid: c.pid, name: c.name,
            type: c.scWindow == nil
                  ? "absent from SCShareableContent / capture-excluded"
                  : "sharingType=.none / capture-excluded",
            since: now,
            pixelArea: Int(c.rect.width) * Int(c.rect.height)
        ))
    }

    let dispId  = CGMainDisplayID()
    let dispW   = Int(CGDisplayPixelsWide(dispId))
    let dispH   = Int(CGDisplayPixelsHigh(dispId))
    let dispPx  = dispW * dispH
    let invisiblePx = hostile.reduce(0) { $0 + $1.pixelArea }
    let pct = dispPx > 0 ? (Double(invisiblePx) / Double(dispPx)) * 100.0 : 0.0
    let forensic = ForensicSnapshot(
        display_width: dispW,
        display_height: dispH,
        display_pixels: dispPx,
        invisible_pixels: invisiblePx,
        fidelity_deficit_pct: (pct * 100).rounded() / 100,
        visible_window_count: visibleCount,
        hostile_window_count: hostile.count
    )
    return (hostile, forensic)
}

// ───────── network ─────────
func reportToServer(_ hostile: [HostileWindow], forensic: ForensicSnapshot, args: Args) {
    let body: [String: Any] = [
        "sessionId": args.sessionId,
        "helper":    "simurgh-helper-mac/0.3-sck",
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
    req.setValue(args.secret, forHTTPHeaderField: "x-simurgh-helper-secret")
    req.httpBody = data
    // Fire-and-forget — do NOT block the scan loop on the network round-trip.
    URLSession.shared.dataTask(with: req) { _, resp, err in
        if args.verbose {
            if let err = err { print("[helper] post error: \(err.localizedDescription)") }
            else if let r = resp as? HTTPURLResponse, r.statusCode != 200 {
                print("[helper] post status=\(r.statusCode)")
            }
        }
    }.resume()
}

// ───────── main loop ─────────
@available(macOS 14.0, *)
@main
struct SimurghHelper {
    static func main() async {
        // Force unbuffered stdout so log lines flush promptly when the helper
        // is run from a parent process / pipe.
        setbuf(stdout, nil)

        let args = parseArgs()
        print("[simurgh-helper] starting · session=\(args.sessionId) · server=\(args.server) · interval=\(args.intervalMs)ms · backend=ScreenCaptureKit")

        // Preflight: SCShareableContent throws if Screen Recording is denied.
        // The first call also triggers the system permission prompt on a
        // fresh install, so we let it run before the main loop.
        do {
            _ = try await SCShareableContent.excludingDesktopWindows(true, onScreenWindowsOnly: true)
        } catch {
            FileHandle.standardError.write(Data("""
                [simurgh-helper] ⚠ Screen Recording permission denied.
                [simurgh-helper] reason: \(error.localizedDescription)
                [simurgh-helper]
                [simurgh-helper] Grant access in System Settings → Privacy & Security → Screen
                [simurgh-helper] Recording (toggle 'simurgh-helper' on, then re-launch).

                """.utf8))
            exit(77)
        }
        print("[simurgh-helper] Screen Recording permission OK · entering scan loop")

        while true {
            if let (hostile, forensic) = await scanOnce(args: args) {
                reportToServer(hostile, forensic: forensic, args: args)
                if hostile.isEmpty {
                    if args.verbose {
                        print("[simurgh-helper] clean — no capture-excluded windows · fidelity-deficit \(forensic.fidelity_deficit_pct)%")
                    }
                } else {
                    print("[simurgh-helper] ⚠ \(hostile.count) capture-excluded window(s) · fidelity-deficit \(forensic.fidelity_deficit_pct)% (\(forensic.invisible_pixels) px) · " +
                          hostile.map { "\($0.name)[\($0.pid)]" }.joined(separator: ", "))
                }
            }
            try? await Task.sleep(nanoseconds: UInt64(args.intervalMs) * 1_000_000)
        }
    }
}
