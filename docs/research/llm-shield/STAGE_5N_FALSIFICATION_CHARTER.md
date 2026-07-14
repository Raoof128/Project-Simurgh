# Stage 5N — VTC-Delay: falsification charter

A blade nobody can attack is decoration. This charter states **exactly what would falsify Stage 5N**, what
we pledge to do with a successful attack, and what a refutation would **not** mean. Signed with
`SIG5N.audit`.

## Scope: the two laws, and nothing else

Only these are on trial. Everything else is already conceded in `NON_CLAIMS` and cannot be "falsified"
because it was never claimed.

**Law 1 — No Instant Finalisation.** If `verifyVtcDelay` returns raw 0, then two RFC-3161 tokens from
authorities in the committed registry bind `start_authorisation_digest` and `D_out` respectively, and their
genTimes — reduced by each authority's committed uncertainty on the conservative side — differ by at least
`precommitted_minimum_elapsed_ms` (frozen at 60,000 ms in v1).

**Law 2 — No Pre-Input Final Commitment.** If `verifyVtcDelay` returns raw 0, then `D_out` is the exact
T-step descendant, under the committed recurrence, of a seed determined by `{run_id, D_in,
start_token_digest, delay_policy_digest}` — where `start_token_digest` is the digest of the **real** start
token's DER. `D_out` therefore cannot have been fixed before that token existed.

## What counts as a refutation

Any of the following, demonstrated against the **shipped** verifier at
`tools/simurgh-attestation/stage5n/`, falsifies the stage:

1. **A false green.** An envelope where `verifyVtcDelay(...).raw === 0` while the true elapsed separation of
   the two tokens is below the committed floor. (This is the headline target.)
2. **A pre-decided verdict passing.** An envelope returning raw 0 whose `D_out` was fixed **before** the
   start token was issued — i.e. Law 2 broken without breaking SHA-256.
3. **An escape from the typed band.** Any input producing a verdict outside `{0} ∪ [396,419]`, an
   uncaught throw, or a non-zero code whose stated reason does not match the actual defect.
4. **A wrapper leak.** Any route to raw 0 that bypasses the frozen `396→418` spine, or any internal error
   surfacing as green rather than 419.
5. **Chain non-determinism.** Two honest implementations of the published recurrence disagreeing on
   `terminal_value` for the same seed (this would void Lane D and the Python/browser parity).
6. **Overclaim smuggling.** A green envelope that nonetheless asserts, anywhere in its structure, that a
   human reviewed, deliberated, or paid attention — i.e. defeating the `DELAY_OVERCLAIM_FORBIDDEN_KEYS`
   gate on its own terms (a _lexical_ gate; see limits below).
7. **Attestation forgery.** A public or audit attestation verifying under the wrong domain, or an audit
   payload whose `known_limitations` can be stripped while still verifying.

## What would NOT refute it

These are already signed non-claims. Demonstrating them confirms our documentation; it does not break the
stage:

- Showing a reviewer was **inattentive** during a valid 90-second interval. Delay is not attention. The
  stage says "not instant", never "careful" — that is the whole honesty boundary.
- Showing the work was **parallelised** across machines, or run on faster hardware. We assert sequential
  _dependency_, not universal non-parallelisability or hardware independence.
- Showing a **TSA's clock was wrong** or an authority misbehaved. RFC 3161 §1 itself declines to establish
  TSA operational security; `not_proof_of_tsa_clock_correctness` is signed. Trust-on-pin is the stated
  model, not a hidden assumption.
- Showing the **decision was wrong**. `not_decision_correctness`. 5N times the boundary; it does not judge it.
- Showing semantic overclaim in **prose** that avoids the forbidden key set. The gate is **lexical, not
  semantic**, and is documented as such. This is a known bound, and the next rung's target — not a defect.
- Showing the **browser core** won't verify anchors. It is Option 3 by design: it never emits a normative
  raw 0.
- **Absence of a finding is not proof of soundness.** No amount of failed attack makes these laws true; it
  only fails to make them false.

## Our pledge

We will **faithfully publish the technical finding and the verifier outcome** — including a finding that
falsifies a law we have already tagged and scored — subject only to redactions for privacy, secret removal,
abuse-safety, and coordinated disclosure. This is deliberately **not** a promise of unconditional verbatim
publication: a submission may carry credentials, personal data, or exploit material that must not be
mirrored. We will not withhold a finding because it is embarrassing.

Precedent, not aspiration: this stage's live Fable-5 lane **refused** the adversarial prompt, and that is
sealed as `model_refused` rather than re-rolled into a pass. An independent reviewer found that our own
watcher wrote files named `confirmed` containing zero confirmations — a filename that overclaimed in a
project built against overclaiming — and that finding is recorded verbatim in the closeout, not buried.

## How to attack it

Everything needed is in the repo; nothing is withheld from an attacker.

```bash
./scripts/reproduce-llm-shield-stage5n.sh          # full offline reproduce, exit 0
node --test tests/e2e/llmShield/stage5n/*.test.js  # the K7 net: all 24 codes 396-419
lean proofs/stage5n/VtcDelay.lean                  # 13 theorems, zero proof holes
```

The Lane C mutation DSL (`tools/simurgh-attestation/stage5n/lanec/run-lanec.mjs`) is the frozen menu a live
model was given; extend it. The Lean model states what we believe is _conformance_-true — note it treats
each domain-separated hash as a deterministic function and therefore proves **verifier conformance**, not
collision resistance or physical elapsed time. An attack on the gap between that model and the running code
is a legitimate and welcome attack.

**Report to:** the repository issue tracker, or the maintainer directly for anything carrying live material.
