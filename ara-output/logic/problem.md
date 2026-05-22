# Problem Statement

## Observations

**O1 — Display Fidelity Failure.**
Both Windows 10 v2004+ and macOS expose documented, user-level APIs that exclude application
windows from all screen-capture pipelines while leaving them fully visible on the physical
monitor. `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` on Windows and
`NSWindow.SharingType.none` on macOS produce this effect. Apple Product Security and Microsoft
MSRC both classified these behaviours as by-design. Empirical evaluation (Abedini 2026) confirmed
100% evasion across Windows 10/11, macOS 14, and macOS 26.3.1 with zero visual artefacts.

**O2 — Commercial Exploitation.**
Commercial AI-overlay tools (Cluely, Interview Coder) already combine capture-invisible overlays,
click-through overlays, and GPU-layer overlays to provide live AI assistance during examinations
and technical interviews. A 2026 industry survey (self-report) estimated 35% of candidates in
technical assessments showed signs of AI-assisted cheating.

**O3 — Surveillance Costs of Current Proctoring.**
Existing proctoring platforms collect webcam video, microphone audio, gaze streams, keystrokes,
screen recordings, browser histories, and system process lists. Documented harms include elevated
student anxiety, algorithmic bias in facial recognition, and structural privacy violations.

**O4 — Browser Capture Pipeline Opacity.**
The WebRTC `getDisplayMedia()` API delegates pixel composition entirely to the OS compositing
pipeline. The browser receives no signal when a window is excluded; the captured frame is
structurally valid but incomplete.

## Gaps

**G1 — Trust anchor mismatch.** Current proctoring treats screen-capture output as a faithful
proxy for physical display state. This assumption is structurally false on any OS that exposes
display-affinity APIs.

**G2 — No privacy-preserving alternative.** Prior work does not demonstrate a system that
(a) detects capture-invisible overlays through signed OS-level metadata, (b) avoids collecting
any content-level data, and (c) enforces a manual-review-only decision model.

**G3 — No cross-platform metadata proof protocol.** No existing system unifies macOS CoreGraphics
affinity scanning, Windows Win32 `GetWindowDisplayAffinity`, and Linux X11/Wayland metadata
probing under a single signed proof contract with server-side HMAC audit chains.

## Key Insight

The OS window-management layer retains records of capture-exclusion state that are invisible to
the browser's capture pipeline but accessible to any native process with standard user privileges.
Moving the trust anchor from the browser capture surface to the OS metadata layer — via signed
daemon proofs — allows session integrity to be assessed without collecting any content-level data.

## Assumptions

**A1.** The adversary cannot modify the proctoring server, the exam platform, or the OS kernel.
Standard (non-administrator) user access only.

**A2.** Signed proofs attest identity ("this key submitted this data") but not truthfulness
("this data faithfully reflects OS state"). A compromised OS can lie without being detectable
by any user-space tool.

**A3.** The system is a research prototype. It has not been piloted with actual students, reviewed
by data-protection authorities, or undergone external red-team engagement.

**A4.** Hardware-rooted attestation (TPM, Secure Enclave) is explicitly future work; current key
storage is software-level (macOS Keychain, Linux XDG_STATE_HOME file, Windows ephemeral).
