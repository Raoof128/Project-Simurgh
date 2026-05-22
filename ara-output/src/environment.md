# Environment

## Primary Runtime (Node.js Verifier + Tests)

| Component        | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| Runtime          | Node.js 22                                                         |
| Test framework   | node:test (built-in)                                               |
| Key dependencies | express ^4.21.2, @anthropic-ai/sdk ^0.39.0                         |
| Dev dependencies | prettier ^3.8.3                                                    |
| Package version  | 0.4.18                                                             |
| Crypto           | Node.js built-in `node:crypto` (Ed25519, ECDSA P-256, HMAC-SHA256) |

## macOS Daemon

| Component   | Value                                     |
| ----------- | ----------------------------------------- |
| Language    | Swift                                     |
| Framework   | CryptoKit (P256.Signing)                  |
| Scanner     | CoreGraphics (CGWindowListCopyWindowInfo) |
| Key storage | macOS Keychain                            |
| Build       | Xcode / swift build                       |

## Windows Daemon

| Component       | Value                                                    |
| --------------- | -------------------------------------------------------- |
| Language        | C# / .NET 8                                              |
| Crypto          | System.Security.Cryptography (ECDsa nistP256)            |
| Scanner         | Win32 EnumWindows + GetWindowDisplayAffinity             |
| Key storage     | Ephemeral (CreateEphemeral — DPAPI persistence deferred) |
| Test framework  | xUnit ([Fact]/[Theory])                                  |
| Validation host | Windows 10 Pro build 19045                               |

## Linux Daemon

| Component       | Value                                           |
| --------------- | ----------------------------------------------- |
| Language        | Rust (stable channel)                           |
| Crate           | p256::ecdsa (ECDSA P-256)                       |
| X11 binding     | x11rb                                           |
| Wayland binding | zbus (D-Bus)                                    |
| Key storage     | XDG_STATE_HOME file, mode 0600 in 0700 dir      |
| CI              | Ubuntu + Xvfb with SIMURGH_REQUIRE_XVFB_TESTS=1 |
| Linting         | shellcheck (lifecycle scripts)                  |

## CI / Quality Gates

| Gate            | Tool                                                |
| --------------- | --------------------------------------------------- |
| Node.js tests   | npm test (node:test)                                |
| Rust tests      | cargo test                                          |
| .NET tests      | dotnet test                                         |
| Linting         | prettier --check                                    |
| Privacy audit   | tools/privacy-audit.mjs                             |
| npm advisory    | npm audit --audit-level=high                        |
| Smoke tests     | scripts/smoke-\*.sh                                 |
| Security audits | scripts/security-audit-\*.sh                        |
| Full gate suite | scripts/check.sh (~63 gates, 61 pass on macOS host) |

## Seeds / Reproducibility

No random seeds required — all randomness is cryptographic key generation and nonce
generation, both intentionally non-reproducible. Golden-fixture interop tests use
pre-committed fixture files to lock canonical serialisation byte-for-byte.

## Platform Test Status

| Platform              | Test execution on audit host                   | Notes                             |
| --------------------- | ---------------------------------------------- | --------------------------------- |
| Node.js               | 327/327 pass (2026-05-22)                      | macOS host, primary CI            |
| Rust (Linux daemon)   | Local cargo test fails (Xvfb missing on macOS) | CI-only for X11 integration tests |
| .NET (Windows daemon) | Cannot run on macOS host                       | Windows-only toolchain            |
| Swift (macOS daemon)  | 8/8 pass (Xcode)                               | macOS host                        |
