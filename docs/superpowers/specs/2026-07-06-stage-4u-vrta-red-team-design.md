# Stage 4U — VRTA: Verifiable Red-Team Attestation

**MOTTO: AnthropicSafe First, then ReviewerSafe.** (Standing project
convention since Stage 4M: "safe for the lab audience in content AND structural
egress, then recomputable by any reviewer" — a design-order tie-break, not an
endorsement claim.)

- **Date:** 2026-07-06
- **Law:** **No Silent Bypass.**
- **Banner:** an adversarial hardening rung that red-teams the Stage-4 capability
  kernel and the VDCC delegation-completeness verifier **before** the Stage 4T
  Incident Capsule is built on top of the chain. 4T (Art-73 rerunnable report)
  remains reserved for the Incident Capsule; hardening the chain first is the
  right order.
- **Branch:** `stage-4u-vrta` · **Target tag:** `v2.29.0-stage-4u-vrta`
- **Raw codes:** 119–132 (additive in
  `tools/simurgh-attestation/stage4h/exitCodes.mjs`; probe-hygiene guard and
  `UNKNOWN_RAW_PROBE=999` already in place — run the full Node-26 e2e nets and
  every prior reproduce script when adding codes).

**Core claim (verbatim, frozen):**

> For one canonical, byte-reproducible red-team corpus bound to a signed
> non-malice charter, every attack against the Stage-4 capability kernel and the
> VDCC verifier resolves to a signed finding record; no attack earns a GREEN
> (raw 0) attestation while omitting, forging, replaying, over-spending, or
> over-authorizing a delegation without that GREEN being independently
> reproducible; and every confirmed bypass is disclosed as a signed,
> severity-tagged finding. A reviewer recomputes the attack-success rate offline
> from pinned inputs.

---

## 0. Why this stage, and why the non-malice frame is first-class

Every safety layer must be attacked by its own authors, or it is faith, not
evidence. But an adversarial harness that drives a live model, forges
signatures, and hunts verifier blind spots is *shaped like* the thing we refuse
to be. So Stage 4U's first deliverable is not an attack — it is a set of
**machine-checkable non-malice constraints**: a signed charter that pins the
declared scope, the bounded keys/endpoints, the caps, and the disclosure
discipline, and to which every single attack fixture is bound by digest. The
charter proves **declared scope, not inner intent**, and yields **bounded
no-harm evidence over declared endpoints, fixture keys, and hermetic execution**
— not a metaphysical guarantee. The verifier refuses to score any attack not
bound to the charter. Covert malice is the exact opposite of this design: our
red-team is *maximally auditable by construction*, and a reviewer can re-derive
both the authorization frame and the honest attack-success rate offline.

This is the Simurgh answer to "how do you red-team responsibly?" — you make the
authorization itself a recomputable artifact, and you make the red-team unable to
hide its own successful attacks.

## 1. Problem — an unaudited safety layer is a claim, not evidence

Stages 4A–4S shipped a capability kernel (`authorise` →
`authorise_with_intent` → `authorise_with_provenance` →
`authorise_with_manifest` → `authorise_with_friction` →
`authorise_with_chain`) and a VDCC delegation-completeness verifier over
dual-signed hop-receipt trees. Each stage proved a *constructive* property: this
bundle is complete, this delegation attenuates, this budget conserves. None has
been subjected to a **published, reproducible, model-driven adversarial campaign
whose only goal is to make the verifier lie** — to earn a GREEN attestation on a
chain that actually omits, forges, or over-authorizes a hop, or to make the
kernel authorize an egress it should contain.

Three gaps in the July-2026 field this closes:

1. **Red-team results are not reproducible evidence.** Public "we red-teamed it"
   claims are prose; nobody can re-run the exact corpus and recompute the
   attack-success rate. 4U makes the corpus and the ASR a signed, replayable
   artifact.
2. **Red-teams can hide their own wins.** A campaign can quietly drop the attacks
   that succeeded. 4U turns the project's **Completeness Invariant** inward: the
   red-team cannot omit a finding without a verifier failure (code 125/126).
3. **Authorization for offensive testing is never machine-checkable.** Scope and
   ethics live in a PDF. 4U signs them into a charter that every attack is bound
   to (code 120/121/122).

The one-sentence moat: **others say they red-teamed; 4U proves what was attacked,
proves the honest result, and carries bounded no-harm evidence over its declared
scope — all offline-recomputable.**

## 2. Non-claims, known limitations, honesty rails (from birth)

