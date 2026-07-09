# Stage 5D — VARL: Verifiable Adaptive Red-Team Ledger (implementation plan)

> Motto: **AnthropicSafe First, then ReviewerSafe.**
> Spec: `docs/superpowers/specs/2026-07-09-stage-5d-varl-adaptive-red-team-ledger-design.md`.
> Version **v2.39.0**, raw codes **240–254**, branch `stage-5d-varl`.
> Marker key: **[Gn]** = addresses spec-gauntlet finding n. **[L]** = Lean. Every code task is
> **test-first**: write the failing test, watch it fail, minimal code, green, run `npm run format`
> to apply, then **validate the gate with `npm run format:check`** (whole-repo, never a glob).

## Ground rules (from the gotcha ledger — read before Task 1)
- **All 5D code lives in `tools/simurgh-attestation/stage5d/`** — re-home the `stage5c/experiments/`
  prototypes by **copying the logic in; NEVER `import` from `stage5c/experiments/`** [G2-5] so the
  Task 19 deletion can't break the build. **[G7]** Delete the experiments/ files at the end.
- Raw codes are **additive** in `stage4h/exitCodes.mjs` (5C ends at 239; "240 remains headroom" is
  already noted there). Adding 240–254 to the code exports + `RUN_LEVEL_BY_RAW` regenerates the
  `tests/fixtures/llmShield/stage4h/expected-results/exit-map.json` golden and any fixture embedding
  the code map — a deterministic ripple, not a bug. Must keep **`exitCodeProbeHygiene.test.js`** green
  (use `UNKNOWN_RAW_PROBE=999`, never a hardcoded "unknown" probe above the block) and the
  `stage4h/exitWrapper.test.js` inline map. **[PG7]** Confirm the exact fixture set by running the 4h
  reproduce; commit the re-signs.
- `npm test` = unit only; never shell `rg`/`git` inside a unit test. Byte-stable evidence builds
  ONLY under Node 26 (`/opt/homebrew/opt/node@26/bin`). **Directory byte-stability:** snapshot sorted
  per-file `sha256`, rebuild, diff the hash set, then `git diff --exit-code` on the evidence dir.
- Validate formatting with **`npm run format:check`** (whole-repo `prettier --check .`), never a glob.
- `.env` is gitignored (holds the Lane C key); never commit it, never print the key.

---

## Task 0 — Test-key fixture [PG6]
Create `tests/fixtures/llmShield/stage5d/test-keys/INSECURE_FIXTURE_ONLY_stage-varl.pem` (Ed25519,
**no digits** in the filename so it dodges the priv-key path regex), and reference it from the
stage3m/3o audit allowlists (Task 18). Public key derived from the private (never commit `.pub.pem`).

## Task 1 — Scaffold + constants (`stage5d/constants.mjs`) [P0-3 exact values]
Test-first (`tests/unit/llmShield/stage5d/constants.test.js`): assert the **exact frozen** exports —
no `…`, no "vague values":
```js
VARL_SCHEMAS = { LEDGER:"simurgh.varl.escalation_ledger.v1", AUDIT_PRIVATE:"simurgh.varl.audit_private.v1",
  BYO_TARGET:"simurgh.varl.byo_target.v1", ATTESTER_PROVENANCE:"simurgh.varl.attester_provenance.v1" }
VARL_RECIPE_OPS = ["fullwidth_digits","percent_to_per_cent","combining_joiner",
  "cross_script_confusable","spell_number","homoglyph_month"]          // closed set of op-KINDS
VARL_GATE_KINDS = ["frozen_kernel","proposed_normalizer"]
VARL_DURABILITY = ["durable","brittle"]
VARL_TRILEMMA_CORNERS = ["ascii_allowlist","cross_script","uts39_skeleton"]
VARL_TRILEMMA_AXES = ["closes_confusables","diacritic_overblock","fixed"]  // [G3]
VARL_OVERCLAIM_DENYLIST = ["cure","cured","solved","unbreakable","immune","bulletproof",
  "foolproof","impenetrable","100% safe","cannot be bypassed"]           // exact, no "…"
VARL_PAID_SLOTS = ["learned_paraphrase_mutation_deferred","live_adversary_capture_lane_deferred"]
VARL_PAID_SCOPE = { learned_paraphrase_mutation_deferred:"adaptive_live_execution",
  live_adversary_capture_lane_deferred:"agent_team_route|pinned_api_attacker" }
VARL_MINTED_SLOTS = ["unicode_confusables_kernel_hardening_deferred","real_deployed_detector_target_deferred"]
VARL_RESERVED_SLOTS = [ /* exact 5C remainder: multilingual_ruleset_deferred, narrative_version_diff_deferred,
  submitted_document_pilot_deferred, frontier_readout_conflict_deferred — copied verbatim from 5C constants */ ]
```
Test asserts every array/object is `Object.freeze`d and matches these literals exactly.

