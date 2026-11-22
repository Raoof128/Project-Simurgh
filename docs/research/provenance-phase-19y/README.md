# Phase 19y evidence: the repair of 19t's faults, and a second round against it

Lane 19t gave two coding agents the gate's source. 49 of their 92 attempts changed the gate's
output, through two faults in the gate and one in its fixture, and that lane left the repair
owed. This lane makes the repair, runs the same 92 attempts again, and then gives the repaired
source to a new set of attackers. Each new file was committed and pushed before any of it was
run on the host of record. No model is a target. See [RESULTS.md](RESULTS.md),
[the brief](BRIEF.md) each attacker was given, [the submissions](submissions/) as received,
and [the declaration](../PROVENANCE_PHASE_19.md) (P19-REDTEAM02) with its four amendments.

**None of 19t's 92 attempts changes the repaired gate's output, and none of the 151 new
attempts does either. Three of the six seats in the second round were refused by their
providers, so the prediction about every seat did not hold.**

Verify the structure (any host with Python 3.12; standard library only):

```sh
python -B tools/assurance-provenance/evidence19y.py verify \
  docs/research/provenance-phase-19y/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19y/ROOT.sha256)"
```

That reads 19t's two submissions from 19t's own pack and the six new ones from this pack,
checks every row against them (round, attacker, position, channel, digest and length of the
text, note) and recomputes the summary and the hypotheses; the receipt says
`"kind": "structure_checked"`. On Linux x86_64 in the hash-locked environment, add `--replay`
to run every attempt again against the gate as it was, the repaired gate and thirteen naive
gates, and compare the whole report (`"kind": "gate_recomputed"`, about thirty minutes
on a two-core server). Root `cf2557c4116c9d160d5055cb6afe2eba61b3b528dfbad0cee893dbf0f6b63bd5`.

## The repair

All of it is in one new module, [`repair19y.py`](../../../tools/assurance-provenance/repair19y.py).
The gate module, the fixture and every frozen file are unchanged, because earlier packs bind
their bytes. The new classes subclass them.

| What 19t found                                                                | What the repair does                                                                                      |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| A signed token whose `approver_id` is a list or an object made `verify` raise | A token whose `approver_id` is not a string is refused as `approval_schema`, before the signature         |
| A database error could leave `verify` as an exception                         | A database error during verification is the reason `approval_store`; the ordinary grant check decides     |
| A note of 12,000 characters could put `summary_schema` into the audit         | An oversize note is cut to the longest prefix that fits, and the cut is recorded in the pipeline's events |
| Half of a surrogate pair made the fixture's file write raise                  | The fixture holds file channels as bytes and reads them back with replacement                             |

## What the pack shows

| Round | Seat        | Attempts run | Change the gate as it was | Change the repaired gate | Potent |
| ----- | ----------- | ------------ | ------------------------- | ------------------------ | ------ |
| 1     | `claude`    | 46           | 16                        | 0                        | 14     |
| 1     | `opus`      | 46           | 33                        | 0                        | 12     |
| 2     | `opus-r2`   | 37           | 10                        | 0                        | 5      |
| 2     | `sonnet-r2` | 60           | 16                        | 0                        | 13     |
| 2     | `mythos-r2` | 54           | 18                        | 0                        | 11     |

Potent means the attempt changes at least one of thirteen naive gates and leaves the repaired
gate's output byte-identical. The naive gates carry the same repair, so an attempt no longer
counts as potent only because it changed the audit.

- **Y0 held: the instrument reproduces 19t.** On the gate as it was, this run gives each of
  the 92 attempts the outcome 19t's pack records for it: 49 differ, 39 in the audit and 10 by
  a raise.
- **Y1 held: the repair closes what 19t found.** None of the 92 changes the repaired gate's
  output. In all 92 the undelegated action is blocked, the delegated one goes through and one
  effect reaches the receiver.
- **Y2 held: the second round found no way in.** None of the 151 new attempts changes the
  repaired gate's output or makes a dispatch raise. 44 of them still change the gate as it
  was (32 in the audit, 12 by a raise), which shows the attackers aimed at the old faults and
  their neighbours.
- **Y3 did not hold, because three seats are empty.** It asked for at least one potent
  attempt from every seat. The three seats that attacked have 5 (`opus-r2`), 13 (`sonnet-r2`)
  and 11 (`mythos-r2`). Between them their potent attempts changed all thirteen naive gates.
- **60 of the new attempts sign with the fixture's operator key**, by their own notes. A
  correctly formed token for either action still ends at `approval_replay`, because no
  approval is ever minted in the fixture.

## The seats of the second round

