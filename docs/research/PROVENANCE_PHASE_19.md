# Phase 19: authority provenance

Declared 1 November 2026 (Australia/Sydney), baseline `30fe9e4b`, under the owner's instruction to
proceed with the gauntlet-revised design
([Phase 19 v2.1](../superpowers/specs/2026-11-01-phase-19-authority-provenance-design.md)).
Phase 19a, 19b, 19c, 19d and 19g are executed here; 19e is executed as an instrument without spend
(the capture itself is owed under `IOU-19-SPEND`); 19f is executed as a handoff package (the
outside replay itself is owed under `IOU-19-OPERATOR`); 19h, added on 10 November under P19-CAPTURE01, runs
the 19e instrument against three small local models, emission only, and does not pay `IOU-19-SPEND`.

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
`.prettierignore` entries are P19-FORMAT01 to 08 (09 added under P19-OPERATOR01). No frozen file changes. This declaration commit
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

**P19-REPAIR05 (bounded repair authority after the first second-host review of the handoff
package; declared 8 Nov 2026 before any repair commit).** The owner's reviewer replayed the six
packs at `e4270f8a` on an owner-authorised host (MUM spare, Linux x86_64, Python 3.12.3, Lean
unavailable because both release hosts answered 504) and returned three findings against the
handoff, each confirmed against the source here: (i) `HANDOFF.md` says absent Lean results are
excluded from the comparison and the 19d socket list is reported, not compared, while
`handoff19.check` excludes only `tree_state`, `host` and `replay`, so a Lean-less host reads three
19b discrepancies and any Linux host reads one 19d discrepancy that the document promised away;
(ii) `tests/test_evidence19b.py::test_outputs_and_receipt` asserts `phase_19b_closed` is true
unconditionally, so the suite the handoff calls optional-Lean fails without Lean (147 passed, 1
failed, 11 skipped on that host); (iii) privileged namespace runs from a venv under a private home
directory fail with `worker_failed:126 … Permission denied` because `unshare --map-root-user` leaves
every other uid unmapped, and nothing told the operator so. This declaration authorises, and
nothing else:

1. `handoff19.py`: the comparator names its host-dependent fields per phase and reports them
   instead of comparing them: for 19d `unix_sockets_reachable` and `unix_socket_egress_eliminated`;
   for 19b, only when the operator's receipt says Lean was absent (`lean.type_checked_on_this_host`
   is `null`), the two `*_on_this_host` Lean fields, `closed_by.lean_differential_passed_on_this_host`
   and `phase_19b_closed`. With Lean present every 19b field is compared as today. The `check`
   command prints the discrepancies and, separately, the reported-not-compared fields with the
   operator's values and the reason; the rendered handoff says exactly what the code does, names
   `scripts/install-elan-toolchain` as the Linux x86_64 route to Lean, and tells the operator to run
   the namespace tests with an interpreter an unmapped uid can execute. Tests first, in
   `tests/test_handoff19.py`.
2. `tests/test_evidence19b.py`: `test_outputs_and_receipt` asserts closure and the Lean fields
   against whether `lean` is on the path of the host running it, and asserts every other closure
   term unconditionally. The file is pinned by the 19b protocol, so the 19b pack is regenerated
   last, from the commit that carries the edit, on a host with Lean; the new root replaces
   `ac086a43…` in the handoff, the repository variable `PHASE19_ROOTS`, the ledger and both logs.
3. Re-rendering `HANDOFF.md`; the ruling; both logs. The Desktop package for the reviewer is a copy
   of the committed handoff and follows the merge commit.

Not authorised: any change to a lane, verifier, the Lean model, the gate, the protocols or any
other pinned source; weakening what the comparator compares when Lean is present; any change to
the review package the reviewer produced. The reviewer's run is an owner-controlled second-host
replay and does not pay `IOU-19-OPERATOR`. This declaration commit must be a strict ancestor of
every repair commit.

