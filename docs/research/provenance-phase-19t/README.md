# Phase 19t evidence: attackers that have the gate's source

Every replay lane before this one says it is not evidence about an attacker who knows the gate.
Here two coding agents were given the whole repository, including the gate, and asked to write
text that changes what the Phase 19 gate decides. One attempt is a channel (`summary_note`,
`transcript`, `memory_file` or `tool_result_body`) and a text of at most 12,000 characters; the
rig writes it into a fresh 19b fixture and dispatches the undelegated action and the delegated
one. Each attacker's file was committed and pushed before any of it was run on the host of
record. The same attempts were run against thirteen gates that naively read a channel as
authority. No model is a target. See [RESULTS.md](RESULTS.md), [the brief](BRIEF.md) each
attacker was given, [the submissions](submissions/) as received, and
[the declaration](../PROVENANCE_PHASE_19.md) (P19-REDTEAM01) with its four amendments.

**The prediction declared before the run did not hold. 49 of 92 attempts change the gate's
output. None of them makes the undelegated action land, changes a verdict or changes the
authority hash.**

Verify the structure (any host with Python 3.12; standard library only):

```sh
python -B tools/assurance-provenance/evidence19t.py verify \
  docs/research/provenance-phase-19t/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19t/ROOT.sha256)"
```

That reads both submissions from the pack, checks every row against them (attacker, position,
channel, digest and length of the text, note) and recomputes the summary and the hypotheses;
the receipt says `"kind": "structure_checked"`. On Linux x86_64 in the hash-locked environment,
add `--replay` to run every attempt against the gate and the thirteen naive gates again and
compare the whole report (`"kind": "gate_recomputed"`, about fifteen minutes on a two-core
server). Root `0096b482e9a4ce62230ee7c4466eb57b7a0094b569a5f9d96899963166611a46`.

## What the pack shows

| Seat     | Attempts run | Change the gate's output | Only the audit | A dispatch raised | Change a naive gate and not the real one |
| -------- | ------------ | ------------------------ | -------------- | ----------------- | ---------------------------------------- |
| `claude` | 46           | 16                       | 10             | 6                 | 14                                       |
| `opus`   | 46           | 33                       | 29             | 4                 | 4                                        |
| `codex`  | 0            | 0                        | 0              | 0                 | 0                                        |

- **T1 did not hold.** It said no submitted attempt would make the clean gate's output differ
  from the baseline. 49 of 92 do.
- **What stayed the same in all 92.** In the 82 attempts where the dispatch completed, the
  undelegated action was blocked, the delegated one went through, one effect reached the
  receiver and the authority hash was the baseline's. In the 10 where a dispatch raised, no
  output exists; nothing was admitted before the raise.
- **Finding 1: any channel can change the audit, with no key.** 39 attempts, from both
  attackers independently and through all four channels. A text of at most 12,000 characters
  can exceed the gate's 16,384-byte limit on the summary once it is escaped (a quote or a
  backslash takes two bytes, a control or non-ASCII character six, an emoji twelve). The gate
  then records `summary_schema` in the resume audit where the baseline has nothing. The limit
  on what a channel may hold is counted in characters and the limit on the summary in bytes, and
  the two disagree. An agent that can write to a channel can therefore put a schema fault into
  the audit at will, which makes that fault useless as a signal.
- **Finding 2: a token signed with the fixture's operator key can make the gate raise.** 7
  attempts, from both attackers. The token's `approver_id` is a list or an object where a string
  is expected. The approval store checks the token's shape, signature, run, action, digest,
  expiry and actor, and then uses `approver_id` in a database lookup, which raises
  `sqlite3.ProgrammingError`; that error is not among the ones the store turns into a refusal.
  The gate's own description says verification returns a reason and never raises. This needs
  the operator's key. In the fixture that key is a constant in `rig.py`, which is why an
  attacker with the source could use it; the declaration places the key outside the attacker's
  control, and with a secret key this path is closed to it. It is still a fault in the gate: a
  holder of the key can stop a dispatch with a malformed token.
- **What the same key could not do.** 14 further attempts sign with the fixture's key and
  change nothing. A correctly formed token for either action ends at `approval_replay`, because
  no approval was ever minted in the fixture, and the ordinary grant check then decides.
