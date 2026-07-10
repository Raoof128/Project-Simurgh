# Stage 5H — VSD: Verifiable Safety-claim Disclosure (TDD build plan)

> Motto: **AnthropicSafe First, then ReviewerSafe.** Public wording stays provider-agnostic.
> Spec of record: `docs/superpowers/specs/2026-07-10-stage-5h-vsd-safety-claim-disclosure-design.md`
> (gauntleted 2026-07-10, 14 findings resolved — the spec text WINS on any conflict with this plan).
> Audience: a skilled engineer with ZERO context on this codebase. Follow tasks in order; every task
> is failing-test → minimal code → green → `npx prettier --write <files>` → commit.

## Global constraints (verbatim from spec — violations are plan bugs)

- **Version:** `v2.43.0-stage-5h-vsd`. **Raw codes: additive 300–315** in the GLOBAL ledger
  `tools/simurgh-attestation/stage4h/exitCodes.mjs` (299 is the last used code — verified).
  `VSD_PUBLIC_CHECK_ORDER = [300…312]`, `VSD_AUDIT_CHECK_ORDER = [300…313]`,
  `VSD_AUDIT_ONLY_CODES = [313]`, `VSD_POLICY_CODES = [314]`, wrapper `315` LAST.
- **Node 26 ONLY** for anything byte-stability-related: `export PATH=/opt/homebrew/opt/node@26/bin:$PATH`.
  The 4H digest-fixture builder is byte-stable ONLY under Node 26.
- Tier enums (ordinal comparison only, never float): `restricted < controlled < public`;
  consequence `contextual < supporting < threshold_crossing`;
  `support_quality = {restricted: "descriptive", controlled: "qualified", public: "full"}` (COMPUTED,
  never declared — the field `declared_support_quality` does NOT exist; it was cut in the gauntlet).
- `max_consequence = {restricted: "contextual", controlled: "threshold_crossing", public: "threshold_crossing"}`.
- Digest rule: `domainDigest = "sha256:" + sha256hex(DOMAIN.<obj> + canonicalJson(content))`; signature
  = Ed25519 over `DOMAIN.<obj> + canonicalJson(content)`. Wrapper-only digest/signature fields. Domains
  (each MUST be consumed by a named check — no dead domains):
  `simurgh.vsd.{claim_inventory, claim, review_receipt, recompute_recipe, disclosure_attestation, inventory_census}.v1`
  — each with a trailing `\n` in the separator string.
- Reuse the SHARED `tools/simurgh-attestation/canonicalise.mjs` — `canonicalJson`, `sha256Hex`,
  `fingerprintPublicKey` (SPKI-DER). NEVER reimplement locally.
- **`vsdCore` is PURE** — it never touches fs/env/child_process. The Node orchestrator runs
  `recomputeKernelRunner` and passes `ctx.recomputeResult`; a `public`-declared claim with
  `recomputeResult == null` → **315** (fail closed), never 310/311.
- **Check-major first-failure**: outer loop over checks in frozen order, inner loop over claims in
  inventory order. First check that fails anywhere = `raw`; first failing claim recorded in
  `trust_reason`.
- Semantics locked by the gauntlet: honest recompute-output mismatch = tier fact → 311 when `public`
  declared; **310 = recipe-integrity ONLY** (recipe digest ≠ committed, grammar violation, reads an
  artefact not in declared inputs, constant-output form). Valid receipt with `verdict:
"not_reproduced"` is NEVER 309 — tier fact (proven < controlled).
- Result shape: `{raw, tier, record_authentic (¬{300,301,302,303}), attestation_valid (raw∈{0,314}),
verdict_table, inventory_census_verified (null on public tier), policy_evaluated (true ONLY when
the policy check actually ran; false when preempted), policy_accepted (null when
bypassed/preempted), trust_reason}`. When `record_authentic` is false (raw ∈ {300–303}),
  `verdict_table = []` — no downstream computation over an unauthenticated record.
- Registry distinction (frozen): `ctx.hostRegistry === undefined` (operator never supplied the
  external config) → **315**; a SUPPLIED registry that is empty or lacks the host → **308**.
- `recompute {recipe_digest, committed_output_digest}` is required iff `declared_tier ≥ controlled`;
  `recipe_digest = domainDigest(DOMAIN.recompute_recipe, recipe)` (the domain is consumed here).
  A review receipt reruns THAT claim's own recipe — no claim borrows another's recompute evidence.
- External config OUTSIDE the evidence dir, never a pack default: `stage5h/pin.json` (verifier pin
  `{key_fingerprint, identity_subject, identity_digest}`) + `stage5h/host-registry.json` (array of
  `{host_subject, host_key_fingerprint, public_key_pem}`).
- **No attribution trailers anywhere** (commits/PR/release). Commit messages neutral,
  conventional-commit style (`feat(5h): …`, `test(5h): …`, `fix(5h): …`, `docs(5h): …`).
- `npm test` runs UNIT tests only. Never shell `rg` inside a unit test. e2e via explicit
  `node --test tests/e2e/llmShield/stage5h/*.test.js`.
- Run `bash scripts/check.sh` locally before EVERY push (not `npm test` alone — the 4U lesson).

## Gotchas pre-loaded (read `references/gotcha-ledger.md` before Task 1; these WILL bite otherwise)

1. Additive codes break BOTH `exit-map.json` goldens + the exitWrapper inline test map → regenerate
   with `node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs` under Node 26.
2. `exitCodeProbeHygiene.test.js` guards probe style (verified against the shipped test): REAL codes
   assert `stage4CodeForRawCode(<raw>) === 1`; the fail-closed-to-3 case is asserted ONLY via
   `UNKNOWN_RAW_PROBE` (999) — its `PROBE_RE` flags ANY literal `stage4CodeForRawCode(NNN)…3`
   pattern, so never write a bare numeric probe expecting 3.