## Task 2 — Exit codes 240–254 (`stage4h/exitCodes.mjs`) [P0-1 full named map]
Test-first (`stage5d/exitCodes.test.js`): `VARL_RAW_CODES` is the **exact named map** (one meaning
per code — no overload):
```
240 VARL_SCHEMA_INVALID          247 VARL_RESIDUAL_PREDICATE_INVALID   253 VARL_AUDIT_PRIVATE_OMISSION (audit-only)
241 VARL_SIGNATURE_INVALID       248 VARL_DURABILITY_INVALID           254 INTERNAL_FAIL_CLOSED_VARL (wrapper LAST)
242 VARL_SOURCE_DIGEST_INVALID   249 VARL_TRILEMMA_INVALID
243 VARL_ROUND_CONTIGUITY_INVALID 250 VARL_BYO_BINDING_INVALID
244 VARL_RECIPE_INVALID          251 VARL_PROVENANCE_INCONSISTENT
245 VARL_WATCHER_VERDICT_MISMATCH 252 VARL_OVERCLAIM_DETECTED (public; incl. unreviewed exact-claim)
246 VARL_CLOSED_COUNT_MISMATCH
```
`VARL_CHECK_ORDER` = 240→253 (254 wrapper LAST); `VARL_AUDIT_CODES` = **[253] only**; `VARL_PUBLIC`
special-cases **252** (public); `RUN_LEVEL_BY_RAW` entries 240–254 = 1. **Ripple:** regen
`tests/fixtures/llmShield/stage4h/expected-results/exit-map.json`, keep `exitCodeProbeHygiene.test.js`
and `stage4h/exitWrapper.test.js` green, then run the 4h reproduce to absorb the re-sign.

## Task 3 — Recipe engine (`stage5d/core/recipes.mjs`) [L] [P1 recipe schema]
Test-first: **recipe schema** = ordered `[{ op, args }]` where `op ∈ VARL_RECIPE_OPS` and `args` is a
per-op-typed object (`cross_script_confusable` → `{ map: {ascii→codepoint} }`; `combining_joiner` →
`{ positions:[int] }` where positions are **codepoint indices into the base_text** [G2-7];
digit/percent/spell/month ops → `{}`). **Plus a `literal` op → `{ text }`** [G2-2] that stores a
verbatim evasion string, so a Lane C evasion outside the transform vocabulary is still reproducible
(anyone re-runs `text` through the gate). **Unknown op or malformed args → throw** (surfaces as 244
at verify / 254 in the wrapper). Ops applied in listed (canonical) order.
`applyRecipe(baseText, recipe)` pure; `recipeDigest`. Ops reproduce the executed evasions (fullwidth
`４０`, `per cent`, U+034F joiner, cross-script `т`). Property: same `(base, recipe)` → identical
bytes (`recipeDeterminism`).