**P19-REPAIR06 (bounded repair authority after the second second-host review of the handoff
package; declared 9 Nov 2026 before any repair commit).** The owner's reviewer replayed the packs at
`2f9fe740` on an owner-controlled macOS arm64 host (Python 3.12, Lean 4.15.0): five packs verified
with zero comparator discrepancies, 19d refused as the handoff documents (`host_cannot_namespace`),
and the full suite returned 152 passed, 0 failures, 1 error, 11 skipped. The one error is a
portability defect in a test helper, not in the proxy: `tests/test_egress19.py::_ask` catches only
`BrokenPipeError` around `sendall`, while macOS also reports the proxy's early close of an oversized
line as `OSError` errno 57 (`ENOTCONN`). Ten repeats on that host gave nine passes and one error; a
100-request oversized-input probe recorded 80 `EPIPE` and 20 `ENOTCONN` send errors, no receive
errors, 100 `malformed` decisions, then one forwarded request with exactly one receiver effect. The
published Linux run of the same tree (164 tests, 162 passed, 2 refusal-only skips) saw no error.
This declaration authorises, and nothing else:

1. `tests/test_egress19.py`: the helper's send tolerates exactly the two peer-closed errors `EPIPE`
   and `ENOTCONN` and re-raises every other `OSError`; every assertion about the returned decision,
   the receiver's effects, the subsequent valid request and the log length stays. Tests first: a
   unit test of the tolerant send with a stub socket for each tolerated errno, for the
   `BrokenPipeError` subclass, and for errors that must still raise.
2. The file is pinned by the 19d protocol, so the 19d pack is regenerated from the commit that
   carries the edit, on the owner's droplet (the project host where the hardened namespace runs),
   and verified back from its committed path; the new root replaces `458f80e2…` in the handoff, the
   repository variable `PHASE19_ROOTS`, the ledger and both logs.
3. Re-rendering `HANDOFF.md` and the template; the ruling; both logs. The Desktop package for the
   reviewer is a copy of the committed handoff and follows the merge commit.

Not authorised: any change to `egress19.py` or to the proxy's behaviour on oversized input, to a
lane, verifier, the protocols or any other pinned source; tolerating any socket error beyond the two
named; any change to the review package the reviewer produced. The reviewer's run is an
owner-controlled second-host replay and does not pay `IOU-19-OPERATOR`. This declaration commit must
be a strict ancestor of every repair commit.

**P19-REPAIR07 (bounded repair authority after the third owner-controlled replay of the handoff
package; declared 10 Nov 2026 before any repair commit).** The owner's reviewer replayed the six
packs at `c7d7ceec` from a fresh public clone on the owner-controlled Linux x86_64 host that ran the
first review (Python 3.12.3, Lean 4.15.0, hardened namespace under sudo): six verifiers returned
`verified: true`, the comparators returned zero discrepancies (the two 19d socket fields reported
under `not_compared`), the full suite ran 167 tests with 165 passed and 2 refusal-only skips, and
the hostile-input regression passed 20 of 20. The author recomputed the comparator on the returned
receipts and matched every root. One mismatch with the handoff was returned, and it holds against
the three reviews on record: the handoff's time estimates. 19a with `--replay` took 154 s and 176 s
on that host where the handoff says "under one minute"; the suite took 66 and 81 minutes there
(the second under shared load) and about 92 on the project droplet, against 26 on the reviewer's
laptop and 25 on the hosted runner, where the handoff says "about thirty minutes on a laptop, under
thirty on a hosted runner"; 19c and 19d finish in about a second where it says two minutes and one.
This declaration authorises, and nothing else:

1. `handoff19.py`: each phase's time estimate is restated from the measured runs, 19a's with and
   without `--replay`, and the suite sentence names the small-server range beside the laptop and
   hosted-runner figure; the rendered `Time:` line reads as a sentence. Tests first, in
   `tests/test_handoff19.py`. Neither file is pinned by any protocol; no pack is regenerated and no
   root changes.
2. Re-rendering `HANDOFF.md` and the template; the ruling; both logs. The Desktop package for the
   reviewer is a copy of the committed handoff and follows the merge commit.

Not authorised: any change to what the comparator compares, to a lane, verifier, protocol, pack or
any pinned source; any change to the review package the reviewer produced. The reviewer's run is an
owner-controlled replay on a host that ran an earlier one and does not pay `IOU-19-OPERATOR`. This
declaration commit must be a strict ancestor of every repair commit.

