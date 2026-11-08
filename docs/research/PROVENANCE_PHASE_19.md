# Phase 19: authority provenance

Declared 1 November 2026 (Australia/Sydney), baseline `30fe9e4b`, under the owner's instruction to
proceed with the gauntlet-revised design
([Phase 19 v2.1](../superpowers/specs/2026-11-01-phase-19-authority-provenance-design.md)).
Phase 19a, 19b, 19c, 19d and 19g are executed here; 19e is executed as an instrument without spend
(the capture itself is owed under `IOU-19-SPEND`); 19f is executed as a handoff package (the
outside replay itself is owed under `IOU-19-OPERATOR`).

## Design and scope

The 1 November gap hunt ranked fifteen gaps from 230 lab pages; the design answers them with an
agent-writable manifest, provenance-tagged decision records, a belief-sensitivity receipt and one
lane per gap. Phase 19a is the only sub-phase with no new runtime mechanism: a verifier and a pack
that recompute four projections from the frozen Phase 17 archive (declines/blocks/admits per
generation and control; an awareness-flag sidecar that is not evaluable on this archive; coverage as
three counts with an architectural denominator; a judge-free row and the forced-call citation).
Results: [provenance-phase-19a/RESULTS.md](provenance-phase-19a/RESULTS.md).

Phase 19b-1 ([plan](../superpowers/plans/2026-11-01-phase-19b-write-anywhere-lane.md)) adds, over
the unpinned successor pipeline, the Agent-Writable Manifest with a reader census, the write-anywhere
differential lane with nine reader mutants as positive controls, signed provenance-tagged decision
records with an offline verifier, the signal-outage hold and acknowledgement-bound lease renewal,
and a Lean transition-system model with a differential test against the running gate. 19b-2 adds
the host-issued approval token with a seven-way forged-token matrix, the re-implemented dispatch
that admits a token-approved ungranted action under the frozen budget, fact and duplicate rules,
and the `tool_result_body` reader as the fourth wired channel, which closes 19b (`closed_by` in the
receipt).
Results: [provenance-phase-19b/RESULTS.md](provenance-phase-19b/RESULTS.md).

Phase 19c ([plan](../superpowers/plans/2026-11-01-phase-19c-forked-receiver.md)) forks the frozen
receiver inside the namespace and adds eight reasons after the six frozen ones: run-bound credentials,
holder-bound sessions, an approved-input manifest (`substituted_input`, G28), a canonicalising
receiver with two effect classes for the route corpus, per-call and running limits, administrative
revocation and grant scope. Every lane is receiver-direct and drives the frozen receiver on the same
bytes. Results: [provenance-phase-19c/RESULTS.md](provenance-phase-19c/RESULTS.md).

Phase 19d ([plan](../superpowers/plans/2026-11-01-phase-19d-namespace-egress.md)) runs a worker
inside a Linux user and network namespace with no route, a parent-owned Unix-socket proxy as its
only path, per-namespace kernel counters as the canary and a live-reader control. Nine cases hold;
the covert-filesystem channel is measured and reported, not closed. Linux only; the pack was produced
in a privileged Linux container on the authoring Mac. Results:
[provenance-phase-19d/RESULTS.md](provenance-phase-19d/RESULTS.md).

Phase 19g ([plan](../superpowers/plans/2026-11-01-phase-19g-evaluator-kit-and-deployer-profile.md)) runs a
seeded incident drill on the successor rig (plant, detect, admit-in-flight, stop, revoke, preserve,
in-flight fate, intervals) and generates a deployer incident record from receiver and host snapshots
against a committed schema that fixes `claimed_prevented` at zero. Two attested documents sit beside
the pack: the deployer profile and the embedded-evaluator kit; their delivery is owed. Results:
[provenance-phase-19g/RESULTS.md](provenance-phase-19g/RESULTS.md).

