# Simurgh macOS Integrity Node CLI (Stage 2.1 + 2.2)

Generates signed integrity-proof and pairing envelopes from the local macOS device and prints them to stdout. Two subcommands:

- **`proof`** (Stage 2.1) — emits a v1 signed integrity proof envelope. Unpaired sessions accept the proof with `signature_status: "unregistered_node"`.
- **`pair`** (Stage 2.2) — signs a server-issued challenge with the local Ed25519 key, producing a pairing payload. Once submitted to `/api/integrity/pairing/complete`, subsequent proofs return `signature_status: "verified"`.

Status (v0.4.3, 2026-05-15): Stage 2.1 + 2.2 + post-audit hardening pass all merged. No localhost daemon yet (Stage 2.3 future work).

## What this does NOT do

- No localhost daemon, no port, no auto-POST to the server.
- No Screen Recording permission request.
- No ScreenCaptureKit usage.
- No window enumeration, process scanning, or content collection.
- No hardware-rooted attestation claim.

This is a CLI scaffold. The local private key stored at `~/.simurgh/node-key` is a **development identity key**, not a hardware-backed attestation key.

## Build and run

```bash
cd tools/simurgh-node-macos
swift build
swift run SimurghNode --session <SESSION_ID>
```

Or pass the session via env:

```bash
SIMURGH_SESSION_ID=sess_abc swift run SimurghNode
```

## Submit a proof to the server

```bash
swift run SimurghNode --session sess_abc > /tmp/simurgh-proof.json

curl -s http://localhost:3030/api/integrity/proofs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  --data @/tmp/simurgh-proof.json | jq
```

Expected response: `status: 202` with `signature_status: "unregistered_node"`.

## CLI options

| Flag                | Description                                           |
| ------------------- | ----------------------------------------------------- |
| `--session <ID>`    | Session ID (required unless `SIMURGH_SESSION_ID` set) |
| `--key-path <path>` | Override the default `~/.simurgh/node-key` location   |
| `--print-key-info`  | Print `node_id_hash` and `node_public_key` only       |
| `--help`            | Show usage                                            |

## Exit codes

| Code | Meaning                                |
| ---- | -------------------------------------- |
| `0`  | Proof printed successfully             |
| `1`  | Generic error                          |
| `2`  | Key file malformed                     |
| `3`  | Missing required `--session`           |
| `4`  | Pair mode missing `--challenge`        |
| `64` | Unknown CLI flag or unknown subcommand |

## Privacy notice for screenshots

The `--print-key-info` output and the proof JSON show `key_path`, which contains your local username. **Redact `key_path` before sharing screenshots or logs publicly.**

## First-run behaviour

On first run the CLI generates a fresh Ed25519 keypair, stores the private key at `~/.simurgh/node-key` with `0600` permissions, and prints a one-time warning to stderr. Subsequent runs reuse the same key. If the key file is malformed the CLI exits `2` without auto-regenerating — silent regeneration would mask key loss.

### Pair with a session (Stage 2.2)

```bash
# 1. Server issues a challenge
curl -s -X POST http://localhost:3030/api/integrity/pairing/challenge \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{}' | jq -r .challenge > /tmp/simurgh-challenge.txt

# 2. Node signs the challenge
swift run SimurghNode pair --session sess_abc --challenge "$(cat /tmp/simurgh-challenge.txt)" > /tmp/simurgh-pair.json

# 3. Submit the signed pairing payload
curl -s -X POST http://localhost:3030/api/integrity/pairing/complete \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H 'Content-Type: application/json' \
  --data @/tmp/simurgh-pair.json | jq
```

Expected response: `status: "paired"` with `signature_status: "verified"`. Subsequent proof submissions for this session now return `signature_status: "verified"`.

The `pair` subcommand prints exactly 8 fields to stdout: `version`, `platform`, `session_id`, `node_id_hash`, `node_public_key`, `challenge`, `timestamp`, `signature`. No private key. No content. No raw process names or window titles.
