# Stage 4N — Extraction Seismograph: Threat Model

> **Motto.** AnthropicSafe First, then ReviewerSafe.

Stage 4N publishes one hash-chained heartbeat record per synthetic reporting window in a
single append-only JSONL feed, with the feed root signed by the stage manifest. It makes
**silence, reordering, equivocation, early/overdue reveals, budget-exceeding disclosure,
and public linkability leaks** machine-detectable offline. This document states what the
verifier defends against, what it trusts, and what is explicitly out of scope.

## Adversary

A dishonest producer or a compromised reporting pipeline that may:

- omit a bad window, or suppress only its aggregate reveal;
- reorder or duplicate windows;
- fork the public feed to tell different audiences different stories;
- mutate a source-stage (4K/4L/4M) commitment while keeping the chain internally tidy;
- hold bilateral 4M disclosure bundles that are not anchored to the public pulse;
- leak overly precise public aggregates to build a real-time attacker oracle;
- publish tier labels or respondent material that make disclosures linkable;
- claim that silence means safety.

## What the verifier detects (offline, deterministic, as of a committed `as_of_window`)

- a missing heartbeat (Q11, raw 47);
- an equivocating second artifact (Q17, raw 48);
- a reordered/duplicated/relinked-but-broken chain (Q10, raw 49);
- a source-stage or `private_evidence_root` mismatch (Q15, raw 50);
- a bilateral inclusion proof that does not bind to the public feed (Q12, raw 51);
- an early or overdue reveal (Q13, raw 52);
- a self-leakage-budget violation (Q14, raw 53);
- raw counts or bilateral material in a public artifact (Q16, raw 54).

## Trusted base

- the verifier binary the reviewer runs;
- the pinned signing key (`tests/fixtures/llmShield/stage4n/seismograph-signer.pub`);
- deterministic canonicalisation (RFC 8785 JCS + SHA-256, shared with 4M);
- the genesis policy;
- the public JSONL feed;
- the committed 4K/4L/4M source-stage fixtures (v0 models the private side in-repo
  because everything is synthetic — `private_side_modelled_in_repo_synthetic_v0`).

## Scoping statements (honest limits)

- **Equivocation detection requires two artifacts.** A single feed proves its own
  integrity, **not the absence of a fork elsewhere**. Q17 fires only when the public feed
  is compared against a second artifact (a second feed snapshot or a bilaterally received
  inclusion proof). This is carried as the non-claim
  `equivocation_detection_requires_two_artifacts`.
- **Inclusion proofs are bilateral.** They travel inside 4M Tier-P/A/R bundles and are
  verified against the public feed by the recipient. Nothing in the public feed identifies
  tiers, respondents, or clusters; Q16 fails any public artifact that carries such material
  (`inclusion_proofs_are_bilateral_not_public`).
- **The commitment is binding, not strongly hiding.** `reveal_salt` is a deterministic
  digest of low-entropy private counts, so commit-now/reveal-later buys binding, ordering,
  and timing discipline — not information-theoretic secrecy of the aggregate
  (`reveal_commitment_binding_not_hiding_low_entropy_v0`).

## Out of scope

- the real-world truth of provider telemetry;
- Sybil closure (inherits 4L's provider-supplied cluster-commitment assumption);
- legal compliance;
- detection completeness;
- preventing extraction;
- preventing a provider from refusing to publish at all — 4N only makes refusal and
  silence **visible**;
- adjudicating respondent contests — 4N anchors the evidence path, it does not rule.
