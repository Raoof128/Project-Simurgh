# Continuation handoff — 19 October 2026

The owner will arrange a classmate. No external messages were sent. This handoff is
ready to give them; their work is not represented as already completed.

## Our completed local work

1. Phase 16: legacy live-route checks now require HTTP 410 retirement; the maintained
   reproduce list adds the strict Stage 5L successor beside the untouched historical pin.
2. Phase 8: whole-change local manual review completed with 24 passing tests and separate
   archive replay. Trusted-host assumptions and remaining review limits are recorded.
3. Phase 17: portable browser/alternate-Node discovery, real wrong-major wrapper test,
   explicit managed-policy prerequisite and a fresh-output browser parity command.
4. Phase 18: human dashboard and JSON agent CLI share the same queries and outcomes;
   source-linked research and gap search, local JSON import/export and detailed inspection.
5. The merged provider-transfer track adds 288 comparison branches and the separate live-role
   correction. These newer archives are not part of the explorer's older 144-row dataset.
6. [Full smoke validation](smoke-validation-2026-10-19/RESULTS.md) passes both prescribed
   scripts plus supplemental suites at the recorded source revisions. Native CI passes 10 macOS
   and 11 Windows tests plus fixture compilation; interactive desktop work remains unverified.
   Strict browser parity is blocked in the managed local environment. Historical bytes remain intact.

## Short independent reproduction

For current source, clone the full `openai-readiness` branch and record its commit. Follow
[README replay](../../README.md#replay-the-evidence) for the latest transfer and role-correction
archives, including hash-locked dependencies and expected roots. Do not use a shallow clone.

The earlier delivered Git bundle remains the snapshot named in its delivery manifest; it
predates the merged provider-transfer work and later smoke repairs. The bundle commands below
reproduce that older dashboard handoff, not the latest branch.
The bundle includes history needed for frozen source bindings. After cloning, verify the
expected commit and compare hashes supplied by the owner through a trusted channel.
A hash delivered alongside a malicious replacement does not establish authenticity.

```sh
git clone simurgh-continuation.bundle simurgh-review
cd simurgh-review
git rev-parse HEAD
node tools/simurgh-explorer/cli.mjs summary
node tools/simurgh-explorer/cli.mjs records --kind unauthorized
node tools/simurgh-explorer/cli.mjs records --kind unknown
```

The local CLI requires Node 24 or 26 and no installed npm packages. For UI build instructions
see `tools/simurgh-explorer/README.md`. The small standalone dashboard package includes a
prebuilt public index; it is useful for inspection but does not replace source verification.

Public-only verification uses standard-library Python:

```sh
python3 tools/assurance-export/export_evidence.py inspect \
  docs/research/export-phase-14/public.zip \
  --expected-root f71802a1906178da56c7ebc7dd19227716d65a2d99901910611f022490a8eb12
```

It checks the supplied export's inventory/aggregates. It cannot verify original action
content, inference origin, receiver effects or omission honesty. For the stronger check,
install the frozen dependencies and verify against the source pack:

```sh
simurgh_handoff_dir=$(mktemp -d "${TMPDIR:-/tmp}/simurgh-handoff.XXXXXX")
python3.12 -m venv "$simurgh_handoff_dir/venv"
"$simurgh_handoff_dir/venv/bin/python" -m pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
PYTHONDONTWRITEBYTECODE=1 "$simurgh_handoff_dir/venv/bin/python" tools/assurance-export/export_evidence.py verify \
  docs/research/export-phase-14/public.zip \
  --expected-root f71802a1906178da56c7ebc7dd19227716d65a2d99901910611f022490a8eb12 \
  --source-pack docs/research/model-composition-phase-10/evidence.zip \
  --source-root 3a63db0052b42c284b9feba94b82aa0b236e31530837c2caf42d927e2f008a96
PYTHONDONTWRITEBYTECODE=1 "$simurgh_handoff_dir/venv/bin/python" tools/assurance-reliability/reliability_evidence.py verify \
  docs/research/reliability-phase-13/evidence.zip \
  --expected-root 4fbe9f50dc2dcb23c3f89c86d1dcbd8f010995bdbe809895e31978c2ed70e3cd
```

The source verifier replays saved proposals; it is not a fresh model generation experiment.
Use Linux for the supported isolation/workflow dependencies. Report unavailable platform
features instead of changing fixtures to pass. Preserve stdout, stderr, exit codes and
versions in a directory you control. Keep `simurgh_handoff_dir` set in the same shell;
retain its logs before removing the temporary environment. Return the
[receipt template](explorer-phase-18/independent-receipt-template.json) with discrepancies and
limits, even if every executable check passed. Independent replay establishes independent
reproduction of supplied records, not independent custody of the original experiment.

## Browser and macOS

On a machine whose policy permits local test pages, set `SIMURGH_CHROME` to an existing
Chrome/Chromium executable (optional when discovery finds it), then:

```sh
node --test tests/unit/llmShield/stage5p/crossRuntimeParity.test.js
node scripts/check-browser-parity.mjs /tmp/simurgh-browser-receipt-new.json
```

The receipt path must be new. Require `three_runtime_parity: true` and exit 0; a named
skip, blocked navigation or a two-runtime result is not success for the browser claim.
Do not disable enterprise browser policy. Native macOS/CryptoKit tests need an actual
macOS host and the documented Xcode/Swift prerequisites. Linux cannot certify them.

## Provider, model and deployment work still requiring outside inputs

- **Owned provider integration:** non-secret project identifier, permitted model/API,
  signed webhook endpoint, same-project alert-read permission and owned identity service
  with rotation/revocation/session control. No secrets in the receipt. Use benign fixtures;
  do not induce an abuse incident to obtain a real safety alert. Treat unavailable fields
  as unknown. Verify receiver effects separately from stop/alert acknowledgments.
- **New model study:** separately chosen model families, a fixed spending/token budget,
  independent held-out task custodian and approved task environment. Retain all attempts,
  broken tasks, refusals and failures; compare useful completion as well as containment.
- **Sustained deployment:** representative owned service topology, concurrency/load and
  duration targets, wall-clock lease/monitor rules, queue semantics and incident ownership.
  Existing bounded fixtures cannot fill these missing deployment assumptions.
- **Real trace privacy:** explicit data owners, access, retention/deletion requirements and
  reviewer consent. The synthetic public export does not establish anonymity or a policy.

These are missing measurement conditions, not requests to redo local work or provide
credentials in chat. The dated gap register keeps them open.
