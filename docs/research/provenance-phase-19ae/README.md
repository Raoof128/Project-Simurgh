# Phase 19ae evidence: one gate with every repair, attacked afresh

After lane 19ad three things stood open. The repair of that lane had not been attacked. The
repairs sat in three modules beside the gate, and a caller had to know to pick the last one.
And two findings of the day were reported and not repaired: a refusal of a malformed action
left no record, and nothing marked a run of retries. This lane builds one gate that has every
repair, runs every attempt an earlier lane recorded on it, and gives it to three fresh
attackers with the source in hand. No model is a target. See [RESULTS.md](RESULTS.md),
[the brief](BRIEF.md), [the three seats' files](submissions/) and
[the declaration](../PROVENANCE_PHASE_19.md) (P19-FULL01).

**None of 467 attempts gains on the full gate: 431 recorded by seven earlier lanes and 36
written for this one by three seats. The seats found something else. A body that lacks its
`run` or `id`, sent with any token whose signature is good, makes the gate raise where it
should refuse: 16 of their attempts do it. Two of six predictions fail. The raise is not
repaired in this lane.**

Verify the structure (any host with Python 3.12; standard library only):

```sh
python -B tools/assurance-provenance/evidence19ae.py verify \
  docs/research/provenance-phase-19ae/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19ae/ROOT.sha256)"
```

That reads the 21 files of attempts from the pack, converts each by the lane's rule, checks
every row against it, checks that each row's flags follow from its recorded outcome and
recomputes the summary and the hypotheses; the receipt says `"kind": "structure_checked"`. On
Linux x86_64 in the hash-locked environment, add `--replay` to run every attempt again and
compare the whole report (`"kind": "gate_recomputed"`, about twelve minutes on a two-core
server). Root `cf7693ef4af20e1f523391e0fa873bf1e1f11246fcd12f3c151406d0d132b20e`.

## The gate a caller should use

`full19ae.pipeline()` returns one class. It is the gate of lane 19b with:

- lane 19y's repairs to how approvals and long notes are read;
- lane 19z's seal over the gate's own store files;
- lane 19ad's approval store, which admits a token only if its payload is the one the host
  signed;
- a record for every refusal: when a dispatch is refused and neither log gained a record, the
  session writes `refused:` and a label;
- a mark for a run of retries: at the twentieth refusal of an action with no admitted
  dispatch of it in between, the session writes one `retry_limit:` record.

The last two change no decision. The mark is a record in the log and not a cap: the frozen
gate still writes one record for each refusal of a well-formed action, and this lane does not
bound that. A cap that refused without consulting the stores could be turned against
delegated work, and none was built.

The frozen gate and the earlier lanes' modules are not edited, and their packs record what the
gate of their day did. A caller that keeps using an earlier class has none of this.

## What the pack shows

| Declared before any code                                                      | Observed                               | Holds |
| ----------------------------------------------------------------------------- | -------------------------------------- | ----- |
| F0: the bound gate has the two findings: an unrecorded refusal, no retry mark | 24 refusals with no record, 0 marks    | yes   |
| F1: on the full gate every refused dispatch leaves a record, unless latched   | 0 without a record in 467 attempts     | yes   |
| F2: a label is marked exactly when it is refused 20 or more times in a row    | 465 of 467 attempts match              | no    |
| F3: every recorded attempt ends the same on the full gate as on the bound one | same in 431 of 431                     | yes   |
| F4: no attempt gains on the full gate                                         | 0 of 467                               | yes   |
| F5: no fresh attempt that writes no store makes the full gate latch or raise  | 31 such attempts: latched 0, raised 16 | no    |

**Every recorded attempt, on one gate.** The 431 are the channel texts of lanes 19t and 19y
(243), the store-writing operations of lane 19z (52), the sequences of lanes 19aa, 19ac and
19ad (67) and the bodies of lane 19ab (69), each converted by rule into one list of steps.
The six attempts that beat the gate in lane 19ac are among them. None gains here, and each
ends on the full gate as it does on lane 19ad's.

**The 24 silent refusals now have records.** They are lane 19ab's malformed bodies on its
first route. Lane 19ab counted 30 by the gate's log alone; six of those are on its second
route and have a record in the pipeline's log. On the full gate 27 `refused:` records were
written in all, three of them for one seat's malformed bodies.

**Runs of retries are marked.** Twelve attempts refuse an action 20 or more times in a row,
and ten of those have its mark. The other two are the F2 failures, below.

## What the seats found

Three agents, each with a copy of the repository at the instrument commit and nothing hidden.
Each was pointed at the two repairs written the same day.

| Seat     | Model, read from the harness's record   | Worked           | Handed in | Gains | Raises with no store write |
| -------- | --------------------------------------- | ---------------- | --------- | ----- | -------------------------- |
| `seat-a` | Claude Opus 5.5 (`claude-opus-5-5`)     | 08:02Z to 08:07Z | 9         | 0     | 4                          |
| `seat-b` | Claude Opus 5.5 (`claude-opus-5-5`)     | 08:02Z to 08:08Z | 11        | 0     | 6                          |
| `seat-c` | Claude Sonnet 5.5 (`claude-sonnet-5-5`) | 08:02Z to 08:09Z | 16        | 0     | 6                          |

**No gain.** All three ran lane 19ac's attack against the repair, and variants of it: the
other action's nonce, a re-signed copy with the expiry written as another number, a spent
token, a crossed token. Each is refused as `approval_replay`. None found a way to put a
second effect or a foreign payload at the receiver.

**A raise.** All three found the same fault independently. The approval check compares the
token's `run` and `action_key` with the dispatched body's `run` and `id`, and it reads those
two keys from the body before anything has checked that the body has them. A body without
one of them, sent with a token that passes the signature check, raises `KeyError`. The
exception passes through every layer, the repairs included, and reaches the caller. The
simplest form needs no signing key: the host mints an approval for the delegated action, and
the agent dispatches the body `{"id": "b"}` with it. That call leaves no verdict and no
record, so it is also a refusal with no record in everything but name. The fault is in lane
19b's approval store and has been there since.

What it costs depends on the caller. A host that does not catch the exception stops. Nothing
is sent and no authority is gained.

**Two flaws in the instrument.** Two seats showed that the check for F2 was wrong where the
gate was right. When an action is refused 20 times, admitted once on a real approval and
refused 20 times more, the gate writes two marks, as it should, and the instrument called
that a mismatch. That was corrected before the run of record, after seeing the seats'
reports, and the ledger records it as such. The second is left as it is and is why F2 fails:
when a seat's own write to a store latches the seal, the gate writes nothing more and the
instrument does not read a log it can no longer trust. A run of 20 refusals in such an
attempt has no mark to match. F1 was declared with an exception for a latched gate and F2
was not, so those two rows count against it.

The record the harness keeps of each seat shows no path outside the seat's copy. That record
is the author's and is not in the repository.

## Where it ran

On the project's second host, a 2-vCPU Ubuntu 24.04 x86_64 server operated by the author, from
a clean clone at `ab544c00`, a commit that holds the seats' files, in the hash-locked
environment. The lane's 23 tests passed there first (one skipped: it tests the refusal on
hosts that cannot replay). The run started at 09:20:43Z on 22 November 2026. It ran every
attempt once to build the report and again to verify it, ending 09:43:55Z; the two passes
agreed and the clone was clean before and after. The host is the author's, so this is not a
replay outside the author's custody.

