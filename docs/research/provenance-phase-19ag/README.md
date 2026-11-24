# Phase 19ag evidence: the approval check refuses a body it cannot read

[Lane 19ae](../provenance-phase-19ae/README.md)'s seats found that a dispatched body without
its `run` or its `id`, sent with a token whose signature is good, makes the gate raise
`KeyError` where it should refuse. Nothing is sent and no authority is gained, but a caller
that does not catch the exception stops. That lane published the raise and repaired nothing.
This lane repairs it in a class beside the gate, runs every attempt lane 19ae ran on the
repaired gate, and gives the repaired source to three fresh attackers. No model is a target.
See [RESULTS.md](RESULTS.md) and [the declaration](../PROVENANCE_PHASE_19.md) (P19-GUARD01).

**The 16 recorded attempts that raised `KeyError` are refused on the repaired gate, and every
other recorded attempt ends as it did before. Three fresh seats handed in 91 attempts with
the repaired source in hand: none gains and none makes the gate raise. One of the six
predictions fails. It said that no recorded attempt raises on the repaired gate, and two
still do, for reasons this repair does not touch.**

Verify (any host with Python 3.12; no model, standard library only):

```sh
python -B tools/assurance-provenance/evidence19ag.py verify \
  docs/research/provenance-phase-19ag/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19ag/ROOT.sha256)"
```

On Linux x86_64 inside the hash-locked environment, add `--replay` to run every attempt again
on real fixtures and compare the whole report. That takes about twenty minutes on a two-core
server. Rows inherited from lanes 19y and 19ac depend on how deep the host's JSON parser
goes, and one attempt of lane 19z ends its worker process, so a `--replay` on another host
may stop with `report_mismatch`. That is a result to send back.

## The repair

`guard19ag.pipeline()` returns the class a caller should use. It is lane 19ae's full gate,
and so every earlier repair, with one change in its approval store:

- a body that is not an object holding a string `run` and a string `id` is refused, with the
  reason `approval_action`, before anything is read from it;
- any error raised while a token is being checked is a refusal, with the reason
  `approval_schema`. The check fails closed.

No file of an earlier lane is edited. The frozen gate and every earlier lane's gate still
raise; a caller has to choose the new class.

## What was run

- **Two gates:** `full`, lane 19ae's, and `guarded`.
- **467 recorded attempts**, each on both gates: the eighteen files of earlier lanes that
  lane 19ae read, and the three files of lane 19ae's own seats.
- **91 fresh attempts**, each on the guarded gate: 36, 29 and 26 from three seats that had
  the repository at the instrument commit, the [brief](BRIEF.md) and the means to run an
  attempt. Their files were committed as received before any was run on the host of record.
- **Where:** the project's Linux x86_64 host, in the hash-locked environment, from a clean
  clone at the commit that holds the seats' files. The run took 38 minutes, with the replay
  that checks it.

## What was found

| Prediction                                                                               | Result                                     |
| ---------------------------------------------------------------------------------------- | ------------------------------------------ |
| G0: on the full gate at least one recorded attempt raises                                | holds: 18 of 467                           |
| G1: on the guarded gate no recorded attempt raises                                       | **does not hold: 2 of 467**                |
| G2: a recorded attempt that does not raise on the full gate ends the same on the guarded | holds: 449 of 449                          |
| G3: on the guarded gate every refused dispatch leaves a record, unless the seal latched  | holds: none without a record               |
| G4: no attempt gains on the guarded gate                                                 | holds: 0 of 558                            |
| G5: no fresh attempt that writes no store makes the guarded gate raise or latch          | holds: 89 attempts, none raises or latches |

Of the 18 recorded attempts that raise on the full gate, 16 raise `KeyError`. All 16 are
lane 19ae's seats' attempts, and on the guarded gate none of them raises: the body is refused
and the steps after it run. Across those 16 attempts the guarded gate refuses 64 dispatches,
and in none does more than one effect reach the receiver.

The fresh seats' 91 attempts make 3,302 dispatches on the guarded gate, of which 2,999 are
refused. No attempt gains. Two of the 91 write the gate's stores; one of those latches the
seal, which is the known cost of lane 19z's seal.

## The prediction that failed

G1 says that no recorded attempt raises on the guarded gate. Two do, on both gates and in the
same way:

- An attempt of one of lane 19z's seats runs SQL against a store that sets a memory cap for
  the whole process. No store byte changes, so the seal stays intact, and the worker process
  that runs the fixture dies. The instrument records a dead worker as a raise.
- An attempt of one of lane 19ae's seats writes a store, the seal latches, and the host's own
  `mint` then raises, as lane 19z built it to.

Neither goes through the approval check. The author wrote G1 without counting them, saw both
in a trial on the author's own machine before any seat started, wrote that down in the ledger,
and left G1 as declared.

## How the seats were run

- The harness's record shows `seat-a` and `seat-b` served by `claude-opus-5-5` and `seat-c`
  by `claude-sonnet-5-5`.
- `seat-b` and `seat-c` were each given one paragraph, beyond the brief, on where to look.
  `seat-a` had the brief alone.
- The three ran at once on the author's laptop, which was heavily loaded. `seat-c` reported
  that four of its attempts came back as a dead worker under that load and ran clean alone.
  The run of record is on another host, where none of the 91 raises.
- `seat-c` reported two things about the instrument, read from the code: an `ops` step that
  holds only a `relay` counts as a store write, so such an attempt falls outside G5; and a
  record written when a long note is cut counts as the record of the refusal that follows
  it. Neither is changed in this lane.

## A limit of this pack

Two seats nested the bodies of some attempts 1,486 and 1,487 levels deep. The JSON reader in
Python 3.12.0 to 3.12.2 stops near 1,500 levels, and later versions near 10,000. On the
author's Python 3.12.2 the verify command above passes from the command line, and the same
check fails with `report_rows` when it is called from inside a test runner, where less of the
interpreter's stack is left: the reader then rejects the seat's whole file. The host of
record runs Python 3.12.3 and read every file. Run the verifier as a command, and treat
`report_rows` on an early 3.12 as this limit and not as a changed pack. The seats' files are
committed as received and are not altered to avoid it.

The lane's unit tests also leave their temporary directories behind. The test file is pinned
by the pack, so it is left as it is.

Without `--replay`, the verifier does not bind every field of the report. A repacked copy
with its `arm` changed, its list of non-claims emptied or an unknown key added still checks
as `structure_checked`. Such a copy has a different root, so the committed `ROOT.sha256` and
the hosted roots check refuse it, and `--replay` stops on it with `report_mismatch`. Always
give `--expected-root`.

(Added 24 Nov 2026: for the committed pack, a test holds those fields to the lane's module.
`tools/assurance-provenance/strict19ag.py` takes the same pack and root, runs the verifier
unchanged and then compares those fields too; it refuses each such copy, and a report or
sidecar whose bytes are not the lane's canonical form, such as one with a key written
twice.)

(Added 24 Nov 2026: what neither tool checks without `--replay`. The verifier runs no gate
then. It checks each row's identity against the seats' files, that each recorded outcome
has the declared shape and agrees with its own flags, and that the summary and the
hypotheses follow from the rows. It does not compare a recorded outcome with what the gate
does. A copy in which the two outcomes that raise are rewritten as not raising, with the
rest recomputed, reads G1 as held and passes both tools under the copy's own root. The
committed root refuses that copy and `--replay` stops on it. A receipt of kind
`structure_checked` means this much and no more.)

## What this does not show

- The frozen gate and every earlier lane's gate still raise. A caller that does not use the
  new class has none of this.
- The seats are agents of Claude models the author started. They are not a person and not an
  attacker from another vendor.
- A check that fails closed turns an unknown error into a refusal, which can hide a fault of
  another kind behind a refusal. The lane counts raises and does not look for those.
- There is no planted fault in this round. A zero from the seats carries the weight that the
  same kind of seat found the last two faults, and no more.
- The two attempts that still raise are not repaired. One needs the means to run SQL
  against the gate's own stores and the other to write them.
- No one outside the project has run this pack. (Added 24 Nov 2026: an outside operator has
  since verified this pack and run its `--replay` on their own Linux machine, with no
  discrepancy. [The 19f page](../provenance-phase-19f/README.md) has the review.)

## Files

- `evidence.zip`, `protocol.json`, `report.json`, `receipt.json`, `ROOT.sha256`: the pack.
- `BRIEF.md`: what each seat was given. It is pinned by the pack.
- `submissions/`: the three seats' files as received.
- `RESULTS.md`: every table, generated from `report.json` by
  `tools/assurance-provenance/results19ag.py`. A test holds the page to that output.
