# Reproduce Phase 16 maintenance

Use Node 26, Python 3 and an installed Chromium or Chrome. No model download or provider
key is required. Keep `PYTHONDONTWRITEBYTECODE=1`. The complete toolchain and disposable
clone instructions remain in the [Phase 15 runbook](../validation-phase-15/RUNBOOK.md).

```sh
npm ci --no-audit --no-fund
node --test tests/unit/maintenance/*.test.js \
  tests/unit/llmShield/stage5p/crossRuntimeParity.test.js \
  tests/e2e/llmShield/stage5s/priorReproduceSet.test.js
node scripts/lib/currentReproduceSet.mjs
bash scripts/smoke-llm-shield-stage3e.sh
bash scripts/smoke-llm-shield-stage3e-live.sh
bash scripts/security-audit-llm-shield-stage3e.sh
npm test
```

`SIMURGH_CHROME` selects an explicit executable; an invalid override fails. Otherwise the
helper checks normal macOS paths and Chromium/Chrome on `PATH`. Missing browsers produce
an explicit skip. A present browser that exits, times out, cannot navigate or disagrees
fails. The owned fixture server binds only loopback, serves exact files, and retains a CSP
that forbids page egress. The debugging channel is a local pipe, without an exposed port.
The existing `--no-sandbox` convention is limited to trusted repository fixture pages.
This is functional parity testing, not browser confinement or malicious-page testing.

Stage 5P checks 1,734 values; the new Stage 5R successor checks all 5 manifest entries / 17
vectors against Node core, portable Node, Python and a real browser. Historical Stage 5R
scripts still use their original driver. Their old output must not be described as the new
successor result. Neither test writes a historical receipt.

The inventory CLI validates the immutable baseline digest, historical membership, nonempty
unique identities, and exact current discovery. The current manifest has 51 scripts; the
original Stage 5S pin retains 50. It does not automatically repin itself. Future additions
require an explicit reviewed migration. `scripts/runAllPriorReproduce.sh` uses the same
validator but then runs the entire set, including external-host prerequisites. Inventory
validation alone does not mean every listed script has executed successfully.

## Container smoke

The default path is:

```sh
bash scripts/docker-smoke-llm-shield-stage3e.sh
```

If this environment needs its trusted corporate CA to reach npm, preserve TLS verification.
Populate an external npm cache with the exact committed package files using the trusted-CA
container method documented in Phase 15. The supported offline path is:

```sh
SIMURGH_NPM_BUILD_CACHE=/absolute/path/to/verified/npm-cache \
  bash scripts/docker-smoke-llm-shield-stage3e.sh
```

The build uses `npm ci --offline`, the committed lockfile integrity values and
`--network=none`; an empty cache fails. Source ownership allows UID 1000 to read files even
when a checkout was created with restrictive permissions. The smoke checks non-root
execution, a mock 3E receipt and HTTP 410 for the retired live route. It removes its owned
container on exit. Local port 33060 must be free. Do not put credentials into the build cache.

Run `bash scripts/check.sh` and `bash scripts/check-e2e.sh` in disposable clones with the
full Phase 15 toolchain, actual `origin/main`, and the optional cache setting above.
Historical scripts may rewrite generated evidence inside those clones. Preserve the
publication checkout and record skipped macOS/provider/browser lanes separately from passes.

## Additional portable .NET check

The Windows daemon's unit project targets portable `net8.0`. The native affinity fixture
requires Windows and is not executed on Linux. This run used the official SDK image
`mcr.microsoft.com/dotnet/sdk:8.0@sha256:f7e28a0a3f6f9235929ec19274fd0ddf8534e9159f99fac602ac73304f1ce99f`
(SDK 8.0.426), with the host's trusted CA bundle mounted read-only. Copy `package.json` and
`tools/simurgh-daemon-windows` from a read-only checkout into `/work` inside the disposable
container, retaining that directory structure, then run:

```sh
cd /work
dotnet test tools/simurgh-daemon-windows/tests/SimurghDaemon.Windows.Tests/SimurghDaemon.Windows.Tests.csproj \
  --artifacts-path /work/.artifacts --logger 'console;verbosity=normal'
```

The fixture test locates the repository by walking upward from its compiled assembly, so
putting artifacts outside that tree fails the check. The initial UID-only container failed
.NET's named-mutex setup; the SDK image's default account worked. The SDK container is a
local test environment with read-only source input, not the non-root gateway deployment.

For complete unit coverage with the selected Lean environment preserved, run the test
command directly; the aggregate runner's login shell resets this machine's custom PATH:

```sh
node --test --test-concurrency=4 tests/unit/*.test.js tests/unit/**/*.test.js tests/unit/**/**/*.test.js
node scripts/check-lean-proofs.mjs
```

The E2E harness searches `/usr/bin/node` for its older-version negative control. If your
Node 24 executable lives elsewhere, run `scripts/reproduce-llm-shield-stage4k.sh` with that
executable's directory first on PATH and require exit 2. Keep the original suite's skip
visible alongside this separate successful refusal check.