### 2.1 Non-claims (signed into the attestation, in this order)

```text
not_a_proof_of_model_safety
not_a_jailbreak_immunity_claim
not_a_production_security_certification
not_an_exhaustive_attack_space_claim
not_a_claim_that_a_green_corpus_means_no_vulnerabilities_exist
not_a_third_party_targeting_or_offensive_tool
not_a_legal_or_compliance_authorization
```

### 2.2 Known limitations (signed, in this order)

```text
corpus_is_relative_to_declared_attack_families_not_the_full_adversary_space
live_fable_lane_is_one_capped_capture_not_ecosystem_scale
a_green_corpus_is_evidence_of_survived_attacks_not_absence_of_bugs
severity_labels_are_analyst_declared_not_a_formal_exploitability_proof
non_malice_is_enforced_over_declared_endpoints_and_fixture_keys_only
```

### 2.3 Honesty rails (spec-time, in this order)

```text
a_confirmed_bypass_is_a_recorded_outcome_not_a_verification_failure
non_malice_charter_proves_declared_scope_not_inner_intent
red_team_held_verifiable_never_system_proven_safe
the_red_team_cannot_omit_its_own_successful_attacks_no_selective_omission
attacks_target_only_our_own_verifier_keys_and_repo_never_third_parties
fable_is_an_attack_bundle_driver_not_a_target_of_harm_no_capability_elicitation
authorization_scope_and_disclosure_are_signed_before_any_attack_runs
reported_asr_is_recomputed_from_pinned_inputs_no_hand_edited_totals
live_lane_is_disabled_by_default_lazy_loaded_and_denial_of_wallet_capped
severity_of_any_confirmed_bypass_is_signed_into_known_limitations
lane_b_uses_honest_transparent_framing_we_never_evade_or_trick_fable_safeguards
a_fable_refusal_is_recorded_as_outcome_never_rephrased_to_bypass_it
```

**Outcome semantics (mirror of Stage 4G, frozen):** a confirmed bypass — an
attack that earns a GREEN it should not, or a kernel authorization that should
have been contained — is a **valid recorded outcome**, not a VRTA failure. VRTA
*fails* only when the red-team is charter-unbound, non-reproducible, incomplete
(a finding omitted), misclassified, cap-breaching, or tampered. This is the
difference between a *security outcome* and a *verification outcome*, and it is
what lets us report a real bypass honestly instead of burying it.

## 3. The signed Red-Team Charter (invention 1)

`red_team_charter.v1` is an Ed25519-signed record emitted before any attack runs.
The charter proves **declared scope, not inner intent** (rail
`non_malice_charter_proves_declared_scope_not_inner_intent`); it binds eight
structurally-enforced constraints:

| # | Constraint | Structural enforcement (not just prose) |
|---|------------|-----------------------------------------|
| 1 | Self-target only | Every attack's referenced keys match `INSECURE_FIXTURE_ONLY_*`; every endpoint is localhost/in-repo. Violation → **122**. |
| 2 | Containment, not elicitation | Win condition schema = `false_green` or `kernel_over_authorize`, never model-output content. Any content-harm target is schema-rejected → **119**. |
| 3 | No harm causation | `destructive_mutation` crossings are modelled labels; no real destructive tool is invoked (offline hermeticity gate, reused from prior stages). |
| 4 | Precommitted disclosure loop | The charter commits an `attack_manifest_root` (below); every planned attack id must resolve to exactly one fixture and one signed finding, and vice versa. Violation → **124 / 125 / 126**. |
| 5 | Brutal honesty | Every confirmed bypass carries a signed severity in `known_limitations`; missing → **131**. |
| 6 | Reproducible receipts | Each attack replays to its recorded raw outcome; divergence → **129**. |
| 7 | Denial-of-wallet caps | Live lane token/spend/turn caps signed into the charter; exceed → **123**. |
| 8 | No evasion-for-malice | Attacks probe *our own* verifier's blind spots; findings land in-repo. |

### 3.1 Precommitted attack manifest (invention 2 — closes self-declared-count laundering)

"Count == count" only proves completeness relative to a self-declared count — an
operator could simply declare fewer attacks. So the charter **precommits the
attack schedule** by seed + family counts + a Merkle root over the planned attack
ids, before any attack runs:

```json
{
  "campaign_seed": "stage4u-vrta-seed-v1",
  "attack_family_counts": {
    "ghost_hop": 8,
    "structuring_budget": 8,
    "scope_escalation": 8,
    "crypto_signature": 8,
    "structural_forgery": 6,
    "fable_adaptive": 4,
    "verifier_oracle": 8,
    "differential": 8
  },
  "attack_manifest_root": "sha256:<merkle root over deterministically-derived attack ids>",
  "declared_attack_count": 58
}
```

The verifier deterministically regenerates the schedule and checks, in order:

```text
generated_attack_manifest(campaign_seed, attack_family_counts) == attack_manifest_root   → else 124
every planned attack_id has exactly one fixture                                            → else 125 (missing) / 126 (count)
every fixture has exactly one signed finding referring to a planned attack_id              → else 125 / 126
```

Now "the red-team cannot hide its own wins" holds against a manifest fixed at
charter-signing time, not a mutable running total. `fable_adaptive` ids are
*slots* the live lane fills; an unfilled slot resolves to a `model_refused` or
`lane_disabled` finding (never silently dropped).

### 3.2 Charter binding

Every attack fixture carries `charter_digest = sha256(canonicalJson(charter))`.
The verifier fails **121** (charter-unbound attack) if any fixture's
`charter_digest` is absent or does not resolve to the bundle's signed charter, and
**120** if the charter signature is invalid. The charter is signed with a
dedicated `INSECURE_FIXTURE_ONLY_vrta-charter.pem` key indexed in the bundle.

## 4. Attack surface (the target)

VRTA is **read-only against the kernel and verifier** — it adds no new kernel
entry and mutates no frozen predecessor, so differential-equivalence over 4A–4S
holds trivially (no `src/llmShield` or kernel diff). The surface:

- **Capability Kernel (Python):** all six families
  `authorise` / `authorise_with_intent` / `authorise_with_provenance` /
  `authorise_with_manifest` / `authorise_with_friction` / `authorise_with_chain`.
- **VDCC verifier (JS):** `evaluateChain` / `evaluateChainSafe`, the two-tier
  attestation verifier (`verify-stage4s-attestation.mjs`), tree/fanout/flux/scope
  cores, `bundleMerkle`, `receiptBuilder` signatures.
- **Cross-impl:** JS↔Python parity surface (`vdcc_kernel.py`,
  `vdcc_surface.py`).

## 5. Attack taxonomy (eight families) → what each falsifies

Every family is a set of signed attack fixtures. The **expected** verifier verdict
for each is recorded; a fixture is a *bypass* iff observed ≠ expected in the
system's favour being wrong (false-GREEN or over-authorize).

1. **Ghost Hop** — off-ledger co-signature withholding, orphan-receipt injection,
   receiptless crossing, uncounted fan-out child. Falsifies: No Ghost Hop
   (targets 106/107/111/112).
2. **Structuring / budget** — sibling-split spend, child-budget double-dip,
   window-boundary timing. Falsifies budget flux conservation (109/110, 4L
   lineage).
3. **Scope escalation** — non-attenuating child, path-intersection evasion,
   sibling re-broadening. Falsifies the scope lattice (108).
4. **Crypto / signature** — unindexed-key substitution, cross-domain signature
   replay (domain-separation test), Ed25519 malleability probe, Merkle
   leaf/node second-preimage. Falsifies signature + domain separation (101/117).
5. **Structural forgery** — parent-pointer cycle (104), resolving-parent island
   (105). **Headline falsification target:** the 4S claim that content-addressing
   makes these *unforgeable*. VRTA attempts an actual forge under adversarial
   pressure and reports the honest result (expected: cannot forge without a hash
   collision → survives; if it forges, that is a signed high-severity finding).
6. **Fable-driven adaptive (in-loop)** — Fable-5 is prompted to *construct* a
   chain the kernel authorizes but that omits a hop; key-free adaptive boundary
   probe (3K lineage). Falsifies robustness to a model adversary.
7. **Verifier / oracle** — public-tier vs audit-tier gap hunting, selective
   omission against the Completeness Invariant, canonical-JSON collision attempts.
   Falsifies the two-tier verifier and canonicalization.
8. **Differential** — JS↔Python kernel fuzzing to find a divergent input.
   Falsifies cross-impl equivalence.

## 6. The two lanes (Fable-5)

- **Lane A — offline deterministic corpus (the bulk).** ~40–60 signed attack
  fixtures across the eight families, seed-derived and byte-reproducible. No API,
  zero cost. Fable-5's *role here* is captured, frozen attack payloads it
  previously produced, replayed deterministically — not a live call.
