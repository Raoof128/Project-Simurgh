# Phase 19f: outside-operator replay (paid in part)

`IOU-19-OPERATOR`: three receipts have come back and each is reviewed here. One outside operator
replayed twenty-one of the twenty-four packs on Linux x86_64 with no discrepancy, among them the
five frozen-gate replays, 19b's Lean closure and 19d's namespace probe. Five items are still
owed: lanes 19w, 19x and 19y, which joined the handoff after those receipts, 19y's `--replay`
and 19q's `--dataset` recomputation.
This directory holds the package that makes the replay a run of named commands against named
expectations, the receipts that came back and the author's review of each:

- [HANDOFF.md](HANDOFF.md): generated from the committed receipts; custody rules, one command per
  phase, the expected fields, how to return the receipt.
- [discrepancy-template.json](discrepancy-template.json): what the operator fills in.
- [operator-receipts/](operator-receipts/): returned receipts, committed unchanged except for
  one substitution in the third, described below.
- [operator-reviews/](operator-reviews/): the author's review of each, recomputable.

Status (recomputable):

```sh
python -B tools/assurance-provenance/handoff19.py status
python -B tools/assurance-provenance/handoff19.py review \
  docs/research/provenance-phase-19f/operator-receipts/all-Jacob-2026-11-15.json
```

| Receipt | Operator's host                                   | What the review found              | Left unexercised                  |
| ------- | ------------------------------------------------- | ---------------------------------- | --------------------------------- |
| First   | macOS 13 x86_64, Python 3.12, no Lean             | 5 lanes verified, 19d refused      | everything else                   |
| Second  | Ubuntu 26.04 x86_64, CPython 3.12.16, Lean 4.15.0 | 21 lanes verified, no discrepancy  | 19w, 19x, 19y and `19q --dataset` |
| Third   | Windows 10 run natively, Python 3.12.10, no Lean  | 21 lanes refused, nothing verified | everything                        |

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
2. The full hash-locked set has no macOS x86_64 wheel for `cryptography`, so it could not be
   the workaround there. Answer: the handoff now says the full set is Linux x86_64 only.

The note also records what the run did not cover: 19d (refused off Linux), 19a's `--replay`, the
Lean fields, and the test suite.

## The second receipt (15 Nov 2026, commit `c24b47ce`)

Returned by Jacob, run on Ubuntu 26.04.1 x86_64 with CPython 3.12.16 and Lean 4.15.0. The receipt
holds the twenty-one lanes the handoff listed at that commit. The author reran the comparator on
every returned verifier output:

- All twenty-one lanes verify with an empty discrepancy list. Every manifest root equals the
  committed `ROOT.sha256`, every `tree_state` equals the commit, and the operator's own comparator
  output equals the author's for every lane.
- 19a, 19j, 19l, 19p and 19t were run with `--replay` and each returns `replay.result: verified`:
  the frozen pipeline dispatched every recorded send again on the operator's machine and the
  reports came out the same.
- 19b closed with Lean on the path: `type_checked_on_this_host` and
  `differential_passed_on_this_host` are both true.
- 19d ran its namespace probe, which the first receipt's host could not. Two fields that depend
  on the host's own sockets are listed under `not_compared`, as the handoff says they will be.
- Not run: 19q's `--dataset` recomputation.

The operator also ran the test suite twice:

| Interpreter                         | Tests | Result             |
| ----------------------------------- | ----- | ------------------ |
| The verify set, as the handoff said | 723   | 2 errors, 18 skips |
| The full hash-locked set            | 723   | all pass, 18 skips |

Both errors are `ModuleNotFoundError: No module named 'agents'`, in the two frozen-replay tests
that run on Linux x86_64. The handoff told operators to run the suite with the verify set, and the
verify set does not hold that package. The handoff was wrong. The author confirmed the cause in
the lock file and in the two tests' skip conditions, which look only at the platform. Answer: the
handoff's Tests section names the full set for Linux x86_64, and a test holds the document to the
lock file.

