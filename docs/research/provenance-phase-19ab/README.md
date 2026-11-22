# Phase 19ab evidence: changed bodies of a delegated or approved action

An agent that may send one thing can try to send another under the same name. The gap hunt of
22 November calls this laundering through a permitted request. The part of it a fixture can
measure is narrow and worth knowing: does the gate bind the whole body of an action, or only
its name? This lane hands the sealed gate of lane 19z 64 changed bodies in place of an action
the agent was delegated or the host approved. No model is a target and no model wrote a body.
See [RESULTS.md](RESULTS.md), [the author's attempts](attempts-author.json) and
[the declaration](../PROVENANCE_PHASE_19.md) (P19-BODY01).

**None of the 64 changed bodies is observed, with or without an approval, and every payload
that reaches the receiver is the unchanged action's. Something the lane did not predict: 30
of the 66 refusals leave no `blocked` record in the gate's log.**

Verify the structure (any host with Python 3.12; standard library only):

```sh
python -B tools/assurance-provenance/evidence19ab.py verify \
  docs/research/provenance-phase-19ab/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19ab/ROOT.sha256)"
```

That reads the file of attempts from the pack, checks every row against it, recomputes each
row's facts from its recorded outcome and the fixture the report names, and recomputes the
summary and the hypotheses; the receipt says `"kind": "structure_checked"`. On Linux x86_64 in
the hash-locked environment, add `--replay` to run every attempt again and compare the whole
report (`"kind": "gate_recomputed"`, about two minutes on a two-core server). Root
`67d1029539c921f772229731779e8c4fd0a1297c07f422e138b03ca967bdaade`.

## What one attempt is

The fixture has two actions, each a JSON object with eight fields. The acting agent was
delegated `a` and was not delegated `b`. An attempt is one body and one route.

- Route `a`: the body is dispatched once in place of the delegated action, with no approval.
  Then the delegated action is dispatched unchanged.
- Route `b`: the host mints an approval for the unchanged `b`. The body is dispatched once
  with that approval. Then the unchanged `b` is dispatched with the same approval.

A body counts as changed when its canonical JSON differs from the unchanged action's. The same
keys and values in another order are not a change.

The 64 changed bodies are of four kinds: another value in each field in turn (content,
resource, operation, principal, tenant, policy revision, run, name); added and missing fields;
the same text in another encoding (a capital letter, a trailing or leading space, a no-break
space, a fullwidth letter, a zero-width space, a look-alike Cyrillic letter, a combining
accent, a trailing newline or NUL); and values of another type (a list, an object, null, a
number, true).

## What the pack shows

| Declared before any code                                                     | Observed                                      | Holds |
| ---------------------------------------------------------------------------- | --------------------------------------------- | ----- |
| B1: no changed body is observed                                              | 64 changed bodies, observed 0                 | yes   |
| B2: every payload at the receiver is the unchanged action's                  | 69 payloads, 0 other                          | yes   |
| B3: after a refused changed body, the unchanged delegated action is observed | 47 refused on route `a`, then observed in 47  | yes   |
| B4: an approval is refused for a changed body and then honoured once         | 17 changed, 17 refused, 17 then honoured once | yes   |
| B5: no attempt latches the seal or raises                                    | latched 0, raised 0                           | yes   |

**The gate binds the body, not the name.** 56 of the 64 changed bodies keep the name of the
action they stand in for, so a gate that matched on the name alone would have passed them.
That figure is arithmetic on the list. It is not a measurement of another gate, and the lane
has no gate of that kind as a positive control.

**An approval covers the bytes it was minted for.** On route `b`, 15 changed bodies are
refused with the reason `approval_digest`, one with `approval_run` and one with
`approval_action`. The refusal does not spend the approval: in all 17 attempts the unchanged
action then goes through once on the same approval.

**Key order is not a change.** The five unchanged bodies are observed, including three
written with their keys reversed or sorted. The receiver records the same canonical payload
for each.

## What the lane did not predict

A refused dispatch should leave a record. Lane 19aa checked that for well-formed actions and
it held: 1,158 refusals, 1,158 `blocked` events. Here it does not hold. Of 66 refused
dispatches, 36 leave a `blocked` event in the gate's log and 30 leave none.

The 30 are the bodies the gate's own schema rejects before it reaches a decision: an added or
missing field, a value of another type, an operation the fixture does not have, and content
that is empty or too long. A look at the stores after the run of record showed the same for
each: the dispatch returns `blocked`, and the only event written is the session's `resume`.
Bodies that are well formed and merely wrong (another resource, principal, tenant, policy
revision, run, name or content, and every re-encoding of the content) are refused with a
`blocked` event.

So an agent that probes the gate with malformed actions is refused every time and is not in
the log as refused. A monitor that counts `blocked` events would have missed 30 of the 66
refusals in this lane. This was not a declared hypothesis. It is reported as found, and no
repair was made, as the declaration says.

## Where it ran

On the project's second host, a 2-vCPU Ubuntu 24.04 x86_64 server operated by the author, from
a clean clone at `b3bf1e77`, the instrument commit, in the hash-locked environment. The lane's
29 tests passed there first (one skipped: it tests the refusal on hosts that cannot replay).
The run started at 05:51:25Z on 22 November 2026. It ran every attempt once to build the
report and again to verify it, ending 05:55:11Z; the two passes agreed and the clone was
clean before and after. The host is the author's, so this is not a replay outside the
author's custody.

The author ran the same 69 attempts on a development machine while writing the instrument, so
the run of record is not the first time the outcome was seen. A rebuild of the pack on that
machine (macOS) after the run of record gave the same root.

## Limits

- The gate binds what the body is. It cannot judge what the body means: an allowed body that
  does harm passes, and this lane says nothing about it.
- A third party that acts on an allowed request is the rest of what laundering names. It is
  not measured here; the fixture's receiver only records.
- The bodies are a list the author wrote. Nothing here is evidence about what a model or an
  attacker would try, and no agent attacked this lane.
- The bodies are JSON objects that the host hands to the gate. A caller that builds the action
  some other way is outside the lane.
- The fixture has two actions, one actor and a budget of one.
- The gate is lane 19z's sealed, repaired gate beside the gate that lanes 19a to 19y measured.

## Reproduce (Linux x86_64)

```sh
python3 -m venv .venv
.venv/bin/pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
.venv/bin/python -B tools/assurance-provenance/evidence19ab.py run --out /tmp/p19ab-pack
```

The new pack's `ROOT.sha256` equals the committed one when run from the committed sources.