- **Lane B — live Fable-5 adaptive (small, disabled-by-default).** A real
  `claude-fable-5` agent, driven under our own API access, is asked to construct
  attack chains against the verifier in-loop (3K/1-LIVE lineage). Lazy-loaded,
  hard denial-of-wallet caps (max turns, max tokens, max spend) signed into the
  charter; cap breach → **123**. Live capture is ephemeral → **reproduce
  re-verifies it, never regenerates** (same discipline as 4S Lane B). Fable is an
  *attack-bundle driver, not the protected system and not a jailbreak target*
  (P1-3, the safety hinge). **Lane B audit recomputes outcomes from the captured
  prompt, model response, tool-free structured output, and signed harness
  transcript; it never re-calls the live model during reproduce** (P1-1).

### 6.1 Lane B safeguard-legibility (honest framing, refusal is data)

VRTA must never trigger Fable-5's safeguards **by evading them** — that would
contradict the charter (§3 invariants 2 and 8) and violate **AnthropicSafe
First**. The only admissible way to keep safeguards from firing is to make the
task genuinely and legibly benign so a well-aligned model correctly permits it:

- **Charter-in-context.** Fable-5's system prompt includes the signed charter
  digest and its plain-language scope: this is a self-authored red-team of our
  own delegation verifier, no third-party target, all findings disclosed and
  fixed. Legibility, not concealment.
- **Structured-data task, not weaponization.** The request is to emit
  `vdcc_chain_bundle` JSON that omits a hop or mis-attenuates a scope label —
  fuzzing our own evidence schema. No harmful content is produced, so there is
  nothing for a content classifier to correctly flag; no real system is attacked.
- **Refusal is a first-class recorded outcome.** If Fable-5 declines, the finding
  record stores `outcome = model_refused` with the verbatim refusal, and the lane
  moves on. We **never** rephrase, role-play around, or otherwise attempt to
  bypass a refusal (rail: `a_fable_refusal_is_recorded_as_outcome_never_...`). A
  refusal is honest telemetry — and, if the task was legitimately benign, an
  over-refusal signal reported alongside ASR.
- **Graceful degradation.** Lane A (offline) carries the bulk of the corpus, so a
  fully-refusing or unavailable Lane B still ships a complete VRTA attestation;
  Lane B is additive live signal, never a dependency.
- **Legible, permitted use.** Live calls run on our own account under
  defensive-security permitted use, with the charter's signed denial-of-wallet
  caps (max turns/tokens/spend; breach → **123**).

The finding schema therefore admits four outcome classes —
`survived` (attack correctly caught), `bypass` (confirmed false-GREEN /
over-authorize), `model_refused` (Lane B only), and `lane_disabled` (Lane B off
by default) — and the ASR denominator excludes `model_refused` and
`lane_disabled` while the over-refusal rate reports them separately. Lane B is
**additive and sealed separately** in `lane_b_capture`; it never mutates the
byte-stable offline corpus (the four `fable_adaptive` corpus fixtures are frozen
pre-captured replays).

## 7. Honest metrics + the dual-signal lie detector (invention 3)

- **Exact ASR formula (frozen):**

  ```text
  ASR = confirmed_bypass_count / executed_non_refusal_attack_count
  over_refusal_rate = model_refused_count / lane_b_attempt_count
  ```

  `model_refused` is **excluded** from the ASR denominator and reported
  separately as `over_refusal_rate`. Target ASR 0/N, but the real number ships
  even if non-zero. If Lane B is disabled, ASR is computed over Lane A only and
  `lane_b_status = disabled_by_default`.
- **Two independent codes, not one (P0-4):** each finding carries a
  *self-reported* outcome (what the harness believed) **and** a
  *verifier-recomputed* outcome (independent re-run), plus a recorded
  `outcome_class`.
  - **127 `SELF_REPORT_RECOMPUTE_CONFLICT`** — `self_reported_outcome !=
    verifier_recomputed_outcome`. Did you honestly report what the engine
    returned?
  - **128 `OUTCOME_CLASSIFICATION_INVALID`** — the recorded `outcome_class`
    (`survived` / `bypass` / `model_refused` / `lane_disabled`) does not follow from the
    expected-vs-observed truth table, *even when* self-report and recompute
    agree. Did your label follow from the numbers? (Worked example: expected
    108, observed 0 → truth = bypass; a finding whose self-report matches the
    observed 0 but labels `outcome_class = survived` passes 127 yet fails 128.)
