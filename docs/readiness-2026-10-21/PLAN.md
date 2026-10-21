# Readiness repairs and gap hunt — 21 October 2026

Owner instruction: complete the proposed readiness work except independent reproduction, which
is assigned to classmates. Starting revision: `1a8f47cfe8ce9e5660e15f48d09ffd3431333cab`.
This authorizes local implementation, tests, research, documentation and publication on the
existing branch. It does not supply missing provider-admin access or independent evidence.

## Design and sequence

1. Revalidate the audit's actionable findings. Fix authenticated-data binding, completeness,
   malformed-input and unsafe rendering defects with failing regression tests first. Distinguish
   these defects from unimplemented research goals or inherently external trust assumptions.
2. Preserve historical evidence. Commit each exact repair surface before code changes; record
   old/new behavior and remaining limitations. Do not regenerate old signed captures in place.
3. Add the current 288-branch study to the shared explorer CLI/UI with explicit study/model
   identities, duplicate/completeness checks, source pointers and unverified-import labeling.
4. Expand local adversarial lifecycle tests and investigate the retained active refusal.
   Externally authored cases remain external; locally generated cases must not inherit that label.
5. Exercise browser/native/provider capabilities that are actually available. Prepare runnable
   acceptance checks for missing infrastructure. A model API credential is not provider admin
   authority. No new paid campaign without a declared model, bounded budget and stopping rule.
6. Run the complete maintained smoke scripts in fresh checkouts at the repair revision, plus
   focused repaired-component checks. Publish a review candidate with logs and explicit exclusions.

The owner approved the preceding readiness work by requesting all items except independent
reproduction. The implementation choices below operationalize that scope; no new deployment,
application submission, outreach or destructive production credential mutation is included.

## First repair authority: M106 and M54

The Stage 4M public tier must authenticate every supplied public artifact against the signed
attestation and refuse missing artifacts when their signed roots are nonempty. Private ledgers
remain optional only for the public tier. The audit tier must recompute aggregate values.
Distinct merge targets must remain distinct. Generated browser output must parse without merging
module-local lexical scopes. Existing captured HTML remains historical and untouched.

| Exact path                                                             | Operation | Purpose / finding                                                    |
| ---------------------------------------------------------------------- | --------- | -------------------------------------------------------------------- |
| `tools/simurgh-attestation/stage4m/core/verdictCore.mjs`               | modify    | Public bindings, required evidence and audit aggregate checks, M106  |
| `tools/simurgh-attestation/stage4m/core/mergeLatticeCore.mjs`          | modify    | Reject duplicate new commitments, M106                               |
| `tools/simurgh-attestation/stage4m/browser/build-browser-verifier.mjs` | modify    | Preserve module scopes and generate parseable browser script, M54    |
| `tests/unit/llmShield/stage4m/verify.test.js`                          | modify    | Require public roots to be checked, M106                             |
| `tests/unit/llmShield/stage4m/readinessRegression.test.js`             | add       | Mutation/control tests for M106 and generated-script parsing for M54 |

Later repair surfaces receive separate prior declarations. Frozen specs, fixture captures,
source-bound evidence and all earlier audit receipts remain unchanged. Both project logs receive
append-only records, attributed to the owner with Codex assistance.

## Verification lifecycle

The added tests govern the named Stage 4M implementation and continue into successor work.
Maintenance requires this committed declaration (strict ancestor) and any subsequent exact-path
extension. They migrate only with an explicit replacement contract. A clean control must pass;
tampering, omission, duplicate identities and syntax failures must fail for their intended reason.
An empty test selection or uncommitted-range-only gate is not completion evidence. No new
repository-wide blocking CI gate is introduced by this declaration.

## Acceptance ledger

| Work                        | Status                                             | Required receipt                                            |
| --------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| Source-backed gap hunt      | Dated source map and all findings retained         | Dated primary-source map, finding-level disposition         |
| Verifier repairs            | Scoped repairs complete; other findings open       | Red/green regressions and preserved evidence hashes         |
| Independent reproduction    | Owner/classmates                                   | Outside operator receipt; excluded from this work           |
| Browser validation          | Blocked by managed navigation policy               | Actual browser interaction/parity, or explicit blocker      |
| Expanded evaluation         | Local controls complete; live blocked              | Frozen new cases, controls and all outcomes                 |
| Provider lifecycle          | Blocked: project 403, inference 401                | Real admin/alert capability and receiver observations       |
| Current-study explorer      | Implemented                                        | 288 rows, model separation, consistent CLI/UI queries       |
| Candidate smoke and handoff | Passed; receipts in RESULTS.md and validation.json | Exact revision, full logs, exclusions and clean publication |