## Task 4 — Gate registry + pinned verdict (`stage5d/core/gateRegistry.mjs`)
Re-home v3/v4 normalizers here as `proposed_normalizer`s over the **read-only** imported 4W/4X
kernel (v1 = `frozen_kernel`). `sourceDigest(gate_version)` hashes a **frozen sorted file list** that must cover **every module
`verdictAt` transitively touches** [G2-3] — for the frozen kernel that is BOTH 4W (leakage) **and 4Y**
(`spanExtractor` + its constants, since `doc_residue` runs `extractSpans`); v3/v4 add their normalizer
module. Each file read as bytes with **LF-normalized line endings**, sorted by path, concatenated with
a separator, then sha256 (242). Test: dropping any transitive dep from the list is caught.
`verdictAt(gate_version, text)` = the watcher recompute. Test: v1/v3/v4 verdicts match the executed
grounding; `verdictIgnoresAttacker` (ignores any `attacker_claim`) **[G2/G6]**.

## Task 5 — Durability classifier (`stage5d/core/durability.mjs`) [L]
Test-first: `classifyDurability(hardening)` → `durable` iff the hardening closes its class **solely**
by a fixed Unicode-property predicate — the exact set `{NFKC, \p{M}, \p{Default_Ignorable_Code_Point},
\p{Script=Latin}/\p{Script=Common}}` closed under the op-set — else `brittle` (any enumerated
codepoint/word blocklist). Procedure: inspect the hardening's declared `closes_class` + rule kind;
v3→brittle (hand blocklists), v4→durable (property strip). `durabilitySound`.

## Task 6 — Trilemma corners (`stage5d/core/trilemma.mjs`) [L] [G1][G3][G9]
Re-home the three corner normalizers (`ascii_allowlist`, `cross_script`, `uts39_skeleton` stub) + the
committed probe corpus (cross-script `т`, Latin-internal `ı`, legit `café/résumé`). Corners **A/B are recomputed** from
real normalizers; **corner C (uts39) is a DECLARED structural row [PG2]** — `fixed:false`
(data-dependence is definitional for a growing skeleton table) with `closes_confusables:true` +
**`declared_only:true`** (never the invalid `~true` notation [P1]), not recomputed (no full skeleton
ships). `cornerOutcomes()` recomputes A/B's `{closes_confusables, diacritic_overblock}` against the
probe corpus; `trilemmaHolds()` asserts no corner is `{closes ∧ ¬overblock ∧ fixed}`. Code 249
recomputes A/B and validates C's `declared_only` shape only.
Test the exact measured table.

## Task 7 — Ledger core (`stage5d/core/ledgerCore.mjs`) [L]
Test-first: rung structure; `roundContiguity` (1..N, no gap, non-empty — 243); `closedCount` recompute
(246); `residualPredicate` (`∅ ⇔ all exact-preserving caught` — 247); `closureNotCure`,
`escalationMonotoneOnCorpus` (scoped to the committed corpus **[G4]**). **Open final rung [PG4]:**
`hardening_diff:null` / no `to_gate_version` → skip 246, and an open rung MUST carry a non-empty
`residual_class` (open + empty residual → 247).

## Task 8 — Slip/claim integrity (`stage5d/core/claimCore.mjs`)
Test-first: `watcherVerdictCheck` (245); `humanReviewGate` — an `exact_quantity_preserving` evasion
with `human_reviewed=false` fails **252** (an unbacked strong claim = overclaim, per audit P0-1; no
collision with 249) **[G2]**; `overclaimScreen(analyst_note)` also **252**; `byoBindingCheck` (250);
`provenanceConsistencyCheck` — 251 checks only that `attester_provenance.response_digest` reproduces
the recorded evasion; `request_digest`/`model_id`/`org_id` are **recorded-not-verified**
(self-asserted/spoofable transparency fields, never gated) [G2-8] (**[G5]**).

## Task 9 — VARL core evaluate (`stage5d/core/varlCore.mjs`)
Test-first: `evaluateVarl(bundle, {tier, ...})` runs checks in **frozen first-failure order
240→253** [P1]; `evaluateVarlSafe` wraps throws → 254. **Signed-content boundary [G2-4]:**
`signBundle` signs `canonicalJson(content)` where `content = bundle minus signature`, and
`attestation_pub_key_pem` is **inside** content (a key-swap breaks 241); `checkSignature` (Ed25519 via
node:crypto); `checkSchema` (BUNDLE_KEYS allowlist incl. `byo_target`, `attester_provenance`,
`analyst_note`, `audit_private_digest`, `audit_private_schema`, `audit_private_attempt_count`,
`audit_private_round_digest_set`); tier split — **252 public**, **253 audit-only**. Full tamper
matrix, one code per test, first-failure order verified.

