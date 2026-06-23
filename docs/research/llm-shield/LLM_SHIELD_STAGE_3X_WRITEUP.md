# Stage 3X — Public VCA Timeline & External Reproduction Packet

## Summary

The VCA ladder ran 3M→3W: twelve signed research rungs, each releasing its own evidence. Stage 3X
makes the whole chain **externally replayable by a reviewer with no private context** — a signed
public timeline plus one offline command.

**Crown.** Stage 3X does not claim new containment capability or uniform full reproduction across
all historical rungs. It demonstrates that the public VCA release chain is tag-and-commit pinned,
tier-classified by actual replay surface, partially evidence-hash re-verifiable offline, and
externally reproducible through a single reviewer command.

**Headline.** 3X turns the VCA chain into a public replay map: all 12 rungs are tag-and-commit
pinned, 10/12 have evidence-root manifests pinned and chain-checked, 3/12 have full reproduce paths,
current-format manifests are deep re-walked under strict containment rules, and 2/12 are index-only
with signed reasons.

## The honesty that makes it credible

3X refuses the fake-clean story ("12/12 full replay"). The rungs grew over months and their
evidence formats are genuinely uneven, so 3X tells the truth about its own bones with a signed,
machine-readable `chain_summary` and per-rung `replay_surface_reason`. A reviewer sees exactly what
each rung supports — and exactly what it does not.

Three honest layers, never conflated:

| Layer                  | What it proves                                                    | Applies to                   |
| ---------------------- | ----------------------------------------------------------------- | ---------------------------- |
| `evidence_root_digest` | the committed manifest file is unchanged since 3X signed it       | all 10 evidence-root rungs   |
| strict deep re-walk    | every listed file digest matches under hardened containment rules | current-format manifests (5) |
| stage-native reproduce | the stage's own reproduce/verifier path passes                    | 3V, 3V-B, 3W                 |

Two rungs are index-only with signed reasons: 3M predates the project-wide `evidence-hashes.json`
pattern (`index_only_for_3x_chain_hashing`); 3R was a `src/llmShield/gateway` source-feature stage
with no evidence directory (`index_only_source_feature_stage_no_evidence_directory`).

## Why legacy manifests are root-pinned, not deep-walked

3N/3O/3P/3Q/3S use older manifest formats — some enveloped, some stage-relative, and 3N's manifest
intentionally references cross-stage artifacts. Deep-walking them would require relaxing the
hardened containment guard (no `..`, no absolute paths, no escape from the stage directory). 3X
keeps that guard sharp and pins these rungs by their manifest root digest instead. The receipt
tells the truth, even when the truth has uneven feathers.

## Design

- **Signed timeline index** (own 3X Ed25519 key, offline-verifiable with the committed public key).
- **Generic evidence-hashes verifier** — strict, hardened (rejects self-inclusion, raw `..`
  segments before normalisation, absolute paths, and any path escaping the stage dir), never throws.
- **Two-tier verifier** (portable + `--reproduce` recomputing digests, commits, and chain summary),
  fails closed.
- **One reviewer command** `scripts/reproduce-vca-chain.sh` performs the full tier-appropriate
  delegated replay and emits a results artifact whose tier counts, evidence-root surface, and deep
  re-walk surface are reported separately to avoid double-counting.
- The heavy delegated replay never enters the ordinary push gate; `check.sh` runs the cheap offline
  confidence (timeline verify, evidence-root 10/10, deep 5/5, tamper, coverage).

## Non-claims (signed)

No new model run; no guard comparison; no new provider; no GPU-capture proof; no production-readiness
claim; no reduction of `live_capture_origin_self_reported`; no uniform 12/12 full reproduction.
