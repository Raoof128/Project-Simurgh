# Stage 5I — VPC: Verifiable Panel Coverage (implementation plan)

> Motto: **AnthropicSafe First, then ReviewerSafe.**
> Spec: `docs/superpowers/specs/2026-07-11-stage-5i-vpc-panel-coverage-design.md`.
> Branch `stage-5i-vpc` · version `v2.44.0-stage-5i-vpc` · raw codes **316–331**.
> Written for an engineer with ZERO context on this repo. Follow tasks in order. Each task:
> failing test → watch it fail → minimal code → watch it pass → `git commit` (neutral message,
> **NO attribution trailer anywhere**). Do not batch commits.

---

## Global Constraints (verbatim — do not paraphrase)

- **Node 26 only** for evidence build + byte-stability (`/opt/homebrew/opt/node@26/bin`). Unit tests
  run on the repo default, but any `reproduce`/4H-digest step is Node 26 from a clean tree.
- **`exitCodes.mjs` is GLOBAL, not stage-local** — it lives at
  `tools/simurgh-attestation/stage4h/exitCodes.mjs`. Add VPC codes 316–331 there. `UNKNOWN_RAW_PROBE
  = 999` stays above the block. Codes **316–330 → exit 1; 331 → exit 3** (wrapper).
- **`domainDigest` is the 2-arg 5G/5H form:** `domainDigest(domainSep, contentObj)` in
  `stage5i/core/digests.mjs` (mirror `stage5h/core/digests.mjs`). Also reuse `identityDigest(identity,
  role)` and `artifactDigest(obj)` from that module. Domains: `simurgh.vpc.{partition,grant,receipt,
  affiliation,attestation}.v1`.
- **Keys compared by SPKI-DER digest**; PEM is normalized before fingerprinting (reuse the shared
  `canonicalise.mjs` SPKI-DER path — the newline-ghost trap).
- **Two policy profiles** (pinned, referenced by `policy_digest`): `vpc-release-challenge-bound-v1`
  (`required_reviewer_separation = required_host_separation = challenge_bound`, `min_reviewers ≥ 2`,
  `require_nontrivial_partition = true`, `require_distinct_anchor_lineage = true`) and
  `vpc-test-externally-anchored-v1` (disjoint synthetic anchors, proves rung-2 support, pays nothing).
- **Frozen total order** (first-failure-wins): `316→328 (public) → 329 (audit) → 330 (policy) → 331
  (wrapper)`. Policy (330) runs in BOTH tiers; only 329 is audit-exclusive. `vpcCore` owns this order.
- **Role-collision matrix:** `verifier ≠ {producer, grant_issuer, affiliation_issuer, reviewer,
  host}`; `reviewer ≠ {producer, grant_issuer}`; `host ≠ producer`; `affiliation_issuer ≠ producer`
  (pinned affiliation registry excludes producer). Allowed: `reviewer == host` ⟹ host_separation
  non-additive.
- **Byte-stable surface** = `canonicalJson` over `{partition_digest, policy_digest,
  panel_evidence_root, trust_context_digest, canonical(counted_reviewers), coverage_union,
  coverage_gap, equality_holds, verdict, coverage_depth, section_states}`. Reviewer sigs differ per
  key ⇒ never byte-compared. Attestation sig = `Ed25519(DOMAIN.attestation ‖ canonicalJson(content
  minus top-level signature))`.
- **Independence is computed, never declared.** `vpcSeparation(evidence) → rung` re-instantiates 5G's
  `rungLattice` pattern for reviewer+host principals; any rung field in a receipt is display-only.
- **No object signs itself** = no signature field is inside the content its own signature covers
  (reviewers signing their own receipts is role-correct).
- **Evidence dirs are prettier-ignored** (`.prettierignore`). Scores/labels compared via
  `canonicalJson`, never `Number()`.

## Trap-list — READ BEFORE TASK 0 (each cost a real red CI round historically)

1. **Additive-code golden ripple.** Codes 316–331 ripple more than the 2 `exit-map.json` goldens.
   **Task 0 greps the real surface** (every file embedding the 300–315 array or a code count) and
   updates ALL of them. History: additive codes broke 5–6 goldens.
