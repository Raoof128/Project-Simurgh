# Cryptographic and Protocol Parameters

## Signing Algorithms

| Path                 | Algorithm                | Key size          | Signature size         | Source                                                           |
| -------------------- | ------------------------ | ----------------- | ---------------------- | ---------------------------------------------------------------- |
| Browser-paired proof | Ed25519                  | 32 bytes (public) | 64 bytes               | `src/integrity/proofSchema.js:PUBLIC_KEY_BYTES, SIGNATURE_BYTES` |
| Device-shield daemon | ECDSA P-256 over SHA-256 | SPKI-DER wrapped  | Variable (DER-encoded) | `src/device/daemonProof.js:verifyDaemonSignature`                |

## Proof Envelope Fields

### Browser-Paired Integrity-Proof Envelope (simurgh-integrity-proof-v1)

| Field           | Type   | Constraint                              | Source                                        |
| --------------- | ------ | --------------------------------------- | --------------------------------------------- |
| version         | string | Must equal "simurgh-integrity-proof-v1" | `proofSchema.js:PROOF_VERSION`                |
| platform        | string | "macos" or other defined platforms      | `proofSchema.js:PROOF_PLATFORM`               |
| session_id      | string | /^[A-Za-z0-9_-]{1,64}$/                 | `proofSchema.js:SESSION_ID_PATTERN`           |
| node_id_hash    | string | /^[0-9a-f]{64}$/ (bare hex)             | `proofSchema.js:NODE_ID_HASH_PATTERN`         |
| node_public_key | base64 | Decoded = exactly 32 bytes (Ed25519)    | `proofSchema.js:PUBLIC_KEY_BYTES=32`          |
| nonce           | base64 | Decoded = 12–64 bytes                   | `proofSchema.js:NONCE_BYTES_MIN=12, MAX=64`   |
| timestamp       | number | Within 30s past / 5s future             | `proofSchema.js:TIMESTAMP_PAST_MS, FUTURE_MS` |
| capabilities    | object | Exactly 4 boolean keys                  | `proofSchema.js:CAPABILITY_KEYS`              |
| signals         | object | Exactly 4 defined keys                  | `proofSchema.js:SIGNAL_KEYS`                  |
| privacy_mode    | string | "metadata_only"                         | `proofSchema.js:PROOF_PRIVACY_MODE`           |
| signature       | base64 | Decoded = exactly 64 bytes              | `proofSchema.js:SIGNATURE_BYTES=64`           |

### Device-Shield Daemon Proof Envelope

| Field                         | Type    | Constraint                                                     | Source                                           |
| ----------------------------- | ------- | -------------------------------------------------------------- | ------------------------------------------------ |
| type                          | string  | Required                                                       | `daemonProof.js:PROOF_REQUIRED_FIELDS`           |
| session_id                    | string  | /^[A-Za-z0-9_-]{1,64}$/                                        | `daemonProof.js:SESSION_ID_PATTERN`              |
| exam_id                       | string  | /^[A-Za-z0-9_-]{1,80}$/                                        | `daemonProof.js:EXAM_ID_PATTERN`                 |
| sequence                      | number  | Non-negative integer                                           | —                                                |
| timestamp                     | number  | Within 30s past / 5s future                                    | `daemonProof.js:DAEMON_TIMESTAMP_PAST/FUTURE_MS` |
| node_id_hash                  | string  | /^sha256:[a-f0-9]{64}$/                                        | `daemonProof.js:NODE_ID_HASH_PATTERN`            |
| daemon_version                | string  | One of {"0.4.5","0.4.7","0.4.11","2.8.0"}                      | `daemonProof.js:SUPPORTED_DAEMON_VERSIONS`       |
| platform                      | string  | One of SUPPORTED_DEVICE_PLATFORMS                              | `platformScannerSchema.js`                       |
| capture_excluded_window_count | integer | ≥ 0                                                            | —                                                |
| helper_state                  | string  | One of {"healthy","missing","stale","risk_detected","unknown"} | `daemonProof.js:HELPER_STATES`                   |
| challenge                     | string  | Server-issued, base64url, 32 bytes pre-encoding                | `daemonProof.js:DAEMON_CHALLENGE_BYTES=32`       |
| signature                     | string  | base64url ECDSA P-256 signature                                | —                                                |

## Capabilities Sub-Object Keys

| Key                        | Type    | Source                           |
| -------------------------- | ------- | -------------------------------- |
| screencapturekit_available | boolean | `proofSchema.js:CAPABILITY_KEYS` |
| window_enumeration         | boolean | `proofSchema.js:CAPABILITY_KEYS` |
| sharing_state_scan         | boolean | `proofSchema.js:CAPABILITY_KEYS` |
| helper_bridge              | boolean | `proofSchema.js:CAPABILITY_KEYS` |

## Signals Sub-Object Keys

| Key                           | Type                                   | Source                                |
| ----------------------------- | -------------------------------------- | ------------------------------------- |
| node_uptime_ms                | nonNegativeInt                         | `proofSchema.js:SIGNAL_KEYS`          |
| window_count                  | nonNegativeInt                         | `proofSchema.js:SIGNAL_KEYS`          |
| capture_excluded_window_count | nonNegativeInt                         | `proofSchema.js:SIGNAL_KEYS`          |
| helper_status                 | "connected"\|"stale"\|"not_configured" | `proofSchema.js:HELPER_STATUS_VALUES` |

## Identity Storage (Platform-Specific)

| Platform | Storage                                                | Persistence                  | Source                       |
| -------- | ------------------------------------------------------ | ---------------------------- | ---------------------------- |
| macOS    | Keychain, account "p256-signing-key"                   | Persistent across launches   | `KeychainIdentity.swift:7`   |
| Linux    | XDG_STATE_HOME/simurgh/identity, mode 0600 in 0700 dir | Persistent                   | `identity.rs:60-72`          |
| Windows  | In-process (CreateEphemeral)                           | Ephemeral — process lifetime | `WindowsIdentityStore.cs:18` |