- **ASR ledger:** the signed attestation carries `attack_success_rate`; a
  reviewer recomputes it from the finding records and fails **130** on mismatch.
- **Anti-laundering (4L lineage):** adding a confirmed bypass can never *decrease*
  reported ASR — a signed monotonicity obligation, mirrored in Lean.

## 8. Raw codes 119–132 + frozen check order

Schema-malformed inputs get a **dedicated code (119)** rather than falling into
the typed-wrapper catch-all (132), so 132 does not do double duty (P0-3).

```text
119 VRTA_BUNDLE_MALFORMED           bundle/charter/fixture/finding schema invalid (reasons list)
120 SIGNATURE_INVALID               charter / finding / attestation signature does not verify (reason distinguishes)
121 CHARTER_UNBOUND_ATTACK          attack fixture not bound to the signed charter
122 NON_MALICE_INVARIANT_VIOLATED   non-fixture key or third-party endpoint referenced
123 LIVE_LANE_CAP_EXCEEDED          denial-of-wallet cap breached / live lane ran uncapped
124 ATTACK_MANIFEST_ROOT_MISMATCH   regenerated schedule ≠ committed attack_manifest_root
125 FINDING_RECORD_MISSING          a planned attack_id has no signed finding (selective omission)
126 CORPUS_COUNT_MISMATCH           declared_attack_count ≠ fixture count ≠ finding count
127 SELF_REPORT_RECOMPUTE_CONFLICT  self_reported_outcome ≠ verifier_recomputed_outcome
128 OUTCOME_CLASSIFICATION_INVALID  recorded outcome_class ≠ expected-vs-observed truth table
129 ATTACK_NOT_REPRODUCIBLE         replaying an attack does not reproduce its recorded raw outcome
130 ASR_LEDGER_MISMATCH             recomputed ASR ≠ signed ASR
131 SEVERITY_UNDECLARED             confirmed bypass without a signed severity/known_limitation
132 INTERNAL_FAIL_CLOSED            typed-wrapper catch-all (mirror of 4S code 118)
```

**Frozen check order** (parse → charter → non-malice → precommitted completeness
→ per-finding truth → ledger → fail-closed) — monotonic by construction:

```text
119 → 120 → 121 → 122 → 123 → 124 → 125 → 126 → 127 → 128 → 129 → 130 → 131 → 132
```

All rows map to `RUN_LEVEL_BY_RAW` level **1** (a red-team-integrity failure is a
harness/structural failure, not a security outcome). Additive-code discipline:
regenerate the 4H `exit-map.json` goldens (both copies), update the
`stage4h/exitWrapper.test.js` literal, extend `.prettierignore`, both
`security-audit-llm-shield-stage3{m,o}.sh` allowlists (new fixture-key path
regex), the lean-proofs workflow, and `scripts/check-e2e.sh`. Run the full
Node-26 e2e nets + every prior reproduce script — not just `npm test`.

## 9. Two-tier red-team attestation

`vrta_attestation.v1`, one Merkle root over **five** sealed groups
(`charter` / `attack_fixtures` / `finding_records` / `lane_b_capture` /
`asr_ledger`), signed with `INSECURE_FIXTURE_ONLY_vrta.pem`. Finding records are
**individually signed** (code 120 `finding_signature_invalid`) in addition to
being sealed under the root, so tampering a single finding is detectable at the
finding layer, not only the attestation layer.

- **Public tier:** structural — charter binding, corpus-count completeness,
  signatures, ASR-ledger recompute. No engine re-run.
- **Audit tier:** re-runs every attack fixture through the real kernel/verifier
  and re-derives each outcome, catching 127/128/129.

## 10. Lane structure, reproduce, hermeticity

`scripts/reproduce-llm-shield-stage4u.sh` — verify-only: rebuild the offline
corpus, recompute the ASR ledger, re-verify both tiers, re-verify (not
regenerate) the Lane B capture, epoch-tamper → expect a red-team-integrity
failure. Guarded Lean step. Offline hermeticity gate reused (no fetch/socket/
subprocess in the scored path).

## 11. Lean obligations (`proofs/stage4u/NoSilentBypass.lean`)

Two headline theorems, zero `sorry`, Lean 4.15.0, no mathlib:

1. **`charterBindingSound`** — an attack whose `charter_digest` does not resolve
   to the signed charter, or whose charter signature is invalid, cannot reach a
   GREEN attestation (schema/charter gates 119–121 dominate the check order).