2. **Renumber discipline.** The spec renumbered adequacy-gate to 328, pushing audit→329, policy→330,
   wrapper→331. The exit-map goldens + inline exitWrapper map must match exactly.
3. **prettier mangles Markdown** numbered lists + bold-across-linebreaks. Keep this file's md simple;
   run `npm run format:check` (NOT a subset) before any commit that touches docs.
4. **CLI `main` argv guard:** every `node/*.mjs` CLI wraps its entrypoint in
   `if (import.meta.url === \`file://${process.argv[1]}\`)` — never top-level side effects.
5. **`resign` after mutate:** every tamper fixture is `structuredClone → mutate one fact → re-sign
   every affected signed object + attestation`, else it collapses into 319.
6. **priv-key audit allowlist:** the `3m`/`3o` private-key scanners fail CI on new `test-keys/*.pem`
   unless the new stage's key PATHS are allowlisted (path regex). Add `stage5i/test-keys/` before CI.
7. **`npm test` = unit only.** Never shell out to `rg`/`grep` inside a unit test. Lane B/C + reproduce
   are driven by the reproduce script, not `npm test`.
8. **Lean is NOT in check.sh.** Compile `proofs/stage5i` separately (`lake build`); the `lean-not-in-
   check.sh` guard exists so don't wire it in.
9. **`node --test <bare-dir>` fails** — use an explicit `*.test.js` glob.
10. **check.sh locally before push** — prettier config, committed-state git checks (fetch-depth:0),
    the additive exit-map ripple. Run `./scripts/check.sh` before the PR, not just `npm test`.

---

## File map (create unless marked MODIFY)

```
tools/simurgh-attestation/stage4h/exitCodes.mjs           MODIFY: +codes 316–331
tools/simurgh-attestation/stage5i/
  constants.mjs                 domains, rung enum, policy profiles, VPC_RESERVED_SLOTS
  core/schema.mjs               object schemas, canonical(NFC+path)+uniqueness, PROHIBITED adequacy fields
  core/digests.mjs              port 5H: domainDigest(2-arg), identityDigest, artifactDigest
  core/signatures.mjs           port 5H: Ed25519 verify, SPKI-DER fp, no-self-sign, role-collision matrix
  core/externalConfig.mjs       317: registries + pin + policy_digest present & consistent
  core/partitionCommitment.mjs  320: partition_digest = domainDigest(partition,{src,proc,producer,sections})
  core/panelCensus.mjs          321: object-graph closure → R_candidate (no attestation compare)
  core/grantBounds.mjs          322: ∀r G(r) ⊆ S
  core/receiptBounds.mjs        323: ∀r C(r) ⊆ G(r)  (No Phantom Review)
  core/evaluation.mjs           324: reviewer_attests_evaluated === true over R_candidate
  core/separation.mjs           325: vpcSeparation rung lattice (reviewer + host) ≥ policy
  core/affiliation.mjs          326: affiliationValid (subject∧producer∧partition∧pinned-issuer∧relationship∧issuer≠producer)
  core/coverage.mjs             327: union over R_eligible == S; coverage_gap
  core/adequacyGate.mjs         328: prohibited adequacy/quality assertion → fail closed
  core/coverageDepth.mjs        BEAST B projection: per-section multiplicity, single_reviewer_sections
  core/sectionStates.mjs        BEAST C projection: covered/assigned_only/unassigned
  core/attestationRecompute.mjs 329 (audit): declared == recompute (incl. roots, depth, states)
  core/policy.mjs               330: min_reviewers, nontrivial partition, distinct hosts, distinct anchor lineage
  core/campaignOutcome.mjs      port 5H: Lane C campaign state (pending|completed|... )
  core/vpcCore.mjs              owns frozen 316→330 order + 331 wrapper; pure
  node/buildBundle.mjs          assemble + sign a bundle (test/lane helper)
  node/build-vpc-evidence.mjs   CLI: build Lane A byte-stable evidence
  node/verify-vpc-attestation.mjs CLI: public + audit verify
  node/verify-byte-stability.mjs CLI: build twice, cmp
  node/lanec-gate.mjs           CLI: fail-closed on campaign-outcome.json
  laneb/ceremony.mjs            2-process ≥2-reviewer panel ceremony
  laneb/child-process.mjs       reviewer/issuer child
  laneb/run-laneb-panel-ceremony.mjs  orchestrator (reproduce-gated)
  lanec/build-real-coverage.mjs partition from Opus 4.6 public TOC snapshot + producer_principal(modeled)
  lanec/ingest-real-receipts.mjs ingest droplet grants+receipts, verify-only
  browser/canonical-json.mjs    port 5H
  browser/vpc-portable.mjs      full portable ordered verifier (316–330), no raw:null
  browser/index.html            harness
  python/vpc_parity.py          parity: partition_digest, census, separation, coverage, depth/states, raw code
  host-registry.json  pin.json  affiliation-anchor-registry.json  policy/{release,test}.json
  toc-snapshots/opus-4-6-sabotage-risk-report.toc.json   committed offline TOC source (Lane C)
tests/unit/llmShield/stage5i/*.test.js   (mirror stage5h test set)
tests/e2e/llmShield/stage5i/k7AllFunctions.test.js
tests/fixtures/llmShield/stage5i/test-keys/INSECURE_FIXTURE_ONLY_{producer,grantIssuer,reviewerA,reviewerB,host,verifier,affiliationIssuer}.pem
proofs/stage5i/                 T1–T11 + L1 (lake project)
scripts/reproduce-llm-shield-stage5i.sh
```

