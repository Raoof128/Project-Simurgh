// SPDX-License-Identifier: AGPL-3.0-or-later
// invisible-window-poc — disclosed-attack reproducer for testing Simurgh
//
// This binary creates an NSWindow with `sharingType = .none`, the documented
// macOS display-affinity flag described in Abedini, 2026 §IV-C. The window is
// fully visible on the physical display but produces zero pixels in any frame
// returned by getDisplayMedia(), CGWindowListCreateImage, or screencapture.
//
// PURPOSE
// Provided so a researcher can verify the Simurgh mitigation against the actual
// attack — running this binary while the simurgh-helper agent is attached
// causes the agent's Display-Affinity Watch to flag the window within 2 s and
// the next telemetry verdict to escalate to Critical.
//
// RESPONSIBLE-USE NOTE
// This is a minimal reproducer for the published vulnerability — it carries
// the same dual-use posture as Section VII of the disclosure paper. Do not
// use this binary against any real proctoring system or examination. Use it
// only against your own copy of Simurgh in a controlled environment.
//
// Build:
//     swiftc -O main.swift -o invisible-window-poc -framework AppKit
//
// Run:
//     ./invisible-window-poc
//     # Hotkeys (when window has focus):
//     #   ⌘T  toggle visibility on physical display
//     #   ⌘C  toggle click-through (paper §VI-C blind-spot demo)
//     #   ⌘Q  quit

import AppKit

final class InvisibleWindow: NSWindow {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    var win: InvisibleWindow!
    var clickThrough = false
    var label: NSTextField!
    var status: NSTextField!

    func applicationDidFinishLaunching(_ note: Notification) {
        let frame = NSRect(x: 200, y: 200, width: 720, height: 460)
        win = InvisibleWindow(
            contentRect: frame,
            styleMask: [.titled, .closable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        win.title = "🔒 Invisible Window — disclosed attack reproducer"
        win.titlebarAppearsTransparent = true
        win.isMovableByWindowBackground = true
        win.level = .floating
        win.sharingType = .none                // ← the entire attack
        win.collectionBehavior = [.canJoinAllSpaces, .stationary]
        win.backgroundColor = NSColor(calibratedRed: 0.95, green: 0.93, blue: 0.86, alpha: 0.97)

        // content
        let content = NSView(frame: NSRect(origin: .zero, size: frame.size))
        content.wantsLayer = true

        let banner = NSTextField(labelWithString: "▲ INVISIBLE TO SCREEN CAPTURE")
        banner.frame = NSRect(x: 24, y: 410, width: 680, height: 24)
        banner.font = NSFont.monospacedSystemFont(ofSize: 11, weight: .bold)
        banner.textColor = NSColor(red: 0.42, green: 0.10, blue: 0.10, alpha: 1)
        content.addSubview(banner)

        let title = NSTextField(labelWithString: "This window has sharingType = .none")
        title.frame = NSRect(x: 24, y: 360, width: 680, height: 38)
        title.font = NSFont(name: "Times New Roman", size: 28) ??
                     NSFont.systemFont(ofSize: 28, weight: .medium)
        title.textColor = NSColor(red: 0.08, green: 0.07, blue: 0.05, alpha: 1)
        content.addSubview(title)

        let body = NSTextField(wrappingLabelWithString:
            "On macOS 14–26, this window is fully visible to you on the physical display but " +
            "absent from any frame produced by getDisplayMedia(), CGWindowListCreateImage, " +
            "or screencapture. It reproduces the attack class formalised in Abedini, 2026 " +
            "§IV-C.\n\n" +
            "While simurgh-helper is running, watch the Display-Affinity Watch panel in the " +
            "Simurgh dashboard — this window will appear there within ~2 seconds, and the " +
            "next 5-second telemetry verdict will escalate to Critical."
        )
        body.frame = NSRect(x: 24, y: 200, width: 680, height: 150)
        body.font = NSFont(name: "Times New Roman", size: 15) ??
                    NSFont.systemFont(ofSize: 15)
        body.textColor = NSColor(red: 0.29, green: 0.27, blue: 0.24, alpha: 1)
        content.addSubview(body)

        let cheat = NSTextField(wrappingLabelWithString:
            "Example cheat content (would be replaced with an LLM stream in a real attack):\n\n" +
            "  • A SYN flood exploits the TCP three-way handshake by sending many SYN packets\n" +
            "    without completing the handshake, exhausting the server's half-open queue.\n" +
            "  • Mitigations: SYN cookies (compute connection state from packet hash);\n" +
            "    rate-limiting per source IP; enabling TCP fastopen.\n"
        )
        cheat.frame = NSRect(x: 24, y: 70, width: 680, height: 120)
        cheat.font = NSFont.monospacedSystemFont(ofSize: 12, weight: .regular)
        cheat.textColor = NSColor(red: 0.20, green: 0.18, blue: 0.15, alpha: 1)
        cheat.drawsBackground = true
        cheat.backgroundColor = NSColor(white: 1.0, alpha: 0.6)
        content.addSubview(cheat)

        status = NSTextField(labelWithString: statusText())
        status.frame = NSRect(x: 24, y: 24, width: 680, height: 28)
        status.font = NSFont.monospacedSystemFont(ofSize: 10, weight: .medium)
        status.textColor = NSColor(red: 0.42, green: 0.10, blue: 0.10, alpha: 1)
        content.addSubview(status)

        label = banner
        win.contentView = content
        win.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        // menu (so ⌘T, ⌘C, ⌘Q hotkeys work)
        let main = NSMenu()
        let appMenuItem = NSMenuItem()
        main.addItem(appMenuItem)
        let appMenu = NSMenu()
        appMenu.addItem(NSMenuItem(title: "Toggle visibility on display",
                                   action: #selector(toggleVisibility),
                                   keyEquivalent: "t"))
        appMenu.addItem(NSMenuItem(title: "Toggle click-through (§VI-C blind spot)",
                                   action: #selector(toggleClickThrough),
                                   keyEquivalent: "c"))
        appMenu.addItem(.separator())
        appMenu.addItem(NSMenuItem(title: "Quit",
                                   action: #selector(NSApplication.terminate(_:)),
                                   keyEquivalent: "q"))
        appMenuItem.submenu = appMenu
        NSApp.mainMenu = main

        print("[poc] Invisible Window armed.")
        print("[poc] sharingType=.none on \(win.windowNumber). Use ⌘T to hide on display, ⌘C to toggle click-through.")
    }

    func statusText() -> String {
        let click = clickThrough
            ? "click-through ENABLED (no focus events fire — paper §VI-C blind spot active)"
            : "click-through disabled (clicking the window will trigger blur on the exam tab)"
        return "sharingType=.none · level=floating · \(click)"
    }

    @objc func toggleVisibility() {
        if win.isVisible { win.orderOut(nil) } else { win.makeKeyAndOrderFront(nil) }
    }

    @objc func toggleClickThrough() {
        clickThrough.toggle()
        win.ignoresMouseEvents = clickThrough
        status.stringValue = statusText()
        print("[poc] click-through is now \(clickThrough ? "ON" : "OFF")")
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