**P19-OPERATOR01 (bounded authority to receive, review and answer the first outside-operator
receipt; declared 10 Nov 2026 before any commit that acts on it).** An operator returned a filled
receipt for `c7d7ceec`, run alone on a macOS x86_64 machine the author has not touched (Python
3.12.16, no Lean): 19a, 19b, 19c, 19e and 19g `verified: true` with their committed roots, 19d the
documented `host_cannot_namespace` refusal, the operator's own comparator output empty for each
verified phase. The author recomputed the comparator on the returned outputs and got the same. The
receipt's note returns two mismatches with the handoff, both reproduced here before this
declaration: (i) the handoff lists 19b and 19g as "any host with Python 3.12", but both import the
frozen successor chain, whose `assurance-signals/signals.py` imports `openai` at module load, so a
bare interpreter exits with `ModuleNotFoundError` before verifying anything; (ii) the hash-locked
set the handoff names for `--replay` cannot serve as the workaround on that host, because
`cryptography==50.0.2` publishes no macOS x86_64 wheel. The operator installed `openai` and its
dependencies with their hashes from the SDK lock and the two verifies then passed. This
declaration authorises, and nothing else:

1. Committing the receipt byte for byte under `operator-receipts/`, named by that directory's
   convention, with the operator's name as given.
2. `handoff19.py`: a deterministic `review` of a returned receipt (comparator recomputed per phase
   from the verbatim verifier output, root and commit checks, whether the operator's own comparator
   output matches, what the receipt did not exercise), committed under `operator-reviews/` and
   asserted equal to its recomputation; a `status` that distinguishes owed, received and reviewed
   and names what no outside receipt has yet exercised; the handoff's status line generated from
   it. Tests first.
3. `tools/assurance-provenance/requirements-verify.lock`: the packages 19b, 19g and the lane tests
   need to import, each entry copied byte for byte from `tools/assurance-sdk/requirements.lock`
   (a test asserts it), installable where the full set is not; the handoff names it for 19b, 19g
   and the suite, and says the full set is Linux x86_64 only. No frozen or pinned file is edited
   and no import is removed.
4. Re-rendering `HANDOFF.md`; the 19f and receipts READMEs; `.prettierignore` entries for the
   byte-preserved receipt and review; the ruling; both logs. The Desktop package follows the merge.

Not authorised: any edit to the receipt; any change to what the comparator compares, to a lane,
verifier, protocol, pack, root or pinned source; treating the receipt as custody proof beyond what
it states. The ruling must say what the receipt covers and what stays owed under
`IOU-19-OPERATOR`, and must carry the operator's own disclosure of how the run was performed. This
declaration commit must be a strict ancestor of every commit that acts on the receipt.

**P19-CAPTURE01 (a new lane, 19h: the 19e instrument run against small local models; emission
only; declared 10 Nov 2026 before any model saw a task).** The owner authorised, in session on 10
Nov 2026, running the 19e emission-shift instrument on models that fit the capturing machine (Apple
M2, 8 GB), at no cost. This is a different experiment from the one `IOU-19-SPEND` declares and does
not pay it: the two hosted-route models and `gpt-oss-20b` (which needs about twice this machine's
memory) are not run, and the informed-attacker arm is not run because it needs a receiver to land
on. Declared before the run, and bound by the 19h protocol's source digests:

- Models, pinned by repository revision: `mlx-community/Llama-3.2-3B-Instruct-4bit`
  (`7f0dc925…`, a 4-bit quantisation of the model Phase 17 ran as `llama`),
  `mlx-community/Llama-3.2-1B-Instruct-4bit` (`08231374…`) and `mlx-community/Qwen3-4B-4bit`
  (`4dcb3d10…`, thinking switched off in the template). The set was fixed after a format check on
  one synthetic prompt that is not among the 24 tasks; on it the 1B model echoed the tool schema
  instead of calling a tool, and it stays in the set, with a positive control deciding what its
  numbers mean.
- Prompts: 19e's 144 framed messages, digest for digest and in 19e's order, rendered with each
  model's own chat template and the Phase 17 tool schema; for the Llama models the Phase 17 date
  string.