The operator's summary of the two runs is committed unchanged as
[Jacob-Phase19-test-suite-results.md](operator-receipts/all-Jacob-2026-11-15.attachments/Jacob-Phase19-test-suite-results.md).
The two full logs came back with it and are not committed, because the repository ignores `*.log`
files; the author holds them. Their sha256 values are `ebb48f8b534b34ce2e53ab2788396d32d15c9f806526dab689ed63e2b7d3bb04`
(verify set) and `78e7b01cab5c1e9e658bb29e287b7e630f592c80f5f5a8dae6aaf1a543c11822` (full set).

## The third receipt (15 Nov 2026, commit `c24b47ce`)

Returned by Mona, run natively on Windows 10 (build 19045, AMD64) with Python 3.12.10, no Linux
distribution under WSL2 and no Lean. The handoff's Windows recipe is WSL2, and it asks an operator
who runs natively to say so, which this receipt does. No verifier printed a receipt, so the review
lists all twenty-one lanes as `refused` and counts nothing as exercised. What the run found:

| What happened                                           | Lanes     | Cause                                                                                                                              | Answer                                              |
| ------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `ValueError: protocol_inventory`                        | seventeen | Each verifier builds its expected source list from file paths, which carry backslashes on Windows; the committed lists do not.     | Recorded in the handoff; not patched.               |
| `ValueError: prompt_binding`                            | 19s       | Git on that machine converts line endings and the repository sets no rule, so a prompt file pinned by digest was checked out CRLF. | Recorded in the handoff; not patched.               |
| `No module named 'fcntl'`                               | 19b, 19g  | The frozen successor module imports a Unix-only module. The handoff predicted a different failure, which Windows never reaches.    | Recorded in the handoff; not patched.               |
| `host_cannot_namespace`                                 | 19d       | Windows has no user or network namespaces.                                                                                         | The refusal the handoff expects.                    |
| The comparator ended in a `JSONDecodeError` traceback   | all       | A verifier that refuses prints no JSON, and `handoff19.py check` did not handle that.                                              | `check` now exits with `not a verifier receipt`.    |
| Test suite: 652 tests, 19 failures, 50 errors, 22 skips | n/a       | The causes above, and four `test_egress19` tests that error for want of `AF_UNIX` where the handoff said they would skip.          | The handoff now says the suite does not pass there. |

The author ran none of this on Windows. Each cause was checked against the code the receipt
names: all twenty-four verifiers build the list the same way, the repository has no
`.gitattributes`, and the import is on line 21 of the frozen module. The path and `fcntl` causes
sit in modules the packs pin by digest, so changing them would change the packs. The handoff now
says that native Windows is not a supported host. Nobody has yet tried the WSL2 route.

One inconsistency in the receipt is published as returned: its `files_received_from_author` list
is empty, while its note says the operator received a folder with the three handoff files and two
cover notes.

The committed file is not byte for byte the file that came back. Every command line in it held
the operator's Windows user folder name, 105 times in all, and each is replaced by `<redacted>`.
Nothing else is changed. The file as returned has sha256
`e4f22c47edb7d7472e21d5e0ad5b959273d16e8f4b17b20968c442617bf710a4` and the author holds it. The
committed file has sha256 `c3ddbce786d622d258e3d3a46041a2cd423eaccec78cfb2239c830766c65a7f4`, and
the review is recomputed from the committed file. A reader can check the committed bytes and
cannot check that the substitution is the only difference.

## How the handoff reached these two operators

The handoff says an operator receives no file from the author other than the repository. That was
not what happened. The owner sent both operators a zip with a cover note, a copy of `HANDOFF.md`
and the discrepancy template. The copies are the bytes committed at `c24b47ce`. The second receipt
lists the zip, and the third receipt's note says its copy of `HANDOFF.md` was byte-identical to
the repository's. Both operators say every pack and all code came from their own clone. The
handoff now tells an operator what to do with such a copy.