Phase 19e ([plan](../superpowers/plans/2026-11-01-phase-19e-capture-instrument.md)) commits the capture
instrument without calling a model: three framings of the 24 Phase 17 tasks with digests, the Wilson
and Newcombe emission-shift estimator with a floor-or-ceiling flag, a scripted control with declared
rates that the estimator recovers, the `IOU-19-SPEND` declaration (models, scope, cap, stop rule,
authorisation not given) and the informed-attacker bundle at `not_run`. Results:
[provenance-phase-19e/RESULTS.md](provenance-phase-19e/RESULTS.md).

Phase 19f ([plan](../superpowers/plans/2026-11-01-phase-19f-outside-operator-handoff.md)) commits the
outside-operator handoff package: a document generated from the committed receipts with custody rules,
one verify command per executed phase and the expected fields (host-dependent fields excluded), a
discrepancy template, a field-by-field comparator for returned receipts and a status that reads `owed`
until a receipt is reviewed. No pack: nothing ran that a pack could bind. Package:
[provenance-phase-19f/README.md](provenance-phase-19f/README.md).

Trusted host, provisioning, storage and receiver, as in the README. The frozen modules are neither
edited nor imported except for the optional Linux replay chain. Recomputing the project's own
archive is not custody evidence.

## Write scope and gate lifecycle

Add `tools/assurance-provenance/**`, `docs/research/provenance-phase-19a/**`,
`docs/research/provenance-phase-19b/**`, `docs/research/provenance-phase-19c/**`, `docs/research/provenance-phase-19d/**`,
`docs/research/provenance-phase-19g/**`, `docs/research/provenance-phase-19e/**`, `docs/research/provenance-phase-19f/**`, `docs/assurance/egress/ERRATA.md`, `proofs/phase19/**`, this ledger and the
Phase 19 design, plan, plug-in map and gauntlet records under `docs/superpowers/`. Modify
`.prettierignore` (P19-FORMAT01 to 07: evidence files and the generated handoff, bytes preserved), `AGENT.md`,
`CHANGELOG.md`, and `scripts/check-lean-proofs.mjs` (floor 39→40, in the commit that adds the proof).
Modify nothing frozen. The CI workflow `.github/workflows/assurance-provenance.yml` is added under P19-CI01 in one commit
with the Stage 5Q census re-pin, after this declaration.

**P19-CI01 (exercised 1 Nov 2026).** When the workflow is added, that single commit may modify
only `current` in `docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json` for the exact
new CI identities measured by `measureGateCensus.mjs` against the draft workflow (Phase 9 added one
identity for its step; the count here is measured, not assumed), and must carry a `paths:` filter on
`tools/assurance-provenance/**` and `docs/research/provenance-phase-19a/**`. This declaration must be
a strict ancestor of that commit. Preserve all non-current fields.

**P19-LEAN01 (authority for one Stage 5S test edit).** `tests/unit/llmShield/stage5s/theoremSet.test.js`
test `[5s-t26]` pins the repository Lean floor at exactly 39 and the gate's discovered count at exactly 39. Adding any proof, which `scripts/check-lean-proofs.mjs` itself instructs the adding task to do by
raising the floor, breaks it. That is a count pin of the Q1-F002 species named in
`docs/research/llm-shield/references/gate-lifecycle.md` (pin sets, not counts). This declaration
authorises changing those two assertions to monotone bounds (floor at least 39; discovered count at
least the floor; the gate must still report zero escape hatches and all type-check) and nothing else in
that file. This declaration commit must be a strict ancestor of that edit.

