# Stage 4U — VRTA: Verifiable Red-Team Attestation (Closeout)

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

- **Law:** No Silent Bypass.
- **Tag:** `v2.29.0-stage-4u-vrta`
- **Raw codes:** 119–132 (120 = generic `SIGNATURE_INVALID`).
- **Reproduce:** `bash scripts/reproduce-llm-shield-stage4u.sh` → `REPRODUCE OK` (Node 26).

## Core claim (verbatim, frozen)

> For one canonical, byte-reproducible red-team corpus bound to a signed
> non-malice charter, every attack against the Stage-4 capability kernel and the
> VDCC verifier resolves to a signed finding record; no attack earns a GREEN
> (raw 0) attestation while omitting, forging, replaying, over-spending, or
> over-authorizing a delegation without that GREEN being independently
> reproducible; and every confirmed bypass is disclosed as a signed,
> severity-tagged finding. A reviewer recomputes the attack-success rate offline
> from pinned inputs.

## What shipped

An offline, charter-bound adversarial red-team of the VDCC (Stage 4S) delegation
verifier, driven by a corpus of 58 deliberately-malformed delegation bundles
across eight attack families, with a two-tier signed attestation, a disabled-by-
default capped live Fable-5 lane, JS↔Python parity, and two machine-checked Lean
theorems. The kernel and the 4S verifier are imported **read-only** — no
`authorise_*` entry was added and no frozen predecessor changed.

### The signed non-malice charter (invention 1)

Before any attack runs, an Ed25519-signed `red_team_charter` precommits the
campaign: `campaign_seed`, exact `attack_family_counts`, an `attack_manifest_root`
(Merkle root over the planned attack ids), the denial-of-wallet `caps`, and the
signed non-claims / limitations / rails. The verifier **refuses to score any
attack not bound to the charter** (`charter_digest`), enforces the canonical
constants (a re-signed charter cannot silently declare a different campaign →
119), and binds the signing key to its claimed digest (→ 120). The charter proves
**declared scope, not inner intent** — bounded no-harm evidence over declared
endpoints and fixture keys, not a metaphysical guarantee.

### The precommitted attack manifest (invention 2)

Because the family counts and manifest root are fixed at charter-signing time,
"count == count" is upgraded to "every planned attack id resolves to exactly one
fixture and one signed finding, and vice versa" (125/126). The red-team **cannot
hide its own wins** by quietly declaring fewer attacks.

### The dual-signal lie detector (invention 3)

Each finding carries a self-reported outcome, a verifier-recomputed outcome, and
a classification. Public tier catches a dishonest self-report (127) and a label
that does not follow from expected-vs-observed (128) with no engine; audit tier
re-runs the engine and catches a non-reproducing recompute (129). The signed ASR
ledger is recomputed offline (130).

## Honest results

| Metric                        | Value                                                                                                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attack corpus                 | **58** fixtures, 8 families (ghost_hop 8, structuring_budget 8, scope_escalation 8, crypto_signature 8, structural_forgery 6, fable_adaptive 4, verifier_oracle 8, differential 8) |
| **Attack-success rate (ASR)** | **0/58** — every attack was contained by the 4S verifier                                                                                                                           |
| Outcomes                      | 58 `survived`, 0 `bypass`, 0 `model_refused` (Lane A is offline)                                                                                                                   |
| 4S codes exercised            | 0, 100–103, 105–117 (a dropped co-signature correctly dies at 101, not 111/112)                                                                                                    |
| Confirmed bypasses            | **none** — no signed `known_limitation` severity required                                                                                                                          |
| Lane B                        | disabled-by-default; verify-only replay degrades gracefully when no capture exists                                                                                                 |

The honest headline: **the VDCC verifier caught every malformation in the corpus
(ASR 0/58).** This is evidence of survived attacks over the declared families —
not a proof that no vulnerability exists (see non-claims).

### A note on the live Fable-5 lane

Consistent with the design, a live Fable-5 run may **refuse** the (benign,
charter-scoped) task; a refusal is recorded verbatim as `model_refused` and is
**never** rephrased to bypass it. We observed exactly this during development —
the model declined, which the architecture treats as first-class evidence, not a
failure. Lane B is additive and sealed separately; the byte-stable corpus and its
ASR stand on Lane A alone.

## Four-axis scorecard (closeout)

| Axis               | Score | Evidence                                                                                                                                                      |
| ------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty            | 9.3   | Signed non-malice charter + precommitted attack manifest ("a red-team that cannot hide its wins") is, to our knowledge, unpublished.                          |
| Frontier           | 9.1   | Model-driven adversarial testing against a formal completeness verifier, with an offline-recomputable ASR.                                                    |
| Good-for-Anthropic | 9.4   | Directly answers "did you red-team your own safety layer, and can we trust the result?" — signed charter + pinned corpus + finding ledger + offline verifier. |
| Constitution       | 9.2   | The scope-bounded non-malice charter makes "responsible offense" machine-checkable without overclaiming inner intent.                                         |

## Non-claims (signed into the attestation)

Not a proof of model safety; not a jailbreak-immunity claim; not a production
security certification; not an exhaustive attack-space claim; a GREEN corpus is
not a claim that no vulnerabilities exist; not a third-party targeting or
offensive tool; not a legal or compliance authorization.

## Verification layers (frozen check order 119→132)

L1 schema/signature `119, 120` · L2 charter/scope/caps/manifest `121, 122, 123,
124` · L3 corpus/finding completeness `125, 126` · L4 finding truth + ledger
`127, 128, 129, 130, 131` · L5 fail-closed `132`. No helper returns a
later-layer code early.

## Lean (machine-checked, zero `sorry`)

`proofs/stage4u/NoSilentBypass.lean` — `charterBindingSound` (a charter-unbound
attack can never earn GREEN) and `asrMonotone` (disclosing a bypass never
decreases the reported rate), plus `bypassLeExecuted`, `executedMonotone`, and
`greenImpliesCharterSilent`.
