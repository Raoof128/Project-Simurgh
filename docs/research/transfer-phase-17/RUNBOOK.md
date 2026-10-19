# Reproduce the provider-transfer evidence

Use a full Git checkout, Python 3.12 and the pinned SDK dependencies. No provider key,
model download or paid inference is needed for verification. Source commits must remain
available: the verifier checks committed input bytes as well as the live source files.

```sh
python3.12 -m venv /tmp/simurgh-review
/tmp/simurgh-review/bin/python -m pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock \
  -r tools/assurance-workflow/requirements.lock
export PYTHONDONTWRITEBYTECODE=1
/tmp/simurgh-review/bin/python -B -m unittest discover -s tools/assurance-transfer/tests -v
/tmp/simurgh-review/bin/python -B -m unittest discover -s tools/assurance-provider-role/tests -v
```

## Short demonstration

Replay the actual captured, corrected OpenAI tool proposals through fresh local services:

```sh
/tmp/simurgh-review/bin/python -B tools/assurance-provider-role/corrected_roles.py demo \
  --archive docs/research/provider-role-phase-17b/evidence.zip \
  --expected-root "$(cat docs/research/provider-role-phase-17b/ROOT.sha256)"
```

The output distinguishes two authorized effects, one active decline, five restricted declines, and the earlier effect
whose acknowledgement was lost. A model decline is not counted as a guard blocking an
attempted call. The transfer unit suite separately submits owned synthetic calls in all
eight lifecycle states to verify that enforcement remains effective when a model calls.

## Full verification

```sh
/tmp/simurgh-review/bin/python -B tools/assurance-transfer/transfer_study.py verify \
  --archive docs/research/transfer-phase-17/evidence.zip \
  --expected-root "$(cat docs/research/transfer-phase-17/ROOT.sha256)"
/tmp/simurgh-review/bin/python -B tools/assurance-provider-role/corrected_roles.py verify \
  --archive docs/research/provider-role-phase-17b/evidence.zip \
  --expected-root "$(cat docs/research/provider-role-phase-17b/ROOT.sha256)"
```

The first command checks exact identities, model request/proposal linkage, source freezes,
all raw storage, both complete reliability epochs and recomputed metrics. It freshly
executes all 288 comparison branches and the original eight workflows. The second command
checks the corrective source freeze, original evidence binding, combined budget and all
eight corrected workflows. Reliability timing values are observations, not replay-equal
expectations; the original schedule validator recomputes their storage invariants.

The archive root is an integrity pin supplied by this repository, not an independent
witness. Local replay is not independent reproduction. API responses are captured claims
from the client; they are not provider-signed attestations or a billing invoice.

## New inference

The published experiments are closed. To run a new study, create a new output directory,
new study identity and declared budget before capture; preserve the existing archives.
The original CLI uses `openai`, `meta` and `soak` subcommands. The local model worker verifies
the exact existing Meta weight manifest, runs offline and receives no inherited provider
credential. Never place a key in command arguments or repository files: `--key-file` takes
the path to a permission-restricted local file, not a key value.

The original experiment used 64 API calls; the separately declared host-role correction
permits 16 more, within the same $1 total budget. It is a post-observation implementation
correction and is presented alongside, never substituted for, the original result.

## Native platform scope

`.github/workflows/provider-transfer-native.yml` runs both Swift package suites on macOS
and the .NET daemon suite on Windows, then compiles the Windows affinity fixture. It checks
nonzero test execution and saves source/toolchain receipts. Compilation does not exercise
window exclusion or display capture. Interactive desktop behavior, provider entitlements,
production deployment capacity and the interrupted whole-change review remain separate.