---

## Task 0 — codes + golden ripple (do FIRST; it gates everything)

**Interfaces.** Produces: `VPC_RAW_CODES` (map name→int, 316–331), `VPC_PUBLIC_CODES` (316–328),
`VPC_AUDIT_ONLY_CODES = [329]`, `VPC_POLICY_CODES = [330]`, wrapper `INTERNAL_OR_ENV_UNAVAILABLE_VPC =
331`. Consumes: nothing.

1. **Enumerate the ripple surface FIRST (trap 1):**
   `grep -rln "\"315\"\|: 315\|315,\|300, 301" tools tests docs --include=*.json --include=*.mjs`
   Record every hit. The known 2 exit-map goldens are
   `tests/fixtures/llmShield/stage4h/expected-results/exit-map.json` and
   `docs/research/llm-shield/evidence/stage-4h/exit-map.json`; there is also the inline exitWrapper
   map. Update EVERY file the grep surfaces.
2. Failing test `tests/unit/llmShield/stage5i/exitCodesLedger.test.js`: assert every name↔int in
   316–331 is present, unique, monotonic, contiguous with 315, wrapper=331, and that 316–330 map to
   exit 1 and 331 → exit 3 in both exit-map goldens. Run → fail.
3. Add codes to `stage4h/exitCodes.mjs` in the exact §2.4 order and names (316 `VPC_MALFORMED_BUNDLE`
   … 327 `VPC_SECTION_LEFT_UNREVIEWED`, 328 `VPC_ADEQUACY_CLAIMED`, 329 `VPC_ATTESTATION_MISMATCH`,
   330 `VPC_POLICY_REJECTED`, 331 `INTERNAL_OR_ENV_UNAVAILABLE_VPC`). Regenerate both exit-map goldens
   + inline map under **Node 26**. Run → pass. Commit.

## Task 1 — constants.mjs

**Interfaces.** Produces `DOMAINS`, `RUNG` (`distinct_key_only<challenge_bound<externally_anchored`,
with `index`/compare), `POLICY_PROFILES` (release + test digests), `VPC_RESERVED_SLOTS`
(`reviewer_assessment_contest_deferred`, `uncommitted_section_universe_deferred`), `REDACTION_ENUM`
(`misuse_risk`, `commercial_proprietary`), `ADEQUACY_FORBIDDEN_KEYS` (`adequate, sufficient, thorough,
review_quality, approved, endorsed, certified_safe`).

- Test `constants.test.js`: `RUNG` is monotone; `POLICY_PROFILES.release` has the 4 release fields;
  `ADEQUACY_FORBIDDEN_KEYS` frozen. TDD → commit.

## Task 2 — core/schema.mjs (316)

**Interfaces.** `parseBundle(raw) → {ok, R}` where `R` is a raw-316 result on failure. Consumes
`DOMAINS`, `REDACTION_ENUM`, `ADEQUACY_FORBIDDEN_KEYS`.

