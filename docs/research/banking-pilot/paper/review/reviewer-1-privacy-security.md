# Reviewer 1: Privacy and Security Systems Review

Stage: B5-R independent-style model-assisted review.
Input scope: `banking-shield-paper-v1.0.md`, full paper audit, claim audit, and
documented gate results only.
Reviewer stance: strict privacy/security systems reviewer.
Review status: simulated adversarial review, not formal peer review.

## Summary Recommendation

Weak accept for preprint after minor revisions. The paper is unusually careful
about non-claims and has strong automated evidence for a research prototype.
However, it should make the trust assumptions and evidence limits even more
visible before Zenodo submission.

## Major Concerns

1. The paper says the no-egress boundary is "statically proven." This is
   defensible for the four scanned modules, but the phrase can read broader than
   the actual grep-style gate. The paper should say "statically checked for
   imported network primitives in the four AI-firewall modules" on first use.

2. The audit chain is server-keyed and in-memory. The limitations section says
   tamper-evident rather than tamper-proof, but the abstract and contribution
   framing could still sound stronger than the threat model. A preprint should
   make operator trust explicit earlier.

3. The privacy evidence proves absence in generated fixtures and scanned
   evidence paths, not an absolute absence across all possible runtime states.
   The paper should avoid broad "proof that sensitive data was never recorded"
   wording unless tied to the evidence pack and gates.

4. Denylist scanning is correctly disclosed as incomplete, but the paper should
   add that allowlist construction is the stronger control and denylist scanning
   is defence in depth.

5. Reproducibility depends on repo scripts and fixtures. The paper references
   gates but does not point readers to a reproduction artifact or exact command
   bundle. Add a short "Reproducibility" paragraph or appendix pointer before
   preprint.

## Minor Concerns

- "Evidence of absence" is a strong phrase. Keep it, but define it as bounded
  evidence within the prototype, not a universal privacy proof.
- The default-off AI explanation flag is important and should appear in the
  abstract or limitations.
- The paper should state that no independent external reviewer has reviewed the
  manuscript.

## Minimum Fixes Before Preprint

1. Narrow "statically proven no-egress" to the exact scanned-module property.
2. Add a short preprint-status statement: author-prepared, model-assisted,
   audit-supported, not formally peer reviewed.
3. Add a reproducibility paragraph listing the gate categories and artifact
   location.
4. Tighten the abstract's "proof that sensitive data was never recorded" wording
   to "evidence, under the prototype gates and fixtures, that sensitive values
   were not recorded in the evidence pack."

## Final Reviewer Note

The paper is defensible as a transparent preprint if it is careful about the
scope of proof. The strongest contribution is not that privacy is "solved"; it
is that the prototype turns data minimisation and claim discipline into
testable artifacts.