3. Prettier: evidence dirs + `stage5h/pin.json` + `stage5h/host-registry.json` MUST be added to
   `.prettierignore` BEFORE committing evidence. Prettier mangles md numbered lists, bold across line
   breaks, `>`-blockquote wrapped inline code, and `_x_` italics touching `snake_case` — keep
   `verdict_table` etc. in backticks in every doc.
4. Fixture `resign()` must re-sign ALL signed objects (inventory + every receipt + attestation) — 5F
   mutation gotcha; and NEVER mutate a shared bundle without deep-clone (`structuredClone`).
5. 3m/3o priv-key audit scripts allowlist test keys by PATH REGEX — add the stage5h line in BOTH
   `scripts/security-audit-llm-shield-stage3m.sh` and `…stage3o.sh` in the SAME task that creates
   test keys, or CI goes red.
6. Lean 4.15 core idioms only (no mathlib); wire the new file into
   `.github/workflows/stage-4-lean-proofs.yml` in the same task.
7. Compare canonical forms with `canonicalJson(a) === canonicalJson(b)` — never deep-equal libraries,
   never `Number()` coercion on digests/scores.
8. CLI mains guard with `import.meta.url === pathToFileURL(process.argv[1]).href`.
9. Reproduce script: every gate on its OWN line (`cmd`, then `echo OK`) — `cmd && echo OK` under
   `set -e` FAILS OPEN (5E lesson).
10. Don't commit spec/plan to local main — branch `stage-5h-vsd` FIRST (4O rebase-merge lesson).

## File map (every file, one responsibility)

```text
tools/simurgh-attestation/stage4h/exitCodes.mjs            MODIFIED  codes 300–315 + orders + run levels
tools/simurgh-attestation/stage5h/constants.mjs            NEW  enums/warrant/DOMAIN/schemas/policy/slots
tools/simurgh-attestation/stage5h/core/digests.mjs         NEW  domainDigest/identityDigest/artifactDigest
tools/simurgh-attestation/stage5h/core/signatures.mjs      NEW  fingerprint/signContent/verifyContent
tools/simurgh-attestation/stage5h/core/schema.mjs          NEW  300
tools/simurgh-attestation/stage5h/core/attestationTrust.mjs NEW 301
tools/simurgh-attestation/stage5h/core/inventorySignature.mjs NEW 302 (+ producer-identity binding)
tools/simurgh-attestation/stage5h/core/inventoryMembership.mjs NEW 303
tools/simurgh-attestation/stage5h/core/scopeBinding.mjs    NEW  304
tools/simurgh-attestation/stage5h/core/artefactLedger.mjs  NEW  305/306/307
tools/simurgh-attestation/stage5h/core/reviewReceipt.mjs   NEW  308/309
tools/simurgh-attestation/stage5h/core/recompute.mjs       NEW  310 (recipe integrity; consumes kernel result)
tools/simurgh-attestation/stage5h/core/tierLattice.mjs     NEW  pure proven_tier/support_quality/max_consequence
tools/simurgh-attestation/stage5h/core/tierOverclaim.mjs   NEW  311
tools/simurgh-attestation/stage5h/core/inversion.mjs       NEW  312
tools/simurgh-attestation/stage5h/core/census.mjs          NEW  313 (audit-only; incl. verdict_table equality)
tools/simurgh-attestation/stage5h/core/policy.mjs          NEW  314
tools/simurgh-attestation/stage5h/core/rightScalingDistance.mjs NEW projection (§6-B)
tools/simurgh-attestation/stage5h/core/inversionCensus.mjs NEW  projection (§6-A)
tools/simurgh-attestation/stage5h/core/disclosureDebt.mjs  NEW  projection (§6-E)
tools/simurgh-attestation/stage5h/core/campaignOutcome.mjs NEW  Lane C outcome record (throws; no raw code)
tools/simurgh-attestation/stage5h/core/vsdCore.mjs         NEW  315 wrapper; evaluateDisclosure(+Safe); PURE
tools/simurgh-attestation/stage5h/node/recomputeKernelRunner.mjs NEW pinned recipe interpreter
tools/simurgh-attestation/stage5h/node/buildBundle.mjs     NEW  deterministic synthetic bundle
tools/simurgh-attestation/stage5h/node/build-vsd-evidence.mjs NEW evidence writer (+pin/host-registry)
tools/simurgh-attestation/stage5h/node/verify-vsd-attestation.mjs NEW orchestrator CLI
tools/simurgh-attestation/stage5h/laneb/ceremony.mjs       NEW  blind-recompute review ceremony
tools/simurgh-attestation/stage5h/laneb/run-laneb-review-ceremony.mjs NEW ceremony CLI
tools/simurgh-attestation/stage5h/lanec/build-real-disclosure.mjs NEW real-package ingest
tools/simurgh-attestation/stage5h/python/vsd_parity.py     NEW  stdlib-only parity
tools/simurgh-attestation/stage5h/browser/vsd-portable.mjs NEW  WebCrypto portable verifier (raw:null)
tools/simurgh-attestation/stage5h/browser/index.html       NEW  CSP no-egress page
proofs/stage5h/DisclosureTier.lean                         NEW  10 theorems + 1 lemma, zero sorry
tests/unit/llmShield/stage5h/_validBundle.mjs              NEW  deterministic fixture + resign()
tests/unit/llmShield/stage5h/_ctx.mjs                      NEW  ctxFor() builder
tests/unit/llmShield/stage5h/*.test.js                     NEW  one file per owner module
tests/e2e/llmShield/stage5h/k7AllFunctions.test.js         NEW  K7 net
scripts/reproduce-llm-shield-stage5h.sh                    NEW  8-step fail-closed (Lane C outcome-gated)
scripts/check-e2e.sh                                       MODIFIED  Stage 5H reproduce registry entry
scripts/security-audit-llm-shield-stage3m.sh / stage3o.sh  MODIFIED stage5h test-key allowlist
.github/workflows/stage-4-lean-proofs.yml                  MODIFIED + proofs/stage5h line
.prettierignore                                            MODIFIED evidence dir + pin/host-registry
docs/research/llm-shield/evidence/stage-5h/…               GENERATED Lane A evidence (+laneb/, real-disclosure/)
```

