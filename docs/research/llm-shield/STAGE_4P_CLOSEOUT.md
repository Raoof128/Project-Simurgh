# Stage 4P — VOCA/CPC Closeout

**MOTTO: AnthropicSafe First, then ReviewerSafe.** Public-facing: provider-safe
first, then reviewer-safe.

- **Shipped:** 2026-07-05 (PR #87 rebase-merged, `main` 35340744).
  Tag `v2.25.0-stage-4p-voca`.
- **Law:** **No Ghost Provider** (the Origin Custody Law).
- **Raw codes:** 67–79 (closed ledger; 4N owns 47–54, 4O owns 55–66).
- **Subtitle:** verifiable origin-custody attestation for proxy-laundered model
  access — and the payoff of the reserved CPC (cross-provider corroboration by
  digest equality) slot.

## Frozen claim

Stage 4P verifies that a model or tool request was routed through a **declared
origin-custody path**. Undeclared proxying, declared-vs-observed model-identity
mismatch (where evidence exists), account-pool ambiguity, trace-custody
expansion, unbound relay transforms, tool-surface rewrites, and custody-path
laundering are refused or ledgered as machine-checkable violations under the
closed raw-code ledger 67–79. Against an uncooperative path the verifiable
outcome is the **absence of a valid custody attestation**: 4P makes custody
attestation cheap for legitimate paths so that its absence is itself the
auditable signal.

**The Origin Custody Law:** a request may be accepted only if its recorded
custody path is monotone with the committed custody envelope —
`accepted(decision) ⇒ recorded_custody_path ⊑ committed_custody_envelope`;
otherwise `refused ∨ ledgered_failure` (**no silent third path**). No new
provider, relay, account pool, model alias, trace custodian, or tool-surface
custodian may appear after approval unless it is declared, signed, and
delta-bound.

**Identity paragraph (frozen):** 4P does not investigate grey-market services,
contact illegal endpoints, or attribute wrongdoing. It verifies declared custody
evidence; if a path cannot produce valid custody evidence, 4P records that
absence as the result. A custody-class match is corroboration of matching
committed evidence, **not attribution, accusation, or provider-truth**.

## What shipped

- **Closed custody ledger 67–79** — `VOCA_RAW_CODES` from
  `CUSTODY_ENVELOPE_MISSING` (67) through `CPC_EMISSION_VIOLATION` (79). The
  normative first-failure order is `VOCA_CHECK_ORDER` = 67,68,69,**78**,70,…,79:
  laundering (78) runs right after structural validity because laundering masks
  every later, more specific violation. Additive in the shared 4H ledger.
- **CPC — cross-provider corroboration by digest equality** — the payoff of the
  reserved 4L slot, delivered as a **window-bound `windowed_evidence_commitment`**:
  bounded corroboration of shared custody-failure classes through digest equality
  over 4N-window-anchored, entropy-floor-gated evidence digests. Raw endpoints,
  prompts, tools, accounts, and hostnames are **NEVER committed into the public
  bundle** — cross-window unlinkable, subject to entropy and disclosure-budget
  rules. A digest match shows two bundles share the same committed custody-class
  digest — never legal attribution.
- **Four inventions (no new raw codes)** — U1 **GhostTrilemma** (the
  laundering-cost trichotomy as a machine-checked theorem); U2 **dual-side
  pincer** (provider commitment and operator herd evidence corroborate by digest
  equality with no raw data revealed); U3 **respondent contest path**
  (`simurgh.relay_contest.v1`, a contestable format); U4 **vendor-disclosure
  projection** (turns prose subprocessor lists into recomputable custody
  disclosures).
- **Six Lean theorems, zero sorry** (`proofs/stage4p/OriginCustody.lean`, Lean
  4.15.0, no mathlib): `noSilentThirdPath`, `noGhostProvider_accept`,
  `custodyPathMonotone`, `noCustodyLaundering`, `ghostTrilemma`,
  `cpcEmissionBounded`.
- **Two-stage bundle digest** — the attestation signs `canonicalJson(parse(bundle))`
  (prettier + merge-safe), `keyDigest` over the public PEM on both sides.
- **Lane B** — binds against Stage 4O's own `manifestCore.mjs` function (a real
  cross-stage invariant, not a copy); MCP-shaped as declared.