## Task 10 — Green bundle + audit-private ceremony log (`stage5d/node/greenBundle.mjs`) [P0-2 binding]
`buildGreenContent` from the executed 3-round result (18 evasions, recipes, trilemma corners, durability
bits, `human_reviewed=true`); `buildGreenBundle(priv)`; `auditPrivate` (the ceremony log with raw
attacker transcript digests). **The signed public bundle MUST bind the log:** include
`audit_private_digest = sha256(canonicalJson(auditPrivate))`, `audit_private_schema`,
`audit_private_attempt_count`, `audit_private_round_digest_set`. The **audit tier requires the supplied
`auditPrivate` log's digest to equal the signed `audit_private_digest`** — a missing, swapped,
shortened, or post-hoc log fails **253** (no more stage-theatre). Test: green → `raw 0` both tiers; a
dropped losing round → **253 audit / 0 public** (5C-233 isolation); a post-hoc swapped log → 253.
**Honesty [G2-1]:** 253 makes the log tamper-evident and bound; it does NOT force a builder to log a
round they never ran (see spec §5 limitation 7) — true completeness is the watcher re-running the
ceremony, not trust in the log.

## Task 11 — Build/verify CLIs + byte-stable evidence (`stage5d/node/{build,verify}-*.mjs`)
Write evidence to `docs/research/llm-shield/evidence/stage-5d/`; `verifyEvidence()` → raw 0 both tiers.
Build twice, `cmp`-identical (Node 26). Add dir to `.prettierignore`. CLI-main argv guard. **[PG1]**
Lane A committed evidence contains **only deterministic recipes** (including any frozen Lane C ones);
the CI/verify path never calls the API — byte-stability must not depend on a live model.

## Task 12 — Lane B ceremony harness (`stage5d/laneb/`) — non-CI
The two-role protocol as a runnable doc + watcher-side verifier: attacker = subagent (prompt template
+ pinned-gate query helper); watcher recomputes and emits the ceremony log. Digest-only public. Not
CI-gated. **Addresses** (partially pays) the key-free live-adversary debt — full retirement only if
shipped evidence proves it [P1].

## Task 13 — Lane C runner (`stage5d/lanec/run-lanec.mjs`) — non-CI [G5][PG1][PG5]
`node --env-file=.env run-lanec.mjs`: adaptive attacker via `@anthropic-ai/sdk`, **`claude-sonnet-5`**
on the approved org, with the gate-feedback loop (one-shot was caught in smoke — must iterate).
Captures `attester_provenance {model_id, org_id, request_digest, response_digest}`; watcher verifies
every evasion; both outcomes sealed (`model_refused` honest). Refuses to print the key.
**Freeze-to-recipe [PG1]:** each live evasion is watcher-verified, then **reduced to a deterministic
recipe + digest and committed** — the ledger reproduces it offline; CI never calls the API. **No
double-count [PG5]:** Lane C attaches `attester_provenance` to the evasions it independently
corroborates; it mints a **new rung only if it finds a genuinely new evasion class**, never a
duplicate of Lane B's. The pinned provenance is a corroboration stamp — a **candidate** Frontier
9.2→9.5, scored only after the pinned evidence ships [G2-6].

## Task 14 — BYO adapter (`stage5d/lanec/byoAdapter.mjs` + README) — non-CI [lever 4]
`flagged(text)→bool` contract + `byo_target` binding (250) + one-command reproduce so a foreign team
points the ceremony at their detector. Boundary test: adapter imports no heavyweight ML in CI.

