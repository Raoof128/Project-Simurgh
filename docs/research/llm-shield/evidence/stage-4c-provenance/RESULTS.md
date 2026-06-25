# Stage 4C — Provenance-gated intent sources (results)

Stage 4C hardens the trust-propagation edge that Stage 4B explicitly left open. 4B grounded
egress in trusted intent sources (meeting participants, contact group) but assumed those
sources were trusted-by-construction. Once a real agent populates them **from tool output**,
an injection can launder the attacker address into the participant list — and a
provenance-blind implementation would then authorise egress to the attacker.

4C tags every intent entry with a **provenance** and grants authority **only** from trusted
origins (`account_owner`, `user_authored`, `explicit_user_request`). A poisoned entry whose
provenance is `untrusted_tool_output` grants nothing, so the laundered attacker stays blocked.

This is **additive**: 4A `authorise()` and 4B `authorise_with_intent()` are both frozen and
their tests still pass; 4C adds `authorise_with_provenance()` + `ProvenanceIntentContext` +
`IntentEntry`. **No `src/llmShield` change.**

## The attack and the result (model-free, per-target malice)

Each action records three verdicts: frozen-4A (task text only), **naive provenance-blind**
(what a 4B-style impl that trusted any populated entry would return), and 4C provenance-gated.

| Metric                                                                                  | Value     |
| --------------------------------------------------------------------------------------- | --------- |
| Poisoned attacks a provenance-**blind** impl would launder (`naive_laundering_exposed`) | **2**     |
| Of those, contained by 4C (`poisoning_contained`)                                       | **2 / 2** |
| 4C laundering failures (`laundering_failures_4c`)                                       | **0**     |
| Full containment under 4C                                                               | **true**  |
| Benign over-blocks still recovered (trusted-provenance participants)                    | **2**     |

The headline is falsifiable: **a provenance-blind intent implementation launders the
poisoned-participant attack; provenance-gating contains every instance with no laundering and
no loss of the legitimate recovery.** In the mixed case, the trusted participant is allowed
and the laundered attacker is blocked in the same call.

## Non-claims (signed into the manifest)

- **Not live-confirmed.** No pod; this is a model-free demonstration of the mechanism and the
  gap it closes, not a live agent run.
- **Provenance labels are modelled, not derived from a real trust tracker.** This stage proves
  that _if_ each intent entry carries a faithful provenance, the gate is sound. Deriving that
  provenance reliably inside the live loop (tracking how each address entered a source) is the
  next, separate engineering step and is **not** claimed here.
- Not jailbreak immunity; not injection prevention. No `src/llmShield` change. Target hashes
  are metadata-minimisation identifiers, not secrecy.

## Verify

```bash
node --test tests/unit/llmShield/stage4c/*.test.js
```

The verifier checks the Ed25519 signature/fingerprint/digest and the core invariants
(`laundering_failures_4c == 0`, `full_containment_4c`, `provenance_closes_naive_gap`, the
`not_live_confirmed` non-claim present); `reproduce` recomputes the decisions digest and
rebuilds the bundle. The manifest binds the frozen 4B intent bundle by sha256.