Attempts that only use the gate's own calls run 25 to a process. An attempt that writes a
store, and every attempt of a seat, runs alone in its process, as in lane 19z.

The author ran the 431 recorded attempts on a development machine while writing the
instrument, and the seats' 36 there before the run of record to check their reports, so the
run of record is not the first time either half was seen. Rows inherited from lanes 19y and
19ac depend on how deep the host's JSON parser goes, and one attempt of lane 19z ends its
worker process, so a `--replay` on another host may stop with `report_mismatch`.

## Limits

- The raise is reported and not repaired. Every gate in this repository has it.
  (Added 23 Nov 2026: [lane 19ag](../provenance-phase-19ag/README.md) repairs it in a class
  beside the gate. This lane's gate and every earlier one still raise.)
- The seats are agents of two Claude models, started by the author. They are not a person
  and not an attacker from another vendor. There was no planted fault in this round, so
  their zero carries only the weight that seats of this kind found the last fault.
- The retry mark is an alert in a log. Nothing reads it, and it does not bound the log.
- Once the seal has latched the gate writes nothing, so a refusal after a latch has no record
  of its own.
- The earlier lanes' packs are not replaced.
- The fixture has two actions, one actor and a budget of one.

## Reproduce (Linux x86_64)

```sh
python3 -m venv .venv
.venv/bin/pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
.venv/bin/python -B tools/assurance-provenance/evidence19ae.py run --out /tmp/p19ae-pack
```
