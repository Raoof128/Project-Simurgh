# Phase 4: reproduce the saved model trajectories

This package replays the frozen phase 3 proposals through the native SDK, isolated
proposal worker and localhost inbox. It retains a raw SQLite snapshot after every
decision and compares the entire result with the published phase 3 report.
**It does not rerun Llama inference or establish outside-operator independence.**

The [design and ledger](../REPRODUCTION_PHASE_4.md) define the scope. Phase 3's
[results and limitations](../model-phase-3/README.md) remain unchanged, including
31 unsuccessful attacked branches under enforcement.

## Operator procedure

Use Linux x86_64 and Python 3.12 with permission to start localhost receivers and
apply the existing Linux seccomp worker restrictions. No GPU, model weights,
provider credential or real service is needed. Full Git history is required to
check phase 3's protocol commit. Do not use a ZIP download or shallow checkout.

From the checked-out repository root, create an environment outside the checkout.
These commands install only hash-pinned wheels and preserve bytecode-free execution:

```sh
export PYTHONDONTWRITEBYTECODE=1
python3.12 -m venv /tmp/simurgh-phase4-venv
/tmp/simurgh-phase4-venv/bin/python -m pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
/tmp/simurgh-phase4-venv/bin/python -m pip check
/tmp/simurgh-phase4-venv/bin/python tools/assurance-reproduce/reproduce.py preflight
/tmp/simurgh-phase4-venv/bin/python -m unittest discover -s tools/assurance-reproduce/tests -v
/tmp/simurgh-phase4-venv/bin/python tools/assurance-reproduce/reproduce.py run \
  --out /tmp/simurgh-phase4-operator-run
```

Choose unused paths; the runner refuses to overwrite a previous output directory.
Preflight refuses wrong platform, direct dependency versions, changed bound sources
or an unavailable protocol commit. Seccomp compatibility is exercised by the real
SDK tests and run, not certified by a platform string. Missing prerequisites are
failures, never skips counted as successes. Dependencies are needed for replay;
pack verification alone uses the Python standard library and the trusted checkout.

The final stdout receipt contains `manifest_sha256`. Copy that digest into an
operator-controlled record **outside the output directory before distributing the
pack**. The producer's digest delivered beside a pack establishes consistency only.
Run offline verification with the digest already held in your trusted record:

```sh
python3 tools/assurance-reproduce/reproduce.py verify \
  /tmp/simurgh-phase4-operator-run/evidence.zip \
  --expected-root "$SIMURGH_EXPECTED_ROOT"
```

`SIMURGH_EXPECTED_ROOT` is a public digest, not a credential. Set it from the trusted
record. Do not calculate it from an untrusted pack as part of verification.
For the published author-operated pack, the root is committed in `ROOT.sha256`:

```sh
python3 tools/assurance-reproduce/reproduce.py verify \
  docs/research/reproduction-phase-4/evidence.zip \
  --expected-root "$(cat docs/research/reproduction-phase-4/ROOT.sha256)"
```

This last command trusts the checked-out commit, including its code, contract and
root file. An attacker able to replace that trust anchor can replace the evidence.
Archive member hashes alone do not authenticate an operator or prove completeness
outside the fixed capture. Pack verification reads archived paths without extracting
them and checks the exact expected set of raw snapshots and decision identities.

## What to retain and compare

Retain `evidence.zip`, `receipt.json`, stdout/stderr, install logs, the checkout commit,
your separately stored digest, and the [operator record](OPERATOR_RECORD.md).
The archive includes `metadata.json`, `report.json`, `observations.json`, one SQLite
database per decision, and the path/hash manifest. Metadata records installed package
versions, Python/OS/SQLite versions and replay elapsed time. The operator decides what
machine/affiliation details to disclose; do not add private identifiers to the corpus.

The full report must equal the phase 3 baseline, including every row, outcome and
summary; the raw receiver payload and deterministic receipt key must agree at each
step. Every blocked/declined/invalid decision still has an empty receiver snapshot.
The baseline totals are 540 branches and 763 decisions. Nonempty snapshots are not
independent model generations. No failure may be deleted or rerun away: preserve the
failed directory, explain the discrepancy and use a new path for any corrected run.

On failure, the command exits nonzero and retains partial evidence plus `failure.json`
when the run has started. It does not issue a success receipt. A failed observer can
leave an effect with no observation; that is incomplete evidence, never a clean result.
The per-decision journal is flushed/fsynced; the pack is not a power-loss-durability
claim. Completion only applies to a successfully verified archive.

## Custody and disclosure limits

- Receiver credentials are freshly generated in each reproduction, supplied over a
  pipe and never stored in this evidence archive. Snapshots contain synthetic report
  contents and receipt keys, not credentials. Never substitute customer data.
- The observer runs as a separate process with a separate SQLite reader, but the host,
  kernel, operator and filesystem are shared. This is implementation diversity and
  retained evidence, not an independent security or custody boundary.
- The run reexecutes saved proposals. Original model tokens, generation randomness,
  capture authenticity and model quality are not independently remeasured here.
- Exact report equality tests deterministic behavior of this frozen composition. It
  does not certify real identity providers, real inboxes or broad incident prevention.
- An external operator must control their environment, retain their own evidence/root,
  disclose affiliation and publish discrepancies. An internal agent, fresh local clone
  or hosted CI run does not meet that requirement. No outside receipt exists yet.

## What this pays down

G23 receives a portable, pinned reproduction entry point. G19 receives retained raw
effect evidence, exact inventory checks and tamper tests within a trusted-host scope.
G18 remains open until an outside operator executes and supplies their own record.
Recovery improvements, broader tasks, real identity and vendor connectors remain open.