## What is paid and what stays owed

The reviews, with every discrepancy published, pay the IOU for what the receipts exercised.
After the second receipt that is every lane the handoff listed at `c24b47ce`, with the five
frozen-gate replays, 19b's Lean closure and 19d's namespace probe, on one Linux x86_64 machine
outside the author's custody. The test suite has passed outside once, on that machine, with the
full hash-locked set.

Still owed:

- Lane 19w, which joined on 15 Nov 2026 after both receipts were run.
- Lane 19x, which joined on 21 Nov 2026.
- Lane 19y and its `--replay`, which joined on 22 Nov 2026.
- 19q's `--dataset` recomputation, which neither receipt ran to completion.

Not on that list, and also not done: the WSL2 route has not been tried, and no second Linux host
has run the replays.

While reviewing the third receipt the author found a fault in the review rule itself. A receipt
whose 19b was refused or absent did not list 19b's Lean closure as unexercised, so two receipts
that never ran Lean could have cleared that item between them. It did not happen here, because
the second receipt ran Lean. The rule is fixed and a test holds it.

## Lanes that joined after the first receipt

Each is `not_in_receipt` in the review of the first receipt. The second and third receipts hold
all of them except 19w, 19x and 19y.

| Lanes                   | Joined       | Declaration    | What verifying does                                                                                          |
| ----------------------- | ------------ | -------------- | ------------------------------------------------------------------------------------------------------------ |
| 19h, 19i, 19k           | 11 Nov 2026  | P19-OPERATOR02 | Recomputes three model captures from committed outputs.                                                      |
| 19j, 19l                | 11 Nov 2026  | P19-OPERATOR02 | Gate replays of those captures; with `--replay` on Linux x86_64 every recorded send is dispatched again.     |
| 19m                     | 12 Nov 2026  | P19-OPERATOR03 | Eight more local models on 19k's schedule, recomputed from committed outputs.                                |
| 19n, 19o                | 13 Nov 2026  | P19-OPERATOR04 | Four local models and six hosted models, recomputed from committed outputs; needs no network and no key.     |
| 19p                     | 13 Nov 2026  | P19-OPERATOR05 | Every send recorded in 19n through the frozen Phase 17 pipeline; `--replay` on Linux x86_64.                 |
| 19q, 19r, 19s, 19t, 19u | 13 to 14 Nov | P19-OPERATOR06 | 19q has `--dataset`, 19t has `--replay`; the others are recomputed from committed outputs.                   |
| 19v                     | 15 Nov 2026  | P19-OPERATOR07 | Eight open-weight models captured on a rented GPU; verifying runs no model and needs no GPU, network or key. |
| 19w                     | 15 Nov 2026  | P19-OPERATOR08 | A no-attack control on a published benchmark; verifying runs no model and no benchmark.                      |
| 19x                     | 21 Nov 2026  | P19-OPERATOR10 | The same control on eight models from two vendors; verifying runs no model and no benchmark.                 |
| 19y                     | 22 Nov 2026  | P19-OPERATOR11 | 19t's attempts and a second round against the repaired gate; `--replay` on Linux x86_64.                     |

## Limits

The first receipt, in the operator's own words: it is signed with a typed name, and the commands
were typed and run by an AI coding agent on a subscription registered to the author. The operator
states that the author did not access the machine, see the session or take part.

The second and third receipts are also signed with a typed name. The third's signature says the
operator ran the commands personally; the second says nothing about how its commands were typed.
Both operators were asked by the owner, who passed the handoff to them and the returned files to
the author, and both are named by first name with their consent. Neither was chosen by a third
party, and the second receipt comes from one machine.

A review establishes what the returned outputs say. It cannot establish who produced them or on
which machine.

There is no pack here. Nothing ran that a pack could bind; the receipts are the evidence.
