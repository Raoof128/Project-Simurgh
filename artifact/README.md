# Project Simurgh — Artifact Guide

This directory contains reproduction instructions for the Project Simurgh paper.

## Quick reference

| Goal                      | Command                                                        | Time  |
| ------------------------- | -------------------------------------------------------------- | ----- |
| Run all 331 Node.js tests | `npm test`                                                     | ~30s  |
| Run privacy audit         | `node tools/privacy-audit.mjs`                                 | ~5s   |
| Run full gate suite       | `bash scripts/check.sh`                                        | ~2min |
| Cross-platform smoke      | `bash scripts/smoke-stage-2-7-cross-platform-device-shield.sh` | ~30s  |
| Linux validation suite    | `bash scripts/smoke-stage-2-8a-2-8b-linux-foundation-x11.sh`   | ~30s  |
| Security audit            | `bash scripts/security-audit-stage-2-6-2-7-closeout.sh`        | ~15s  |

## Prerequisites

- Node.js 22+
- (Optional) Rust stable + Xvfb for Linux daemon tests
- (Optional) .NET 8 SDK on Windows for .NET daemon tests
- (Optional) Xcode on macOS for Swift daemon tests

## 60-minute reviewer path

If you have 60 minutes, run these three commands in order:

```bash
# 1. All 331 Node.js unit tests (behavioural risk scorer, proof validator,
#    nonce guard, HMAC chain, display-server lock, pairing registry, ...)
npm test

# 2. Privacy audit — confirms no getDisplayMedia, no getUserMedia, no
#    clipboard-read, no forbidden field names in any source file
node tools/privacy-audit.mjs

# 3. Security + smoke gates — pairing, daemon proof, replay rejection,
#    tampered-proof audit, rate-limit, display-server-lock wiring
bash scripts/check.sh
```

Expected output:

- `npm test`: `# tests 331 / # pass 331 / # fail 0`
- `privacy-audit.mjs`: `PASS`
- `check.sh`: `Passed: 61 / Failed: 2` (the 2 failures are platform-specific: Windows .NET requires Windows toolchain; Linux Rust integration requires Xvfb)

For detailed instructions per platform, see:

- [REPRODUCE_WINDOWS.md](REPRODUCE_WINDOWS.md)
- [REPRODUCE_LINUX_CI.md](REPRODUCE_LINUX_CI.md)
- [REPRODUCE_PRIVACY_AUDIT.md](REPRODUCE_PRIVACY_AUDIT.md)
