# Constraints and Non-Claims

## Hard Constraints (Architectural)

**SC01 — Metadata-only collection.** No proof field may contain screen pixels, audio, webcam
frames, typed content, pasted content, raw window titles, raw process names, process identifiers,
window handles, hardware serial numbers, MAC addresses, or hostnames. Enforced via schema
validator and privacy audit CI gate.

**SC02 — Manual-review-only.** No component may produce an automatic misconduct finding, trigger
a suspension, or send a notification to any authority. Verdict strings are hard-coded literals.

**SC03 — Localhost-only daemon.** The integrity daemon binds to 127.0.0.1 only. No remote
listener.

**SC04 — Challenge single-use.** Each pairing challenge is consumed on first use and expires
after 60 seconds. A new challenge issuance clears any unconsumed pending challenge.

**SC05 — Node continuity.** Once a session is paired to a node_id_hash, subsequent proof
submissions from a different node are rejected with `node_mismatch`.

**SC06 — Wayland consent safety.** The Rust daemon's Wayland path never calls
`CreateSession`, `SelectSources`, `Start`, or `OpenPipeWireRemote`. Only `NameHasOwner` and
`ScreenCast.AvailableSourceTypes` are called. Enforced by banned-method grep test in CI.

## Explicit Non-Claims

**NC01 — No GPU-layer overlay detection.** Tools that hook DirectX or Metal compositor layers
bypass all OS window-management APIs. Simurgh explicitly does not detect these.

**NC02 — No kernel-level visibility.** A kernel-level rootkit can modify API return values.
No user-space tool can detect this. Hardware-rooted attestation is future work.

**NC03 — No read-only cheating detection.** A student reading from a second device or printed
notes with no overlay produces no anomalous signals.

**NC04 — No click-through overlay detection (no-flag variant).** Click-through overlays that do
not set a capture-exclusion flag are not detected by the affinity scanner.

**NC05 — No production readiness.** The system has not been reviewed by a data-protection
authority, accessibility auditor, or institutional ethics board. It has not been piloted with
actual students. It is a research prototype at v0.4.18.

**NC06 — No hardware attestation.** Keys reside in software (macOS Keychain, Linux file,
Windows process memory). Proofs attest identity, not truthfulness.

**NC07 — No universal Wayland enumeration.** Direct window enumeration is not available to
unprivileged Wayland clients. The Linux Wayland path performs portal property probing only.

**NC08 — No notarisation / signed distribution packages.** Distribution packages are not
signed or notarised for macOS/Windows. Required before any institutional deployment.

**NC09 — No external red-team validation.** The security audit conducted is an internal
10-question self-audit. An external red-team engagement is required before any deployment.

## Operational Limits

| Limit                                      | Value        | Source                                             |
| ------------------------------------------ | ------------ | -------------------------------------------------- |
| Proof submissions per minute per session   | 30           | `server.js:limitIntegrityProof`                    |
| Pairing challenges per minute per session  | 10           | `server.js:limitPairingChallenge`                  |
| Pairing completions per minute per session | 20           | `server.js:limitPairingComplete`                   |
| Challenge TTL                              | 60 seconds   | `src/integrity/pairingRegistry.js:DEFAULT_TTL_MS`  |
| Nonce guard TTL                            | 5 minutes    | `src/integrity/nonceGuard.js:DEFAULT_TTL_MS`       |
| Audit chain cap                            | 5000 entries | `src/audit/hmacChain.js:CHAIN_CAP`                 |
| Timestamp tolerance (past)                 | 30 seconds   | `src/integrity/proofSchema.js:TIMESTAMP_PAST_MS`   |
| Timestamp tolerance (future)               | 5 seconds    | `src/integrity/proofSchema.js:TIMESTAMP_FUTURE_MS` |
| Nonce byte range                           | 12–64 bytes  | `src/integrity/proofSchema.js:NONCE_BYTES_MIN/MAX` |
| macOS nonce size                           | 16 bytes     | Section V-D                                        |