**P19-REPAIR01 (bounded repair authority for the 19g verifier).** The first hosted run of the
workflow (run `41306753664`, `ubuntu-latest`, Python 3.12, commit `e58f9688`) verified the 19a pack
with the frozen Phase 17 replay chained and the 19b, 19c, 19d and 19e packs, and refused the 19g
pack with `incident_digest_mismatch`. Cause: `incident19.verify_record` compared the record's
`evidence_digests` values with a fresh drill's, although the 19g protocol, results and receipt
declare snapshot digests reported, not compared. The values are sha256 of sqlite file bytes and
sqlite writes its library version into every file header, so they agree only on the sqlite build
that produced the pack (reproduced on the authoring Mac with Python 3.12.4 and sqlite 3.45.3). This
declaration authorises, and nothing else: in `tools/assurance-provenance/incident19.py`, replacing
that value comparison with an inventory check (the fresh drill's snapshot names, each value a sha256
hex string; reason `digest_inventory`); the matching tests in `tests/test_incident19.py` and
`tests/test_evidence19g.py`, including a cross-build regression; regenerating the 19g pack
(`protocol.json`, `report.json`, `incident-record.json`, `receipt.json`, `evidence.zip`,
`ROOT.sha256`) from the commit that carries the fix; the verifier paragraph of the 19g results; and
re-rendering the 19f handoff from the regenerated receipt. The refused pack (root `6e534e5c…`)
stays in history at `9d1ae938`. No other pinned source, no frozen file and no workflow step
changes. This declaration commit must be a strict ancestor of the repair.

**P19-REPAIR02 (bounded repair authority for the 19d covert probe; declared 8 Nov 2026, owed, not
yet exercised).** The replay on `portfolio-droplet` (Ubuntu 24.04.3, x86_64, CPython 3.12.3, commit
`6a10a4b9`) verified every pack and failed one suite test,
`test_lanes19d.Lanes19dTests.test_covert_probe_reported_not_closed`, with `0 not greater than 0`.
Cause, confirmed by running the probe alone on that host: `lanes19d.covert_probe` runs `python -c`
inside the
namespace while every other 19d worker runs `sys.executable`; stock Ubuntu ships `python3` only, so
`unshare` exits 127 (`failed to execute python`), the file is never written and the probe reports
`bytes_delivered: 0` with the exit code discarded. The 19d `verify` passed because the probe is
reported, not compared (results §3), so the receipt stands and the hidden assumption is the lane's.
This declaration authorises, and nothing else: in `tools/assurance-provenance/lanes19d.py`, running
the probe under `sys.executable` and raising on a non-zero exit (reason `covert_probe_failed`); a test
for that failure path in `tests/test_lanes19d.py`; regenerating the 19d pack on a namespace host from
the commit that carries the fix; the probe paragraph of the 19d results; and re-rendering the 19f
handoff from the regenerated receipt. Until it is exercised, the suite on a host without `python` on
`PATH` fails that one test, and this ledger says so.

**P19-REPAIR03 (bounded repair authority after the 8 Nov 2026 strict audit; declared before any
repair commit).** A six-lane line-by-line audit of Phase 19 on `main` at `47fbd6b6` (report retained
with the session; findings reproduced by the lead before inclusion) found three blocking and twelve
major defects. This declaration authorises, and nothing else, the following, each with a reproducing
test written first:

1. `gate19.py`: `dispatch_approved` re-runs the frozen admission (`Session.authority`, actor active,
   source match, checkpoint, configured-action equality) and replaces only the grant-set term; the
   token payload gains `actor` and `verify` gains `approval_actor`; every decode and arithmetic error
   in `verify`, `approval_from_tool_result` and `ack_renewal` is a schema refusal, never an exception;
   `approved_decision` spends the nonce it approves; relayed bodies are length-capped.
2. `provenance.py`, `lane.py`: an approval-admitted dispatch emits an `operator_signed_approval`
   input naming the token digest; `decision_id` is unique per lane; `verify_records` raises
   `ValueError` only; `impl_hash` covers `gate19.py`, `rig.py` and `lane.py`.
3. `evidence19b.py`: `closed_by` gains floors (at least 13 mutants, at least 7 forgeries, at least 4
   wired channels) and `lean_differential_passed_on_this_host`; the receipt reports the verifying
   host's Lean result and the enumeration count as measured; `states_compared` is computed.
4. `receiver19.py`, `lanes19c.py`: `canonical` keeps case for paths; the effect payload carries the
   canonical resource; the holder-proof helper returns `None` on mismatch and `send` refuses; the
   route corpus gains alias rows of a granted resource and an identity-canonical ablation that must
   fail; the strawman sentence is corrected in the results.