- Validate the four in-bundle object classes + the external affiliationAssertion shape.
- **Canonicalization before uniqueness:** `section_id` and `canonical_path` are NFC-normalized and
  path-canonicalized; reject duplicates (post-NFC), non-canonical array order, unknown redaction
  enums, and **any `ADEQUACY_FORBIDDEN_KEYS` presence anywhere → this is caught later at 328, but the
  SCHEMA must accept the field as structurally valid so 328 (not 316) fires** (trap: schema must not
  swallow the adequacy field). `reviewer_attests_evaluated` accepts boolean `false`.
- Tests `schema.test.js`: valid bundle → ok; duplicate `section_id` after NFC → 316; unknown enum →
  316; a bundle carrying `adequate:true` → schema-OK (so 328 can own it). TDD → commit.

## Task 3 — core/digests.mjs + core/signatures.mjs

**Port** `stage5h/core/digests.mjs` verbatim (2-arg `domainDigest`, `identityDigest`,
`artifactDigest`). **Port** `stage5h/core/signatures.mjs` with deltas: Ed25519 verify + SPKI-DER
fingerprint; add `roleCollisionOk(principals)` implementing the §2.3 matrix EXACTLY (including
`affiliation_issuer ≠ producer` and the allowed `reviewer==host`); `noSelfSign(obj)` = the object's
own signature field is excluded from the signed content. Tests `digestsSignatures.test.js`: a tampered
sig → false; `verifier==host` → collision; `reviewer==host` → allowed. TDD → commit.

## Task 4 — core/externalConfig.mjs (317)

`checkExternalConfig(cfg) → null | R(317)`. Requires `affiliation_anchor_registry`,
`reviewer_key_registry`, `host_registry`, `verifier_key_pin`, `policy` all present, internally
consistent, and `policy_digest === domainDigest(DOMAINS... , policy)`. **Undefined/unavailable config
→ 331 (wrapper), empty/malformed → 317** (the 5H 308-vs-315 lesson). The pinned
`affiliation_anchor_registry` MUST exclude the producer identity. Tests: missing pin → 317; policy
mismatch → 317; producer in affiliation registry → 317. TDD → commit.

## Task 5 — core/partitionCommitment.mjs (320)

`checkPartition(bundle) → null | R(320)`. Recompute `partition_digest = domainDigest('simurgh.vpc.
partition.v1', {source_report, partition_procedure, producer_principal, sections})` and compare;
`producer_principal.producer_identity_digest = identityDigest(producer_principal,'producer')`. Test:
a mutated section list without re-digest → 320; a swapped producer_principal → 320. TDD → commit.

## Task 6 — core/panelCensus.mjs (321)

**Complete code (novel, load-bearing):**

```js
// Derives R_candidate. NEVER compares against the attestation (that is 329).
export function checkCensus(bundle, ctx) {
  const grantsByReviewer = new Map();
  for (const g of bundle.access_grants) {
    const fp = g.reviewer_principal.key_fingerprint;
    if (grantsByReviewer.has(fp)) return R(321, "duplicate_grant");   // no dup
    grantsByReviewer.set(fp, g);
  }
  const seenReceipt = new Set();
  const candidate = [];
  for (const c of bundle.coverage_receipts) {
    const fp = c.reviewer_principal.key_fingerprint;
    if (seenReceipt.has(fp)) return R(321, "duplicate_receipt");
    seenReceipt.add(fp);
    const g = grantsByReviewer.get(fp);
    if (!g) return R(321, "orphan_receipt");                          // receipt w/o grant
    if (ctx.grantDigest(g) !== c.grant_digest) return R(321, "grant_ref_mismatch");
    if (g.review_host_identity_ref.key_fingerprint
          !== c.review_host_identity_ref.key_fingerprint) return R(321, "host_mismatch");
    for (const d of [c.independence_evidence.separation_evidence_digest,
                     c.independence_evidence.affiliation_assertion_digest,
                     c.independence_evidence.host_independence_evidence_digest]) {
      if (!ctx.resolvesExactlyOnce(d)) return R(321, "evidence_ref_unresolved");
    }
    candidate.push({ fp, grant: g, receipt: c });
  }
  for (const g of bundle.access_grants) {                             // no orphan grant
    if (!seenReceipt.has(g.reviewer_principal.key_fingerprint)) return R(321, "orphan_grant");
  }
  ctx.R_candidate = candidate;
  return null;
}
```

