# Linux CI Validation Reproduction

Reproduces Section VIII-E (Linux CI and Display-Server Validation) from the paper.

## Environment

- Ubuntu 22.04+ (or equivalent)
- Rust stable toolchain
- Xvfb + x11-utils + dbus-x11
- Node.js 22

## Install dependencies

```bash
sudo apt-get install -y xvfb x11-utils dbus-x11
```

## Steps

```bash
# 1. Run the Rust daemon test suite under mandatory Xvfb
export SIMURGH_REQUIRE_XVFB_TESTS=1
cd tools/simurgh-daemon-linux
cargo test 2>&1

# 2. Run the 16-scenario Linux smoke suite
cd /path/to/project-simurgh
bash scripts/smoke-stage-2-8c-8d-linux-wayland-systemd-ci.sh

# 3. Run the 30-assertion Linux security audit
node --test tests/security/stage28cd_linux_wayland_systemd_ci_security_audit.test.js

# 4. Verify shellcheck passes on lifecycle scripts
shellcheck tools/simurgh-daemon-linux/scripts/*.sh
```

## Expected results

- 33/33 Rust tests pass (Xvfb required for X11 integration tests)
- 16/16 smoke scenarios pass (scenario M is the Xvfb-gate CI check)
- 30/30 Linux security assertions pass
- shellcheck: no errors

## Note on scenario M

Scenario M (`runScenarioM_mandatoryXvfbInCi`) tests that the CI pipeline
rejects runs where Xvfb is absent when `SIMURGH_REQUIRE_XVFB_TESTS=1` is set.
This scenario passes only when Xvfb is installed. On a developer machine without
Xvfb, 15/16 scenarios pass and M is skipped.