## Honest limitations (signed non-claims, not hidden)

1. **Public anchor** — the 4N window anchor is public; corroboration is
   disclosure-**budget**-bounded, **not a cryptographic privacy proof**. Full
   VOPRF/PSI private matching is deferred to 4P.1.
2. **Both sides synthetic** — every pincer / contest / disclosure fixture is
   built by us; no real operator or provider corroborated a custody class in the
   wild during this stage.
3. **Lane B is MCP-shaped** — the HTTP resale shape (real router/aggregator
   resale traffic) is deferred to 4P.1.
4. **Envelope/receipt machinery is AEX/in-toto-adjacent** — that adjacency is
   signed, not concealed; the novel parts are the GhostTrilemma, the pincer, and
   4N-window-anchored entropy-gated custody-class corroboration.
5. **A custody-class match is corroboration, not attribution** — restated as a
   limitation so nobody reads a digest match as legal provider-truth.

## Four-axis re-score (honest — the number of record)

Re-scored at closeout against the shipped artifact (spec design-time scores in
parentheses):

| Axis               | Score         | Note                                                                                                                                                                                                                                                                                                             |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty            | 9.0 (9.0)     | `GhostTrilemma` proved exactly as specced (six theorems, `lean` exit 0, no sorry); the U2 dual-side pincer shipped green. Held at spec.                                                                                                                                                                          |
| Frontier           | 9.0 (9.0)     | Lane B shipped MCP-shaped as declared, binding against 4O's real `manifestCore.mjs`; HTTP resale correctly deferred to 4P.1. Held at spec.                                                                                                                                                                       |
| Good-for-Anthropic | **9.0 (9.5)** | Honest downgrade: the U2 pincer and U4 vendor-disclosure projection shipped and are recomputable, but **both sides of every fixture remain synthetic** — no real operator/provider corroborated a class. The pilot dependency is unchanged by implementation, so the design-time 9.5 is trimmed to reflect that. |
| Constitution       | 9.0 (9.0)     | Respondent path (§11.2) shipped with 2/2 contest arms (valid chain + wrong-signer rejection); model-identity custody makes the identity-honesty clauses enforceable. Held at spec.                                                                                                                               |

**The one delta explained:** Good-for-Anthropic moves 9.5 → 9.0 not because
anything descoped, but because the ceiling on the score was always a real
operator/provider pilot, and that ceiling is untouched by shipping — so the
honest number of record is 9.0, not the design-time aspiration.

## Reproduce

```bash
bash scripts/reproduce-llm-shield-stage4p.sh
```

Evidence under `docs/research/llm-shield/evidence/stage-4p/`.

## Build gotchas (recorded)

- The `D()` test seed must be **hex-valid** (fix the fixture, not the validator).
- The private-key audit allowlists by **PATH REGEX**
  (`test-keys/INSECURE_FIXTURE_ONLY_<name>.pem`, no digits) in **both** the 3m
  and 3o audit scripts.
- Full `check.sh` shows a pre-existing RED (untracked worktrees/`.history` +
  untracked pytest/wiki) unrelated to 4P — confirm the stage-specific gates are
  green rather than chasing the aggregate.
- Lane C is a signed spec delta (no `public_report_custody_data_insufficient`
  code) — recorded, not papered over.

Builds on Stage 4O (VTSA) and the reserved 4L CPC slot; sets up the post-4P
roadmap (PCCC / VFR split, then the VDCC wedge). Version discipline: verify
`git tag --sort=-creatordate` before versioning — 4E–4H shipped out of letter
order.
