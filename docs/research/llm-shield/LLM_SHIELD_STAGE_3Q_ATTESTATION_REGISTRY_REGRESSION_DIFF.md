# LLM Shield — Stage 3Q: Attestation Registry + Regression Diff

> **Stage 3Q proves that signed containment attestations can be preserved as an
> append-only timeline and compared only against the same target's past, producing
> signed regression evidence — without cross-target ranking.** A target cannot
> silently weaken between signed snapshots without the registry and diff exposing
> exactly which cells regressed.

## The VCA ladder

| Stage  | What it proves                                                                                             |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| 3M     | the evidence bundle verifies offline (Ed25519)                                                             |
| 3N     | the claims made _from_ that evidence cannot outrun it                                                      |
| 3O     | others can produce evidence under the same contract                                                        |
| 3P     | the contract binds many, differently-built targets at one point in time                                    |
| **3Q** | **attestations age into a tamper-evident timeline; weakening surfaces as a signed same-target regression** |

3Q is the temporal rung. It is tooling, not a defence, and ships **no
`src/llmShield` change** (policy-drift guard enforced, fail-closed).

## The temporal non-ranking wall (verbatim)

> **Temporal diff, not leaderboard. Stage 3Q may compare a target only against its
> own previous signed snapshot. It must not compare different target lineages, rank
> targets by regressions, or export cross-target superiority claims.**

Hard invariant: a regression diff is valid only when
`before.target_lineage_id == after.target_lineage_id`; otherwise
`cross_target_diff_violation` fires. Lineage is bound strictly to the referenced 3P
attestation's own `target.target_id` (no aliases) — `lineage_binding_violation`
otherwise.

## Determinism — the clock is evidence, not entropy

A committed `timeline-manifest.json` is the source of truth. `registry build`
deterministically derives `registry.json` from it; CI re-derives and byte-compares.
All time-bearing fields are committed manifest inputs — the tooling never calls
`Date.now()`. Manifest source digests use canonical JSON. The same model applies to
regression diffs via a committed `diff-manifest.json`.

## Registry substrate

One signed `registry.json` — ordered `entries[]`, each `{ entry_body, entry_digest }`
where `entry_digest = sha256(canonicalJson(entry_body))` and
`entry_body.previous_entry_digest` chains to the prior entry (genesis = `"GENESIS"`).
A sibling `registry.signature.json` (Ed25519) signs the whole canonical ledger, and
`source.timeline_manifest_digest` binds the derivation source. The file proves
_internal_ chain integrity; **append-only continuity** is proven against a committed
`previous-registry-head.json` (the prior release's head; genesis form at first
release). The signer emits the current head to `current-registry-head.json` for the
next release and never overwrites the previous-head input.

Verification has two modes: **offline current-ledger** (signature, chain, head,
referenced 3P digests still match committed files, no ranking fields) and
**append-continuity** (the last preserved entry equals the previous head; new entries
appended only at the tail; the first new entry chains from the previous head).

## Regression diff — manifest-derived, same-target only

A committed `diff-manifest.json` selects comparison pairs (pinned before/after
digests + paths + a fixed `created_at_utc`). Each `regression-diff.json` is derived
deterministically, byte-compared in CI, and signed. Transition enum:
`improved | unchanged | regressed | non_comparable | integrity_failure`.

**Anti-laundering lattice** (the soul of 3Q):

```text
contained → allowed   (same lineage, same corpus, valid evidence)  → regressed   [only path]
allowed  → contained  (same lineage, same corpus, valid evidence)  → improved    [only path]
verification_failed / invalid either side                          → integrity_failure
different corpus_digest                                            → non_comparable
different lineage                                                  → cross_target_diff_violation
```

Integrity failures and corpus mismatches are **never** regressions or improvements,
in either direction. Weakening is only weakening when the evidence is valid,
same-lineage, same-corpus, and actually moves `contained → allowed`.

**Genesis emptiness:** at first release `diff-manifest.json` has zero real diffs; the
diff engine is proven through the self-proof pack, never via synthetic demo diffs in
the real layer.

## Self-proof — the teeth (both layers)

Unit tests on every gate **and** an end-to-end self-proof pack
(`self-proof-results.json`, never pollutes the real registry/diffs):

| Fixture                    | Must trip                               |
| -------------------------- | --------------------------------------- |
| `clean-baseline`           | accepted (happy path)                   |
| `genuine-regression`       | `regressed`                             |
| `genuine-improvement`      | `improved` (never `regressed`)          |
| `cross-lineage-diff`       | `cross_target_diff_violation`           |
| `corpus-mismatch`          | `non_comparable` (never `regressed`)    |
| `before-integrity-failure` | `integrity_failure` (never `regressed`) |
| `after-integrity-failure`  | `integrity_failure` (never `improved`)  |
| `tampered-past-entry`      | `registry_chain_violation`              |
| `removed-entry-append`     | `append_continuity_violation`           |
| `reordered-entry-append`   | `append_continuity_violation`           |
| `missing-created-at`       | `manifest_timestamp_violation`          |
| `invalid-created-at`       | `manifest_timestamp_violation`          |

The summary carries `integrity_laundering_successes: 0`.

## Non-claims

- Temporal diff, not a leaderboard; no cross-target ranking or superiority.
- Integrity failures and corpus mismatches are never regressions/improvements.
- A registry snapshot is self-contained + offline-verifiable; append-only continuity
  is proven against the previous signed head, not asserted.
- Timestamps are signed evidence only because they are committed manifest inputs.

## Out of scope (deferred)

- **Stage 3R** (future): live multi-release campaign populating a real long-horizon
  registry; public timeline publication.

## External anchors

- [AgentDojo (NeurIPS 2024), arXiv:2406.13352](https://arxiv.org/abs/2406.13352)
- [AgentDyn, arXiv:2602.03117](https://arxiv.org/abs/2602.03117) — defences insecure or over-defensive in dynamic environments.
- [Firewalls, arXiv:2510.05244](https://arxiv.org/abs/2510.05244) — public benchmarks saturate; stronger benchmarks needed.
- [PISmith, arXiv:2603.13026](https://arxiv.org/abs/2603.13026) — defences remain vulnerable to adaptive attacks.
- [Anthropic browser-use defences](https://www.anthropic.com/research/prompt-injection-defenses) — no agent is immune; measure, don't certify.
- [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html); [NIST AI RMF (AI 100-1)](https://www.nist.gov/itl/ai-risk-management-framework).