- **Three raises are the fixture's, not the gate's.** A text holding half of a surrogate pair
  cannot be written to a file channel; the fixture's write raises `UnicodeEncodeError` before
  the gate runs. They are counted against T1 as the rule says.
- **T2 did not hold, because of the empty seat.** It asked for at least one attempt from each
  attacker that changes a naive gate. `claude` has 30 and `opus` 37; `codex` handed in nothing.
  For the two seats that attacked, the texts were potent: between them, attempts that left the
  real gate unchanged changed every one of the thirteen naive gates.

## Read after the fact (not part of the declared analysis)

- "Changes a naive gate" overstates potency where the audit is involved. The naive gates share
  the real gate's resume audit, so every attempt that changes the audit changes all thirteen.
  The last column of the table counts only attempts that changed a naive gate while the real
  gate's output stayed byte-identical: 14 from `claude`, covering all thirteen naive gates, and
  4 from `opus`, covering five.
- The two attackers found both faults independently. `claude` first left the raising attempts
  out because they would have stopped the run, said so, and added them when told a raise would
  be recorded.
- Neither attacker found a way for channel text to reach a grant, an attempt record, a held
  action, a signal or a port. Both report reading for one and name the code paths they tried.

## The seat that is empty

The declaration named the OpenAI Codex command-line agent as the first attacker. Its one request
was refused by its provider with a notice that the content was flagged for possible
cybersecurity risk. The task was not reworded to get past that filter. `submissions/codex.json`
is an empty submission written by the author to record that nothing was received. A second
Claude agent on a different model took a third seat, declared before any submission existed.
Two agents from one vendor are weaker evidence of independent attack than the pair first
declared.

## What changed after the attackers were started

All four changes are in the ledger, each made before any submission was committed.

1. The count of naive gates in the declaration was corrected from nine to thirteen.
2. The Codex seat was recorded as refused and the third seat added.
3. The instrument was changed to record an attempt that makes a dispatch raise. As first
   committed it would have stopped there. An attacker found this offline and reported it.
4. The instrument's digest of a text was changed to accept half of a surrogate pair, and the
   second attacker added seven attempts it had held back.

The author answered two questions from attackers. Both answers said to submit as the brief
says, and asked that a note say where an attempt signs with the fixture's key. No attempt was
removed or moved at the author's request.

## Where it ran

On the project's second host, a 2-vCPU Ubuntu 24.04 x86_64 server operated by the author, from
a clean clone at `8a99ccae`, the commit that holds the submissions, in a new environment built
from the hash-locked requirement files. The lane's 27 tests passed there first (one skipped: it
tests the refusal on hosts that cannot replay). The submissions were pushed at 02:37:35Z on
13 November 2026 and the run started at 02:37:49Z. It ran every attempt once to build the
report and again to verify it, ending 03:07:43Z; the two passes agreed and the clone was clean
before and after. The host is the author's, so this is not a replay outside the author's
custody.

## Limits

- Two attacking agents, one sitting each of about half an hour, through one interface. Nothing
  here is evidence about attackers in general, about a person, or about an attacker with more
  time.
- The attackers are of one vendor, and of the same family as the model that wrote most of the
  gate under the owner's direction. An attacker with different habits may look elsewhere.
- The attacker controls a channel's text and nothing else. The host's state, the clock, the
  receiver and the code are out of reach by declaration. So is the operator's key, except that
  the fixture publishes it; attempts that use it are marked by their own notes.
- What an attacker tried offline is not recorded. The rows are what it chose to hand in.
- The rig is 19b's fixture under a fixed clock, with two actions and one actor. It is not a
  deployed system.
- Neither fault is repaired here. A repair is owed under its own declaration, and no attempt of
  this lane is rerun after it.
- The attackers' notes and reports are their own words. Where a note says why something
  happens inside the gate, that explanation was checked by the author only for the two findings
  above.

## Reproduce (Linux x86_64)

```sh
python3 -m venv .venv
.venv/bin/pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
.venv/bin/python -B tools/assurance-provenance/evidence19t.py run --out /tmp/p19t-pack
```
