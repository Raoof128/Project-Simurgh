# Reviewer 3: HCI and Usability Review

Stage: B5-R independent-style model-assisted review.
Input scope: `banking-shield-paper-v1.0.md`, full paper audit, claim audit, and
documented gate results only.
Reviewer stance: HCI/usability reviewer.
Review status: simulated adversarial review, not formal peer review.

## Summary Recommendation

Weak accept for preprint if the formative status is made even more explicit.
The paper is careful that n=5 trusted insiders is not a user study, but the
abstract and conclusion still risk making the dry run sound more evidential than
it is.

## Major Concerns

1. The abstract says "5/5 comprehension of the system's non-claims." That is
   factually clear but should be framed as a formative internal dry-run result,
   not evidence of user comprehension generally.

2. The conclusion says the pattern "holds." That could overstate the HCI
   evidence. The technical gates hold; human comprehension is only preliminary.

3. The export-interpretability result is important: 1/5 initially understood
   Report/Audit/Verify. The paper includes it, but the abstract omits it. If
   space allows, mention that interpretability remains a design concern.

4. The 3-session rerun is correctly described as unable to establish
   improvement. Keep that exact caveat.

5. The paper should clarify that the trusted internal testers were not
   representative banking customers and not naive users.

## Minor Concerns

- "Comprehension" should be "checklist comprehension" or "non-claim checklist
  comprehension" to avoid implying deep mental-model formation.
- The paper would benefit from a table footnote saying all human results are
  descriptive counts.
- Future work should explicitly include a powered external user study.

## Minimum Fixes Before Preprint

1. Change the abstract phrase to "5/5 internal-test checklist comprehension."
2. Change conclusion wording from "the pattern holds" to "the mechanism remained
   intact under the stated gates and formative dry-run scope."
3. Add "trusted insiders, not representative users" in the evaluation or
   limitations section.
4. Keep the 1/5 interpretability weakness visible.

## Final Reviewer Note

The paper is HCI-honest if it treats the human evidence as design feedback, not
validation. It should not sound like a usability study.
