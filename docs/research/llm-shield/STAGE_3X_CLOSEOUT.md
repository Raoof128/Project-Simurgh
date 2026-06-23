# Stage 3X Closeout

## Status

SHIPPED. Stage 3X publishes a signed VCA timeline over all 12 rungs (3M→3W) and a single offline
reviewer command that reproduces the chain by tier. Mixed-tier and honest: no uniform-12/12 claim.

## What shipped

- Generic strict evidence-hashes verifier (`verifyEvidenceHashesLib.mjs`) and the timeline lib
  (`stage3xTimelineLib.mjs`): frozen 12-rung table, tier + chain-integrity + deep-rewalk modes.
- Runner, own 3X Ed25519 key + signer, two-tier verifier, 11-case tamper suite.
- Reviewer command `scripts/reproduce-vca-chain.sh` + results artifact (separated tier /
  evidence-root / deep summaries).
- Offline gate scripts wired into `check.sh` (timeline verify + evidence-root 10/10 + deep 5/5 +
  tamper + audits + policy-drift + coverage). Heavy delegated replay stays in the reviewer command.
- Reviewer docs + evidence README.

## Honest result

12/12 tag-and-commit pinned · 10/12 evidence-root pinned & chain-checked · 5/12 deep per-file
re-walk (current-format) · 3/12 full reproduce · 2/12 index-only with signed reasons.

## Invariants held

Zero `src/llmShield` change; offline-primary (no network in gate or core verifier); 100% function
coverage on both pure libs; verifier fails closed; `evidence-hashes.json` excludes itself; neutral
outward text (no "Claude Code" tag); does NOT reduce `live_capture_origin_self_reported`; does NOT
claim uniform 12/12 reproduction.

## Mid-build honesty finding (recorded)

The 10 evidence-hashes manifests use three historical formats (flat repo-relative, enveloped
repo-relative with cross-stage refs, enveloped stage-relative). Rather than relax the containment
guard or fake a 10/10 deep walk, 3X promotes `evidence_root_digest` as the format-independent
chain-level guarantee and applies the strict deep verifier only to current-format manifests.

## Next

Public-facing polish (README top, one-page brief, architecture/timeline diagram) and outreach —
packaging the now-replayable chain for reviewers. No 3Y stage required next.
