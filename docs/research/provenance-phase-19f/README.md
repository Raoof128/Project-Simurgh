# Phase 19f: outside-operator replay (paid in part)

`IOU-19-OPERATOR`: one outside operator has replayed five of the twenty packs. This directory holds the
package that makes the replay a run of named commands against named expectations, the receipt that
came back and the author's review of it:

- [HANDOFF.md](HANDOFF.md): generated from the committed receipts; custody rules, one command per
  phase, the expected fields, how to return the receipt.
- [discrepancy-template.json](discrepancy-template.json): what the operator fills in.
- [operator-receipts/](operator-receipts/): returned receipts, committed unchanged.
- [operator-reviews/](operator-reviews/): the author's review of each, recomputable.

Status (recomputable):

```sh
python -B tools/assurance-provenance/handoff19.py status
python -B tools/assurance-provenance/handoff19.py review \
  docs/research/provenance-phase-19f/operator-receipts/all-Michael-2026-11-10.json
```

## The first receipt (10 Nov 2026, commit `c7d7ceec`)

Run by the operator alone on a macOS 13 x86_64 machine with Python 3.12 and no Lean. The author
reran the comparator on the returned verifier outputs:

| Phase | Result                                   | Comparator discrepancies | Root matches |
| ----- | ---------------------------------------- | ------------------------ | ------------ |
| 19a   | verified (projection; no `--replay`)     | 0                        | yes          |
| 19b   | verified (four Lean fields not compared) | 0                        | yes          |
| 19c   | verified                                 | 0                        | yes          |
| 19d   | refused: `host_cannot_namespace`         | not run                  | not run      |
| 19e   | verified                                 | 0                        | yes          |
| 19g   | verified                                 | 0                        | yes          |

The operator's note returned two mismatches with the handoff, both reproduced and answered:

1. 19b and 19g were listed as "any host with Python 3.12" but import `openai` through the frozen
   successor chain and exit with `ModuleNotFoundError` on a bare interpreter. Answer:
   [`requirements-verify.lock`](../../../tools/assurance-provenance/requirements-verify.lock), a
   hash-locked subset of the SDK lock, and a host recipe that names it.
2. The full hash-locked set has no macOS x86_64 wheel for `cryptography`, so it could not serve as
   the workaround there. Answer: the handoff now says the full set is Linux x86_64 only.

The note also records what the run did not cover: 19d (refused off Linux), 19a's `--replay`, the
Lean fields, and the test suite.

## What this pays and what stays owed

The review with every discrepancy published pays the IOU for what the receipt exercised: five
verifies whose results do not depend on the host. It stays owed for 19d, 19a `--replay`, 19b's Lean
closure and the test suite, none of which has run outside the author's custody; they need an
outside Linux x86_64 host.

Five lanes joined the handoff on 11 Nov 2026 under P19-OPERATOR02, after the first receipt: 19h, 19i
and 19k (model captures, recomputed from committed outputs) and 19j and 19l (the gate replays of
those captures, with `--replay` on Linux x86_64). The first receipt predates them, so its review
lists each as `not_in_receipt` and all five stay owed, with the two replays. The receipt itself is
unchanged; only the review was recomputed.

19m (eight more local models on 19k's schedule, recomputed from committed outputs) joined on 12 Nov
2026 under P19-OPERATOR03. It is also `not_in_receipt` in the review of the first receipt and is
owed with the rest.

19n (four local models: placement, kind and author of the injected text, an adaptive attacker and
what follows a refusal) and 19o (the fixed prompts of 19k and of 19n's placement block on six
hosted models; verifying it needs no network and no key) joined on 13 Nov 2026 under
P19-OPERATOR04. Both are `not_in_receipt` in the review of the first receipt and are owed with
the rest.

19p (every send recorded in 19n dispatched through the frozen Phase 17 pipeline; with `--replay`
on Linux x86_64) joined on 13 Nov 2026 under P19-OPERATOR05. It is `not_in_receipt` in the review
of the first receipt; the lane and its `--replay` are owed with the rest.

Five lanes joined on 13 and 14 Nov 2026 under P19-OPERATOR06: 19q (a destination rule scored on
a public monitor benchmark; with `--dataset` it recomputes every row from a clone of that
benchmark), 19r (a send must name its grant; three local models, recomputed from committed
outputs), 19s (two local models as monitors on twin transcripts that differ only in the trusted
state; recomputed from committed outputs), 19t (attackers with the gate's source; with
`--replay` on Linux x86_64 every submitted attempt is run again) and 19u (four hosted Claude
models; verifying it needs no network and no key). All five are `not_in_receipt` in the review
of the first receipt and are owed with the rest, together with 19q's `--dataset` and 19t's
`--replay`.

## Who has agreed to run it next

Two people have agreed to run the handoff: Jacob, on a Linux machine, and Mona, on a Windows
laptop. They are named by first name with their consent, as the owner relayed it on
13 Nov 2026. No receipt from either exists, and nothing here is evidence until one is
returned, committed unchanged and reviewed. The handoff's Windows recipe (WSL2 with Ubuntu) was
written for the second of these runs and has not been tried by the author.

Limits, in the operator's own words in the receipt: the receipt is signed with a typed name, and
the commands were typed and run by an AI coding agent on a subscription registered to the author.
The operator states that the author did not access the machine, see the session or take part.
The review establishes what the returned outputs say; it cannot establish who produced them.

There is no pack here. Nothing ran that a pack could bind; the receipts are the evidence.