Branch first: `git checkout -b stage-5h-vsd` (from up-to-date main). Commit after every task.

---

## Task 1 — Ledger: raw codes 300–315 (test first, watch the goldens break, regenerate)

**Interfaces (produces):** in `tools/simurgh-attestation/stage4h/exitCodes.mjs`:
`VSD_RAW_CODES` (name→raw map below), `VSD_PUBLIC_CHECK_ORDER=[300..312]`,
`VSD_AUDIT_CHECK_ORDER=[300..313]`, `VSD_AUDIT_ONLY_CODES=[313]`, `VSD_POLICY_CODES=[314]`,
`RUN_LEVEL_BY_RAW[300..315]=1`. Run-level accessor is **`stage4CodeForRawCode`** (NOT
`runLevelForCode` — that function does not exist; verified in 5G).

```js
export const VSD_RAW_CODES = Object.freeze({
  VSD_SCHEMA_INVALID: 300,
  VSD_ATTESTATION_TRUST_OR_SIGNATURE_INVALID: 301,
  VSD_INVENTORY_SIGNATURE_INVALID: 302,
  VSD_CLAIM_OUTSIDE_INVENTORY: 303,
  VSD_SCOPE_UNBOUND: 304,
  VSD_ARTEFACT_UNACCOUNTED: 305,
  VSD_REDACTION_UNTYPED: 306,
  VSD_ARTEFACT_DIGEST_MISMATCH: 307,
  VSD_REVIEW_HOST_UNPINNED: 308,
  VSD_REVIEW_RECEIPT_INVALID: 309,
  VSD_RECOMPUTE_RECIPE_INVALID: 310,
  VSD_TIER_OVERCLAIM: 311,
  VSD_EVIDENTIAL_INVERSION: 312,
  VSD_AUDIT_CENSUS_MISMATCH: 313,
  VSD_POLICY_REJECTED: 314,
  INTERNAL_OR_ENV_UNAVAILABLE_VSD: 315,
});
```

**Steps:** (1) write `tests/unit/llmShield/stage5h/exitCodesLedger.test.js` asserting all names/raws,
orders, `stage4CodeForRawCode(300)===1` … `(315)===1`, disjointness from 0–299, and that
`VSD_PUBLIC_CHECK_ORDER` excludes 313/314/315 — run, watch it fail. (2) Append the block to
`exitCodes.mjs` mirroring the VFC tail (same comment style). (3) `node --test tests/unit/llmShield/stage5h/exitCodesLedger.test.js`
green. (4) Run the FULL unit suite — expect the two `exit-map.json` goldens + exitWrapper inline map
to break; regenerate under Node 26 with `node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs`;
add 300–315 to the exitWrapper test's inline map; suite green. (5) `node --test tests/unit/llmShield/exitCodeProbeHygiene.test.js`
green. Commit `feat(5h): raw codes 300-315 in the global exit ledger`.

## Task 2 — `constants.mjs`: enums, warrant, domains, schemas, policy, slots

**Interfaces (produces):** `TIER = {order:["restricted","controlled","public"], index(t)}`,
`CONSEQUENCE = {order:["contextual","supporting","threshold_crossing"], index(c)}`, `tierGte(a,b)`,
`consequenceGt(a,b)` (ordinal integer compare; throw on unknown value),
`SUPPORT_QUALITY = Object.freeze({restricted:"descriptive", controlled:"qualified", public:"full"})`,
`MAX_CONSEQUENCE = Object.freeze({restricted:"contextual", controlled:"threshold_crossing", public:"threshold_crossing"})`,
`warrant(tier)` → `Object.freeze({max_consequence, support_quality})`,
`DOMAIN` (six separators, each `"simurgh.vsd.<obj>.v1\n"`), `VSD_SCHEMAS` (the same six, no `\n` —
there is NO separate ceremony-receipt schema: the Lane B ceremony emits `review_receipt`, same
species, per spec §3),
`JUSTIFICATION_TYPES = ["safety_hazard","third_party_confidential","security_sensitive"]`,
`DEFAULT_POLICY = Object.freeze({ min_tier_for: Object.freeze({ contextual: "restricted", supporting: "controlled", threshold_crossing: "controlled" }) })`
(equals the structural warrant — honest no-op; the configuration point),
`VSD_RESERVED_SLOTS = ["consequence_self_rating_contest_deferred","secure_review_host_independence_deferred","withheld_artefact_content_deferred","claim_text_semantic_binding_deferred","real_risk_report_pilot_deferred"]`,
re-export of the Task-1 ledger names (`CODES`, orders) exactly like 5G's constants head.

**Test:** `constants.test.js` — ordinal comparisons, warrant table (all three rows), unknown-value
throws, DOMAIN trailing `\n`, DEFAULT_POLICY equals structural warrant, slots frozen. Commit
`feat(5h): VSD constants — tier/consequence lattices + typed warrant`.

## Task 3 — `core/digests.mjs` + `core/signatures.mjs` (mirror 5G byte-for-byte conventions)

