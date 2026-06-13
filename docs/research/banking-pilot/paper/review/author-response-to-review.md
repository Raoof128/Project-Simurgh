# Author Response to Stage B5-R Independent-Style Review

Stage: B5-R Banking Shield Independent-Style Review Pack.
Paper under response: `../banking-shield-paper-v1.1.md`.
Review status: model-assisted adversarial review substitute, not formal peer
review.

## Summary

The five B5-R review passes converged on the same risk areas:

- "Evidence of absence" and "no-egress" language needed tighter scope.
- The paper needed a direct non-peer-reviewed preprint-status statement.
- The deterministic mock provider needed stronger separation from live-LLM
  safety claims.
- The n=5 trusted-insider dry run needed stronger HCI caveats.
- Banking-domain vocabulary needed continued non-claim discipline.
- Reproducibility commands and the review-substitute process needed to be
  visible in the paper itself.

All required preprint fixes were applied in `banking-shield-paper-v1.1.md`.

## Response to Reviewer 1: Privacy and Security

**Concern:** "Statically proven no-egress" could read broader than the actual
source scan.

**Response:** Accepted. v1.1 now says "static source gate checking the four
AI-firewall modules for network primitives" in the abstract and "not a
host-level egress-control claim" in §4.2 and §7.

**Concern:** "Evidence of absence" language was too broad.

**Response:** Accepted. v1.1 now defines bounded evidence of absence as
gate-backed evidence that sensitive values were not recorded in the frozen
evidence pack and did not reach the explanation payload.

**Concern:** Reproducibility needed a command bundle.

**Response:** Accepted. v1.1 adds §8, listing the core reproduction gates.

## Response to Reviewer 2: Banking and Fintech Governance

**Concern:** The name Banking Shield can imply real protection.

**Response:** Accepted. v1.1 abstract now introduces the system as a
"fictional, non-bank, research-only banking-adjacent prototype."

**Concern:** Real payee-confirmation citations could imply implemented payee
verification.

**Response:** Accepted. Related work now explicitly states the prototype
performs no name matching and that the payee scenario is fictional.

**Concern:** "safe/warning/critical" could be misread as calibrated alerts.

**Response:** Existing text already frames them as fictional prototype policy
outcomes. No new capability claim was added.

## Response to Reviewer 3: HCI and Usability

**Concern:** n=5 trusted insiders is not a user study.

**Response:** Accepted. v1.1 now says the dry run is not a representative
banking-customer sample and makes no representative-user or banking-customer
comprehension claim.

**Concern:** "5/5 comprehension" should be narrowed.

**Response:** Accepted. v1.1 now uses "internal-test checklist comprehension"
and "non-claim-checklist comprehension."

**Concern:** Conclusion wording "pattern holds" was too broad.

**Response:** Accepted. v1.1 now says the mechanism remained intact under the
stated gates and formative dry-run scope.

## Response to Reviewer 4: AI Safety

**Concern:** The paper could imply live LLM guardrail validation.

**Response:** Accepted. v1.1 repeatedly states the provider is a deterministic
mock and that no live LLM has been filtered or validated.

**Concern:** The no-egress claim should not become a runtime/network-sandbox
claim.

**Response:** Accepted. v1.1 scopes it to static source checks over four
modules, with negative self-test evidence.

**Concern:** Receipts attest process, not truth.

**Response:** Existing §3 already says receipts attest process, not ground
truth. That limitation remains.

## Response to Reviewer 5: Hostile Reviewer #2

**Concern:** This should not be framed as validated or peer reviewed.

**Response:** Accepted. v1.1 adds a preprint-status paragraph: author-prepared,
automated-audit-supported, model-assisted adversarially reviewed, and not
formally peer reviewed, externally banking reviewed, or independently security
validated.

**Concern:** The gates are project-authored.

**Response:** Accepted. §7 keeps the limitation that project-authored gates are
mitigated by negative self-tests and public reproducibility, not eliminated.

**Concern:** Single-node in-memory and server-keyed audit chain are not
deployment-grade.

**Response:** Accepted. §7 keeps both limitations and does not claim production
readiness.

## Remaining Known Limits After Response

- No formal peer review.
- No external banking governance review.
- No independent security validation.
- No live LLM filtering.
- No representative user study.
- No production deployment or regulatory compliance claim.

These limits are disclosed in v1.1 and are acceptable for Zenodo preprint
submission, not for claims of external validation.
