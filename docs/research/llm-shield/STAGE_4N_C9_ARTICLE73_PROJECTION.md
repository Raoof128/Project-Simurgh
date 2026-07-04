# Stage 4N — GPAI Commitment-9 / EU AI Act Article-73 Projection

> **Motto.** AnthropicSafe First, then ReviewerSafe.

**This is a docs-only projection, not a legal filing and not a compliance certification**
(`not_legal_compliance_certification`, the same discipline as the 4M Article-73 projection).
It shows how the Stage 4N heartbeat _shape_ lines up with the reporting-liveness structure
that EU regulation is about to require — nothing more.

## The regulatory surface

The EU AI Act's **Article 73** requires providers of general-purpose AI models with systemic
risk to report serious incidents "without undue delay," on **severity-based initial-report
deadlines of 2 / 5 / 10 / 15 days**. The European Commission published a serious-incident
**reporting template on 2025-11-04** (demonstrating compliance with **Commitment 9** of the
GPAI Code of Practice), and the accompanying guidance **applies from 2026-08-02**.

Those deadlines are, structurally, a **window cadence with an overdue bound** — exactly the
shape Stage 4N makes recomputable. Nothing in the official template makes "we reported
without undue delay" independently checkable; that is the gap 4N's mechanism addresses.

## The projection (shape mapping only)

| Article-73 / Commitment-9 concept               | Stage 4N mechanism                                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Reporting cadence                               | `window_policy.cadence` (synthetic in v0; wall-clock mapping is declared deployment metadata) |
| "Without undue delay" / initial-report deadline | `max_overdue_heartbeats` + Q11 silence detection (raw 47)                                     |
| Severity-based 2/5/10/15-day tiers              | per-window overdue horizon (a deployment parameter over the same cadence machinery)           |
| Follow-up / updated report                      | delayed aggregate reveal at `W + d`, bound to the heartbeat's commitment (Q13)                |
| Consistent story to authority and public        | cross-tier non-equivocation (Q17) + bilateral inclusion binding (Q12)                         |
| Recomputable evidence of the above              | Ed25519-signed feed root + offline verifier, `as_of_window` committed                         |

The mapping is **shape only**. 4N does not assert that any real filing occurred, that any
deadline was met, or that a producer is compliant. It provides a _reference mechanism_ by
which a producer _could_ make reporting liveness recomputable — and by which a third party
could check it without trusting the producer.

## Related work

This complements the Oxford NeurIPS position paper **"NeurIPS Should Require Reproducibility
Standards for Frontier AI Safety Claims" (arXiv:2605.08192)**, which diagnoses an
"evidential inversion" — the most consequential AI-safety claims are the least verifiable —
and proposes **tiered public / controlled / claim-restricted disclosure with claim
inventories**. That tiered structure is, independently, what 4M's Tier-P/A/R plus 4N's
public anchor implement: 4M gives the tiers, 4N gives the public liveness anchor and binds
each bilateral disclosure to it. 4N is a _reference mechanism_ for that proposed standard,
not a competitor to it.

## Guardrail

4N is a reference mechanism over synthetic fixtures. It must never be read as commentary on
whether any specific real-world extraction accusation is correct. A mechanism is not a
verdict, just as (per Stage 3T) a match is not an accusation.
