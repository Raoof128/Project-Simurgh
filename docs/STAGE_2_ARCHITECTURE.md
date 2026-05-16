# Stage 2 Architecture: Device Shield / Integrity Node

> **Implementation status (v0.4.10, 2026-05-16):**
>
> - **Stage 2.1 ✅ merged** — Ed25519 signed-integrity-proof pipeline.
> - **Stage 2.2 ✅ merged** — macOS node pairing.
> - **Stage 2.3 ✅ merged** — macOS localhost node daemon (Swift).
> - **Stage 2.4 ✅ merged** — browser SDK bridge.
> - **Stage 2.5 ✅ merged** — CoreGraphics metadata affinity scanner.
> - **v0.4.10 ✅ merged** — Stage 2.5 cybersecurity audit and documentation closeout.
> - **Stage 2.6 ⏳ planned** — Windows Display Affinity Scanner.

Stage 2 is the transition from a browser-centered Stage 1 Academic Shield to a device-aware integrity architecture for macOS. The sections below describe the implemented architecture.

```text
Browser Session
   ↓
Simurgh SDK
   ↓
Local Integrity Node (macOS Daemon)
   ↓
Signed Integrity Proof (P-256)
   ↓
Simurgh API
   ↓
Risk Engine + Audit Log
```

## Goals

- Pair a browser exam session with a local device integrity process.
- Produce signed integrity proofs instead of raw local observations.
- Improve resistance to helper spoofing, replay, and local tampering.
- Preserve the metadata-only privacy model.
- Create a deployable foundation for institutional pilots.

## Non-Goals

- No screen, webcam, microphone, typed-content, or pasted-content collection.
- No automatic misconduct findings.
- No production claim before red-team, privacy/legal, accessibility, and pilot review.
- No hardware-rooted attestation claim until actual hardware-backed integrations exist.

## Local Integrity Node Responsibilities

- Pair with a browser session using a short-lived challenge.
- Maintain a local monotonic event log.
- Inspect permitted device integrity signals.
- Sign proof envelopes with node-held keys.
- Redact local details before transmission.
- Detect stale, replayed, or duplicated proof submissions.
- Report degraded state explicitly when a capability is unavailable.

## Browser and Device Pairing

The Simurgh SDK should request a pairing challenge from the API, pass it to the Local Integrity Node, and receive a signed response bound to:

- session ID,
- exam ID,
- timestamp,
- nonce,
- node identity,
- supported capability set,
- privacy mode.

## Signed Integrity Proofs

A proof should be a compact signed envelope:

```json
{
  "session_id": "sess_example",
  "nonce": "api-issued-nonce",
  "issued_at": "2026-05-14T00:00:00.000Z",
  "capabilities": ["display_affinity_scan", "local_log_hash"],
  "risk_signals": {
    "capture_excluded_window_count": 0,
    "node_state": "healthy"
  },
  "privacy_mode": "metadata_only",
  "local_log_root": "sha256:...",
  "signature": "..."
}
```

The proof should not include raw process names, raw window titles, screenshots, audio, webcam frames, answer text, or pasted text.

## Tamper-Aware Local Logs

The node should maintain a local append-only hash chain and periodically send only the root hash or signed summary. Full local logs should remain controlled by the institution and subject to privacy/legal policy.

## Network Integrity Checks

Stage 2 should detect:

- stale node heartbeat,
- proof replay,
- nonce reuse,
- clock drift outside tolerance,
- SDK/node pairing mismatch,
- API/node version mismatch.

## Helper Attestation

The current helper-secret model is acceptable for Stage 1 validation. Stage 2 should move toward:

- per-install node identity,
- signed proof envelopes,
- key rotation,
- revocation support,
- capability self-reporting,
- future platform attestation where available.

## API Boundaries

### SDK to Node

| Operation         | Purpose                                | Status      |
| ----------------- | -------------------------------------- | ----------- |
| `pair(challenge)` | Bind browser session to local node     | Implemented |
| `status()`        | Report capability and health summary   | Implemented |
| `proof(nonce)`    | Return signed proof for API submission | Implemented |

### Node to API

| Endpoint                              | Purpose                                 | Status      |
| ------------------------------------- | --------------------------------------- | ----------- |
| `POST /api/device/challenge`          | Request pairing/proof challenge         | Implemented |
| `POST /api/device/pair`               | Complete node pairing                   | Implemented |
| `POST /api/telemetry`                 | Submit signed proof envelope            | Implemented |
| `GET /api/integrity/nodes/:id/status` | Instructor/admin status path, protected | Planned     |

## Failure and Degradation Modes

| Mode                   | Expected handling                                                 |
| ---------------------- | ----------------------------------------------------------------- |
| Node absent            | Degrade to Stage 1 browser telemetry and mark helper/node missing |
| Node stale             | Increase helper/node risk and require manual review context       |
| Proof invalid          | Reject proof and record integrity event                           |
| Capability unavailable | Record explicit degraded capability, not silence                  |
| Clock drift            | Reject or quarantine proof depending on drift                     |
| Network loss           | Buffer locally within policy; avoid private data expansion        |

## Deployment Model

Stage 2 assumes institutional deployment support:

- managed device distribution,
- signed and notarized macOS app/helper,
- signed Windows installer,
- Linux package strategy,
- secure update channel,
- LMS or exam-platform integration,
- privacy/legal approval,
- accessibility review,
- red-team testing.

## Threat Model Changes from Stage 1

Stage 2 moves trust from "browser plus shared-secret helper" toward "browser plus signed local proof." This improves helper spoofing resistance and auditability, but it still does not eliminate risks from a fully compromised endpoint or malicious administrator. Hardware-rooted attestation remains a future research and deployment milestone.

## Anti-Overclaiming Notes

Use this language:

- "planned Stage 2 architecture"
- "signed integrity proof direction"
- "prepares for hardware-rooted attestation"

Do not use:

- "production-ready"
- "complete endpoint security"
- "universal detection claims"
- "cannot be bypassed"
