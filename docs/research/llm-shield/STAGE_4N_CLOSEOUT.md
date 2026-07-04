# Stage 4N — Extraction Seismograph: Closeout

> **Motto.** AnthropicSafe First, then ReviewerSafe.

## What shipped

The first public, offline-recomputable extraction-telemetry heartbeat over the 4K/4L/4M
containment-evidence spine. One hash-chained record per synthetic reporting window in a
single append-only JSONL feed, with the feed root signed by the stage manifest. Silence,
reordering, equivocation, early/overdue reveals, budget-exceeding disclosure, and public
linkability leaks are all machine-detectable offline at exact raw exit codes 47–54.

**The completeness invariant, extended to time.** 4K stops omitted exposures; 4L stops
split-account structuring; 4M stops rewritten disclosure; **4N stops time laundering.** The
seismograph does not say the earth is safe — it proves the needle was there.

### Components

- **Raw codes 47–54** on the shared stage-4 exit ledger (39 reserved; 40–46 unchanged;
  unknown → run-level 3), with the exit-map goldens refreshed across 4H/4K/4L/4M.
- **Eight verification gates** in pinned order Q10 → Q11 → Q15 → Q13 → Q14 → Q16 → Q12 → Q17.
- **A single interleaved chain** (heartbeats + delayed aggregate reveals), so suppressing a
  reveal is as chain-detectable as suppressing a heartbeat.
- **A signed public evidence feed** (`docs/research/llm-shield/evidence/stage-4n/`) — genesis
  policy, heartbeat feed, attestation binding `as_of_window`, and an Ed25519 manifest.
- **A twelve-arm tamper matrix**, each arm validated end-to-end through the real verifier.
- **A machine-checked Lean lemma** (`proofs/stage4n/TemporalCompleteness.lean`): a
  position-perfect chain cannot omit an expected window without a detectable discontinuity.
- **A one-command reproduce** (`scripts/reproduce-llm-shield-stage4n.sh`) that is
  byte-idempotent and leaves the tree clean.

## Honest prior art

4N claims **no novelty** as a transparency log or as a silence-as-signal system — both are
prior art. It stands on Certificate Transparency (append-only ancestry and inclusion
proofs), SCITT (signed transparency statements over artifacts), and warrant canaries
(silence as signal).
The defensible delta is **budget-gated extraction telemetry + cross-tier non-equivocation +
respondent semantics + deterministic offline recomputation under a dishonest producer**.
CT and SCITT prove statement history; 4N proves extraction-telemetry liveness and cross-tier
non-equivocation over the 4K/4L/4M spine.

## Non-claims (verbatim)

- **The heartbeat proves reporting liveness and non-equivocation; it does not prove
  extraction did not happen.**
- **A quiet trace is not a safe model.**
- **4N enforces declared telemetry, not detection truth.**
- **Bands are not counts.**
- **Synthetic-time cadence is a reproducibility mechanism, not a deployment SLA.**
- **The public feed is a bounded disclosure channel, not a full incident report.**
- **Equivocation detection requires two artifacts; a single feed proves its own integrity,
  not the absence of a fork elsewhere.**
- **Inclusion proofs are bilateral artifacts; nothing in the public feed identifies tiers,
  respondents, or clusters.**
- **4N does not solve Sybil attacks; it inherits 4L's provider-supplied cluster-commitment
  assumption.**
- **4N does not adjudicate respondent contests; it anchors the evidence path.**
- **No raw prompts, outputs, user identities, cluster identities, or per-cluster data appear
  in any public artifact.**

Machine-readable non-claim slugs (carried in the genesis policy and attestation):
`band_not_count`, `quiet_trace_not_safe_model`,
`reporting_liveness_not_detection_guarantee`, `synthetic_clock_not_deployment_sla`,
`equivocation_detection_requires_two_artifacts`, `inclusion_proofs_are_bilateral_not_public`.

## Known limitations (verbatim, signed into the attestation)

- `detection_completeness_not_claimed`
- `inherits_4l_provider_supplied_cluster_commitment_assumption`
- `private_side_modelled_in_repo_synthetic_v0`
- `proof_is_of_model_not_implementation`
- `publication_refusal_only_made_visible_not_prevented`
- `respondent_contests_anchored_not_adjudicated`
- `reveal_commitment_binding_not_hiding_low_entropy_v0` — the commit-now/reveal-later
  commitment is unconditionally binding but only weakly hiding: `reveal_salt` is a
  deterministic digest of low-entropy private counts, so a party who can enumerate plausible
  counts could brute-force the pre-reveal bands. The mechanism buys binding + ordering +
  timing discipline, not information-theoretic secrecy; random salts would strengthen hiding
  but break byte-reproducibility, and v0 deliberately chooses reproducibility.

## Out of scope (deferred, seeded)

- a real-cadence deployment profile (wall-clock mapping is declared policy metadata only);
- additional exit families beyond the extraction lane (schema reserves room);
- cross-provider corroboration by digest equality (**4P / CPC**);
- verifiable friction receipts (**VFR**);
- Tier-R respondent-slice machinery and contest adjudication (permanently out of lane).

## Verification baseline

`npm test` green; `node --test tests/e2e/llmShield/stage4n/*.test.js` green (8);
`bash scripts/reproduce-llm-shield-stage4n.sh` → `[stage4n] ALL GREEN`, byte-idempotent;
`lean proofs/stage4n/TemporalCompleteness.lean` exit 0, no `sorry`.
