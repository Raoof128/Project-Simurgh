# Simurgh macOS Integrity Node — Stage 2.1 CLI

Generates a signed Stage 2 v1 integrity proof envelope from the local macOS device and prints it to stdout. The Simurgh server validates the proof structure and Ed25519 signature; in Stage 2.1 every accepted proof is recorded with `signature_status: "unregistered_node"` because pairing/registration lands in Stage 2.2.

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

| Flag                  | Description                                            |
|-----------------------|--------------------------------------------------------|
| `--session <ID>`      | Session ID (required unless `SIMURGH_SESSION_ID` set)  |
| `--key-path <path>`   | Override the default `~/.simurgh/node-key` location    |
| `--print-key-info`    | Print `node_id_hash` and `node_public_key` only        |
| `--help`              | Show usage                                             |

## Exit codes

| Code | Meaning                                |
|------|----------------------------------------|
| `0`  | Proof printed successfully             |
| `1`  | Generic error                          |
| `2`  | Key file malformed                     |
| `3`  | Missing required `--session`           |
| `64` | Unknown CLI flag                       |

## Privacy notice for screenshots

The `--print-key-info` output and the proof JSON show `key_path`, which contains your local username. **Redact `key_path` before sharing screenshots or logs publicly.**

## First-run behaviour

On first run the CLI generates a fresh Ed25519 keypair, stores the private key at `~/.simurgh/node-key` with `0600` permissions, and prints a one-time warning to stderr. Subsequent runs reuse the same key. If the key file is malformed the CLI exits `2` without auto-regenerating — silent regeneration would mask key loss.