5. `egress19.py`, `lanes19d.py`: the proxy's role comes from the socket it serves, never from the
   request; every exception in `_serve` is a `malformed` decision with a log line and a recv
   timeout; methods are allow-listed; `canonical_url` keeps IPv6 brackets and decodes to a fixed
   point; `covert_probe` runs under `sys.executable` and a non-zero exit fails the lane
   (P19-REPAIR02 is exercised here); a reachable-Unix-socket probe is added and reported, not
   compared.
6. `evidence19d.py`, `evidence19e.py`, `evidence19g.py`: every receipt field derives from the
   verifying host's recomputation (`actual`), never from the saved report; `compare` binds the whole
   report after normalising only the fields each results file names as host-dependent; the 19d
   receipt gains `unix_sockets_reachable` (reported); the 19e compare binds the spend declaration,
   models, cap, stop rule and informed-attacker digests; the 19g compare binds every step field
   except the snapshot digest values.
7. `drill19.py`, `incident19.py`: the interval fields are renamed `*_logical_steps` and described
   as scripted sequencing checks; the third verdict is read from the stop step; the record's
   description says "from the drill's dispatch verdicts and the receiver's effect count".
8. `capture19.py`: the framing note moves to the system role; the awareness rule matches whole
   words and excludes the framing text; the Llama note reads 22 of 24; temperature and seed are
   declared.
9. `handoff19.py`: `check` flags unexpected fields; the handoff states the venv, preflight,
   namespace-host and Lean recipes and the comparator's limits.
10. `projection.py` is pinned by every pack. The Lean model gains an approval input and a `held`
    enumeration; the differential passes tokens.
11. `.github/workflows/assurance-provenance.yml`: the user-namespace sysctl runs before the unit
    tests; path filters gain every pinned dependency; the Stage 5Q census is re-pinned by set in
    the same commit for any new step identity.
12. Regenerating the 19b, 19c, 19e and 19g packs on the authoring host and the 19d pack on a
    namespace host from the commit that carries the fixes; re-rendering the 19f handoff; the
    results, README, deployer profile and evaluator kit sentences the audit listed as false; the
    hosted README's corroboration sentence; and the IOU settlement below.

Write scope additionally includes `docs/research/provenance-phase-19-hosted/**`, and the
`.prettierignore` entries are P19-FORMAT01 to 08. No frozen file changes. This declaration commit
must be a strict ancestor of every repair commit.