Tests `census.test.js`: orphan receipt → 321; duplicate reviewer → 321; grant/host mismatch → 321;
clean panel → `R_candidate.length === n`. TDD → commit.

## Task 7 — grantBounds.mjs (322) + receiptBounds.mjs (323)

322: `∀ g: setOf(g.granted_sections) ⊆ S`. 323 (No Phantom Review): `∀ candidate:
setOf(receipt.evaluated_sections) ⊆ setOf(grant.granted_sections)`. Tests `checks.test.js`: grant
naming an out-of-S section → 322; receipt exceeding grant → 323. TDD → commit.

## Task 8 — evaluation.mjs (324)

`∀ r ∈ R_candidate: receipt.reviewer_attests_evaluated === true` (strict boolean). Test: a candidate
with `false` → 324. TDD → commit.

## Task 9 — core/separation.mjs (325) — vpcSeparation

**Complete code (novel; re-instantiates 5G rungLattice for reviewer+host):**

```js
import { RUNG } from "../constants.mjs";
// evidence-driven rung; NO declared value trusted. Mirrors 5G checkKeySeparation→checkChallengeBinding→checkAnchorBinding.
export function vpcSeparation(ev, ctx) {
  if (!ev || !ctx.keyDistinct(ev)) return "below_floor";             // not even rung 0
  let rung = "distinct_key_only";
  if (ctx.challengeBound(ev)) rung = "challenge_bound";              // binds a Simurgh-signed challenge receipt
  if (rung === "challenge_bound" && ctx.externallyAnchored(ev)) rung = "externally_anchored";
  return rung;
}
export function checkSeparation(ctx, policy) {
  for (const { receipt } of ctx.R_candidate) {
    const rev = vpcSeparation(ctx.separationEvidence(receipt), ctx);
    const host = vpcSeparation(ctx.hostEvidence(receipt), ctx);
    if (RUNG.index(rev) < RUNG.index(policy.required_reviewer_separation)) return R(325, "reviewer");
    if (RUNG.index(host) < RUNG.index(policy.required_host_separation)) return R(325, "host");
    receipt._computed = { reviewer_separation_strength: rev, host_separation_strength: host };
  }
  return null;
}
```

Tests `separation.test.js`: a receipt whose evidence only clears distinct-key under a
`challenge_bound` policy → 325; a display-only inflated rung is ignored (still 325). TDD → commit.

## Task 10 — core/affiliation.mjs (326)

`affiliationValid(receipt, partition, producer, pinnedRegistry)` requires ALL: assertion resolves;
`subject_key_fingerprint == reviewer`; `producer_identity_digest == partition.producer_principal.
producer_identity_digest`; `partition_digest == current`; `issued_by` externally pinned AND `≠
producer`; `relationship == "independent_of_producer"`. Any miss → 326. Tests: replayed assertion
(other producer) → 326; issuer == producer → 326; unpinned issuer → 326. TDD → commit.

## Task 11 — core/coverage.mjs (327)

After 324–326 pass over EVERY candidate, set `R_eligible = R_candidate` (no silent filter). Compute
`U = ⋃ receipt.evaluated_sections for r∈R_eligible`; `coverage_gap = S ∖ U`; **327 iff `coverage_gap
≠ ∅`**. Tests `coverage.test.js`: drop one section from all receipts → 327; full cover → null +
`equality_holds`. TDD → commit.

## Task 12 — core/adequacyGate.mjs (328) — BEAST A

**Complete code:**

```js
import { ADEQUACY_FORBIDDEN_KEYS } from "../constants.mjs";
// Fails closed if the bundle asserts adequacy/quality — EVEN when coverage holds.
export function checkAdequacyGate(bundle) {
  const hit = (obj) => {
    if (obj == null || typeof obj !== "object") return false;
    for (const k of Object.keys(obj)) {
      if (ADEQUACY_FORBIDDEN_KEYS.has(k)) return true;
      if (hit(obj[k])) return true;
    }
    return false;
  };
  return hit(bundle) ? R(328, "adequacy_or_quality_claimed") : null;
}
```

Tests `adequacyGate.test.js`: a fully-covered bundle with `attestation.review_quality:"good"` → 328
(NOT 0); nested `{certified_safe:true}` → 328; clean bundle → null. TDD → commit.

