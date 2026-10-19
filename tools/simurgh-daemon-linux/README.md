# Linux Device Shield daemon

A local research daemon for signed, counts-only device evidence. It binds to
`127.0.0.1:3031` by default. See the [Stage 2.8 design](../../docs/superpowers/specs/2026-05-17-stage-2-8-linux-display-integrity-design.md),
[device contract](../../docs/DEVICE_SHIELD_CONTRACT.md) and
[platform matrix](../../docs/DEVICE_SHIELD_PLATFORM_MATRIX.md) for the supported surface.

## Build and run

From the repository root, with Rust/Cargo available:

```sh
cargo build --locked --release --manifest-path tools/simurgh-daemon-linux/Cargo.toml
cargo run --locked --manifest-path tools/simurgh-daemon-linux/Cargo.toml -- --port 3031
```

This launches a local service; stop it with Ctrl-C. Do not expose it as a public endpoint.
A valid signature authenticates an envelope under its key, not a trustworthy device or
complete screen visibility. `scanner_unavailable` and unsupported environments must remain
explicit states rather than being interpreted as clean scans.

## Validation

The [19 October smoke report](../../docs/research/smoke-validation-2026-10-19/RESULTS.md)
records 34 Rust tests with all four real-Xvfb fixture cases exercised, plus formatting and
Clippy. Xvfb tests require the real Xvfb executable and relevant X11 libraries. The test
fixture uses `-noreset` to avoid a reset when its readiness connection closes; scanner
behavior and substantive assertions are unchanged.

These checks do not establish Wayland capture visibility, interactive deployment readiness
or arbitrary compositor support. See the [integration matrix](../../docs/INTEGRATIONS.md).