**IOU settlement (8 Nov 2026).** The design minted ten IOUs; this ledger had named three. Status of
each: `IOU-19-LEAN` and `IOU-19-REFINEMENT` paid in 19b (`06d499f4`: model, differential) with the
closure dependence added under REPAIR03; `IOU-19-NETNS` paid in 19d (`decdf0f6`: launcher);
`IOU-19-DRILL` paid in 19g (`e8bff1ed`: a recomputable drill, exceeding the design's "attested");
`IOU-19-CANARY` (second-operator canary) folded into `IOU-19-OPERATOR`, owed; `IOU-19-GPTOSS` folded
into `IOU-19-SPEND`, owed; `IOU-19-JUDGE-LEDGER` owed to a separate stage, not Phase 19;
`IOU-19-SPEND`, `IOU-19-OPERATOR`, `IOU-19-KIT` owed as before. P19-CI01's "single commit" was
exceeded: `current` changed in `25839d5e`, `decdf0f6` and `5b7382d1`; the two later changes were
ruled after the fact and are recorded here as an overrun, not a widening. Authorship: every Phase 19
commit was co-authored by a model agent (Claude Opus 5.5 or Claude Mythos 5.1) under the owner's
instruction; the four gauntlet reviews were model reviews; no human outside the owner has read the
work.

**P19-REPAIR04 (bounded authority for the two machine-closable items the 8 Nov 2026 audit left open;
declared before any repair commit).** After P19-REPAIR03 the ledger said two things were measured but
not closed by any machine: the 19d namespace confined IP routing only (the Docker engine and
systemd-resolved were reachable over filesystem Unix sockets from inside it on a stock Ubuntu host),
and the hosted workflow read the expected pack roots from the same checkout it verified. This
declaration authorises, and nothing else:

1. `egress19.py`: the worker launch adds mount, PID and IPC namespaces, mounts a private `tmpfs`
   over `/run` and `/dev/shm` before the worker starts, and drops every capability except
   `CAP_NET_ADMIN` (the live-reader control brings loopback up); `can_namespace` is true only where
   that whole launch works. The work directory stays shared by design (the measured covert channel).
2. `lanes19d.py`, `evidence19d.py`: the socket probe's `eliminated` follows what it measured and
   names its residual (sockets elsewhere on the shared filesystem); the namespace description and
   the non-claims say what is now hidden and what is not; a test inside the namespace asserts PID 1,
   empty `/run` and `/dev/shm`, and the single capability.
3. `.github/workflows/assurance-provenance.yml`: one step compares each committed `ROOT.sha256`
   with the repository variable `PHASE19_ROOTS` (set outside any pull request by the owner's
   account) and fails on a mismatch or an unset variable; the Stage 5Q census is re-pinned by set in
   the same commit if the step is a problem gate.
4. Regenerating the 19d pack on a namespace host from the commit that carries the fix; the 19d
   results, README and the deployer profile; re-rendering the 19f handoff; the hosted README; this
   ledger's ruling; both logs.

Not authorised: seccomp, a minimal root filesystem, hiding the work directory, or any change to
another lane's source. This declaration commit must be a strict ancestor of every repair commit.

**P19-CI02 (receipt retention).** The workflow writes each phase's receipt on the runner and
discards it, so the first hosted run's 19a `--replay` outcome survives only as one printed
assertion line in the job log. This declaration authorises one named step at the end of
`.github/workflows/assurance-provenance.yml` that uploads `receipt-19*.json` as a run artifact under
`if: always()`, pinned to the `actions/upload-artifact` commit the repository already uses
(`ea165f8d…`, v4.6.2). The step has no `run:` scalar, so `measureGateCensus.mjs` measures no new
identity: `current` in the Stage 5Q problem-gate set is not modified and the checker must stay
set-identical (53). It further authorises committing the receipts of the first green run after that
step, unchanged, under `docs/research/provenance-phase-19-hosted/` with the run id, commit and
artifact digest, and exempting those bytes from prettier (P19-FORMAT08). A hosted receipt is the
project's own runner recomputing the project's own evidence: it is not custody evidence and does
not pay `IOU-19-OPERATOR`. This declaration commit must be a strict ancestor of the workflow edit.

**P19-CI03 (toolchain install resilience; declared 8 Nov 2026 before the edit).** Every hosted gate
that needs `lean` installs the toolchain with the same five inline lines, and each of them asks
`releases.lean-lang.org` once. On 8 Nov 2026 that host answered 502 and 504 for hours; the Phase 19
workflow and the Stage 1 quality gate on PR #152 failed in their install steps for a reason that had
nothing to do with the repository (runs `42468683455`, `42468683397`). This declaration authorises,
and nothing else: one new script, `scripts/install-elan-toolchain`, that fetches the pinned elan
release (sha256 checked, curl retries), asks elan for the toolchain named by a `lean-toolchain` file
up to six times, and when the release host is still down fetches `lean-4.15.0-linux.tar.zst` from the
Lean GitHub release page, checks it against a sha256 pinned in the script
(`af71a2569a9f68337de2434829b3008cd8e32c436e9cb6bd8c84a2c2ba3585c9`, measured on 8 Nov 2026 from
both hosts, identical) and links it into elan under the pinned toolchain name; replacing the inline
body of the elan step in `.github/workflows/assurance-provenance.yml` and of the Lean step in
`.github/workflows/stage-1-checks.yml` with a call to it; adding the script to the Phase 19
workflow's path filters; the ruling; both logs. The fallback pins what elan does not: elan verifies
no digest the repository chose. The script carries no `.sh` suffix because the Stage 5Q census
treats a named `*.sh` in a `run:` body as an enumerated artifact; both steps must classify exactly as
they do today and the problem-gate set must stay set-identical (53). Not authorised:
`stage-4-lean-proofs.yml` (F001's live premise, spec §14.2), `stage-5q-checks.yml` and
`stage-5s-checks.yml` (5Q Annex A5.3: their own single-file pull requests), any other step, any
change under `tools/`. Recorded against this ledger's own rule: `a814c6f0` made the elan step
install the toolchain eagerly before any declaration named that edit; this declaration replaces
that step body and the lapse stands in the ruling. This declaration commit must be a strict
ancestor of the edit.

| Field                         | Declaration                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| active_phase                  | Phase 19a projection verifier (19b–19g declared)                                                                    |
| protected_surface             | New source/tests, protocol and retained pack under the new namespace                                                |
| next_phase_behaviour          | 19b–19g add lanes in the same namespace, subclass the unpinned successor, and never edit a pinned file              |
| maintenance_behaviour         | Bounded repair authority precedes any change to the protocol's pinned sources                                       |
| sunset_or_migration_condition | A versioned successor preserves the 288-branch projection and its verify command                                    |
| anti_vacuity_condition        | 288 split rows and 96 sidecar rows recomputed; five named mutations and a wrong root rejected with distinct reasons |

## Execution ledger

- Ruling: design approved only after a four-review gauntlet; v1 failed (41 findings), v2.1 holds with
  0 P0/P1 open in text. 19a approved outright by the closure reviewer; 19b/19c text fixed after that
  review and not independently re-read.
- Ruling: the pack was produced on macOS without the frozen replay chain, after the lane sources
  were committed; `receipt.json` records the host outcome and the commit in `tree_state`. A Linux
  run with `--replay` is owed before any "replayed" wording.
- Tests: 18 passed for 19a; 57 passed for the namespace after 19b-1 (`tools/assurance-provenance/tests`),
  ruff clean, Lean proof gate 40/40. No hosted CI receipt yet.
- Ruling: the 19a protocol pinned the lane directory by glob; adding the 19b-1 modules invalidated
  the committed 19a pack (`protocol_inventory`). The pin is now an explicit file set (pin sets, not
  counts) and the 19a pack was regenerated from the lane commit that carries the fix.
- Ruling: 19b-1 ended with three wired deterministic channels; 19b-2 wired the fourth and the
  receipt now reads `phase_19b_closed: true` on six named conditions. Not among them: the native
  delivery path (not exercised on this host) and any outside replay.
- Ruling: of the workflow's five run steps the census classified three as problem gates (the elan
  install as `unclassifiable_step`, the two pack-verify steps as `missing_committed_universe_query`)
  and two as ordinary steps; `current` gained exactly those three ids (48 → 51), `baseline` untouched. The workflow installs elan so the Lean differential test runs
  rather than skips, and chains the frozen Phase 17 replay through the 19a verifier on Linux x86_64,
  which the authoring host could not. No hosted run has executed yet; the first run's receipt is owed.
- Ruling: 19d's canary is the absence (no route, `ENETUNREACH`, zero counter movement) with a
  live-reader control, because a fresh network namespace fails a connect before any segment is
  built; the design's "counters move" expectation was wrong and the probe corrected it. The 19d
  workflow step runs under `sudo` because hosted Ubuntu runners may restrict unprivileged user
  namespaces; the census gained that step's id in the same commit.
- Ruling: 19c is receiver-direct by design (gauntlet M5). The strawman is a power check and G22 is
  not paid. A POSIX leading double slash is not a receiver's canonical form; the canonicaliser
  collapses it.
- Ruling: an invalid relayed approval never reduces authority. It is recorded with its reason and
  the ordinary grant path decides; otherwise the tool-result channel would be a denial lever.
- Ruling: 19g's drill reports the admitted-then-dropped attempt as `unknown` and the record's
  `claimed_prevented` is a schema constant of zero; a prevention claim for an unknown outcome is the
  exact wording the labs' cards use and the lane refuses it. Snapshot digests are reported, not
  compared, because they vary with the sqlite build. The deployer profile and the evaluator kit are
  attested; nobody outside the project has read them yet.
- Ruling: 19e ships as an instrument because spend needs the owner's explicit authorisation and
  none was given. The framing line is trusted-channel text above the untrusted source, so a shift
  could not be read as source-obedience. The scripted control is a positive control for the
  estimator and is not evidence about any model; the receipt says `model_inference: false`.
- Ruling: 19f ships as a package because the replay needs a person. The comparator excludes only
  `tree_state`, `host` and `replay`; the manifest root and every count must match on the operator's
  machine. A received receipt does not pay `IOU-19-OPERATOR`; the review with every discrepancy
  published does. The generated handoff is exempt from prettier (P19-FORMAT07) because its test
  asserts byte equality with the render.
- Ruling: the 19e and 19g packs verify in one added workflow step; the census classified it as
  `missing_committed_universe_query` like the other pack-verify steps and `current` gained exactly
  that id (52 → 53) in the same commit, `baseline` untouched. The workflow's path filters gained the
  two evidence directories.
- Ruling: the first hosted run (`41306753664`, `e58f9688`) passed the suite (135 tests, 10 skipped)
  and verified 19a with the frozen replay chained, 19b, 19c, 19d and 19e, and refused 19g with
  `incident_digest_mismatch`. The 19g verifier compared snapshot digest values that the protocol
  declares reported, not compared. Repaired under P19-REPAIR01: the record's digest inventory is
  compared and the values are reported, with a regression test that emulates another sqlite build.
  The pack regenerated from `e8bff1ed` (root `2fa16e8d…`) differs from the refused one only in the
  three re-bound source digests, the snapshot digest values, `protocol_sha256`, the root and
  `tree_state`. It verified on the authoring Mac under sqlite 3.45.3 and 3.53.1; under 3.53.1 the
  refused pack and verifier reproduce the refusal.
- Ruling: P19-CI02 exercised in `94b8217b`. The census measured the same 58 steps with the same
  classification and the checker stayed set-identical (53). The second hosted run (`41623244388`,
  `94b8217b`, `ubuntu-24.04`, CPython 3.12.15) passed every step (suite 138 tests, 10 skipped) and
  its six receipts are committed byte for byte in `provenance-phase-19-hosted/` with the artifact
  digest. The 19a receipt reads `frozen_replay_chained` with `replay.result: verified`: the Linux
  x86_64 replay this ledger owed ran on the project's own hosted runner. That is recomputation by
  the project, not custody, and `IOU-19-OPERATOR` stays owed.
- Ruling: the hosted 19a receipt exposed a comparator defect in 19f. The handoff tells a Linux
  operator to add `--replay`; the comparator excluded `replay` but compared `kind`, which follows
  from it, so the instructed run would have been published as a discrepancy. Fixed in `6a93b39a`:
  the expected `kind` follows the operator's own verified replay and no other pairing, and the
  handoff states the rule. `handoff19.py` is not pinned by any pack protocol, so no pack changed.
  The six hosted receipts compare with no discrepancy.
- Ruling (8 Nov 2026): PR #148 (Stage 5R parity driver writes its signed receipt only under
  `--write`) merged to `main` at `ccd50943` with a green hosted gate; `main` merged into this branch
  at `1ea82c8f` without conflict (four Stage 5R files only; 391 Stage 5R unit tests pass locally).
  PR #149 is re-checked on that head. `IOU-19-SPEND`, `IOU-19-OPERATOR` and `IOU-19-KIT` are unchanged.