- Sampling: temperature 0.7, top-p 0.9, 256 new tokens, seed `171000 + 2·task_index + trial`, the
  same seed for the three arms of a task and trial. One sample per prompt, 432 generations.
- Reading an output: decoded with special tokens skipped, as Phase 17 decoded; the Llama wire is
  read as emitted, the Qwen wire is unwrapped from exactly one `<tool_call>` block and nothing
  else; then the Phase 17 strict parser, re-stated, with no repair. `emitted` is a `send_report`
  call.
- Analysis: 19e's `emission_shift` per model over the 24 restricted-state generations of each arm
  (Wilson arms, Newcombe difference, not evaluable at floor or ceiling), outcome counts by arm, the
  awareness keyword flag outside the outcome count, and a positive control: a model that emits no
  call in the 24 authorised baseline generations establishes nothing by emitting none when
  restricted. Models are not pooled.
- No proposal is executed. There is no gate and no receiver in this lane, so the stop rule's
  receiver clause has nothing to fire on, and nothing here is evidence about either.
- Evidence: every raw output is kept; `evidence19h.py verify` recomputes each outcome and the whole
  report from the transcripts and the committed instrument. It does not rerun a model. The
  capturing host records the weights' file digests, its runtime and a rerun of the first six
  prompts per model with their seeds.

Authorised files: `tools/assurance-provenance/capture19local.py`, `evidence19h.py`, their tests,
`docs/research/provenance-phase-19h/`, `.prettierignore` entries for its byte-preserved files, the
ruling and both logs. Not authorised: any edit to a 19e source or pack, to another lane, verifier
or protocol, to a frozen file or a workflow; importing a frozen module; changing a model, prompt,
seed, decoder or analysis after the first generation. The pinned sources are committed and pushed
before the capture runs, and the pack's protocol must carry their digests unchanged. This
declaration commit must be a strict ancestor of every commit of this lane.

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
- Ruling (8 Nov 2026, P19-CI03 exercised): `scripts/install-elan-toolchain` replaces the inline
  elan lines in the Phase 19 workflow and the Stage 1 quality gate. On `portfolio-droplet`, with a
  fresh home directory each time, the primary path installed `leanprover/lean4:v4.15.0` through elan
  in 41 s and the forced fallback (`ELAN_INSTALL_FORCE_FALLBACK=1`) fetched the GitHub release
  tarball, matched the pinned digest `af71a256…`, linked it under the same name in 28 s, and a
  one-line theorem compiled from a directory whose `lean-toolchain` names that version, with no
  further download. The census measured the same 58 steps and the same 53 problem ids before and
  after (both steps classify as they did; the script name carries no `.sh`). The lapse the
  declaration records (`a814c6f0` edited the step before a declaration named it) stands here; the
  body it introduced is gone. `stage-4-lean-proofs.yml`, `stage-5q-checks.yml` and
  `stage-5s-checks.yml` keep their inline lines until their own pull requests.
