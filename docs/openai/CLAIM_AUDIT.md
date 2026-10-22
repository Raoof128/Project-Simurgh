# Reviewer-facing claim audit

This is a scoped audit of the new reviewer entry point, the complete previous README and roadmap,
Stage 5Q/5R/5S closeouts and the primary records linked below. It distinguishes a recorded result
from a result independently reproduced in this readiness task. It is not an exhaustive audit of
all source files, historical release artifacts, research novelty or external publications.
See [READINESS_REPORT.md](READINESS_REPORT.md) for commands actually executed and their outcomes.

## Historical claims retained with their bounds

| ID  | Permitted assertion                                                                                             | Primary evidence and inspected fields                                                                                                                                                                                                                                       | Qualification                                                                                                                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01 | Stage 3V-B recorded external-plus-Simurgh targeted attack success of 0/150, compared with external-only 138/150 | [metrics.json](../research/llm-shield/evidence/stage-3v-b/metrics.json): `comparative`; [write-up](../research/llm-shield/LLM_SHIELD_STAGE_3V_B_WRITEUP.md)                                                                                                                 | Historical synthetic reference experiment with a captured Llama Guard 4 input-only classifier. Downstream context was outside that classifier's visibility. No OpenAI result, provider ranking or production generalization follows.                                                    |
| C02 | Stage 5Q discharged 1,438 of 23,332 obligated cells, rounded to 6.2%                                            | [discharge-ledger.json](../research/llm-shield/evidence/stage-5q/coverage/discharge-ledger.json): `cells_obligated_discharged`, `cells_obligated`, `l1_certified`; [closeout](../research/llm-shield/STAGE_5Q_CLOSEOUT.md)                                                  | Matrix total 40,496; `l1_certified: false`; 2,522 members lack a coverage status. This percentage is frozen campaign coverage, not vulnerability detection probability. Q1 was not authorized and the stage closeout records release blocked.                                           |
| C03 | Stage 5R added zero discharged cells and left cumulative coverage at 6.2%                                       | [delta-ledger.json](../research/llm-shield/evidence/stage-5r/ledgers/delta-ledger.json): `newly_discharged_count`, `cumulative_5r_coverage_percent`, `four_term_disclosure`; [campaign-result.json](../research/llm-shield/evidence/stage-5r/campaign/campaign-result.json) | 8 admissible / 8 attempted / 47 not attempted / 55 families; 0 newly discharged / 15,301 under-supported / 23,332 inherited cells. Of 2,406 examined cells, 210 are `probed_not_discharged` and 2,196 `unprobed`. A static probe did not demonstrate a class-specific executed outcome. |
| C04 | Stage 5S reports conflicts within the committed comparison set                                                  | [vwq-attestation.json](../research/llm-shield/evidence/stage-5s/attestation/vwq-attestation.json): `comparison_status`, `compared_checkpoint_envelope_digests`; [closeout](../research/llm-shield/STAGE_5S_CLOSEOUT.md)                                                     | Comparison-bounded. A clean set does not establish absence of conflicts elsewhere. The exhibited fork was authored by this project, not observed against a provider.                                                                                                                    |
| C05 | Stage 5S witness independence remains unproven                                                                  | [vwq-attestation.json](../research/llm-shield/evidence/stage-5s/attestation/vwq-attestation.json): `witness_independence_status: unproven`, `lane_b_environment`, `declared_witness_class_mix`                                                                              | Four processes on one host and multiple keys belong to one operator. External digest anchoring cannot upgrade witness independence.                                                                                                                                                     |
| C06 | Stage 5S has a WebCrypto implementation; its recorded browser lane did not execute a browser                    | [browser-capture.json](../research/llm-shield/evidence/stage-5s/browser/browser-capture.json): `state: not_captured_driver_absent`, `results: null`, `non_claim`                                                                                                            | API equivalence under Node is not browser execution. Other stages' browser captures cannot substitute for this missing lane.                                                                                                                                                            |
| C07 | Stage 4Q records approval-gate ordering; Stage 4S records delegation-chain properties                           | [4Q closeout](../research/llm-shield/STAGE_4Q_CLOSEOUT.md), [4S closeout](../research/llm-shield/STAGE_4S_CLOSEOUT.md)                                                                                                                                                      | These protocol properties do not establish human deliberation, real-world identity or the security of arbitrary integrations.                                                                                                                                                           |
| C08 | Historical tests and formal proofs provide evidence for specified checks                                        | [Stage 5S closeout](../research/llm-shield/STAGE_5S_CLOSEOUT.md), [proof guidance](../../proofs/README.md)                                                                                                                                                                  | The recorded 5,425-test run is historical. Toolchain-dependent skips remain skips. Source escape-hatch scans and actual type-checking are distinct checks; neither proves an entire deployment secure.                                                                                  |