Copy the 5G pattern EXACTLY (`stage5g/core/signatures.mjs` is the reference): `fingerprint(pem)` =
shared `fingerprintPublicKey`; `signContent(privatePem, domainSep, contentObj)`;
`verifyContent(identity, domainSep, contentObj, sigB64)` recomputing fp from PEM FIRST and throwing on
declared-fp mismatch. `digests.mjs`: `domainDigest(domainSep, content)`,
`artifactDigest(obj) = "sha256:"+sha256Hex(canonicalJson(obj))` (undomained — file artefacts),
`identityDigest(identity, role)` where role ∈ {producer, verifier, host} maps to… **STOP: identities
here are NOT domain-separated objects in the six-domain list.** Frozen decision (no dead domains):
`identityDigest(identity) = artifactDigest({identity_subject, key_fingerprint})` — subject+fp only,
never the PEM (PEM wrapping must not change identity). Test digests against hand-computed sha256 of
known strings (use `printf '%s' "simurgh.vsd.claim_inventory.v1\n{}" | shasum -a 256` to precompute).
Commit `feat(5h): domain digests + Ed25519 signature surface`.

## Task 4 — Fixtures: `_validBundle.mjs` + `_ctx.mjs` (deterministic; the Oxford family)

**Interfaces (produces):**
`validBundle()` → deep-fresh `{bundle, artefacts, pin, hostRegistry, recomputeResult}`;
`resign(bundle, keys)` re-signs inventory + EVERY receipt + attestation;
`keys` = three fixed Ed25519 PEM pairs committed under
`tests/fixtures/llmShield/stage5h/test-keys/INSECURE_FIXTURE_ONLY_{producer,host,verifier}.pem`
(the 5G convention — verified: 5G keys live at `tests/fixtures/llmShield/stage5g/test-keys/`, NOT
under `tests/unit/`, and the 3m allowlist regex matches
`^tests/fixtures/llmShield/stage5g/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$` — add the
stage5h twin line to BOTH 3m/3o audit scripts in this task). `_ctx.mjs`: `ctxFor(bundle, {pin,
hostRegistry, recomputeResult, tier})` → the exact ctx `vsdCore` consumes.

The three claims (exact values, deterministic — no `Date.now()`, no randomness):