- Ruling (8 Nov 2026, second host): with PR #149 merged (`937ec70b`), the six packs were replayed
  on `portfolio-droplet`, the owner's own virtual machine (Ubuntu 24.04.3, x86_64, 2 vCPU, 2 GB,
  CPython 3.12.3, SQLite 3.45.1), from a fresh clone of `6a10a4b9` with the hash-locked dependency
  set in a venv and `replay-preflight` passing. All six verified; 19a with the frozen Phase 17 chain
  replayed (`frozen_replay_chained`, `replay.result: verified`); `handoff19.py check` reports no
  discrepancy for any of them, and each differs from its hosted counterpart only in `tree_state`.
  The receipts are committed byte for byte in `provenance-phase-19-hosted/droplet-portfolio-2026-11-08/`.
  The host is the project's and the session that drove it was the project's agent with the
  project's key, so this is a second project-operated host, a third machine class beside the hosted
  runner and the authoring Mac (bare VM, root, namespaces without `sudo`, no Docker, no Lean). It
  does not pay `IOU-19-OPERATOR`, and `IOU-19-SPEND` and `IOU-19-KIT` are unchanged. The lane suite
  on that host: 139 tests, 3 skipped (no Lean toolchain; the two off-host refusal tests), one
  failure, `test_lanes19d.Lanes19dTests.test_covert_probe_reported_not_closed`, whose cause was
  confirmed on the host and whose bounded repair is declared as P19-REPAIR02 and owed.