2. **`asrMonotone`** — adding a confirmed bypass to the finding set cannot
   decrease reported ASR (anti-laundering; the red-team cannot make itself look
   cleaner by disclosing more).

Plus supporting lemmas: `completenessNoOmission` (finding-count = attack-count is
required for GREEN) and `bypassIsOutcomeNotFailure` (a bypass verdict is disjoint
from an integrity failure).

## 12. Kernel touch

**None.** VRTA is strictly read-only against the kernel and the 4S verifier. No
new `authorise_*` entry, no frozen-predecessor edit. This is the honest,
low-risk boundary: the red-team must not become a code change to the thing it
attacks.

## 13. Prior-art / field scan (pinned at spec time)

To be recorded in the plan's citation block with URLs checked on 2026-07-06:
NIST AI RMF adversarial-testing profile, MITRE ATLAS, OWASP LLM Top-10
(delegation/excessive-agency items), and the project's own Stage 4G campaign
(differentiated: 4G attacked the *evidence campaign layer*; 4U attacks the
*delegation-completeness verifier and the capability kernel*, and signs a
non-malice charter). Every citation pinned or dropped.

## 14. Four-axis scorecard (spec-time estimate)

| Axis | Score | What moves it higher |
|------|-------|----------------------|
| Novelty | 9.3 | Signed non-malice charter + precommitted attack manifest ("red-team that cannot hide its wins") is, to our knowledge, unpublished. Live cross-org lane would push it. |
| Frontier | 9.1 | Model-driven adaptive attack on a formal completeness verifier. A second independent verifier impl would raise it. |
| Good-for-Anthropic | 9.4 | Directly answers "did you red-team your own safety layer, and how do we trust the result?" — fellows-thread-grade. |
| Constitution | 9.2 | The scope-bounded non-malice charter is the constitution's "responsible offense" clause made machine-checkable, without overclaiming inner intent. |

Re-scored at closeout (§17). Scores reflect the P0 hardening pass (manifest
root, scope-bounded non-malice wording, dedicated malformed code, split
127/128).

## 15. Comprehensive E2E net + docs-accuracy pass (mandatory before tag)

- `tests/e2e/llmShield/stage4u/k7AllFunctions.test.js` — composes every VRTA
  export, the full tamper matrix over 119–132, cross-stage invariants (charter
  binding, ASR recompute, dual-signal conflict, corpus completeness), and the
  read-only-kernel assertion (4A–4S byte-frozen).
- `tests/e2e/llmShield/stage4u/laneb.test.js` — verify-only Lane B ceremony.
- Docs-accuracy pass: every claim in the closeout, README row, and NORTH_STAR
  update checked against shipped code before tag.

## 16. File structure (locked at plan time)

```text
tools/simurgh-attestation/stage4u/
  constants.mjs               charter schema, attack families, non-claims, rails, codes
  core/charter.mjs            build/verify signed charter + manifest, charter_digest, 120/121/122/124
  core/attackModel.mjs        attack fixture schema + expected-verdict binding, 119 schema
  core/findingLedger.mjs      finding records, precommitted-completeness 125/126, ASR recompute 130
  core/dualSignal.mjs         self vs recomputed outcome + classification, 127/128/129
  core/vrtaCore.mjs           frozen check order + evaluateVrta / evaluateVrtaSafe (132)
  node/build-stage4u-corpus.mjs        offline attack corpus (Lane A)
  node/build-stage4u-attestation.mjs   structural + audit attestation + sign
  node/verify-stage4u-attestation.mjs  --tier public|audit
  laneb/fable-attacker.mjs + run-laneb-vrta.mjs   capped live Fable-5 lane
  python/vrta_parity.py       stdlib parity for the offline outcome model
proofs/stage4u/NoSilentBypass.lean
scripts/reproduce-llm-shield-stage4u.sh
docs/research/llm-shield/STAGE_4U_CLOSEOUT.md
tests/unit/llmShield/stage4u/*.test.js
tests/e2e/llmShield/stage4u/{k7AllFunctions,laneb}.test.js
```

## 17. Closeout obligations

Re-score the four axes with evidence; record the honest ASR (both lanes);
list every confirmed bypass with its signed severity as a known limitation;
write `project_stage-4u-vrta.md` + update `MEMORY.md`; verify main CI green;
neutral commit/PR/release copy (no co-author trailer, no "Claude Code" tag
anywhere).
