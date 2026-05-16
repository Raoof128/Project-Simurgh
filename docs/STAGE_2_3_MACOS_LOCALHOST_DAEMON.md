# Stage 2.3 — macOS Localhost Integrity Daemon

**Release:** `v0.4.10-stage-2-macos-closeout-docs`
**Status:** Complete and Frozen

Stage 2.3 implements a macOS localhost daemon that bridges the browser client and native helper through signed, replay-resistant, privacy-preserving proof messages. It has been verified through Stage 2.5 closeout gates.

## Architecture

```text
Browser -> POST /api/device/challenge -> macOS daemon on 127.0.0.1:3031
Browser -> daemon /pair or /proof -> server /api/device/pair or /api/telemetry
Server  -> verifies P-256 signature, challenge freshness, session binding, and node match
```

The daemon package lives at:

```text
tools/simurgh-daemon-macos/
```

## API Surface

Server:

- `POST /api/device/challenge` — session-token-gated challenge issue for `pair`, `session_start`, `proof`, or `session_end`.
- `POST /api/device/pair` — verifies daemon-signed pairing payload and stores the daemon public key for the session.
- `POST /api/telemetry` — accepts optional `daemon_proof`, rejects invalid/replayed/stale proofs, and updates `device_integrity`.

Daemon:

- `GET /health`
- `GET /status`
- `POST /pair`
- `POST /proof`
- `POST /session/end`

## Cryptography

- P-256 signing key.
- Private key stored in macOS Keychain.
- Public key exported as base64url SPKI DER.
- `node_id_hash` is `sha256:` of public-key DER bytes.
- Signed payloads use sorted-key JSON with `signature` excluded.
- Server challenges are 32 random bytes, expire after 30 seconds, and are consumed once.

## Privacy Contract

Allowed fields include `node_id_hash`, `daemon_version`, `daemon_state`, `helper_state`, `platform`, `proof_timestamp`, `proof_age_ms`, `capture_excluded_window_count`, `signature_valid`, and `challenge_id_hash`.

Forbidden fields include screenshots, pixels, webcam frames, microphone audio, typed content, pasted content, raw process names, raw window titles, usernames, serial numbers, MAC addresses, home directories, and file paths.

## Risk and Audit

Stage 2.3 adds `daemon_risk` to the local scoring model. Healthy proofs add no risk; stale, missing, unpaired, or untrusted daemon states add bounded review risk; any capture-excluded count above zero applies a Critical floor of 85.

Set `SIMURGH_REQUIRE_DAEMON=true` for hardened/native-required exams. In that mode, telemetry without `daemon_proof` is rejected with `daemon_proof_required` and HMAC-audited as `DAEMON_MISSING`. Browser-only demos keep the default `false` value.

All daemon events are HMAC-audited as metadata-only events. The report export includes a `device_integrity` section with final daemon state, proof counts, max capture-excluded count, and manual-review recommendation.

## Verification

```bash
npm test
node --check server.js
node tools/privacy-audit.mjs
cd tools/simurgh-daemon-macos && swift test && swift build
./scripts/check.sh
```

Run the daemon manually:

```bash
cd tools/simurgh-daemon-macos
swift run SimurghDaemon --port 3031 --allowed-origin http://localhost:3030
```

This stage remains a research prototype. It does not claim hardware attestation, production endpoint management, or automatic misconduct detection.