The numerator/denominator in C02 recomputes to approximately 6.1632%, which rounds to the published
6.2%. Nothing in this work changes that denominator or reinterprets 5R's zero as extra coverage.

## OpenAI track claims

| ID  | Assertion                                                                           | Evidence required                                                                         | Status and limit                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O01 | A deterministic key-free demonstration can exercise explicit tool-use authorization | [Evaluation design](EVALUATION.md), `npm run openai:offline`, report verifier and tests   | Inspect the [readiness report](READINESS_REPORT.md) for executed results. The corpus and tools are synthetic and locally controlled.                                                                                            |
| O02 | An optional transport uses the Responses API                                        | Adapter source and contract tests; [official sources](SOURCES.md)                         | Local request/response contract tests are not a successful live API run, account entitlement check or model evaluation.                                                                                                         |
| O03 | Report content can be replayed and its signature checked                            | `npm run openai:verify -- /tmp/simurgh-openai/report.json` plus tamper controls           | A fresh local key signs a self-attestation. Reproducibility concerns content; fresh signatures are not deterministic. Signature validity does not prove a trusted signer, timestamp, independent witness or genuine API origin. |
| O04 | An effect-observing oracle can detect a vulnerable control                          | Consequence-state observations, vulnerable and safe controls, orthogonal failure handling | An oracle separate from the authorization decision is still part of the same authored harness. This is not third-party implementation or operator independence.                                                                 |
| O05 | Materials are prepared for OpenAI owner review                                      | [Brief](OPENAI_BRIEF.md), [proposal](PROPOSAL.txt), [checklist](APPLICATION_CHECKLIST.md) | Eligibility, applicant identity, resource choices and submission require owner review. No acceptance, funding, endorsement or submitted application is claimed.                                                                 |

## Corrections to the entry point

1. **Version ambiguity:** the application package retains `0.4.18`; `v2.54.1` identifies the existing
   research release line. Updating the description does not create a release or rewrite history.
2. **Roadmap ambiguity:** the active roadmap now describes research and the focused evaluation.
   The old device roadmap is retained exactly, with its historical status labels interpreted as such.
3. **Unqualified independence:** the new README distinguishes replay by another reviewer from
   independent provenance, implementation, operator or witness evidence. Multiple keys alone prove
   none of these stronger properties.
4. **Overbroad proof language:** claims such as "proof of what happened" require an explicit
   evidence boundary. The new entry point states that signing authenticates records, not ground truth.
5. **Historical vendor relevance:** the previous Anthropic analysis remains in the historical
   README. It is not silently repurposed as demonstrated OpenAI compatibility or endorsement.
6. **Novelty and subjective scores:** self-assigned novelty/frontier/vendor-relevance scores and
   "first" claims are retained only in historical documents. They are not used as independently
   established research results in the new entry point.

## Preservation and traceability

The old README and roadmap were copied byte-for-byte to root-level files before editing their
entry points. Keeping the copies at repository root preserves their relative links. They are
historical snapshots, not a correction to signed evidence or a claim audit of every sentence.

| Snapshot                                         | SHA-256 of original bytes                                          |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| [RESEARCH_HISTORY.md](../../RESEARCH_HISTORY.md) | `220c4e97d1b25e8505011bdce17355851fe6d895d2a3e5b0cd93efeda4f27baf` |
| [DEVICE_ROADMAP.md](../../DEVICE_ROADMAP.md)     | `e8edc08d72afa7bf69ebbb65ea0e9a74aca61c6b4f0f0196c1d69fb5dbd8033f` |

Existing signed evidence, frozen specifications and historical releases must remain unchanged.
[AGENTS.md](../../AGENTS.md) points to `wiki/claims/` and `wiki/decisions/`, but those directories
were absent in the inspected checkout. No unseen wiki claim or decision is treated as reviewed.

## Unresolved research-review limits

- This audit maps the newly promoted claims; it does not certify every historical claim or re-run
  every stage's evidence ceremony.
- No live OpenAI model performance, independent external reproduction, production deployment or
  genuine human approval deliberation is established by this readiness task.
- Frozen synthetic cases cannot estimate a broad population error rate. New case families and
  external evaluation are future work, with failures and exclusions to be disclosed.
- AGPL license compatibility for contributing code to differently licensed projects needs a
  separate review; no relicensing is performed here.
