# Reviewer 5: Hostile Reviewer #2 Attack

Stage: B5-R independent-style model-assisted review.
Input scope: `banking-shield-paper-v1.0.md`, full paper audit, claim audit, and
documented gate results only.
Reviewer stance: most sceptical reviewer, reject-oriented.
Review status: simulated adversarial review, not formal peer review.

## Summary Recommendation

Reject as a conference paper; allow as an honest preprint after revision. The
paper is transparent, but its novelty and evaluation are too narrow for a
strong archival claim. It can be defensible on Zenodo if it does not pretend to
have external validation.

## Strongest Reasons for Rejection

1. The provider is a deterministic mock, not a real LLM. Therefore the AI safety
   evaluation does not establish robustness against live-model behaviour,
   prompt injection, provider logging, provider-side retention, or stochastic
   drift.

2. Human evidence is n=5 trusted insiders. It is useful development feedback,
   not user evidence. The paper risks overvaluing 5/5 comprehension counts.

3. The security/privacy gates are project-authored. They are useful but not
   independent validation. Negative self-tests help but do not eliminate this
   limitation.

4. The system is in-memory and single-node. Tamper-evidence is server-keyed and
   depends on operator trust. This is not a deployment-grade audit architecture.

5. Denylist-based claim scanning can be bypassed by paraphrase. The paper should
   state that output-claim enforcement is bounded and incomplete.

6. The paper's "evidence of absence" language is rhetorically strong. A hostile
   reader will ask: absence from what exact scope, under what exact gate, and
   against what threat model?

7. There is no formal peer review or external reviewer. That is acceptable for a
   preprint only if stated plainly.

## Minimum Fixes Required Before Preprint

1. Add explicit preprint status: author-prepared, automated-audit-supported,
   model-assisted adversarially reviewed, not formally peer reviewed.
2. Tighten "proof/evidence of absence" language to be bounded to the prototype,
   evidence pack, fixtures, and gates.
3. Strengthen limitations around mock provider, project-authored gates, trusted
   insiders, and single-node in-memory state.
4. Add a review-substitute disclosure describing this B5-R process.
5. Produce v1.1 with the fixes and rerun claim/audit scans.

## Final Reviewer Note

This should not be submitted as "validated" work. It can be posted as a careful
preprint if it leads with the caveats and invites external review.