## Task 13 — coverageDepth.mjs (B) + sectionStates.mjs (C) projections

`coverageDepth(R_eligible, S) → {per_section, min_depth, single_reviewer_sections}`.
`sectionStates(bundle, R_eligible, S) → {covered, assigned_only, unassigned}` where `assigned_only` =
sections that appear in some grant but in no eligible receipt, and are otherwise covered/uncovered by
the union. Pure projections; no gate. Tests `projections.test.js`: a section covered by 1 reviewer →
in `single_reviewer_sections`; a granted-but-unreceipted section → `assigned_only`. TDD → commit.

## Task 14 — attestationRecompute.mjs (329 audit) + policy.mjs (330)

329 (audit-only): recompute `{counted_reviewers=canonical(R_eligible), coverage_union, coverage_gap,
equality_holds, verdict, coverage_depth, section_states, panel_evidence_root, trust_context_digest}`
and compare to the DECLARED attestation; any diff → 329. `panel_evidence_root` / `trust_context_digest`
per §3.2. 330 (policy, BOTH tiers): `min_reviewers`, `require_nontrivial_partition`,
`min_distinct_hosts`, `require_distinct_anchor_lineage` (no two eligible reviewers share an
`anchor_lineage_digest`). Tests `verdictChecks.test.js`: declared union ≠ recompute → 329; 3 reviewers
under min 4 → 330; shared anchor lineage → 330. TDD → commit.

## Task 15 — core/vpcCore.mjs (owns the frozen order)

**Complete code (the order is the contract):**

```js
export function vpcVerify(bundle, cfg, { tier }) {
  try {
    const ctx = makeCtx(bundle, cfg);
    const steps = [
      () => checkSchema(bundle),                 // 316
      () => checkExternalConfig(cfg),            // 317
      () => (ctx.candidateCount() >= 1 ? null : R(318)),
      () => checkSignaturesAndRoles(bundle, cfg),// 319
      () => checkPartition(bundle),              // 320
      () => checkCensus(bundle, ctx),            // 321
      () => checkGrantBounds(ctx),               // 322
      () => checkReceiptBounds(ctx),             // 323
      () => checkEvaluation(ctx),                // 324
      () => checkSeparation(ctx, cfg.policy),    // 325
      () => checkAffiliation(ctx, bundle, cfg),  // 326
      () => checkCoverage(ctx, bundle),          // 327
      () => checkAdequacyGate(bundle),           // 328
    ];
    for (const s of steps) { const r = s(); if (r) return r; }
    if (tier === "audit") { const r = checkAttestationRecompute(ctx, bundle, cfg); if (r) return r; } // 329
    const p = checkPolicy(ctx, cfg.policy); if (p) return p;   // 330 BOTH tiers
    return OK(ctx);
  } catch (e) {
    return R(331, "internal_or_env_unavailable", String(e));   // wrapper, fail-closed
  }
}
```

Tests `vpcCore.test.js`: first-failure ordering (inject two faults, assert the lower code wins);
public tier skips 329 but still runs 330; a thrown error → 331. TDD → commit.

## Task 16 — node/ CLIs + campaignOutcome.mjs

`buildBundle.mjs` (assemble+sign), `build-vpc-evidence.mjs`, `verify-vpc-attestation.mjs`
(`--attestation-only` = public tier), `verify-byte-stability.mjs` (build twice, `cmp` the byte-stable
surface), `lanec-gate.mjs` (fail-closed on `campaign-outcome.json`). Each CLI uses the argv `main`
guard (trap 4). Port `stage5h/core/campaignOutcome.mjs`. Tests `evidenceAndCli.test.js`: build→verify
raw 0 public+audit; byte-stability build-twice identical. TDD → commit.

## Task 17 — Lane A fixtures + tamper matrix

`_validBundle.mjs`: 8-section `S`, 3 independent reviewers, distinct keys + pinned affiliation, union
= S → raw 0 public+audit. Generate `test-keys/` (add path to the 3m/3o allowlist — trap 6). Tamper
matrix per §3.1, **each fixture re-signed after mutation** (trap 5), incl. the `wirecard-*` family
(affiliation issuer traces to producer → 326; receipt beyond grant → 323) and `covered panel asserts
"review adequate" → 328`. Tests `fixture.test.js` + `checks.test.js` assert the intended FIRST raw
code for each. Build evidence twice, `cmp`. TDD → commit.

