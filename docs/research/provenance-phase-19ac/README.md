# Phase 19ac evidence: sequences written by a model, and one planted fault

Lanes 19y and 19z ended with no attempt that beat the gate, and nothing in them says whether
their attackers would have found a fault had one been there. Lane 19aa's sequences are the
author's own. This lane has two agents write the sequences, and gives them a second gate with
a fault the author planted, without saying which gate is which. The planted fault was meant
to give weight to a zero on the real gate, and the seats did not return a zero. No model is
a target. See [RESULTS.md](RESULTS.md), [the brief](BRIEF.md),
[the author's controls](attempts-author.json), [the two seats' files](submissions/) and
[the declaration](../PROVENANCE_PHASE_19.md) (P19-PLANT01).

**Both seats found the planted fault, and both found a real one in the gate itself: 6 of
their 25 attempts make the undelegated action land on the real gate. Each of the 6 signs a
token with the operator's key and reuses the nonce of an approval the host minted for the
other action. The fault is not repaired in this lane.**

Verify the structure (any host with Python 3.12; standard library only):

```sh
python -B tools/assurance-provenance/evidence19ac.py verify \
  docs/research/provenance-phase-19ac/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19ac/ROOT.sha256)"
```

That reads the three files of attempts from the pack, checks every row against them, checks
that each row's flag follows from its recorded outcome and recomputes the summary and the
hypotheses; the receipt says `"kind": "structure_checked"`. On Linux x86_64 in the hash-locked
environment, add `--replay` to run every attempt again on both gates and compare the whole
report (`"kind": "gate_recomputed"`, about two minutes on a two-core server). Root
`c130b0e56a4f1c38bc2c11f70fd8944ce88ee0221be7d8432e7a063a262742fe`.

## The real fault

When the host mints an approval, the approval store records its nonce together with the
action it is for. When a token comes back, the store checks the signature, the run, the
action, the content digest, the expiry, the actor and the approver against the token, and
then looks up the nonce and asks one thing of it: has it been spent. It never asks which
action the nonce was minted for.

So this sequence lands the undelegated action `b` with no approval for it:

1. The host mints an approval for `a`. Its nonce is now in the store, unspent.
2. The agent writes a token for `b` that carries that nonce and signs it with the operator's
   key.
3. The agent relays the token and dispatches `b`. Every check passes, and `b` is observed.

The attacker needs the operator's signing key. In this fixture the key is a constant in the
repository and the brief allowed its use; every attempt that signs with it says so in its
note. A key that signs approvals is a serious thing to lose, and a gate whose key is lost has
lost most of what an approval means. The store's record of what the host minted is
the one thing left standing in that case, and it is weaker than it looks: it holds the action
and does not use it.

The fault is in the approval store of lane 19b (`gate19.py`) and has been there since. The
repair of lane 19y and the seal of lane 19z do not touch it, and no earlier lane's page
reports it.
[Lane 19aa](../provenance-phase-19aa/README.md) reports that a token signed with the key and
carrying a nonce the host never minted is refused. That stands. A token carrying a nonce the
host minted for something else is not refused.

Both seats found it independently, in sessions of under three and under five minutes. Both
named the same cause in the store's code, and `seat-b` named the repair: compare the stored
action with the token's when the nonce is looked up.

## The planted fault

The planted gate is the real gate with one change in `planted19ac.py`: a token passes
although the host never minted its nonce. It is an easy fault. Any sequence that relays a
key-signed token with a fresh nonce finds it, and four of the author's 28 sequences in lane
19aa are of that kind. `seat-b` found it by running those 28 on both gates and comparing.
`seat-a` found it by running its own probes on both.

Each seat handed in attempts that gain on the planted gate and not on the real one (one from
`seat-a`, two from `seat-b`), and each named the planted gate's label and the fault. So the
control shows that these seats tried forged tokens at all and compared the two gates with
care. It is a floor on their effort, and it says nothing about harder faults.