## Task 15 — Python + browser parity (`stage5d/python/varl_parity.py`, `stage5d/browser/varl-verifier.html`)
Stdlib Python parity on `applyRecipe`, pinned-gate verdict, closed-count, residual, durability, the
three corners, `canonicalJson`. Browser WebCrypto Ed25519 + arithmetic, verified via `node:vm`
cross-realm parity (compare by value, not `deepEqual` — the node:vm array gotcha), **as prior stages
4Z/5A/5C do**. Plus a **documented manual browser smoke** (green verify + tampered-signature red).
_Playwright/Chromium CI smoke is an optional stretch, not a blocker — no prior Simurgh stage gates CI
on a real browser_ [P1 refined, receipts in message].

## Task 16 — Lean proofs (`proofs/stage5d/AdaptiveRedTeam.lean`) [L]
The 8 theorems (Task refs 3–8): `escalationMonotoneOnCorpus`, `closureNotCure`, `roundContiguity`,
`recipeDeterminism`, `verdictSound`, `verdictIgnoresAttacker`, `trilemmaLatticeUnsat`,
`durabilitySound`. **[PG3]** `trilemmaLatticeUnsat` proves pick-2 over the **enumerated 3×3 corner
table** by `decide` (finite/decidable); the interleaving mechanism stays PROSE in the spec, never
claimed as part of the proof. Zero `sorry`; **CI grep guard rejects `sorry`, `admit`, and unauthorised
`axiom`** [P1]; toolchain `leanprover/lean4:v4.15.0`; wire into `stage-4-lean-proofs.yml`.

## Task 17 — K7 all-functions e2e net (`tests/e2e/llmShield/stage5d/k7AllFunctions.test.js`)
Every export exercised; full tamper matrix in frozen first-failure order; committed-evidence verify
raw 0 both tiers; the 253 audit/public isolation; the read-only-predecessor assertion (4w/4x/4y AND
**5c** byte-identical to merge-base). Reproduce script `scripts/reproduce-llm-shield-stage5d.sh`;
wire into `scripts/check-e2e.sh` REPRODUCE array.

## Task 18 — Security audits, scripts, self-review gate
Add the exact allowlist line
`^tests/fixtures/llmShield/stage5d/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$` to **both**
`security-audit-llm-shield-stage3m.sh` and `3o.sh` (only the basename is `[A-Za-z-]+`; the literal
`stage5d` segment is fine, same as `stage5c` today — verified). **Raw-code collision scan:** assert no
code in 240–254 has two meanings (guards P0-1 permanently). **Self-review gate:** re-read every task's
diff against the spec + all gauntlet/audit findings; settle any empirical question by running code.

## Task 19 — Closeout (MANDATORY order)
K7 + `reproduce-llm-shield-stage5d.sh` green **and** all prior reproduce scripts undisturbed —
**exact list: 4h, 4w, 4x, 4y, 4z, 5a, 5b, 5c** [P1] → `scripts/check.sh` local → **guarded
`rm -rf tools/simurgh-attestation/stage5c/experiments` [PG8]** (untracked, so sealed 5C stays
byte-identical; do this before the predecessor/`git status` check) → closeout doc with
honestly re-scored scorecard → README banner → memory (`project_stage-5d-varl.md` + MEMORY.md pointer)
+ Zurvan decision → PR (neutral message, no attribution trailer) → CI green → **await your merge**.

---

## Execution order & checkpoints
1–2 (scaffold+codes, absorb 4h ripple) → 3–8 (pure cores, TDD, Lean-backed) → 9–11 (evaluate + evidence,
byte-stable) → 12–14 (lanes B/C/BYO, non-CI) → 15–16 (parity + Lean) → 17–18 (K7 + audits) → 19
(closeout). **Checkpoint after Task 11**: committed evidence verifies raw 0 both tiers before any lane
work. **Lane C (Task 13) may run live** against `claude-sonnet-5`; if it produces watcher-verified,
non-duplicate evasions, fold the pinned `attester_provenance` into the ledger. **Frontier 9.5 is a
candidate target; the final score is assigned only after the pinned evidence ships** [P1].