## Task 18 — Lane B ceremony (reproduce-gated, not npm test)

`laneb/`: issuer + reviewerA + reviewerB + verifier processes; `≥2` reviewers; `∀r C(r) ⊂ S`; `⋃C=S`;
each reviewer child sees only its signed grant. Deterministic (fixed seeds/keys) ⇒ reproducible. The
ceremony receipt is the same species as the bundle receipt. Wire into
`scripts/reproduce-llm-shield-stage5i.sh` (NOT `npm test`). Test `laneb.test.js` runs the ceremony
in-process and asserts raw 0 + a genuine multi-reviewer split. TDD → commit.

## Task 19 — Lane C ingest + campaign gate

`toc-snapshots/opus-4-6-sabotage-risk-report.toc.json` = committed offline TOC source (section list +
original report digest). `lanec/build-real-coverage.mjs` derives the partition via the frozen
`toc-leaf-partition` procedure; `producer_principal` is MODELED and labeled; redaction taxonomy is
report-level, per-section `redaction_types: []`. `ingest-real-receipts.mjs` ingests droplet
grants+receipts (verify-only, keys we don't hold), challenge signed by the Simurgh verifier key.
`campaign-outcome.json` starts `pending`; the reproduce gate is fail-closed (`completed` ⟹ dir+sigs+
config+verify all present). Sign the modeled-affiliation limitation. Test `lanec.test.js`: a
`completed` campaign with a missing dir → gate fails; a valid committed pack verifies raw 0 audit. TDD
→ commit.

## Task 20 — browser portable verifier + Python parity

`browser/vpc-portable.mjs` = full portable ordered verifier (316–330, no `raw:null`), SubtleCrypto
adapter. `python/vpc_parity.py` recomputes `partition_digest`, census, separation, coverage,
depth/states, raw code. Tests `browser.test.js` + `parity.test.js`: for the Lane A fixture + a
tamper set, assert **exact 316–330 raw-code parity** across Node/browser/Python on the deterministic
surface (compare via `canonicalJson`, not `Number`). TDD → commit.

## Task 21 — Lean proofs (proofs/stage5i, zero sorry)

`lake` project mirroring `proofs/stage5c`. Prove T1–T11 + L1 (§3.4). Load-bearing: T3 (no silent
filter: `R_eligible = R_candidate`), T7 (`firstFailureUnique` over the frozen predicate list), T11
(`adequacyUnprovable`: covered ∧ verify=0 ⟹ no adequacy predicate present). `lake build` → zero
`sorry`, zero errors. Do NOT wire into check.sh (trap 8). Commit.

## Task 22 — K7 e2e + reproduce + prior-stage sweep + closeout gates

- `tests/e2e/llmShield/stage5i/k7AllFunctions.test.js`: exercise EVERY exported function + the tamper
  matrix + cross-stage invariants (every raw 316–331 reachable + evidence-locked).
- `scripts/reproduce-llm-shield-stage5i.sh`: Lane A byte-stability + Lane B ceremony + Lane C campaign
  gate; ALL PASS under Node 26 from a clean tree.
- Re-run the **prior** reproduce scripts (5F/5G/5H) — additive codes must not disturb sealed history.
- `./scripts/check.sh` (trap 10), `npm run format:check` (full, trap 3), metadata/privacy/claim-
  boundary scans, `git diff --check`.
- Docs-accuracy pass: re-verify every spec claim against shipped code; fix drift in the doc, not the
  verifier. Commit.

---

## Definition of done

`npm test` green; `proofs/stage5i` `lake build` zero sorry; `reproduce-llm-shield-stage5i.sh` ALL
PASS (Node 26); prior reproduce scripts still pass; `check.sh` green; K7 covers every export + all
raw 316–331; byte-stability `cmp` identical; Lane C campaign `pending` (real ceremony post-tag).
Then: PR with honest scope section → CI green → rebase-merge → **reset local main to origin/main** →
tag `v2.44.0-stage-5i-vpc` → reproduce ON MAIN → closeout with re-scored scorecard → memory + Zurvan.