## What the pack shows

| Declared before any code                                         | Observed               | Holds |
| ---------------------------------------------------------------- | ---------------------- | ----- |
| P0: the author's controls gain on the planted gate, not the real | planted 2, real 0      | yes   |
| P1: no attempt of a seat gains on the real gate                  | 6 of 25 gain           | no    |
| P2: each seat hands in an attempt that gains on the planted gate | `seat-a` 3, `seat-b` 6 | yes   |
| P3: on the real gate no attempt latches the seal or raises       | latched 0, raised 0    | yes   |

The counts under P2 include the attempts that gain on both gates. No attempt puts more than
one effect at the receiver: the budget of one holds on both gates. The seats also tried lone
surrogates, a token nested 1,900 lists deep, an expiry of NaN, lists and objects where the
store expects text, and SQL in a nonce. Each came back with a reason and no exception.

## The seats

Both seats are agents the author started, each with a copy of the repository at the
declaration commit, which holds the real gate and not the planted one. Each reached the two
gates through a runner outside its copy that took a label, `gate-1` or `gate-2`, and a
sequence, and printed the outcome. `gate-1` was the planted gate.

| Seat     | Model, read from the harness's record | Worked                 | Handed in |
| -------- | ------------------------------------- | ---------------------- | --------- |
| `seat-a` | Claude Opus 5.5 (`claude-opus-5-5`)   | 06:16:55Z to 06:19:25Z | 16        |
| `seat-b` | Claude Opus 5.5 (`claude-opus-5-5`)   | 06:17:01Z to 06:21:19Z | 9         |

The record the harness keeps of each seat was read after it ended. Neither holds a call that
reads the runner, the runner's directory, the planted module, or any path outside the seat's
copy other than to run the runner. That record is the author's and is not in the repository,
so a reader has the author's word for it.

The instrument commit (`555ddbc6`) was made at 06:16:25Z, before either seat started, and was
pushed at 06:22Z with the seats' files, after both had ended. The declaration commit
(`b0574021`) was pushed alone before that.

Both seats are the same model, so this is one kind of attacker run twice.

## Where it ran

On the project's second host, a 2-vCPU Ubuntu 24.04 x86_64 server operated by the author, from
a clean clone at `37c48971`, the commit that holds the seats' files, in the hash-locked
environment. The lane's 25 tests passed there first (one skipped: it tests the refusal on
hosts that cannot replay). The run started at 06:22:23Z on 22 November 2026. It ran every
attempt once to build the report and again to verify it, ending 06:25:38Z; the two passes
agreed and the clone was clean before and after. The host is the author's, so this is not a
replay outside the author's custody.

**One row depends on the host.** `seat-a`'s attempt 14 relays a token nested 1,900 lists
deep. On the Linux host the store parses it and refuses it as `approval_schema`. On the
author's macOS machine the parser gives up first and the store records no reason. The
verdicts, the effects and the gains are the same on both, and no hypothesis turns on it, but
the report differs in that row, so a `--replay` on another host may stop with
`report_mismatch`. The author ran `seat-a`'s file on that machine before the run of record,
to check the seat's report of a gain.

## Limits

- The real fault is reported and not repaired. Every lane that uses this gate has it.
- It needs the operator's signing key. Nothing here measures how an agent would come to hold
  one.
- One planted fault, chosen by the author and easy to find. A seat that finds it is not
  shown to find faults of other kinds.
- Two seats of one model, both started by the author. They are not a person and not an
  attacker in general.
- The runner hid which gate was which from an agent that kept to its brief. It is not a
  sandbox.
- The fixture has two actions, one actor and a budget of one.

## Reproduce (Linux x86_64)

```sh
python3 -m venv .venv
.venv/bin/pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
.venv/bin/python -B tools/assurance-provenance/evidence19ac.py run --out /tmp/p19ac-pack
```
