# System Architecture

## Component Graph

```
Student Device
├── Browser SDK (public/sdk/simurgh-browser-sdk.js)
│   ├── Input: exam page DOM events
│   ├── Output: behavioural telemetry events → Node.js server (HTTP POST /api/telemetry)
│   └── Collects: keystroke counts, paste counts/lengths, focus-loss counts/durations,
│                 idle gaps, WPM, keydown timing intervals (up to 200 samples)
│                 [NOT: content, clipboard, DOM text, getDisplayMedia, getUserMedia]
│
└── Integrity Daemon (native process at 127.0.0.1)
    ├── macOS: tools/simurgh-daemon-macos/ (Swift/CryptoKit)
    │   ├── Key storage: macOS Keychain, account "p256-signing-key" (ECDSA P-256, persistent)
    │   ├── Scanner: CGWindowListCopyWindowInfo (optionOnScreenOnly | excludeDesktopElements)
    │   │           reads kCGWindowSharingState; counts windows with SharingNone
    │   └── Output: signed device-shield daemon proof envelope (ECDSA P-256)
    │
    ├── Windows: tools/simurgh-daemon-windows/ (.NET)
    │   ├── Key storage: CreateEphemeral() — process-lifetime key (ECDSA P-256)
    │   ├── Scanner: EnumWindows + GetWindowDisplayAffinity
    │   │           counts WDA_MONITOR → monitor_only_window_count
    │   │           counts WDA_EXCLUDEFROMCAPTURE → capture_excluded_window_count
    │   └── Output: signed device-shield daemon proof envelope (ECDSA P-256)
    │
    └── Linux: tools/simurgh-daemon-linux/ (Rust)
        ├── Key storage: XDG_STATE_HOME identity file (0600 in 0700 dir, ECDSA P-256, persistent)
        ├── Scanner paths:
        │   ├── X11: x11rb → _NET_WM_STATE (window-manager metadata counts)
        │   ├── Wayland: D-Bus NameHasOwner + ScreenCast.AvailableSourceTypes (portal probe only)
        │   └── XWayland: X11 path on DISPLAY from XWayland (coverage=xwayland_partial)
        └── Output: signed device-shield daemon proof envelope (ECDSA P-256)

─────────────────── Trust Boundary ───────────────────

Verifier Server (server.js, Node.js 22)
├── Proof Verifier (src/device/daemonProof.js, src/integrity/proofValidator.js)
│   ├── Input: telemetry events + proof envelopes from browser SDK
│   ├── E1 triple check: node_id_hash = SHA-256(pubkey), key match, signature verify
│   ├── N1 node-continuity: submitting node must match session-bound node
│   ├── Nonce guard: global in-memory store, 5-minute TTL
│   └── Schema validation: forbidden fields, capability/signal key whitelist
│
├── Risk Scorer (src/academic/riskScoring.js)
│   ├── Input: accepted telemetry + proof results
│   ├── 8 weighted categories (weights sum to 1.0)
│   └── Output: risk_level (Critical/Warning/Safe) + hard-coded recommendation string
│
├── HMAC-SHA256 Audit Chain (src/audit/hmacChain.js)
│   ├── Input: every state-changing event (accept/reject/pairing/transition/narrative)
│   ├── prev = HMAC-SHA256(JSON(entry_before_sig))
│   ├── HMAC key: server-held, not shared
│   └── Cap: 5000 entries (CHAIN_CAP)
│
├── Claude Narrative Layer (optional, server.js)
│   └── Consumes: risk score + audit chain; produces: natural-language session summary
│
└── Instructor Dashboard + Report (public/instructor.html, src/academic/reportBuilder.js)
    ├── Displays: risk category breakdown, event timeline, integrity state, audit chain status
    └── Export: full audit chain JSON verifiable via tools/verify-audit.mjs
```

## Data Flow

1. Student joins session → server issues session token → browser SDK loads
2. Browser SDK emits telemetry events → POST /api/telemetry → normalised and scored
3. Browser SDK requests pairing challenge → GET /api/pairing/challenge (60s TTL)
4. Challenge forwarded to daemon → daemon signs → POST /api/pairing/complete
5. Server verifies pairing signature → binds node_id_hash to session
6. Daemon polls OS metadata → constructs signed proof → POST /api/integrity/proofs
7. Server performs E1 + N1 + nonce check → accepts/rejects → appends to audit chain
8. Risk scorer aggregates → produces verdict → appended to audit chain
9. Instructor accesses dashboard → reviews risk breakdown → decides on manual review