- Ruling (8 Nov 2026, P19-REPAIR03 exercised): every item of the declaration landed in the commits
  after `8d9f5ce8` on `phase-19/repair-03-audit`, each behind a reproducing test. The approved path
  re-runs the frozen admission and replaces only the grant-set term; tokens are actor-bound (eighth
  forgery `approval_actor`); hostile relayed bodies are schema refusals; the native decision spends
  its nonce; approvals leave a provenance input. The 19b closure has floors and the Lean differential
  on the verifying host (96 states with host approvals, 0 mismatches); the Lean model carries the
  approval input, so "admitted implies registered or approved" is now what both the proof and the
  gate say. The receiver keeps path case, records the canonical resource, and never fails open on a
  sentinel; the route corpus has granted-alias rows and an identity ablation that flips five of them.
  The proxy's role is the socket's, hostile lines are `malformed` decisions, methods are
  allow-listed; the 19d lane probes filesystem Unix sockets. The 19d, 19e and 19g receipts derive
  from the verifying host and their comparisons bind the whole report minus the named
  host-dependent fields. Packs regenerated: 19b root `ac086a43…` (tree `11d0dae1`), 19c
  `dd0fb73b…` (212f34e6), 19d `aa44eb45…` (d7b37242, produced on
  `portfolio-droplet`: eleven cases hold, covert probe 262,144 bytes, five daemon sockets reachable
  from inside the namespace and reported), 19e `cd74f489…` (212f34e6), 19g
  `b8d68621…` (212f34e6); 19a unchanged (no pinned file changed). The 19f handoff is
  re-rendered and the comparator reports no discrepancy for the six committed receipts. P19-REPAIR02
  is paid inside this repair. The workflow runs the namespace sysctl before the tests and its path
  filters cover every pinned dependency; the census is set-identical (the new step asserts no
  completeness). What this repair does not do: the namespace is still IP-only (the socket channel is
  measured, not closed); the drill is still scripted (now labelled so); the trust root is still read
  from the checkout; `IOU-19-SPEND`, `IOU-19-OPERATOR` and `IOU-19-KIT` are unchanged.
- Ruling (8 Nov 2026, P19-REPAIR04 exercised): the 19d worker now runs in user, network, mount, PID
  and IPC namespaces with a private `tmpfs` over `/run` and `/dev/shm` and `CAP_NET_ADMIN` as its
  only capability; a test inside the namespace asserts PID 1, no socket under either directory and
  the single capability, and it passes on `portfolio-droplet`, where the previous pack had reached
  five daemon sockets. The regenerated 19d pack (root `458f80e2…`, tree `270fb96e`, produced on the
  droplet) reports `unix_sockets_reachable: []` and `unix_socket_egress_eliminated: true` for the
  probed list, with the residual named (sockets outside the two hidden directories and the shared
  work directory). The hosted workflow now compares each committed `ROOT.sha256` with the repository
  variable `PHASE19_ROOTS`, set from the owner's account outside any pull request; the census is
  set-identical (the step asserts no completeness). Still not done, and said so: seccomp, a minimal
  root, hiding the work directory; the drill stays scripted; the three IOUs are unchanged and need
  people.
