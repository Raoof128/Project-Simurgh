# Stage 4Q — VFR Closeout

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

Stage 4Q — Verifiable Friction Receipts — is implemented on branch `stage-4q-vfr`.
Approval-gate friction precedence with the two-key pincer, plus the No Silent
Exemption completeness closure, raw codes 80–89, zero new dependencies.

## Gate results (all Stage-4Q-specific gates GREEN under Node 26)

- `scripts/reproduce-llm-shield-stage4q.sh` — exit 0, run twice, committed tree
  byte-stable (all ten steps).
- Unit suites (constants, digest, schemaCore, chainCore, pincerCore,
  inventionCore, fixtures, laneb, attestation) — all pass.
- Python kernel + JS↔Python parity — pass (real Ed25519 via `cryptography`).
- K7 all-functions net — 5/5 (frozen export inventory, composed replay + check-
  order masking, byte-idempotency, cross-stage invariants, attestation both tiers).
- Lean `proofs/stage4q/FrictionPrecedence.lean` — machine-checks clean (exit 0):
  `frictionPrecedence`, `failClosed`, `sameKeyFails`, `frictionCoverage`,
  `noSilentExemption`.
- Privacy scan + 3M/3O private-key audits — pass.
- The known pre-existing `scripts/check.sh` RED (unrelated worktree/history +
  untracked artifacts) is documented here and is NOT a 4Q gate (§4.4).

## Four-axis re-score (honest; the number of record)

- **Novelty 9.0** — the variant-binding No Silent Exemption ("even an unbound
  crossing signs a policy-falsifiable exemption") and the two-key pincer are a
  genuine differentiator; the signed `novelty_source_map` (7 rows incl. the
  GitHub-required-reviews kill-shot) makes the firstness claim falsifiable. Held
  below 10: the source-map has not yet survived external prior-art review.
- **Frontier 9.0** — Lane B captures approval-gated tool calls with a genuinely
  separate approver OS process and a human-ceremony arm, all recomputable
  offline. To 9.5: an approver driven by a real independent human/service in CI.
- **Good-for-Anthropic 9.0** — machine-checks "oversight preceded consequential
  action" AND run-level completeness (no silent unbound crossing). To 9.5: PCCC
  consuming these receipts to gate match-result egress.
- **Constitution 9.5** — the signed `constitution_projection` maps all five
  boundary kinds to clauses with a naming machine-check per row. To 10: clause
  mappings verified against the arms by an external reviewer.

## Spec deltas (recorded, not papered over)

1. **Attestation census is an evidence-level roll-up.** §3.4 lists
   `census {committed_crossings, chain_crossings, laneb_observed}`. Realized as a
   roll-up over all committed Lane A + Lane B chains, where `committed_crossings`
   equals `chain_crossings` by construction (the honest commitment); Tier 2
   recomputes and compares. No behavioural weakening.
2. **Human-at-terminal arm is ceremony-gated by env, not a live tty.** The
   approver process requires a confirmation to sign under `--interactive`;
   the committed capture carries it via `STAGE4Q_HUMAN_CONFIRM=y` so the one-time
   ceremony is reproducible. Scope is unchanged: rails `not_human_intent_proof`
   and `approver_key_separation_is_cryptographic_not_organisational` already
   state this is a key ceremony, not proof of a human.
3. **BYO-approver via env override + `--emit-corpus`.** §3.5 decision-equivalence
   is implemented by rebuilding the Lane A corpus with
   `STAGE4Q_APPROVER_KEY_PATH` and asserting identical per-case `{raw, reason}`.
   Byte-identity is NOT claimed (impossible once the key changes), matching the
   spec's corrected wording.

## Next

Tag `v2.26.0-stage-4q-vfr` after PR (re-check `git tag --sort=-creatordate` first).
Raw codes 80–89 consumed; next stage starts at 90. PCCC is next (pays 4P's
`private_custody_corroboration_deferred`) and can consume VFR receipts to gate
match-result egress — friction gates export, not the private match.
