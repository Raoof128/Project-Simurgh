# Phase 19ad evidence: the approval bound to what the host minted

[Lane 19ac](../provenance-phase-19ac/README.md) found a real fault in the gate. The approval
store records which action a nonce was minted for and never reads it back, so a token signed
with the operator's key is admitted on the nonce of an approval the host minted for another
action. This lane repairs that beside the gate and runs every recorded sequence again, on the
gate as it was and on the repaired one. No model is a target and no agent was started. See
[RESULTS.md](RESULTS.md), [the author's sequences](attempts-author.json) and
[the declaration](../PROVENANCE_PHASE_19.md) (P19-BIND01).

**Of 67 recorded sequences, 8 make the undelegated action land on the gate as it was and none
does on the repaired gate. The other sequences that carry no forged token, 57 of them, get
the same verdicts and effects from both. The repair has not been attacked afresh.**

(Added 23 Nov 2026: [lane 19ae](../provenance-phase-19ae/README.md) attacked the repair with three
fresh seats. None of their 36 attempts gains.)

Verify the structure (any host with Python 3.12; standard library only):

```sh
python -B tools/assurance-provenance/evidence19ad.py verify \
  docs/research/provenance-phase-19ad/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19ad/ROOT.sha256)"
```

That reads the five files of sequences from the pack, checks every row against them, checks
that each row's flag follows from its recorded outcome and recomputes the summary and the
hypotheses; the receipt says `"kind": "structure_checked"`. On Linux x86_64 in the hash-locked
environment, add `--replay` to run every sequence again on both gates and compare the whole
report (`"kind": "gate_recomputed"`, about four minutes on a two-core server). Root
`a4f233830d9fad3c86a6ce219a72f5f8daed6b9d976c15a9187d0cd5df12fb3f`.

## The repair

When the host mints an approval, the repaired store records a digest of the whole payload it
signed: the run, the action, the content digest, the expiry, the actor, the approver and the
nonce. When a token comes back and has passed every earlier check, the store looks up its
nonce and admits the token only if its payload has the recorded digest. A token that differs
from what the host minted in any field is refused, whoever signed it.

So the signing key no longer lets its holder move an approval. A holder can still present
the exact token the host minted, which is the approval itself.

The repair is in a new module, `bind19ad.py`, beside the gate, as the repairs of lanes 19y
and 19z are. `bind19ad.pipeline()` returns the repaired class. No earlier file is edited, the
earlier lanes' packs are not rerun, and a caller that keeps using the earlier classes has
none of this.

## What the pack shows

The sequences are every one already committed in this grammar, read from the files of the
lanes that own them and bound by digest: lane 19aa's 28, and lane 19ac's 5 controls, 16 from
its first seat and 9 from its second. The author added nine for this lane.

| Declared before any code                                                        | Observed            | Holds |
| ------------------------------------------------------------------------------- | ------------------- | ----- |
| D0: the gate before still loses to the six recorded gains and to a new sequence | seats 6, author 2   | yes   |
| D1: on the bound gate no sequence gains                                         | 0 of 67             | yes   |
| D2: with no forged token admitted before, both gates give the same outcome      | same in 57 of 57    | yes   |
| D3: on the bound gate nothing latches the seal or raises                        | latched 0, raised 0 | yes   |

**D2 was amended before anything was run.** As first declared it covered every sequence that
does not gain on the gate before. The same declaration said the lane would report what each
gate does with a re-signed token for an action the host did approve, and on those the two
gates are meant to differ. The amendment, committed on its own before the instrument, reads
D2 over the sequences in which the gate before admits no token the host did not mint.

**The re-signed tokens.** In two of the author's sequences the host approves `b` and a
re-signed token for `b` is relayed before the real one is used. In one the token keeps `b`'s
nonce and changes the expiry. In the other both actions are approved and the token rides on
`a`'s nonce. Neither is a gain, since `b` was approved. The gate before admits the re-signed
token. The bound gate refuses it and then honours the real approval once. A third, naming an
approver the host does not list, is refused by both.

**The other sequences are unchanged.** A real approval is honoured once, direct or relayed,
on both gates. Tokens with a nonce the host never minted, the retries and the self-written
approvals of lane 19aa, and the seats' probes with malformed tokens all end the same way on
both.

## Where it ran

On the project's second host, a 2-vCPU Ubuntu 24.04 x86_64 server operated by the author, from
a clean clone at `62133f88`, the instrument commit, in the hash-locked environment. The lane's
18 tests passed there first (one skipped: it tests the refusal on hosts that cannot replay).
The run started at 06:43:23Z on 22 November 2026. It ran every sequence once to build the
report and again to verify it, ending 06:51:53Z; the two passes agreed and the clone was
clean before and after. The host is the author's, so this is not a replay outside the
author's custody.

The author ran the same 67 sequences on a development machine while writing the instrument,
after the amendment, so the run of record is not the first time the outcome was seen. One of
lane 19ac's rows records a different reason on that machine (a token nested 1,900 lists
deep); the same row is here, so a `--replay` on another host may stop with `report_mismatch`
on it. No verdict, effect or gain depends on it.

## Limits

- The repair is not attacked afresh. The sequences are the ones already recorded, and the
  seats that found the fault have not seen the repair.
- It does not make a lost signing key safe. It removes one thing a holder of the key could
  do.
- The repaired classes are beside the gate. A caller that does not use them has none of it,
  and the fault is still in the gate that lanes 19a to 19ac ran.
- The repair was written within the hour the fault was found. No one outside the project
  has reviewed it.
- One grammar, on a fixture with two actions, one actor and a budget of one.

## Reproduce (Linux x86_64)

```sh
python3 -m venv .venv
.venv/bin/pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
.venv/bin/python -B tools/assurance-provenance/evidence19ad.py run --out /tmp/p19ad-pack
```