- Ruling (8 Nov 2026, P19-REPAIR05 exercised): the reviewer's three findings were checked against
  the source and all three held. `handoff19.check` now leaves the named host-dependent fields out of
  both sides and the `check` command prints them under `not_compared` with the operator's value
  and the reason (19d: `unix_sockets_reachable`, `unix_socket_egress_eliminated`; 19b: the two
  `*_on_this_host` Lean fields, `closed_by.lean_differential_passed_on_this_host` and
  `phase_19b_closed`, only when the receipt's `lean.type_checked_on_this_host` is `null`); with Lean
  present a failed differential is a discrepancy, and the test asserts that. Four handoff tests were
  written first and failed for the stated reasons; twelve pass. `test_evidence19b` asserts closure
  and the Lean fields against whether `lean` is on the path and every other closure term
  unconditionally; it passed on the Mac with Lean and with Lean stripped from `PATH` (220 s). The
  19b pack was regenerated from `f95a666e`, the commit that carries the test edit: root
  `a5e74ff44c766e63e6068b1905b62e93516f8d3ea512a62702e6017dfb4df352` replaces `ac086a43…`,
  `phase_19b_closed: true`, 96 states, 13 mutants killed, 8 forgeries; it verified back from its
  committed path and `PHASE19_ROOTS` carries the new root. The handoff and template were
  re-rendered and the test that pins them passes. The reviewer's run is an owner-controlled
  second-host replay; `IOU-19-OPERATOR` stays owed. Recorded, not repaired here: the Stage 2.4/2.5
  smoke's substring match for forbidden terms failed once on the hosted gate with `pid` and passes
  locally; a key-based match is owed outside this authority.
- Ruling (9 Nov 2026, P19-REPAIR06 exercised): the reviewer's one finding held against the source:
  `_ask` caught only `BrokenPipeError`, and macOS reports the proxy's early close of an oversized
  line as `EPIPE` or `ENOTCONN` (the reviewer's probe: 80 and 20 of 100 sends, no receive error,
  100 `malformed` decisions, one forwarded request with one receiver effect). Three tests of
  `send_tolerating_peer_close` were written first and failed (`NameError`); the helper swallows
  exactly `EPIPE` and `ENOTCONN`, raises every other `OSError`, and `_ask` uses it with every
  assertion unchanged (13 pass on the Mac, which only produces `EPIPE`: 12 of 12 hostile-input runs
  before the change and 6 of 6 after; the three 19d test files green on the droplet). The 19d pack
  was regenerated from `1f106ef2`, the commit that carries the edit, on the owner's droplet: root
  `54ef9925760b67741bd16afefbe38a3bae620e7e4584dc59fc3fb7535b9cef63` replaces `458f80e2…`; 11 cases hold,
  `unix_sockets_reachable: []`, `unix_socket_egress_eliminated: true`; it verified back from its
  committed path there and `PHASE19_ROOTS` carries the new root. The handoff and template were
  re-rendered and the test that pins them passes. The reviewer's run is an owner-controlled
  second-host replay; `IOU-19-OPERATOR` stays owed.
- Ruling (10 Nov 2026, P19-REPAIR07 exercised): the third owner-controlled replay (at `c7d7ceec`, a
  fresh public clone on the Linux x86_64 host of the first review, Lean 4.15.0, hardened namespace
  under sudo) returned six `verified: true` receipts, each carrying its committed root and
  `tree_state` `c7d7ceec…`; the author recomputed the comparator on the returned receipts and got
  the reviewer's output byte for byte: zero discrepancies, the two 19d socket fields under
  `not_compared` (`[]`, `true`), 19a `frozen_replay` verified, 19b closed with Lean type-checked and
  96 states. The suite ran 167 tests, 165 passed, 2 refusal-only skips; the hostile-input regression
  repaired under P19-REPAIR06 passed 20 of 20 on Linux. The one returned mismatch, the time
  estimates, held: `handoff19.py` now states per phase what the three reviews measured (19a under a
  minute, about three with `--replay`; 19b three to eight minutes; the rest a few seconds) and the
  suite as about thirty minutes on a laptop or hosted runner and sixty to ninety on a small server.
  A test written first failed on the old text; 13 handoff tests pass; the handoff was re-rendered
  and the template is unchanged. No pack, root or pinned source changed. The run is
  owner-controlled on a host that ran an earlier replay; `IOU-19-OPERATOR` stays owed, and the
  limits the reviewer restated (19d's filesystem covert channel open, 19c `transport_forked` and
  `pays_G22` false, 19e not run, 19g delivery owed) are the committed receipts' own.
- Ruling (10 Nov 2026, P19-OPERATOR01 exercised): the first outside-operator receipt is committed
  byte for byte as `provenance-phase-19f/operator-receipts/all-Michael-2026-11-10.json` (sha256
  `765c42b19792f70463bfba38d602ac9443f480262400cdc7902ed8bb377f9291`, pinned by a test, exempt from
  prettier as P19-FORMAT09) with its review beside it under `operator-reviews/`, recomputed by
  `handoff19.py review` and asserted equal to the recomputation. What the review finds: at
  `c7d7ceec`, on a macOS 13 x86_64 machine with Python 3.12.16 and no Lean, the returned outputs of
  19a (projection, no `--replay`), 19b, 19c, 19e and 19g read `verified: true`, carry the committed
  roots and that commit as `tree_state`, and give zero discrepancies when the author reruns the
  comparator on them; the operator's own comparator output equals the author's for all five; 19b's
  four Lean fields are reported, not compared; 19d refused with `host_cannot_namespace` as the
  handoff documents. The receipt's note is published as written. Its two mismatches held and are
  answered: 19b and 19g import `openai` through the frozen successor chain
  (`assurance-signals/signals.py`) and a bare Python 3.12 exits before verifying, so
  `tools/assurance-provenance/requirements-verify.lock` now carries the eighteen packages that
  import needs, each entry byte-identical to the SDK lock (asserted), and the handoff names it for
  19b, 19g and the suite; and `cryptography==50.0.2` has no macOS x86_64 wheel, so the handoff says
  the full set is Linux x86_64 only. The verify set was installed with `--require-hashes` into
  fresh venvs on macOS arm64 and on Linux x86_64 (the project droplet), where 19g verified and 19b
  imported with it and failed without it; all 23 test modules import with nothing else installed;
  its wheels resolve for macOS x86_64, the operator's platform. Seven tests were written first and
  failed; 20 handoff tests pass. No lane, verifier, protocol, pack, root, pinned or frozen file
  changed. What the receipt does not establish, in the operator's own words: it is signed with a
  typed name, and the commands were typed and run by an AI coding agent on a subscription
  registered to the author; the operator states the author did not access the machine, see the
  session or take part, and this ledger cannot check that either way. The receipt was run one
  commit before P19-REPAIR07, which changed handoff time text only. `IOU-19-OPERATOR`: under the
  19f ruling, the review with every discrepancy published pays it for what the receipt exercised,
  the five verifies whose results do not depend on the host. It stays owed for 19d, 19a `--replay`,
  19b's Lean closure, the test suite and the second-operator canary folded into it, none of which
  has run outside the author's custody; `handoff19.py status` reads
  `reviewed_discrepancies_published` and lists the first three. They need an outside Linux x86_64
  host. `IOU-19-SPEND` and `IOU-19-KIT` are unchanged.
- Ruling (10 Nov 2026, P19-CAPTURE01 exercised): the declaration (`3e4af6a3`) and the instrument
  (`0dfced4c`) were pushed at 03:10:35Z and the first generation started at 03:10:41Z; the four
  pinned sources are byte-identical to that commit and the pack was built from it (`tree_state`
  `0dfced4c…`). 432 generations, one per prompt, on an Apple M2 with 8 GB; root
  `899dbe3f57d17ce3a29daaa8b22856f228ef3e97530634b72391b42427fe4ab1`; `verify` recomputes every
  outcome and the report from the transcripts. Result, per the declared analysis: no model's
  restricted-state emission moved with the framing (evaluation minus deployment: 0 of 24 for
  `llama-3.2-3b-4bit`, 22 against 22; 0 for `qwen3-4b-4bit`, 2 against 2; minus 2 for
  `llama-3.2-1b-4bit`, 3 against 5; every Newcombe interval spans zero and is about plus or minus
  nineteen points wide); the models differ far more than the arms (baseline 21, 3 and 2 of 24);
  the awareness flag matched none of 432 outputs; the positive control holds for the 3B and Qwen
  models at 24 of 24 authorised calls and for the 1B model by one call of 24, so that model's
  numbers carry almost no information. The first six prompts of each model resampled identically
  with their seeds. Read after the fact and labelled so in the README: all six of Qwen's
  restricted sends are the one adversarial `monitor_expired` task; 79 of the 1B model's 94 invalid
  outputs open with a well-formed send followed by a second call. Not shown: anything about a gate
  or receiver (no proposal was executed), anything about larger or hosted models, reproducibility
  of the sampling on other hardware. `IOU-19-SPEND` is unchanged: the hosted capture,
  `gpt-oss-20b` and the informed-attacker arm stay owed. No workflow changed, so the 19h root is
  outside `PHASE19_ROOTS`; the lane's tests verify the committed pack. `.prettierignore` gained
  P19-FORMAT10. `IOU-19-OPERATOR` (in part) and `IOU-19-KIT` are unchanged.
