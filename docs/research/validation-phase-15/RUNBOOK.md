# Re-run the local validation

Use a disposable clone for `scripts/check.sh` and `scripts/check-e2e.sh`. Historical
smokes/reproduction scripts can rewrite generated evidence; inspect that clone's Git
status afterward. Preserve the published checkout and its frozen evidence bytes.
No API key, model download or paid inference is required for these commands.

## Toolchains used

- Node 26.12.0; retain Node 24 separately for the wrong-major refusal check.
- Python 3.12.14. Install both frozen requirement locks with `--require-hashes` and
  `--only-binary=:all:`; use a separate environment for pytest 8.4.2.
- Redis 8.10.2, built by `tools/assurance-redis/install-redis.sh`.
- Lean 4.15.0 (the committed `proofs/*/lean-toolchain` pin).
- Rust 1.99.1 with rustfmt/clippy and Linux Xvfb for mandatory X11 tests.
- Chromium was present but the observed headless executions timed out; browser parity
  remains unverified. Some older tests hard-code macOS or `/usr/bin` paths.

```sh
python3.12 -m venv /tmp/simurgh-validation
/tmp/simurgh-validation/bin/python -m pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
/tmp/simurgh-validation/bin/python -m pip install pytest==8.4.2
/tmp/simurgh-validation/bin/python -m pip check
```

Set `PYTHONDONTWRITEBYTECODE=1`. The published matrix records the exact 28 test-directory
inventory. Run each directory in its own Python process: generic module names collide if
all tools are imported into one interpreter. Put the selected tool directory first in
`PYTHONPATH`, followed by `tools/assurance-workflow`, `tools/assurance-redis`,
`tools/assurance-durable`, `tools/assurance-sdk`, `tools/assurance-isolation`,
`tools/assurance-scope` and `tools/assurance-egress`. AgentDojo uses `python -m pytest tests/ -q`
from `tools/agentdojo-simurgh-adapter`; the other 27 use `python -m unittest discover -s
<test-directory> -v` from the repository root. Reject zero-test runs. Allow at least 30
minutes for the workflow suite: it repeats complete fresh-process studies to test tampering.
The initial ten-minute wrapper limit was insufficient and is retained as a failed attempt.

```sh
npm ci --no-audit --no-fund
npm test
node scripts/check-lean-proofs.mjs
cargo fmt --check --manifest-path tools/simurgh-daemon-linux/Cargo.toml
cargo clippy --locked --manifest-path tools/simurgh-daemon-linux/Cargo.toml --all-targets -- -D warnings
SIMURGH_REQUIRE_XVFB_TESTS=1 cargo test --locked --manifest-path tools/simurgh-daemon-linux/Cargo.toml -- --test-threads=1
bash scripts/check.sh
bash scripts/check-e2e.sh
```

For end-to-end history assertions, fetch the actual remote `main` into `origin/main`;
a local-only clone of a topic branch may lack that reference. Put the pytest environment,
Lean and Node 26 on `PATH` before the end-to-end script. `SIMURGH_CHROME` is supported by
some browser scripts, but not every historical test. Do not turn missing runtimes into
successful parity receipts.

Reverify archived evidence using the exact commands in the maintained assurance workflows.
Phases 4–9 were separately replayed here; Phases 10, 13 and 14 were covered by the full
source/export and reliability verifications. Reports retain supplied roots and complete
branches. Public-only export inspection is intentionally weaker than source verification.

## Known exclusions and interpretation

The aggregate script includes optional external/paid campaigns behind flags and macOS
checks that do not execute on Linux. Keep those as unrun; do not count their surrounding
successful shell steps as test coverage. The [current gaps](GAPS.md) identify stale legacy
expectations and the frozen prior-script inventory mismatch. The validation results retain
initial failures, corrected setup attempts and remaining failures rather than combining
them into a single green badge.

## Container setup diagnostics

The default Docker build failed during npm dependency installation. A direct container
registry check identified a certificate-chain error; mounting the host's trusted CA
bundle with `NODE_EXTRA_CA_CERTS` fixed that check. The same trusted runtime completed
`npm ci`, while the BuildKit network step still failed. TLS verification was never disabled.
An external build recipe then consumed that lockfile-verified npm cache with `--offline`
and `--network=none`. Source files inherited restrictive checkout permissions, so a
`COPY --chown=node:node` override lets the image's existing non-root user read them.
These are isolated validation overrides, not changes to the repository Dockerfile or
proof that its original aggregate Docker step passes in every environment. The container
smoke checks health, non-root execution, a mock receipt and rejection of the retired live
route; no external provider is contacted.

The validated [Dockerfile override](Dockerfile.gateway.validation) uses the named build
context `simurgh_npm_cache`, populated by `npm ci --cache=/npm-cache --omit=dev --no-audit
--no-fund` in the trusted-CA container. Build with `--network=none --build-context
simurgh_npm_cache=<verified-cache-directory> -f Dockerfile.gateway.validation`. npm still
checks the lockfile integrity values. The original checkout/Dockerfile remain unchanged.
The [retained receipt](docker-smoke-receipt.json) records the successful isolated smoke.
