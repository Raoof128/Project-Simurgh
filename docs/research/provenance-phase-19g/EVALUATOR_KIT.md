# Embedded-evaluator kit: what Stages 5I and 5J already do, against the criteria the labs publish

**Status:** attested document (Phase 19g). Delivery to an evaluator and any reply are owed and
will be recorded as attested items; nothing here is a lab's or an evaluator's statement.

Three lab pages ingested on 1 November 2026 state the need in their own words:

- "There are, as yet, no standards for what information embedded evaluators should have access
  to, or how they should report what they find." (Anthropic, Accenture embedded-evaluation
  announcement, 18 Sep 2026; cluster C row 2)
- "Anthropic ultimately decides what information does and does not fall into these categories."
  (Anthropic, independent-evaluators update, 15 Oct 2026; C row 1)
- "Where direct access is impractical or not possible, assessors can work with a designated
  representative at a company or explore indirect or privacy preserving access mechanisms"
  (OpenAI, third-party assessment principles, 22 Sep 2026; D row 12)

Simurgh's frozen LLM-Shield line already implements the two mechanisms those sentences lack.

## Stage 5I — Verifiable Panel Coverage (`v2.44.0-stage-5i-vpc`)

Turns "all parts of the unredacted report are evaluated by at least one external reviewer" into an
offline-recomputable relation: a committed partition of the report, signed access grants per
reviewer, reviewer receipts, and coverage **equality** over the partition. Three laws: no section
left unreviewed, no phantom review, no self-vouched reviewer. The adequacy gate is structurally
unable to certify that the review was adequate; an adequacy assertion fails closed even at full
coverage. Reviewer and host independence are computed, not asserted.

## Stage 5J — Verifiable Rating Contest (`v2.45.0-stage-5j-vrc`)

Derives the rating-obligation set from 5I's coverage relation and requires the ledger's active
ratings to equal it on both sides; preserves every divergence as an append-only contest event; a
producer cannot remove a stricter reviewer rating from history, and a forged supersession is caught
even when the head is honest. Contest recorder, not truth arbiter.

## Mapped to the published acceptance criteria

| Programme and stated criterion                                                                                                                         | What 5I/5J gives                                                                                                                                           | What is still missing                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Independent evaluators (15 Oct): expertise, independence (no equity, not financially dependent), enough access, freedom to publish; three access tiers | a signed record of exactly which sections each evaluator was granted and which they covered; redactions are committed spans, not silent omissions          | a signed independence-and-funding disclosure (field proposed below); evidence of expertise is out of scope |
| Accenture (18 Sep): evaluators "verify that it is keeping its safety commitments"; no standard for access or reporting                                 | the evidence-package schema an evaluator fills: claim-to-evidence table, access manifest, coverage equality, divergence ledger                             | the commitments themselves as checkable predicates (design IOU)                                            |
| OpenAI third-party principles (22 Sep): privacy-preserving access where direct access is impractical                                                   | a redaction-aware verifier states which claims remain recomputable after redaction and which became unknown                                                | a worked example on a real lab report (needs the lab's cooperation)                                        |
| Advanced AI Framework (June): certified independence, published review covering adequacy, rigor, redactions and disagreements                          | 5J's append-only disagreement ledger; 5I's redaction commitments; the adequacy gate refuses to certify adequacy, which is the honest reading of "adequacy" | certification of independence by a third party                                                             |
| RSP 3.0 §3.6: reviewers must know evaluation failure modes, must not depend entirely on the lab for revenue                                            | the disclosure field below; 5J records the reviewer's stricter rating even if later overridden                                                             | nothing mechanical can establish expertise                                                                 |

## The independence-and-funding disclosure field

Added to the evidence package as a signed object per evaluation:

```json
{
  "evaluator": "<organisation>",
  "funding_sources_for_this_evaluation": [
    { "from": "<party>", "amount_band": "<band>", "direct": true }
  ],
  "equity_or_options_in_evaluated_party": false,
  "share_of_evaluator_revenue_from_evaluated_party": "<band>",
  "reporting_chain": "<who may edit before publication>",
  "access_tier": "<tier>",
  "access_manifest_digest": "<sha256 of the 5I grant set>",
  "signature": "<evaluator key>"
}
```

A missing or unsigned field makes the package fail closed in the same way a missing reviewer
receipt does in 5I.

## Who could run it tomorrow, and the one blocker

METR holds tier-three, employee-like access with six staff (independent-evaluators update, cluster C
§acceptance). With a lab report partitioned by section and a key pair per reviewer, 5I and 5J run
offline on the reviewers' own machines and publish a coverage and disagreement receipt the lab
cannot edit. The blocker is not technical: nobody has shown the verifier to an evaluator. That
delivery, and any reply, are the attested items this phase owes (`IOU-19-KIT`).