| Seat        | Agent                                              | What happened                                                                                  |
| ----------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `opus-r2`   | Claude Opus 5.5                                    | Handed in 37 attempts                                                                          |
| `sonnet-r2` | Claude Sonnet 5.5                                  | Handed in 60 attempts                                                                          |
| `mythos-r2` | Claude Mythos 5.2, the model that wrote the repair | Handed in 54 attempts                                                                          |
| `fable-r2`  | Claude Fable 5.2                                   | Its provider's safeguards flagged the first request. Nothing received                          |
| `codex-r2`  | OpenAI Codex command-line agent                    | Refused on the owner's plan as a possible cybersecurity risk; could not start with the API key |
| `astra-r2`  | `gpt-6.2-astra` through the paid interface         | The provider answered `cyber_policy` after the model had read the brief. Nothing received      |

No request was reworded after a refusal and no access programme was applied for. The three
empty files were written by the author to record that nothing was received. The only money
spent in the lane is 0.008 USD at OpenAI, on the `astra-r2` seat, under a cap of 10 USD.

So every seat that attacked is a Claude model, and one of them is the model that wrote the
repair. That is weaker evidence than attackers from two vendors would be, and the lane has no
way to make it stronger.

## What the attackers said was still weak

None of these changed the gate's output. They are the attackers' own points, checked by the
author only where marked.

- **A cut note and a refused token leave no trace in what the oracle reads.** Both are
  recorded in the pipeline's own event table and nowhere else. The audit stays empty after a
  cut. All three attackers said this. A channel writer can therefore drop the tail of a note
  without the audit showing it, and can add rows to that table at will. Checked: the rows
  exist, and the repair's tests count them.
- **Only the unminted nonce stops a well-formed token signed with the operator's key.** The
  fixture never mints an approval, so the path that honours one was not attacked here.
- **A file channel can read back longer than it was written.** Half of a surrogate pair comes
  back as three replacement characters. A tool result of 12,000 such characters then exceeds
  the relay's limit and is not parsed at all.
- **The type check on `approver_id` runs before the signature check**, so an unsigned token
  with a non-string approver is `approval_schema` where the gate as it was said
  `approval_signature`. No verdict depends on it.
- **`verify` turns decoding and database errors into reasons, and nothing else.** An error
  from a failing disk would still leave it as an exception. No attacker found a text that
  causes one.

## What changed after the declaration

All four changes are in the ledger, each made before any submission was committed.

1. The Fable seat was refused by its provider, and a Sonnet 5.5 seat was added.
2. The owner asked for an OpenAI model and for Claude Mythos, and two seats were added.
3. The Codex agent was refused on the owner's plan, and the owner said to use the paid
   interface. A cap of 10 USD was set.
4. The Codex agent could not use the project's API organisation, which is an account setting.
   A sixth seat called the model directly, and its provider refused that as well.

The author asked one attacker to save its full report to a file after the report arrived cut
off. No attempt was added, removed or moved at the author's request. One mistake by the
author is in the log: the commit that added two seats was pushed while the quick gate showed
one timing failure of a Node test under load; the test passes alone and the gate passed again
before the submissions were committed.

## Where it ran

On the project's second host, a 2-vCPU Ubuntu 24.04 x86_64 server operated by the author, from
a clean clone at `f1bbf672`, the commit that holds the submissions, in the environment
built from the hash-locked requirement files for 19t. The lane's 59 tests passed there first
(one skipped: it tests the refusal on hosts that cannot replay). The submissions were pushed
at 01:22:54Z on 22 November 2026 and the run started at 01:23:49Z. It ran every attempt once
to build the report and again to verify it, ending 02:22:59Z; the two passes agreed and the
clone was clean before and after. The host is the author's, so this is not a replay outside
the author's custody.

Before the run of record the author ran 19t's 92 attempts on the repaired gate on a
development machine, and after the submissions were pushed ran all of them there too. The
numbers on this page are the host of record's.

## Limits

- Three attacking agents, one sitting each of about half an hour, through one interface, all
  from one vendor. Nothing here is evidence about attackers in general, about a person, or
  about an attacker with more time.
- The repair is beside the gate, not in it. Lanes 19a to 19x measured
  `gate19.ProvenancePipeline`, which still has both faults; a caller has to use
  `repair19y.Pipeline` to get the repair.
- The attacker controls a channel's text and nothing else. The host's state, the clock, the
  receiver and the code are out of reach by declaration. So is the operator's key, except
  that the fixture publishes it; attempts that use it say so in their notes.
- The path that honours a minted approval was not attacked, because the fixture mints none.
- Three attempts depend on the host, on the naive gates only. Two of 19t's attempts and one
  of the new ones nest JSON thousands of levels deep. On the author's macOS machine two naive
  gates raise on them and so count as changed; on the host of record they do not, and those
  attempts are not potent here. The gate as it was and the repaired gate gave every attempt
  the same outcome on both machines. A replay on another host may differ in those three rows.
- What an attacker tried offline is not recorded. The rows are what it chose to hand in.
- The rig is 19b's fixture under a fixed clock, with two actions and one actor. It is not a
  deployed system.
- The attackers' notes and reports are their own words.

## Reproduce (Linux x86_64)

```sh
python3 -m venv .venv
.venv/bin/pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
.venv/bin/python -B tools/assurance-provenance/evidence19y.py run --out /tmp/p19y-pack
```