| claim_id                        | declared_tier | declared_consequence | evidence                                                                                                                                                                                                                                        |
| ------------------------------- | ------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontier7b-cbrn-threshold`     | `controlled`  | `threshold_crossing` | host receipt `reproduced` over THIS claim's own recipe (`aggregate_mean` over `artefacts/redteam-summary.json`); present: `artefacts/redteam-summary.json` + `artefacts/judge-rubric.json`; 2 withheld (typed, `available_at_tier: controlled`) |
| `frontier7b-harmbench-public`   | `public`      | `supporting`         | recompute recipe over `artefacts/eval-results.json`; committed output digest matches; withheld = []                                                                                                                                             |
| `frontier7b-monitoring-context` | `restricted`  | `contextual`         | restriction `{reason, right_scaling_note}`; no receipt, no recipe                                                                                                                                                                               |

Every claim carries `claim_text_digest` (sha256 of a fixed sentence), `method_summary_digest` for the
two ≥controlled claims, and a full `scope_statement {checkpoint_kind, environment,
pipeline_components[], uncertainty_note}`. `eval-results.json` fixture: 6 rows
`{case_id, metric:"refusal_rate", value:"0.94"}` — values are **decimal STRINGS** (canonicalJson
BigInt/float gotcha, 4Z lesson). Test: build twice → `canonicalJson` byte-equal; resign→verify green;
mutation of any signed byte breaks the right signature. Commit
`test(5h): deterministic Oxford-family fixture bundle + test keys (audit allowlisted)`.

## Tasks 5–12 — the eight check modules (one TDD cycle each, one commit each)

Uniform contract: each module exports ONE check function `check<Name>(ctx)` returning
`{ok: true}` or `{ok: false, raw: <code>, reason: "<snake_case_reason>", claim_id?}`. Each test file
starts from `validBundle()` and tampers ONE thing per case (deep-clone first; `resign()` when the
tamper must survive signature checks — i.e., when testing a check DOWNSTREAM of signatures). Minimum
tamper matrix per module (test names = these strings):

- **Task 5 `schema.mjs` (300):** missing `claims[]`; duplicate `claim_id`; unknown top-level field in
  `pin`/`host-registry` embedded inside the bundle (`embedded_trust_material`); missing
  `restriction` on a `restricted` claim; missing `recompute` on a claim declaring ≥ `controlled`
  (BOTH the controlled and public fixture claims carry one); missing
  `method_summary_digest` on a `controlled` claim; non-member enum values. Schema deliberately
  EXEMPTS `scope_statement` presence — that is 304's single ownership (assert schema passes a
  scope-less claim so the exemption is real).
- **Task 6 `attestationTrust.mjs` (301):** pin absent → `external_pin_missing`; pin fp/subject/digest
  mismatch (all three separately) → `external_pin_mismatch`; attestation signature bit-flip →
  `attestation_signature_invalid`. Pin is checked BEFORE any signature (order test).
- **Task 7 `inventorySignature.mjs` (302):** producer sig bit-flip; PEM↔fp mismatch;
  `identityDigest(producer_identity) !== inventory.content.producer_identity_digest`.
- **Ownership triangle (frozen here — three codes touch claim references, single owner each):**
  **303** owns membership: a referenced `claim_id` unknown, OR a receipt/verdict `claim_digest`
  matching NO recomputed inventory claim digest (`domainDigest(DOMAIN.claim, claim)` per claim).
  **304** owns scope presence + the Law-4 formula guarantee. **309** owns receipt authenticity:
  host signature + `inventory_digest` binding. **The Maverick fixture therefore lands on 303 at
  runtime**: edit `checkpoint_kind`, `resign()` inventory+attestation (NOT the receipt — the host
  signed the OLD claim), and the receipt's `claim_digest` now matches no inventory claim → 303.
  (Check-major order makes this stable: 303 < 304 < 309.)
- **Task 8 `inventoryMembership.mjs` (303):** verdict_table row with unknown `claim_id`; receipt
  whose `claim_digest` matches no inventory claim; **the Maverick fixture** (scope swapped,
  inventory+attestation resigned, receipt stale → 303); receipt for an intact claim → ok.
- **Task 9 `scopeBinding.mjs` (304):** scope_statement absent (schema 300 deliberately EXEMPTS
  scope presence — 304 owns it); plus the Law-4 formula-guarantee unit test: mutate any
  scope_statement field → recomputed `domainDigest(DOMAIN.claim, claim)` changes (this is a
  property test of the digest formula, not a runtime tamper — the runtime detection is 303's
  stale-receipt path above).
- **Task 10 `artefactLedger.mjs` (305/306/307):** referenced artefact (recipe input) in neither
  ledger → 305; withheld entry missing `justification_type`/`available_at_tier` → 306; present
  artefact bytes perturbed → 307. Ledger totality: `present ∩ withheld = ∅` → 300? NO — overlap is
  305's `reason:"artefact_in_both_ledgers"` (ledger owns partition).
- **Task 11 `reviewReceipt.mjs` (308/309):** SUPPLIED registry empty → 308; host fp not in the
  supplied registry → 308 (a registry never supplied at all — `ctx.hostRegistry === undefined` —
  is 315, owned by vsdCore, asserted in Task 18: environment failure, never a pin verdict); host
  sig bit-flip → 309; receipt `inventory_digest` mismatch → 309 (`claim_digest` linkage is 303's,
  per the ownership triangle — do NOT re-check it here); valid receipt with
  `verdict:"not_reproduced"` → **`{ok:true, verdict:"not_reproduced"}`** (NEVER 309 — assert
  explicitly).
- **Task 12 `recompute.mjs` (310) + `node/recomputeKernelRunner.mjs`:** the pinned recipe grammar is
  ONE form: `{schema:"simurgh.vsd.recompute_recipe.v1", op:"aggregate_mean", input_artefact_ids:[…],
metric:"refusal_rate", decimals:4}` — runner reads ONLY the listed artefacts from `ctx.artefactBytes`,
  computes the mean of `value` fields as decimal-string arithmetic (no float: parse to scaled
  integers), emits `{output:{metric, mean:"0.9400", n:6}, output_digest:artifactDigest(output)}`.
  310 fires on: `domainDigest(DOMAIN.recompute_recipe, recipe) !== claim.recompute.recipe_digest`
  (this is where the `recompute_recipe` domain is CONSUMED — using `artifactDigest` here would
  leave the domain dead and violate the no-dead-domains rule); unknown `op`;
  `input_artefact_ids` ⊄ present[]; an input listed but not read is impossible by construction
  (runner reads exactly the list — assert in test); zero inputs (constant-output form) →
  `reason:"constant_output_recipe"`. **Output mismatch is NOT 310** — runner returns
  `{matched:false}` and the tier lattice consumes it (Task 13). Split of labour (frozen):
  core/recompute performs the STATIC integrity checks (recipe digest, grammar shape,
  `input_artefact_ids ⊆ present[]`, constant-output form) PURELY from the bundle — they run for
  EVERY claim carrying a recompute block, controlled included, kernel or no kernel; only OUTPUT
  matching consumes `ctx.recomputeResult`, and the kernel reruns recipes only for
  `public`-declared claims (R1's rerun is the host's, not ours). Kernel-null with a `public`
  claim → handled by vsdCore (315), asserted in Task 18. **Rounding-edge test required**:
  a second artefact fixture whose values force half-up rounding at `decimals:4` (e.g. five rows
  averaging to `…x50005` scaled) — JS and Python (Task 23) MUST byte-agree on it; if they diverge,
  fix the rounding contract BEFORE Task 23, not after.

## Task 13 — `tierLattice.mjs` (pure): proven_tier + support_quality + per-claim facts

**Interfaces:** `computeTierFacts(claim, {receiptFact, recomputeFact})` →
`{proven_tier, support_quality, max_consequence_warranted}` implementing EXACTLY spec §2:
tierR1 = tierR0 ∧ `method_summary_digest` present ∧ receipt valid ∧ `verdict==="reproduced"`;
tierR2 = tierR0 ∧ `method_summary_digest` present ∧ `withheld.length===0` ∧
`recomputeFact.matched===true` — **EXPLICIT: R2 does NOT require an R1 receipt** (the public
fixture claim has none and must prove R2; assert this exact case).
Table-driven test (8 rows): all three fixture claims → (R1, R2, R0); `not_reproduced` receipt → R0;
receipt absent on controlled-declared → R0; recompute mismatch on public-declared → R1-if-receipt
else R0; withheld nonempty blocks R2 even when recompute matches; `support_quality` follows tier.
Commit `feat(5h): pure tier lattice + computed support quality`.

## Tasks 14–17 — verdict checks (one commit each)

- **Task 14 `tierOverclaim.mjs` (311):** `TIER.index(declared) > TIER.index(proven)` → 311 with
  `reason` naming both. The three FrontierMath-holdout legs asserted here: declared controlled +
  not_reproduced → 311; declared restricted honest + C0 → ok; (third leg lands in Task 15).
- **Task 15 `inversion.mjs` (312):** `CONSEQUENCE.index(declared_consequence) >
CONSEQUENCE.index(max_consequence(proven_tier))` → 312. Cases: C2-on-R0 (the headline), C1-on-R0
  (the "limited contextual or descriptive use only" half — assert BOTH halves of the boundary),
  C2-on-R1 → ok (qualified support suffices structurally), restricted+C1+failed-receipt → 312 (leg 3).
- **Task 16 `census.mjs` (313, audit-only):** inventory↔verdict_table bijection (missing row / extra
  row / duplicate); artefact census (every `artefacts_ref` on disk digest-matches — audit reruns);
  **committed `verdict_table` ≠ freshly recomputed table → 313** (`reason:"verdict_table_mismatch"`).
- **Task 17 `policy.mjs` (314):** `evaluatePolicy(verdictTable, policy=DEFAULT_POLICY)`; DEFAULT is a
  no-op on any structurally-valid table (assert on the valid bundle); strict config
  `{threshold_crossing:"public"}` rejects the R1 CBRN claim → 314 with `policy_accepted:false`;
  `policy_evaluated` is `true` ONLY when this check actually ran — an earlier failure preempts it
  and the result carries `policy_evaluated:false, policy_accepted:null` (assert both states).

## Task 18 — `vsdCore.mjs`: the check-major walk + 315 wrapper (the stage's spine)

**Interfaces:** `evaluateDisclosure(bundle, ctx)` (throws only on programmer error) and
`evaluateDisclosureSafe(bundle, ctx)` (never throws; any internal throw → raw 315,
`trust_reason:"internal_error_fail_closed"`). ctx = `{pin, hostRegistry, recomputeResult, tier:
"public"|"audit", policy?}`. Frozen walk:

```js
// CHECK-MAJOR: outer loop = frozen check order; inner loop = claims in inventory order.
// A check function that is per-bundle (300,301,302,303) runs once; per-claim checks iterate.
// First {ok:false} anywhere → freeze raw + trust_reason {check, claim_id}; audit tier still
// completes the verdict_table for ALL claims (no forward pass past 313).
```

315 fires when: any `public`-declared claim while `ctx.recomputeResult == null` (a
controlled-declared claim does NOT need the kernel — its evidence is the host receipt; Simurgh's
own rerun is an R2 requirement only);
`ctx.hostRegistry === undefined` (never supplied — vs a supplied-but-empty/unpinned registry = 308,
assert the distinction BOTH ways); internal throw in Safe. Result assembled EXACTLY per the
Global-Constraints shape; `record_authentic` false iff raw ∈ {300,301,302,303} — **and when it is
false, `verdict_table = []`** (no downstream computation over an unauthenticated record; assert on
a 301 tamper); `attestation_valid = raw===0 || raw===314`; `inventory_census_verified` null on
public tier; `policy_evaluated` true ONLY when the policy check ran (false + `policy_accepted:null`
when preempted — assert on any pre-policy failure). Tests: the valid bundle → raw 0 both tiers; ONE
tamper per raw code 300–315 end-to-end through Safe (16 cases, reusing module tampers); check-major
order test (claim-2 fails 304 AND claim-1 fails 312 → raw 304); truthful-R0 reachability
(restricted+C0 bundle variant → raw 0, then strict policy → 314). Commit
`feat(5h): vsdCore — check-major walk, fail-closed wrapper, result shape`.

## Task 19 — Projections (§6): `rightScalingDistance` / `inversionCensus` / `disclosureDebt`

Pure functions over the audit `verdict_table` + inventory; NO new failure codes.
`rightScalingDistance(row)` = `max(0, CONSEQUENCE.index(declared) − CONSEQUENCE.index(warranted))`;
`inversionCensus(table)` → 3×3 occupancy grid + `inverted_cells` count;
`disclosureDebt(inventory)` → `[{artefact_id, available_at_tier, justification_type}]` + counts by
tier. Each test includes the anti-gaming non-claim as a code comment (spec §6 verbatim). Commit
`feat(5h): verdict projections — right-scaling distance, inversion census, disclosure debt`.

## Task 20 — `node/buildBundle.mjs` + `node/build-vsd-evidence.mjs` (byte-stable Lane A)

`buildSyntheticBundle()` mirrors `stage5g/node/buildBundle.mjs`: fixture keys read from the SAME
`tests/fixtures/llmShield/stage5h/test-keys/` dir as Task 4 (already audit-allowlisted; 5G's
builder reads its fixtures dir the same way — verified), fixed timestamps
(`"2026-07-10T00:00:00Z"` constants), sorted keys everywhere; returns
`{bundle, artefacts, pin, hostRegistry}`.
`build-vsd-evidence.mjs` writes `docs/research/llm-shield/evidence/stage-5h/`
(`vsd-attestation.json`, `claim-inventory.json`, `review-receipts.json`, `recompute-recipe.json`,
`inventory-census.json`) **plus `artefacts/<id>.json` for EVERY `present[]` artefact
inventory-driven — iterate the bundle's artefact map, never a hardcoded filename list** (that
covers `eval-results.json`, `redteam-summary.json`, `judge-rubric.json`, and the Task-12
rounding-edge artefact; a hardcoded list here guarantees a 307/313 at verify) + `stage5h/pin.json`

- `stage5h/host-registry.json` OUTSIDE the evidence dir. **Add `.prettierignore` lines in this
  task.** Test: run builder twice into clean temp dirs → build a **sorted manifest** (path + sha256
  per file) for each and assert manifest equality (catches added/omitted files that pairwise `cmp`
  misses), then `git diff --exit-code` on the committed copy; verify evidence → raw 0 both tiers.
  Commit `feat(5h): Lane A byte-stable evidence builder`.

## Task 21 — `node/verify-vsd-attestation.mjs` (orchestrator CLI)

Mirrors `stage5g/node/verify-vfc-attestation.mjs`: `--tier public|audit`, `--dir <evidenceDir>`
(default the committed dir), loads pin + host-registry from stage dir (or `--pin/--host-registry`),
runs `recomputeKernelRunner` over the evidence artefacts (this is the ONLY place the kernel runs),
calls `evaluateDisclosureSafe`, prints the result JSON, `process.exitCode = raw===0 ? 0 : 1`. CLI
main-guard per gotcha 8. e2e-style unit test spawns it with `node` on the committed evidence and
asserts exit 0 with raw 0; on a tampered temp copy it asserts exit 1 with the expected raw. Commit
`feat(5h): verify CLI orchestrator (kernel lives here, core stays pure)`.

## Task 22 — Lane B ceremony (`laneb/`)

`ceremony.mjs`: process-2 (spawned `node` child with ONLY the evidence dir + host ceremony key)
blind-recomputes all six domain digests, re-verifies producer+attestation sigs, re-runs **BOTH
committed recipes** (the controlled claim's and the public claim's — each claim's OWN recipe,
never borrowed: the reviewer-caught evidence-cosplay trap), recomputes per-claim
`{proven_tier, support_quality, inverted}`, and signs a `simurgh.vsd.review_receipt.v1` **for the
controlled claim over ITS recipe output** — same species as the bundle receipt (spec §3: R1 is a
rerun that happened); the public claim's rerun is recorded in the transcript as a cross-check
(its digest must equal the claim's `committed_output_digest`), not a receipt.
`run-laneb-review-ceremony.mjs` orchestrates two processes, writes
`evidence/stage-5h/laneb/ceremony-transcript.json` + receipt, asserts the ceremony receipt's
`recomputed_output_digest` equals the bundle receipt's (both are reruns of the SAME controlled
recipe). Deterministic; reproduce-safe. Commit
`feat(5h): Lane B two-process blind review ceremony`.

## Task 23 — Python parity (`python/vsd_parity.py`)

Stdlib-only, mirrors `stage5g/python/vfc_parity.py` structure: recompute all six domain digests, the
identity digests, artefact digests, and the tier lattice + warrant + inversion arithmetic per
claim from the committed evidence; emit `{"vsd_parity":"corroborated"|"FAILED","mismatches":[…]}`,
exit 0/1. It does NOT verify Ed25519 (JS's job — comment verbatim from 5G), so its lattice is the
**predicate view** (5G precedent: receipt treated as digest-linked-present, not
signature-verified — state this in a comment; the JS side owns receipt validity). The
decimal-string mean must byte-agree with the JS runner on BOTH artefact fixtures including the
rounding-edge one (scaled-integer arithmetic, half-up to `decimals`). Test: run via `python3` from
a unit test IF python3 exists (skip cleanly otherwise, 5G pattern). Commit
`feat(5h): python parity — digests + tier lattice byte-agreement`.

## Task 24 — Browser portable verifier (`browser/`)

`vsd-portable.mjs`: WebCrypto SHA-256 + Ed25519 verify, recomputes digests + lattice + inversion,
`raw:null` advisory result (never a verdict — 5G rule); `index.html` with CSP
`default-src 'none'; script-src 'sha256-…'`-style no-egress (copy 5G's CSP header exactly),
file-input only. Unit test: run `vsd-portable.mjs` under Node's WebCrypto
(`globalThis.crypto`) against the committed evidence → `corroborated:true`. Commit
`feat(5h): portable browser verifier (advisory, no-egress)`.

## Task 25 — Lean (`proofs/stage5h/DisclosureTier.lean`) + CI wiring

Model tiers/consequences as inductive types with `Ord`; state the ten theorems + lemma EXACTLY as
spec §4 names them (`tierMonotonicity`, `warrantMonotone`, `inversionSound`, `tierOverclaimSound`,
`truthfulRestrictedVerifies`, `notReproducedCapsTier`, `redactionCompleteness`, `scopeBindingSound`,
`noFullWithoutRecompute`, `publicTierRequiresEmptyWithheld`, lemma
`verifierCodomainHasNoTruthBoolean` — the codomain structure literally lacks the field). Lean 4.15
core idioms (match/omega/decide; NO mathlib). Verify locally:
`lean proofs/stage5h/DisclosureTier.lean` → exit 0, zero `sorry` (grep). Add the line to
`.github/workflows/stage-4-lean-proofs.yml` after the stage5g line. Commit
`feat(5h): Lean disclosure-tier theorems + CI wiring`.

## Task 26 — K7 all-functions e2e net (`tests/e2e/llmShield/stage5h/k7AllFunctions.test.js`)

MANDATORY before tag. Covers: EVERY export of every stage5h module invoked at least once; the full
16-code tamper matrix through the CLI-level path; family-separation invariants (an integrity tamper
never reports as policy; env-null never reports as tamper; `record_authentic`/`attestation_valid`
combinations exhaustively checked); check-major ordering property (two simultaneous tampers → lower
check wins regardless of claim index); Lane A byte-stability (build twice, cmp); Lane B ceremony
corroboration; python parity (skip-guarded); browser portable corroboration; projections consistency
(`inversionCensus.inverted_cells === count(rightScalingDistance>0)`); cross-stage invariant: 5G's
committed evidence still verifies raw 0 (additive changes must not disturb sealed history). Commit
`test(5h): K7 all-functions e2e net`.

## Task 27 — Lane C outbound + ingest (`lanec/build-real-disclosure.mjs`)

Two halves. **(a) Ingest tool now:** `assembleRealDisclosure({pkg, verifierIdentity, artifacts,
verifierPriv})` accepting a returned `disclosure-package.json` (producer-signed claim inventory +
artefact bytes + optional host receipt) → attestation → verify raw 0; `writeRealEvidence(outDir, …)`
→ `evidence/stage-5h/real-disclosure/` (verify-only). Unit-test with the fixture keys standing in
for the foreign ones. **(b) Outbound pack** (mirrors 5G `foreign-capture-pack/`, built AFTER CI is
green, in `/Users/raoof.r12/Desktop/Raouf/test/`): sign-inventory script + README + OUTPUT_CONTRACT
with the roles SPLIT so no party hosts its own claim (gauntlet catch — producer==host for the same
claim would be grading-own-homework wearing an R1 badge): the droplet team (1) files a claim
inventory as PRODUCER over their real 5G PG2 capture (cross-attestation chaining: the 5G
attestation file is a `present[]` artefact by digest; the Simurgh Lane-B ceremony key serves as
review host for THEIR claim — honest note in evidence: host independent of producer, not of
verifier), and (2) counter-signs an R1 receipt as REVIEW HOST over OUR committed Lane-A claim
(rerunning our recipe from the pack) — THIS receipt is the real
`secure_review_host_independence_deferred` payment. Both requested; either alone seals honestly;
declines recorded, never re-rolled. **Campaign outcome is fail-closed** (reviewer catch — 5G's
if-exists-skip was a latent softness): add `core/campaignOutcome.mjs` (5G semantics mirrored: only
`status:"completed"` may carry disclosure evidence; non-completed with evidence throws) and commit
`evidence/stage-5h/lanec/campaign-outcome.json` with
`status ∈ {completed, declined, no_show, environment_failed}` — written honestly when the campaign
resolves. C-2 (real published risk-report claim) is assembled by US, verify-only,
provider-agnostic wording — staged for closeout review (spec gauntlet item 14). Commit
`feat(5h): Lane C real-disclosure ingest + fail-closed campaign outcome + outbound pack scaffolding`.

## Task 28 — Reproduce script + audit sweeps

`scripts/reproduce-llm-shield-stage5h.sh` — 8 steps, EVERY gate two-line (5E lesson), mirroring the
5G script: (1) stage5h unit suite; (2) exit-code probe hygiene; (3) K7 e2e; (4) public verify raw 0;
(5) audit verify raw 0; (5b) **Lane C fail-closed gate** (reviewer catch — NOT if-exists-skip):
`lanec/campaign-outcome.json` MUST exist or the script fails; `status:"completed"` → the
real-disclosure dir must exist AND verify raw 0; any other status → the dir must be ABSENT (a
non-completed campaign carrying completed evidence fails); (6) Lane B ceremony; (7) python parity
(skip-guarded); (8) byte-stability rebuild + sorted-manifest compare. **CI wiring in this task**
(reviewer catch, verified: `scripts/check-e2e.sh` carries an explicit per-stage reproduce
registry): add the `"Stage 5H VSD|scripts/reproduce-llm-shield-stage5h.sh"` entry to
`check-e2e.sh`, and confirm `scripts/check.sh` reaches the stage5h unit tests via `npm test` (it
runs the unit suite — verify stage5h globs are included, not assumed). Then: run `bash
scripts/reproduce-llm-shield-stage5g.sh` AND the 4Y–5F reproduce scripts unchanged-green (sealed
history), `bash scripts/check.sh` clean, `npm run format:check` (NEVER a subset — 4V lesson).
Commit `feat(5h): fail-closed reproduce script + CI wiring`.

## Task 29 — Final gate: full E2E + docs-accuracy pass (plan ENDS here by standing rule)

1. Fresh `bash scripts/check.sh` + full unit + K7 + reproduce under Node 26 — read FULL output.
2. Docs-accuracy: re-verify EVERY spec §2 number/name against shipped code (code table, orders,
   result shape, domain list, fixture claim table) — fix the DOC when drift is editorial, fix the
   CODE only for real defects; never loosen a check.
3. Evidence committed; `.prettierignore` verified BEFORE `npm run format:check`.
4. **Docs BEFORE tag** (reviewer catch + the 5G lesson — the tagged commit must CONTAIN its own
   closeout and banner): write the closeout doc (re-scored scorecard; gauntlet item 14 resolved;
   post-release slots as explicit TO-CONFIRM placeholders) + README banner ON THE BRANCH → commit.
5. PR `stage-5h-vsd` with honest scope section (what is executed vs deferred), no attribution
   trailers → CI green → rebase-merge → reset local main to origin/main.
6. Reproduce ON MAIN under Node 26 (ALL PASS) → tag `v2.43.0-stage-5h-vsd` at the reproduced HEAD
   (verify `git rev-parse <tag>^{commit}` == reproduced HEAD) → push the tag → create the GitHub
   Release → **verify with `gh release list` that the Release exists and is marked Latest** (a git
   tag is NOT a GitHub Release — the 5C lesson; `gh release create` has exited 1 on a
   already-created Release before, so check the list, not the command's exit code).
7. Fill the closeout TO-CONFIRM slots (tag==HEAD, reproduce-on-main, Release Latest) in a small
   docs commit on main → memory write + Zurvan (dupe-search first; decision ADR; NEVER push
   Zurvan).

## Test-count budget (honest estimate)

~110–125 stage5h tests: ledger 6, constants 10, digests/sigs 8, fixtures 6, checks 5–12 ≈ 40,
lattice 8, 311/312 10, census 6, policy 5, vsdCore 22, projections 8, builders/CLI 8, laneb 4,
parity 2, browser 2, K7 ~20 asserts. If the real count lands materially below 100, something in the
tamper matrix was skipped — stop and find it.
