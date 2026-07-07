# Stage 4V — VDP Counter-Capsule Contest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Stage 4V — Verifiable Due Process: a signed counter-capsule that
contests a sealed 4T Incident Capsule under the same recomputation discipline,
producing a deterministic five-status conflict map inside a contest outcome
envelope (spec: `docs/superpowers/specs/2026-07-07-stage-4v-vdp-counter-capsule-contest-design.md`).

**Architecture:** New read-only layer `tools/simurgh-attestation/stage4v/`
consuming stage4t artifacts. Counter-capsule (respondent Ed25519) binds to the
exact capsule via a five-field tuple; respondent census reuses the 4T census
verifier with remapped codes (Same Rules made literal); the conflict map is
derived-never-filed; the outcome envelope seals the forced 4T re-verification
(subpoena). Raw codes 151–161.

**Tech Stack:** Node 26 ESM (.mjs), node:crypto Ed25519, node:test; Python 3
stdlib parity; Lean 4.15.0 (no mathlib); static browser verifier (CSP
`default-src 'none'`, node:vm parity gate).

## Global Constraints

- Node 26 required for byte-stable evidence (`/opt/homebrew/opt/node@26/bin` on this Mac).
- Zero new npm/pip dependencies. ESM `.mjs`; SPDX header + motto line on every new source file: `// SPDX-License-Identifier: AGPL-3.0-or-later` + `Motto: AnthropicSafe First, then ReviewerSafe.`
- Raw codes **151–161 only**, headroom to 170 reserved; `UNKNOWN_RAW_PROBE = 999` in any probe near the registry tail (standing 4S hygiene rule).
- **Read-only kernel:** zero diff under `src/llmShield/`; no `authorise_*` entry; 4A–4U artifacts byte-frozen.
- **Registry authority rail:** stage4v defines ZERO recompute functions; it imports `RECOMPUTE_REGISTRY` / `KIND_EVIDENCE_SOURCE` from `../stage4t/core/projectionCore.mjs`.
- Unit tests: never a bare directory to `node --test` (4K gotcha) — explicit `*.test.js` globs. Never shell out to `rg` in tests (Linux CI lacks it).
- Fixture keys: `tests/fixtures/llmShield/stage4v/test-keys/INSECURE_FIXTURE_ONLY_{vdp,vdp-respondent}.pem` (+ `.pub.pem`); names contain no digits (3M/3O audit allowlist pattern).
- `docs/research/llm-shield/evidence/stage-4v/` fully prettier-ignored in the SAME commit that creates it (4N lesson). Specs/plans/closeouts ARE prettier-gated: `npx prettier --write` before every docs commit.
- Neutral commit messages, no attribution trailers (standing rule). Run `bash scripts/check.sh` locally before any push (4U lesson).
- Version: verify `git tag --sort=-creatordate | head -3` shows `v2.30.0-stage-4t-vic` before using target tag `v2.31.0-stage-4v-vdp` (4J gotcha).
- Public wording rail: closeout/README use "provider-safe first, then reviewer-safe"; scorecard axis 3 is "Lab/regulator usefulness".

**Verified repo facts (checked 2026-07-07 before planning — do not re-litigate):** the quality gate is `scripts/check.sh` (no root `check.sh`); `sha256Hex`, `recordDigest`, `canonicalJson`, `merkleRootSorted` are all exported from `tools/simurgh-attestation/stage4m/core/canonical.mjs`; `KIND_EVIDENCE_SOURCE` and `RECOMPUTE_REGISTRY` are exported from `tools/simurgh-attestation/stage4t/core/projectionCore.mjs`; 4T projected sections DO carry a `class` field; the 4T inner signature lives at `bundle.content.signature` (4T's own 134 fixture mutates exactly that); `RECOMPUTE_REGISTRY` keys are `stage4s_chain_verdict, kernel_block_record, epoch_range, participant_count, consent_manifest_scope, stage4u_asr, stage4n_beat_index`; the green 4T capsule has `art73_high_risk_draft/users_affected = 2`, `remedial_actions = 2`, `gpai_art55/evidence_available` class `not_derivable`, capsule-level anchor `beat_index = 42`.

---

### Task 0: Repo-shape preflight (no code, gate only)

**Files:** none created — this task is a set of assertions that must pass before Task 1.

- [ ] **Step 1: Confirm paths and exports**

```bash
test -f scripts/check.sh || echo "MISSING scripts/check.sh"
test -f tools/simurgh-attestation/stage4t/node/greenCapsule.mjs || echo "MISSING greenCapsule"
test -f tools/simurgh-attestation/stage4t/core/projectionCore.mjs || echo "MISSING projectionCore"
node -e 'import("./tools/simurgh-attestation/stage4t/core/projectionCore.mjs").then(m=>{const need=["stage4s_chain_verdict","kernel_block_record","epoch_range","participant_count","consent_manifest_scope","stage4n_beat_index"];const have=Object.keys(m.RECOMPUTE_REGISTRY);const miss=need.filter(k=>!have.includes(k));if(miss.length){console.error("MISSING registry keys",miss);process.exit(1);}if(!m.KIND_EVIDENCE_SOURCE)throw new Error("no KIND_EVIDENCE_SOURCE");console.log("registry ok");})'
node -e 'import("./tools/simurgh-attestation/stage4m/core/canonical.mjs").then(m=>{for(const k of ["sha256Hex","recordDigest","canonicalJson","merkleRootSorted"])if(typeof m[k]!=="function")throw new Error("missing "+k);console.log("canonical ok");})'
node -e 'import("./tools/simurgh-attestation/stage4t/node/greenCapsule.mjs").then(m=>{const b=m.buildGreenBundle().bundle;console.log(JSON.stringify({root:b.content.capsule_root,att:b.attestation_digest,hasClass:"class" in b.content.projected_sections[0],anchor:b.content.evidence_anchored_at_beat.value}));})'
```

Expected: no `MISSING` lines; `registry ok`; `canonical ok`; a JSON line with `hasClass: true` and `anchor: 42`. If any fails, STOP — a prior stage moved; reconcile before writing 4V code.

- [ ] **Step 2:** no commit (gate only). Proceed to Task 1.

---

### Task 1: Raw codes 151–161 + golden ripple

**Files:**

- Modify: `tools/simurgh-attestation/stage4h/exitCodes.mjs` (after the `VIC_REASONS_134` block, ~line 493; and the `RUN_LEVEL_BY_RAW` literal tail)
- Test: `tests/unit/llmShield/stage4v/exitCodes.test.js` (create)
- Modify (ripple, enumerated in Step 5): both `exit-map.json` copies, the 4H exitWrapper inline map, `exitWrapper.test.js` RUN_LEVEL_BY_RAW literal, `exitCodeProbeHygiene.test.js` range, 4K/4H pack digests, 4L/4T e2e goldens.

**Interfaces:**

- Produces: `VDP_RAW_CODES` (frozen object, names below), `VDP_CHECK_ORDER` (frozen `[151..161]`), `VDP_REASONS_151`, `VDP_REASONS_152`; `RUN_LEVEL_BY_RAW[151..161] === 1`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage4v/exitCodes.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VDP_RAW_CODES,
  VDP_CHECK_ORDER,
  VDP_REASONS_151,
  VDP_REASONS_152,
  RUN_LEVEL_BY_RAW,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VDP raw codes are 151-161, frozen, level 1", () => {
  assert.deepEqual(VDP_CHECK_ORDER, [151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161]);
  assert.equal(VDP_RAW_CODES.VDP_COUNTER_CAPSULE_MALFORMED, 151);
  assert.equal(VDP_RAW_CODES.VDP_RESPONDENT_SIGNATURE_INVALID, 152);
  assert.equal(VDP_RAW_CODES.VDP_BINDING_MISMATCH, 153);
  assert.equal(VDP_RAW_CODES.VDP_CONTESTED_SECTION_SET_MISMATCH, 154);
  assert.equal(VDP_RAW_CODES.VDP_RESPONDENT_CENSUS_ITEM_MISMATCH, 155);
  assert.equal(VDP_RAW_CODES.VDP_RESPONDENT_CENSUS_OMITS_EVIDENCE, 156);
  assert.equal(VDP_RAW_CODES.VDP_RESPONDENT_CENSUS_ROOT_MISMATCH, 157);
  assert.equal(VDP_RAW_CODES.VDP_RESPONDENT_CENSUS_EPOCH_MISMATCH, 158);
  assert.equal(VDP_RAW_CODES.VDP_FORBIDDEN_RAW_PAYLOAD, 159);
  assert.equal(VDP_RAW_CODES.VDP_CONFLICT_MAP_MISMATCH, 160);
  assert.equal(VDP_RAW_CODES.INTERNAL_FAIL_CLOSED, 161);
  for (const raw of VDP_CHECK_ORDER) assert.equal(RUN_LEVEL_BY_RAW[raw], 1);
  assert.ok(Object.isFrozen(VDP_RAW_CODES) && Object.isFrozen(VDP_CHECK_ORDER));
  assert.ok(VDP_REASONS_151.includes("vdp_counter_capsule_schema_invalid"));
  assert.ok(VDP_REASONS_152.includes("respondent_signature_invalid"));
});
```

- [ ] **Step 2: Run to verify it fails** — `node --test tests/unit/llmShield/stage4v/exitCodes.test.js` → FAIL (`VDP_RAW_CODES` not exported).

- [ ] **Step 3: Implement** — append to `exitCodes.mjs` directly after `VIC_REASONS_134`:

```js
// Stage 4V VDP codes (reviewed extension of the shared ledger; 4V spec §8).
export const VDP_RAW_CODES = Object.freeze({
  VDP_COUNTER_CAPSULE_MALFORMED: 151,
  VDP_RESPONDENT_SIGNATURE_INVALID: 152,
  VDP_BINDING_MISMATCH: 153,
  VDP_CONTESTED_SECTION_SET_MISMATCH: 154,
  VDP_RESPONDENT_CENSUS_ITEM_MISMATCH: 155,
  VDP_RESPONDENT_CENSUS_OMITS_EVIDENCE: 156,
  VDP_RESPONDENT_CENSUS_ROOT_MISMATCH: 157,
  VDP_RESPONDENT_CENSUS_EPOCH_MISMATCH: 158,
  VDP_FORBIDDEN_RAW_PAYLOAD: 159,
  VDP_CONFLICT_MAP_MISMATCH: 160,
  INTERNAL_FAIL_CLOSED: 161,
});
// Frozen first-failure order (4V spec §8): pre(4T re-verify) → schema → signature →
// binding → set digest → census → payload → map compare → fail-closed.
export const VDP_CHECK_ORDER = Object.freeze([
  151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161,
]);
export const VDP_REASONS_151 = Object.freeze([
  "vdp_counter_capsule_schema_invalid",
  "contest_schema_invalid",
  "respondent_census_schema_invalid",
  "unknown_verb",
  "unknown_respondent_role",
]);
export const VDP_REASONS_152 = Object.freeze([
  "respondent_signature_invalid",
  "attestation_signature_invalid",
]);
```

and add `151: 1,` … `161: 1,` rows (with a `// Stage 4V VDP codes` comment) to the `RUN_LEVEL_BY_RAW` literal after the `150: 1,` row.

- [ ] **Step 4: Run to verify it passes** — same command → PASS.

- [ ] **Step 5: Chase the golden ripple (enumerated).** Run each and fix in the standard way (add 151–161 rows exactly as prior stages added theirs):

```bash
grep -rl '"150"' --include='exit-map*.json' . | grep -v node_modules   # both exit-map copies
grep -n '150' tools/simurgh-attestation/stage4h/*.mjs | grep -i 'inline\|map'  # exitWrapper inline map
node --test tests/unit/llmShield/stage4h/exitWrapper.test.js            # RUN_LEVEL_BY_RAW literal
node --test tests/unit/llmShield/stage4s/exitCodeProbeHygiene.test.js   # extend danger zone to 170
bash scripts/reproduce-llm-shield-stage4k.sh && bash scripts/reproduce-llm-shield-stage4h.sh  # pack digests
node --test tests/e2e/llmShield/stage4l/*.test.js tests/e2e/llmShield/stage4t/k7AllFunctions.test.js
```

Expected failures: exit-map copies missing 151–161; exitWrapper inline map + test literal missing rows; probe-hygiene range constant ends at 150 (raise to 170); 4K/4H pack digests shift after exit-map edits (re-run their build steps per their reproduce scripts); 4T k7 asserts the registry tail (update its expected tail to 161). Fix each, re-run until all green.

- [ ] **Step 6: Full local gate** — `npm test` → all green. Commit:

```bash
git add -A && git commit -m "feat(4v): VDP raw codes 151-161 + registry golden ripple"
```

---

### Task 2: stage4v constants, fixture keys, reference-capsule pin

**Files:**

- Create: `tools/simurgh-attestation/stage4v/constants.mjs`
- Create: `tests/fixtures/llmShield/stage4v/test-keys/INSECURE_FIXTURE_ONLY_vdp.pem` (+`.pub.pem`), `INSECURE_FIXTURE_ONLY_vdp-respondent.pem` (+`.pub.pem`)
- Test: `tests/unit/llmShield/stage4v/constants.test.js`

**Interfaces:**

- Consumes: `buildGreenBundle` from `../stage4t/node/greenCapsule.mjs`; `capsuleAttestationDigest` from `../stage4t/core/capsuleCore.mjs`.
- Produces: `VDP_COUNTER_CAPSULE_SCHEMA`, `VDP_CONFLICT_MAP_SCHEMA`, `VDP_OUTCOME_SCHEMA`, `VDP_ATTESTATION_SCHEMA` (strings); `VDP_VERBS`, `RESPONDENT_ROLES`, `VDP_STATUSES`, `DISPUTE_FAILED_SUBREASONS`, `ANCHOR_KEY`; `VDP_NON_CLAIMS` (8, spec §2 order), `VDP_KNOWN_LIMITATIONS` (5), `VDP_RAILS`, `VDP_RESERVED_SLOTS` (4); `STAGE4T_REFERENCE_CAPSULE` (pinned digests).

- [ ] **Step 1: Generate keys** (same recipe as stage4t keys):

```bash
mkdir -p tests/fixtures/llmShield/stage4v/test-keys && cd tests/fixtures/llmShield/stage4v/test-keys
for n in vdp vdp-respondent; do
  openssl genpkey -algorithm ed25519 -out INSECURE_FIXTURE_ONLY_$n.pem
  openssl pkey -in INSECURE_FIXTURE_ONLY_$n.pem -pubout -out INSECURE_FIXTURE_ONLY_$n.pub.pem
done
cd - && bash tools/simurgh-attestation/stage3m/audit-private-keys.sh && bash tools/simurgh-attestation/stage3o/audit-private-keys.sh
```

If either audit is RED, extend its path-regex allowlist to cover `stage4v/test-keys/INSECURE_FIXTURE_ONLY_[a-z-]+\.pem` exactly as stage4t/stage4o entries do (no digits in names).

- [ ] **Step 2: Pin the reference capsule** — print the deterministic 4T digests:

```bash
node -e 'import("./tools/simurgh-attestation/stage4t/node/greenCapsule.mjs").then(m => { const b = m.buildGreenBundle().bundle; console.log(JSON.stringify({ capsule_root: b.content.capsule_root, attestation_digest: b.attestation_digest })); })'
```

Copy both values into Step 4's `STAGE4T_REFERENCE_CAPSULE`.

- [ ] **Step 3: Write the failing test**

```js
// tests/unit/llmShield/stage4v/constants.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../../../../tools/simurgh-attestation/stage4v/constants.mjs";
import { buildGreenBundle } from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";

test("schemas, enums, signed lists frozen and complete", () => {
  assert.equal(C.VDP_COUNTER_CAPSULE_SCHEMA, "simurgh.vdp.counter_capsule.v1");
  assert.equal(C.VDP_CONFLICT_MAP_SCHEMA, "simurgh.vdp.conflict_map.v1");
  assert.equal(C.VDP_OUTCOME_SCHEMA, "simurgh.vdp.contest_outcome.v1");
  assert.deepEqual(C.VDP_VERBS, ["agree", "dispute_by_recomputation", "dispute_as_judgment"]);
  assert.deepEqual(C.RESPONDENT_ROLES, ["provider", "deployer", "third_party", "unspecified"]);
  assert.deepEqual(C.VDP_STATUSES, [
    "AGREED",
    "CONFLICT_PROVEN",
    "ABSENCE_REBUTTED",
    "DISPUTE_RECORDED",
    "DISPUTE_FAILED",
  ]);
  assert.deepEqual(C.DISPUTE_FAILED_SUBREASONS, ["recompute_failed", "section_not_contestable"]);
  assert.equal(C.ANCHOR_KEY, "meta/evidence_anchored_at_beat");
  assert.equal(C.VDP_NON_CLAIMS.length, 8);
  assert.equal(C.VDP_NON_CLAIMS[7], "not_a_claim_partition_rescore_signals_revise_the_capsule");
  assert.equal(C.VDP_KNOWN_LIMITATIONS.length, 5);
  assert.deepEqual(C.VDP_RESERVED_SLOTS, [
    "surrejoinder_round_deferred",
    "narrative_claim_contest_deferred",
    "risk_report_contest_profile_deferred",
    "fact_group_projection_deferred",
  ]);
  for (const k of ["VDP_NON_CLAIMS", "VDP_KNOWN_LIMITATIONS", "VDP_RAILS", "VDP_RESERVED_SLOTS"])
    assert.ok(Object.isFrozen(C[k]), k);
});

test("reference capsule pin matches the deterministic 4T build (immutability rail)", () => {
  const b = buildGreenBundle().bundle;
  assert.equal(C.STAGE4T_REFERENCE_CAPSULE.capsule_root, b.content.capsule_root);
  assert.equal(C.STAGE4T_REFERENCE_CAPSULE.attestation_digest, b.attestation_digest);
  assert.equal(C.STAGE4T_REFERENCE_CAPSULE.incident_anchor, "stage4s_verdict_108");
  assert.equal(C.STAGE4T_REFERENCE_CAPSULE.reference_capsule_not_synthetic, true);
});
```

- [ ] **Step 4: Implement `constants.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V VDP constants (spec §2, §3, §6). Motto: AnthropicSafe First, then ReviewerSafe.
export const VDP_COUNTER_CAPSULE_SCHEMA = "simurgh.vdp.counter_capsule.v1";
export const VDP_CONFLICT_MAP_SCHEMA = "simurgh.vdp.conflict_map.v1";
export const VDP_OUTCOME_SCHEMA = "simurgh.vdp.contest_outcome.v1";
export const VDP_ATTESTATION_SCHEMA = "simurgh.vdp.attestation.v1";

export const VDP_VERBS = Object.freeze([
  "agree",
  "dispute_by_recomputation",
  "dispute_as_judgment",
]);
export const RESPONDENT_ROLES = Object.freeze([
  "provider",
  "deployer",
  "third_party",
  "unspecified",
]);
export const VDP_STATUSES = Object.freeze([
  "AGREED",
  "CONFLICT_PROVEN",
  "ABSENCE_REBUTTED",
  "DISPUTE_RECORDED",
  "DISPUTE_FAILED",
]);
export const DISPUTE_FAILED_SUBREASONS = Object.freeze([
  "recompute_failed",
  "section_not_contestable",
]);
// Anchor contest pseudo-section (spec §4a) — flows through set digest + statuses.
export const ANCHOR_REGIME = "meta";
export const ANCHOR_SECTION = "evidence_anchored_at_beat";
export const ANCHOR_KEY = `${ANCHOR_REGIME}/${ANCHOR_SECTION}`;
// filed_at_beat is signed-body metadata, NOT part of contested_section_set_digest
// (spec §4a Option B): schema-checked, payload-checked, census-checked; a failed
// self-anchor only sets filed_at_beat_status = FAILED, never voids the contest.
export const FILED_AT_BEAT_REGIME = "meta";
export const FILED_AT_BEAT_SECTION = "filed_at_beat";

export const VDP_NON_CLAIMS = Object.freeze([
  "not_an_adjudication_of_truth_or_fault",
  "not_an_adjudication_of_legal_fault",
  "not_a_finding_the_respondent_is_right",
  "not_a_multi_round_appeals_process",
  "not_an_identity_or_authority_verification_of_the_respondent",
  "python_public_core_does_not_verify_ed25519_signatures",
  "not_a_claim_the_incident_was_prevented_by_this_stage",
  "not_a_claim_partition_rescore_signals_revise_the_capsule",
]);
export const VDP_KNOWN_LIMITATIONS = Object.freeze([
  "single_round_no_surrejoinder",
  "respondent_key_provenance_out_of_band",
  "absence_rebuttal_registry_bounded",
  "lane_a_both_parties_built_by_us",
  "judgment_disputes_recorded_never_scored",
]);
export const VDP_RAILS = Object.freeze([
  "registry_authority_no_respondent_only_recompute",
  "conflict_map_derived_never_filed",
  "prose_by_digest_only",
  "read_only_kernel",
  "provider_agnostic_public_wording",
  "reference_capsule_immutability",
  "status_locality",
  "mirror_symmetry_all_agreed",
  "node_public_verifier_authoritative_for_raw_152",
]);
export const VDP_RESERVED_SLOTS = Object.freeze([
  "surrejoinder_round_deferred",
  "narrative_claim_contest_deferred",
  "risk_report_contest_profile_deferred",
  "fact_group_projection_deferred",
]);

// Reference-capsule immutability rail (spec §7): pinned from the DETERMINISTIC
// stage4t buildGreenBundle() under Node 26. e2e rebuilds and compares.
export const STAGE4T_REFERENCE_CAPSULE = Object.freeze({
  source_stage: "4T",
  incident_anchor: "stage4s_verdict_108",
  capsule_root: "<PASTE capsule_root FROM STEP 2>",
  attestation_digest: "<PASTE attestation_digest FROM STEP 2>",
  reference_capsule_not_synthetic: true,
});
```

(Replace the two `<PASTE …>` strings with the Step-2 output before running tests — they are build inputs computed in Step 2, not deferred work.)

- [ ] **Step 5: Run tests** — `node --test tests/unit/llmShield/stage4v/constants.test.js` → PASS. Commit: `git add -A && git commit -m "feat(4v): stage4v constants, fixture keys, pinned 4T reference capsule"`

---

### Task 3: bindingCore — No Strawman tuple (153/154)

**Files:**

- Create: `tools/simurgh-attestation/stage4v/core/bindingCore.mjs`
- Test: `tests/unit/llmShield/stage4v/bindingCore.test.js`

**Interfaces:**

- Consumes: `recordDigest` from `../../stage4m/core/canonical.mjs`; `keyDigest` from `../../stage4s/core/receiptBuilder.mjs`; `VIC_CAPSULE_SCHEMA` from `../../stage4t/constants.mjs`; `ANCHOR_REGIME` / `ANCHOR_SECTION` from `../constants.mjs`.
- Produces: `contestTuples(counterCapsule) -> {regime, section_id}[]` (one per contest + the anchor pseudo-section when `anchor_contest` present; `filed_at_beat` is NOT included — spec §4a Option B, metadata not part of the set digest); `keyString(tuple) -> "regime/section_id"` (display + uncontested comparison only, safe because schema bans `/` in both fields, Task 6); `contestedSectionSetDigest(tuples) -> "sha256:..."` (digest over the tuples SORTED by a JSON-array sort key — collision-safe, order-insensitive); `buildBinding(capsuleBundle, capsulePubKeyPem, tuples) -> binding`; `verifyBinding(counterCapsule, capsuleBundle, capsulePubKeyPem) -> null | {raw:153|154, reason, detail}`.

**Note (spec §6, P1 #6):** the previous slash-joined string key was collision-prone (`{a/b, c}` vs `{a, b/c}` both render `a/b/c`). The set digest is now over structured `{regime, section_id}` objects; `keyString` remains for human-readable map keys but is unambiguous because Task 6's `schemaCheck` rejects any `regime`/`section_id` containing `/`.

- [ ] **Step 1: Write the failing tests**

```js
// tests/unit/llmShield/stage4v/bindingCore.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contestTuples,
  contestedSectionSetDigest,
  buildBinding,
  verifyBinding,
} from "../../../../tools/simurgh-attestation/stage4v/core/bindingCore.mjs";
import { buildGreenBundle } from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";

const green = buildGreenBundle();
const tuples = [
  { regime: "art73_high_risk_draft", section_id: "users_affected" },
  { regime: "gpai_art55", section_id: "chain_of_events" },
];
const cc = (over = {}) => ({
  binding: buildBinding(green.bundle, green.pubKeyPem, tuples),
  contests: tuples.map((t) => ({
    ...t,
    verb: "dispute_as_judgment",
    judgment_text_digest: "sha256:" + "0".repeat(64),
  })),
  ...over,
});

test("set digest is order-insensitive and collision-safe", () => {
  assert.equal(contestedSectionSetDigest(tuples), contestedSectionSetDigest([...tuples].reverse()));
  // collision guard: {a/b, c} and {a, b/c} must NOT collide (structured, not slash-joined)
  const A = [{ regime: "a/b", section_id: "c" }];
  const B = [{ regime: "a", section_id: "b/c" }];
  assert.notEqual(contestedSectionSetDigest(A), contestedSectionSetDigest(B));
});
test("faithful binding verifies", () => {
  assert.equal(verifyBinding(cc(), green.bundle, green.pubKeyPem), null);
});
test("any tuple field mismatch -> 153", () => {
  const bad = cc();
  bad.binding = { ...bad.binding, capsule_root: "sha256:" + "0".repeat(64) };
  assert.equal(verifyBinding(bad, green.bundle, green.pubKeyPem).raw, 153);
});
test("set digest vs contests mismatch -> 154; duplicate section -> 154", () => {
  const drop = cc();
  drop.contests = drop.contests.slice(0, 1); // digest no longer matches
  assert.equal(verifyBinding(drop, green.bundle, green.pubKeyPem).raw, 154);
  const dup = cc();
  dup.contests = [...dup.contests, dup.contests[0]];
  dup.binding = buildBinding(green.bundle, green.pubKeyPem, contestTuples(dup));
  assert.equal(verifyBinding(dup, green.bundle, green.pubKeyPem).raw, 154);
});
```

- [ ] **Step 2: Run to verify FAIL** — `node --test tests/unit/llmShield/stage4v/bindingCore.test.js`

- [ ] **Step 3: Implement**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V No Strawman binding (spec §5). Motto: AnthropicSafe First, then ReviewerSafe.
//   153 vdp_binding_mismatch                 any of the five tuple fields
//   154 vdp_contested_section_set_mismatch   set digest != contests[] OR duplicate section
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { VIC_CAPSULE_SCHEMA } from "../../stage4t/constants.mjs";
import { ANCHOR_REGIME, ANCHOR_SECTION } from "../constants.mjs";

// Structured contest tuples — filed_at_beat is metadata, NOT in the set (spec §4a Option B).
export const contestTuples = (cc) => [
  ...(cc.contests ?? []).map((c) => ({ regime: c.regime, section_id: c.section_id })),
  ...(cc.anchor_contest ? [{ regime: ANCHOR_REGIME, section_id: ANCHOR_SECTION }] : []),
];

export const keyString = (t) => `${t.regime}/${t.section_id}`;

// Collision-safe: sort by JSON-array key, digest over structured objects.
const sortKey = (t) => JSON.stringify([t.regime, t.section_id]);
export const contestedSectionSetDigest = (tuples) =>
  recordDigest(
    [...tuples].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0))
  );

export function buildBinding(capsuleBundle, capsulePubKeyPem, tuples) {
  return {
    capsule_root: capsuleBundle.content.capsule_root,
    attestation_digest: capsuleBundle.attestation_digest,
    capsule_schema_version: VIC_CAPSULE_SCHEMA,
    capsule_signing_key_fingerprint: keyDigest(capsulePubKeyPem),
    contested_section_set_digest: contestedSectionSetDigest(tuples),
  };
}

export function verifyBinding(cc, capsuleBundle, capsulePubKeyPem) {
  const tuples = contestTuples(cc);
  const expected = buildBinding(capsuleBundle, capsulePubKeyPem, tuples);
  const b = cc.binding ?? {};
  for (const field of [
    "capsule_root",
    "attestation_digest",
    "capsule_schema_version",
    "capsule_signing_key_fingerprint",
  ])
    if (b[field] !== expected[field])
      return { raw: 153, reason: "vdp_binding_mismatch", detail: { field } };
  const seen = new Set(tuples.map(keyString));
  if (seen.size !== tuples.length)
    return { raw: 154, reason: "vdp_contested_section_set_mismatch", detail: { duplicate: true } };
  if (b.contested_section_set_digest !== expected.contested_section_set_digest)
    return { raw: 154, reason: "vdp_contested_section_set_mismatch", detail: {} };
  return null;
}
```

Add `ANCHOR_REGIME = "meta"` and `ANCHOR_SECTION = "evidence_anchored_at_beat"` to `constants.mjs` (Task 2), keeping the existing `ANCHOR_KEY = "meta/evidence_anchored_at_beat"` for display. Downstream `contestKeys` references in later tasks become `contestTuples(...).map(keyString)`.

- [ ] **Step 4: Run to verify PASS**, then commit: `git add -A && git commit -m "feat(4v): No Strawman binding tuple + contested-section-set digest (153/154)"`

---

### Task 4: contestCensus — Same Rules via remapped 4T verifier (155–158)

**Files:**

- Create: `tools/simurgh-attestation/stage4v/core/contestCensus.mjs`
- Test: `tests/unit/llmShield/stage4v/contestCensus.test.js`

**Interfaces:**

- Consumes: `buildEvidenceManifest`, `verifyCensus` from `../../stage4t/core/censusCore.mjs`; `recordDigest`; `contestTuples` is NOT needed here — the caller (Task 6) passes the referenced-digest set.
- Produces: `buildRespondentCensus({epoch, items})` (re-export of `buildEvidenceManifest`); `respondentArtifactsIndex(cc) -> {digest: artifact}`; `referencedDigests(cc) -> Set<string>` (collects `evidence_digest` from every contest + `anchor_contest` + `filed_at_beat`); `verifyRespondentCensus(cc, capsuleEpoch) -> null | {raw:155..158}`.

**P0 #3 — the census must reject referenced-but-uncensused evidence.** Raw 156 (`VDP_RESPONDENT_CENSUS_OMITS_EVIDENCE`) fires not only for a smuggled artifact (139 remap) but ALSO when a contest cites an `evidence_digest` absent from `respondent_census.items` — citing evidence outside your own sealed census is a Same-Rules violation that must fail before any conflict map, not silently degrade to `DISPUTE_FAILED{recompute_failed}`. This covers contest, anchor, AND filed_at_beat references (spec §4a Option B keeps filed_at_beat out of the binding, but its evidence is still census-bound).

- [ ] **Step 1: Failing tests** — build a tiny census of one artifact `{ kind: "stage4s_chain_bundle", epoch: E, participants: ["x"] }`, assert green passes; then: item digest mismatch → 155; extra unlisted artifact → 156; **contest references a digest not in the census → 156**; corrupted `census_root` → 157; item epoch ≠ capsule epoch → 158.

```js
// tests/unit/llmShield/stage4v/contestCensus.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  buildRespondentCensus,
  respondentArtifactsIndex,
  verifyRespondentCensus,
} from "../../../../tools/simurgh-attestation/stage4v/core/contestCensus.mjs";

const E = "vic-incident-epoch-0001";
const art = { kind: "stage4s_chain_bundle", epoch: E, participants: ["x"] };
const mk = () => ({
  respondent_census: buildRespondentCensus({
    epoch: E,
    items: [{ kind: art.kind, digest: recordDigest(art), epoch: E }],
  }),
  respondent_evidence_artifacts: [art],
});

test("green respondent census passes", () => {
  assert.equal(verifyRespondentCensus(mk(), E), null);
});
test("codes remap 138/139/140/145 -> 155/156/157/158", () => {
  const missing = mk();
  missing.respondent_evidence_artifacts = [];
  assert.equal(verifyRespondentCensus(missing, E).raw, 155);
  const smuggled = mk();
  smuggled.respondent_evidence_artifacts.push({
    kind: "kernel_decision_records",
    epoch: E,
    decisions: [],
  });
  assert.equal(verifyRespondentCensus(smuggled, E).raw, 156);
  const root = mk();
  root.respondent_census.census_root = "sha256:" + "0".repeat(64);
  assert.equal(verifyRespondentCensus(root, E).raw, 157);
  assert.equal(verifyRespondentCensus(mk(), "other-epoch").raw, 158);
});
test("contest references a digest not in the census -> 156 (P0 #3)", () => {
  const c = mk();
  c.contests = [
    {
      regime: "gpai_art55",
      section_id: "serious_incident_response",
      verb: "dispute_by_recomputation",
      claimed_value: 1,
      recompute_kind: "kernel_block_record",
      evidence_digest: "sha256:" + "a".repeat(64),
    }, // never sealed
  ];
  assert.equal(verifyRespondentCensus(c, E).raw, 156);
});
```

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement** — the whole file is a thin remapping caller (this IS the Same Rules rail):

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V respondent census — Same Rules for the Defence (spec §2 rail, §6).
// Motto: AnthropicSafe First, then ReviewerSafe.
// The defence is checked by the OPERATOR'S OWN census verifier (stage4t verifyCensus),
// with raw codes remapped into the VDP block. No respondent-only census logic exists.
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { buildEvidenceManifest, verifyCensus } from "../../stage4t/core/censusCore.mjs";

export const buildRespondentCensus = buildEvidenceManifest;

export const respondentArtifactsIndex = (cc) =>
  Object.fromEntries((cc.respondent_evidence_artifacts ?? []).map((a) => [recordDigest(a), a]));

// Every evidence_digest a contest / anchor / filed_at_beat relies on.
export const referencedDigests = (cc) => {
  const all = [
    ...(cc.contests ?? []),
    ...(cc.anchor_contest ? [cc.anchor_contest] : []),
    ...(cc.filed_at_beat ? [cc.filed_at_beat] : []),
  ];
  return new Set(all.map((c) => c.evidence_digest).filter((d) => typeof d === "string"));
};

const REMAP = Object.freeze({ 138: 155, 139: 156, 140: 157, 145: 158 });
const REASON = Object.freeze({
  155: "vdp_respondent_census_item_mismatch",
  156: "vdp_respondent_census_omits_evidence",
  157: "vdp_respondent_census_root_mismatch",
  158: "vdp_respondent_census_epoch_mismatch",
});

export function verifyRespondentCensus(cc, capsuleEpoch) {
  const res = verifyCensus(
    { evidence_manifest: cc.respondent_census, epoch: capsuleEpoch },
    respondentArtifactsIndex(cc)
  );
  if (res) {
    const raw = REMAP[res.raw];
    return { raw, reason: REASON[raw], detail: res.detail };
  }
  // P0 #3 — Same Rules: a contest may only cite evidence inside its OWN sealed census.
  const listed = new Set((cc.respondent_census?.items ?? []).map((i) => i.digest));
  for (const d of referencedDigests(cc))
    if (!listed.has(d))
      return {
        raw: 156,
        reason: "vdp_respondent_census_omits_evidence",
        detail: { referenced: d },
      };
  return null;
}
```

- [ ] **Step 4: PASS + commit:** `git add -A && git commit -m "feat(4v): respondent census via remapped 4T verifier (155-158, Same Rules literal)"`

---

### Task 5: conflictMap — frozen status derivation + map assembly

**Files:**

- Create: `tools/simurgh-attestation/stage4v/core/conflictMap.mjs`
- Test: `tests/unit/llmShield/stage4v/conflictMap.test.js`

**Interfaces:**

- Consumes: `RECOMPUTE_REGISTRY` AND `KIND_EVIDENCE_SOURCE` from `../../stage4t/core/projectionCore.mjs` (registry-authority rail — the ONLY recompute source, and the source-kind gate P1 #7); `PARTITIONS` from stage4t; `canonicalJson`; `contestTuples`, `keyString` (Task 3); `respondentArtifactsIndex` (Task 4); constants (Task 2). Add a test: a `stage4s_chain_verdict` contest whose `evidence_digest` points at a `kernel_decision_records` artifact → `DISPUTE_FAILED{recompute_failed}` (kind mismatch), NOT a spurious AGREED/CONFLICT.
- Produces: `deriveSectionStatus({contest, cls, operatorValue, artifacts, ctx}) -> {status, subreason?, respondent_value?}` (the frozen spec-§3 table); `deriveConflictMap(capsuleBundle, counterCapsule, ctx) -> conflictMap` with `{schema, binding, respondent_role, sections[], anchor_status?, uncontested_sections[], partition_rescore_signals[]}`.

- [ ] **Step 1: Failing tests** — the frozen table, geometry over intent (use the green 4T capsule; helper builds a one-contest counter-capsule):

```js
// tests/unit/llmShield/stage4v/conflictMap.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  deriveSectionStatus,
  deriveConflictMap,
} from "../../../../tools/simurgh-attestation/stage4v/core/conflictMap.mjs";

const E = "vic-incident-epoch-0001";
const kernel3 = {
  kind: "kernel_decision_records",
  epoch: E,
  decisions: [{ decision: "blocked" }, { decision: "blocked" }, { decision: "blocked" }],
};
const arts = { [recordDigest(kernel3)]: kernel3 };
const base = {
  regime: "gpai_art55",
  section_id: "serious_incident_response",
  recompute_kind: "kernel_block_record",
  evidence_digest: recordDigest(kernel3),
};
const ctx = { chainVerdict: (a) => a.recorded_verdict };

test("frozen status table — geometry over intent", () => {
  // dispute, evidence_backed, different value -> CONFLICT_PROVEN
  assert.deepEqual(
    deriveSectionStatus({
      contest: { ...base, verb: "dispute_by_recomputation", claimed_value: 3 },
      cls: "evidence_backed",
      operatorValue: 2,
      artifacts: arts,
      ctx,
    }),
    { status: "CONFLICT_PROVEN", respondent_value: 3 }
  );
  // dispute, evidence_backed, same value -> AGREED
  assert.equal(
    deriveSectionStatus({
      contest: { ...base, verb: "dispute_by_recomputation", claimed_value: 3 },
      cls: "evidence_backed",
      operatorValue: 3,
      artifacts: arts,
      ctx,
    }).status,
    "AGREED"
  );
  // claimed value not recomputed by own evidence -> DISPUTE_FAILED{recompute_failed}
  assert.deepEqual(
    deriveSectionStatus({
      contest: { ...base, verb: "dispute_by_recomputation", claimed_value: 5 },
      cls: "evidence_backed",
      operatorValue: 2,
      artifacts: arts,
      ctx,
    }),
    { status: "DISPUTE_FAILED", subreason: "recompute_failed" }
  );
  // agree with matching evidence -> AGREED; agree that disagrees -> recompute_failed
  assert.equal(
    deriveSectionStatus({
      contest: { ...base, verb: "agree", claimed_value: 3 },
      cls: "evidence_backed",
      operatorValue: 3,
      artifacts: arts,
      ctx,
    }).status,
    "AGREED"
  );
  assert.equal(
    deriveSectionStatus({
      contest: { ...base, verb: "agree", claimed_value: 3 },
      cls: "evidence_backed",
      operatorValue: 2,
      artifacts: arts,
      ctx,
    }).subreason,
    "recompute_failed"
  );
  // agree on absence-class -> section_not_contestable
  assert.equal(
    deriveSectionStatus({
      contest: { ...base, verb: "agree", claimed_value: 3 },
      cls: "not_derivable",
      operatorValue: undefined,
      artifacts: arts,
      ctx,
    }).subreason,
    "section_not_contestable"
  );
  // dispute on absence-class with derived value -> ABSENCE_REBUTTED
  assert.equal(
    deriveSectionStatus({
      contest: { ...base, verb: "dispute_by_recomputation", claimed_value: 3 },
      cls: "not_derivable",
      operatorValue: undefined,
      artifacts: arts,
      ctx,
    }).status,
    "ABSENCE_REBUTTED"
  );
  // judgment -> DISPUTE_RECORDED
  assert.equal(
    deriveSectionStatus({
      contest: {
        regime: "gpai_art55",
        section_id: "root_cause_analysis",
        verb: "dispute_as_judgment",
        judgment_text_digest: "sha256:" + "0".repeat(64),
      },
      cls: "requires_human_input",
      operatorValue: undefined,
      artifacts: arts,
      ctx,
    }).status,
    "DISPUTE_RECORDED"
  );
  // section outside the pinned template -> section_not_contestable
  assert.equal(
    deriveSectionStatus({
      contest: {
        regime: "gpai_art55",
        section_id: "no_such_section",
        verb: "dispute_as_judgment",
        judgment_text_digest: "sha256:" + "0".repeat(64),
      },
      cls: undefined,
      operatorValue: undefined,
      artifacts: arts,
      ctx,
    }).subreason,
    "section_not_contestable"
  );
});
```

Plus a `deriveConflictMap` test (built in Step 3's implementation order): derive over a two-contest counter-capsule against the green capsule; assert `sections.length === 2`, `uncontested_sections` lists every other template section key, `ABSENCE_REBUTTED` appends to `partition_rescore_signals`, determinism (`canonicalJson(mapA) === canonicalJson(mapB)` across two calls).

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V conflict map — five-status derivation, geometry over intent (spec §3, §4, §4a).
// Motto: AnthropicSafe First, then ReviewerSafe.
// Registry-authority rail: recompute comes ONLY from the stage4t shared registry.
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { RECOMPUTE_REGISTRY, KIND_EVIDENCE_SOURCE } from "../../stage4t/core/projectionCore.mjs";
import { PARTITIONS } from "../../stage4t/constants.mjs";
import { VDP_CONFLICT_MAP_SCHEMA, ANCHOR_KEY } from "../constants.mjs";
import { contestTuples, keyString } from "./bindingCore.mjs";
import { respondentArtifactsIndex } from "./contestCensus.mjs";

const eq = (a, b) => canonicalJson(a) === canonicalJson(b);
const ABSENCE = new Set(["not_derivable", "requires_human_input"]);

// Frozen table (spec §3): verb x class x recompute outcome -> status.
export function deriveSectionStatus({ contest, cls, operatorValue, artifacts, ctx }) {
  if (cls === undefined) return { status: "DISPUTE_FAILED", subreason: "section_not_contestable" };
  if (contest.verb === "dispute_as_judgment") return { status: "DISPUTE_RECORDED" };
  if (contest.verb === "agree" && ABSENCE.has(cls))
    return { status: "DISPUTE_FAILED", subreason: "section_not_contestable" };
  // recomputation verbs: the respondent's own evidence must recompute their claim.
  const artifact = artifacts[contest.evidence_digest];
  const fn = artifact === undefined ? undefined : RECOMPUTE_REGISTRY[contest.recompute_kind];
  // P1 #7 — executable KIND_EVIDENCE_SOURCE rail: the cited artifact's kind must be
  // the source kind the recompute kind expects (a chain verdict may not be recomputed
  // from a kernel record). A kind/artifact mismatch is a failed dispute, not a valid one.
  const expectedKind = KIND_EVIDENCE_SOURCE[contest.recompute_kind];
  const kindOk =
    artifact !== undefined && expectedKind !== undefined && artifact.kind === expectedKind;
  const recomputed = fn === undefined || !kindOk ? undefined : fn(artifact, ctx);
  if (fn === undefined || !kindOk || !eq(recomputed, contest.claimed_value))
    return { status: "DISPUTE_FAILED", subreason: "recompute_failed" };
  if (ABSENCE.has(cls))
    return { status: "ABSENCE_REBUTTED", respondent_value: contest.claimed_value };
  return eq(contest.claimed_value, operatorValue)
    ? { status: "AGREED", respondent_value: contest.claimed_value }
    : { status: "CONFLICT_PROVEN", respondent_value: contest.claimed_value };
}

export function deriveConflictMap(capsuleBundle, cc, ctx) {
  const capsule = capsuleBundle.content;
  const artifacts = respondentArtifactsIndex(cc);
  const operatorByKey = new Map((capsule.projected_sections ?? []).map((p) => [keyString(p), p]));
  const sections = (cc.contests ?? []).map((contest) => {
    const key = keyString(contest);
    const cls = PARTITIONS[contest.regime]?.[contest.section_id];
    const op = operatorByKey.get(key);
    const derived = deriveSectionStatus({
      contest,
      cls,
      operatorValue: op?.value,
      artifacts,
      ctx,
    });
    return {
      key,
      verb: contest.verb,
      operator_class: cls ?? null,
      ...(op?.value !== undefined ? { operator_value: op.value } : {}),
      ...derived,
    };
  });

  // Anchor contest (spec §4a): evidence_backed semantics against the capsule anchor.
  let anchor_status;
  if (cc.anchor_contest) {
    anchor_status = deriveSectionStatus({
      contest: cc.anchor_contest,
      cls: "evidence_backed",
      operatorValue: capsule.evidence_anchored_at_beat?.value,
      artifacts,
      ctx,
    });
  }

  const contested = new Set(contestTuples(cc).map(keyString));
  const uncontested_sections = Object.keys(PARTITIONS)
    .flatMap((r) => Object.keys(PARTITIONS[r]).map((s) => `${r}/${s}`))
    .filter((k) => !contested.has(k))
    .sort();

  const partition_rescore_signals = sections
    .filter((s) => s.status === "ABSENCE_REBUTTED")
    .map((s) => ({ key: s.key, note: "review_signal_not_automatic_rewrite" }));

  return {
    schema: VDP_CONFLICT_MAP_SCHEMA,
    binding: cc.binding,
    respondent_role: cc.respondent_role,
    sections,
    ...(anchor_status ? { anchor_status: { key: ANCHOR_KEY, ...anchor_status } } : {}),
    uncontested_sections,
    partition_rescore_signals,
  };
}
```

- [ ] **Step 4: PASS + commit:** `git add -A && git commit -m "feat(4v): conflict map — frozen status table, anchor status, rescore signals, uncontested ledger"`

---

### Task 6: counterCapsuleCore — build/sign/evaluate + outcome envelope (151/152/159/160/161)

**Files:**

- Create: `tools/simurgh-attestation/stage4v/core/counterCapsuleCore.mjs`
- Test: `tests/unit/llmShield/stage4v/counterCapsuleCore.test.js`

**Interfaces:**

- Consumes: Tasks 2–5 exports; `evaluateCapsuleSafe` from stage4t capsuleCore; `keyDigest`; `canonicalJson, recordDigest`; node:crypto.
- Produces:
  - `buildCounterCapsule({capsuleBundle, capsulePubKeyPem, contests, respondentRole, respondentCensus, respondentArtifacts, anchorContest?, filedAtBeat?, privKeyPem, pubKeyPem}) -> counterCapsule` (signed; `respondent_key_digest` inside body)
  - `resignCounterCapsule(cc, privKeyPem) -> cc`
  - `evaluateContest(capsuleBundle, cc, opts) -> {raw, envelope}` where `opts = {capsulePubKeyPem, respondentPubKeyPem, stageVerifiers?, capsuleEvalOpts?, expectedConflictMap?, publicTier?}`; envelope `= {schema: VDP_OUTCOME_SCHEMA, capsule_reverify_result, result, filed_at_beat_status}`; `result` = conflict map when scoreable, `{refused: true, raw}` otherwise; when the 4T pre-verify fails, `raw` = the CAPSULE's 4T code (subpoena).
  - `evaluateContestSafe(...) -> {raw:161}` on throw.
  - `evaluateContestPublic(capsuleBundle, cc, opts)` — public tier: skips 152 and uses recorded-verdict ctx; parity/browser target.

- [ ] **Step 1: Failing tests** (representative — the full tamper matrix arrives in Task 8):

```js
// tests/unit/llmShield/stage4v/counterCapsuleCore.test.js — core happy path + order
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildGreenBundle,
  STAGE_VERIFIERS,
} from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";
import {
  buildCounterCapsule,
  resignCounterCapsule,
  evaluateContestSafe,
} from "../../../../tools/simurgh-attestation/stage4v/core/counterCapsuleCore.mjs";
import { buildRespondentCensus } from "../../../../tools/simurgh-attestation/stage4v/core/contestCensus.mjs";
```

Test with a minimal two-contest counter-capsule assembled inline via
`buildCounterCapsule` (Task 7's richer builder is NOT a dependency here)
(one judgment contest + one dispute over `serious_incident_response` with a
respondent kernel artifact), asserting: green → `raw 0` + envelope with
`capsule_reverify_result === 0`, map present, `filed_at_beat_status ===
"not_supplied"`; broken respondent signature → 152; `respondent_role:
"martian"` → 151; **an unknown structural top-level key** (`cc.smuggled = 1`)
→ 151; **a top-level raw-content key** (`cc.transcript = "…"`) → **159**, not
151 (prose smuggling is a forbidden payload, not a malformed field); **an
unknown contest key** (`contest.provider_notes` — a raw-content key) → 159,
and a genuinely-unknown structural contest key (`contest.foo = 1`) → 151;
contest carrying raw `judgment_text` → 159;
a `dispute_by_recomputation` contest **missing `claimed_value`** → 151;
`filed_at_beat` carrying `raw_prose` → 159; `expectedConflictMap` with one
mutated status → 160; capsule with tampered inner signature → `raw 134` and
`result.refused === true` (subpoena).

Note: every 159 case must have the raw key **in the signed body** (build or
`resignCounterCapsule` WITH the key), because 152 (signature) precedes 159 in
the frozen order — a raw key bolted on after signing would fire 152 first.

**161 fail-closed (P1 #14 — do NOT test via a throwing `stageVerifiers`):** a
poisoned stage verifier throws inside 4T's `evaluateCapsuleSafe` (pre-verify),
which catches it and returns raw 150 — 4V would then refuse with
`capsule_reverify_result: 150`, never reaching 161. Instead trigger a throw
AFTER pre-verify, inside 4V's own path: give the counter-capsule a
non-JSON-serializable respondent artifact so `respondentArtifactsIndex` →
`recordDigest` → `canonicalJson` throws inside `evaluateContest` (pre-verify
never touches respondent artifacts, so it passes first):

```js
test("161 fail-closed on an internal throw after pre-verify", () => {
  const g = buildGreenContest(); // Task 7; or the inline builder for this task
  const poisoned = JSON.parse(JSON.stringify(g.counterCapsule));
  poisoned.respondent_evidence_artifacts.push({ kind: "x", bad: 10n }); // BigInt → JSON throws
  const { raw } = evaluateContestSafe(g.capsuleBundle, poisoned, {
    capsulePubKeyPem: g.capsulePubKeyPem,
    respondentPubKeyPem: g.respondentPubKeyPem,
    stageVerifiers: STAGE_VERIFIERS,
  });
  assert.equal(raw, 161);
});
```

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V counter-capsule core + contest outcome envelope (spec §3, §6, §8).
// Motto: AnthropicSafe First, then ReviewerSafe.
// Frozen order: pre(4T re-verify) -> 151 -> 152 -> 153 -> 154 -> 155..158 -> 159 -> map -> 160.
import crypto from "node:crypto";
import { canonicalJson, recordDigest } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { evaluateCapsuleSafe } from "../../stage4t/core/capsuleCore.mjs";
import {
  VDP_COUNTER_CAPSULE_SCHEMA,
  VDP_OUTCOME_SCHEMA,
  VDP_VERBS,
  RESPONDENT_ROLES,
  VDP_NON_CLAIMS,
} from "../constants.mjs";
import { verifyBinding, buildBinding, contestTuples } from "./bindingCore.mjs";
import { verifyRespondentCensus, respondentArtifactsIndex } from "./contestCensus.mjs";
import { deriveConflictMap, deriveSectionStatus } from "./conflictMap.mjs";

const eqArray = (a, b) =>
  Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;

// P0 #2 — strict allowlists close prose/field smuggling. Unknown STRUCTURAL keys
// are 151; known raw/content keys (judgment_text and friends) are 159 (payloadCheck).
const TOP_LEVEL_KEYS = new Set([
  "schema",
  "respondent_role",
  "binding",
  "contests",
  "anchor_contest",
  "filed_at_beat",
  "respondent_census",
  "respondent_evidence_artifacts",
  "non_claims",
  "respondent_key_digest",
  "signature",
]);
const RECOMPUTE_CONTEST_KEYS = new Set([
  "regime",
  "section_id",
  "verb",
  "claimed_value",
  "recompute_kind",
  "evidence_digest",
]);
const JUDGMENT_CONTEST_KEYS = new Set(["regime", "section_id", "verb", "judgment_text_digest"]);
const RAW_CONTENT_KEYS = new Set([
  "judgment_text",
  "raw_prose",
  "provider_notes",
  "operator_summary",
  "prompt",
  "transcript",
  "note",
  "text",
  "body",
]);

export const unsignedCounterCapsule = (cc) => {
  const { signature, ...body } = cc;
  return body;
};

export function buildCounterCapsule({
  capsuleBundle,
  capsulePubKeyPem,
  contests,
  respondentRole = "unspecified",
  respondentCensus,
  respondentArtifacts,
  anchorContest,
  filedAtBeat,
  privKeyPem,
  pubKeyPem,
}) {
  const cc = {
    schema: VDP_COUNTER_CAPSULE_SCHEMA,
    respondent_role: respondentRole,
    contests,
    ...(anchorContest ? { anchor_contest: anchorContest } : {}),
    ...(filedAtBeat ? { filed_at_beat: filedAtBeat } : {}),
    respondent_census: respondentCensus,
    respondent_evidence_artifacts: respondentArtifacts,
    non_claims: [...VDP_NON_CLAIMS],
    respondent_key_digest: keyDigest(pubKeyPem),
  };
  cc.binding = buildBinding(capsuleBundle, capsulePubKeyPem, contestTuples(cc));
  const priv = crypto.createPrivateKey(privKeyPem);
  cc.signature = crypto
    .sign(null, Buffer.from(canonicalJson(unsignedCounterCapsule(cc))), priv)
    .toString("hex");
  return cc;
}

export function resignCounterCapsule(cc, privKeyPem) {
  const priv = crypto.createPrivateKey(privKeyPem);
  cc.signature = crypto
    .sign(null, Buffer.from(canonicalJson(unsignedCounterCapsule(cc))), priv)
    .toString("hex");
  return cc;
}

// A single contest's STRUCTURAL shape (151 only). Raw-content keys are NOT flagged
// here — they are deferred to payloadCheck (159) so the frozen check order holds
// (159 fires after census, never before binding). Unknown NON-content keys are 151.
function contestShapeError(c) {
  if (typeof c !== "object" || c === null)
    return { raw: 151, reason: "contest_schema_invalid", detail: { part: "contest" } };
  if (!VDP_VERBS.includes(c.verb))
    return { raw: 151, reason: "unknown_verb", detail: { verb: c.verb } };
  if (
    typeof c.regime !== "string" ||
    typeof c.section_id !== "string" ||
    c.regime.length === 0 ||
    c.section_id.length === 0 ||
    c.regime.includes("/") ||
    c.section_id.includes("/")
  )
    return { raw: 151, reason: "contest_schema_invalid", detail: { part: "target" } };
  const allowed = c.verb === "dispute_as_judgment" ? JUDGMENT_CONTEST_KEYS : RECOMPUTE_CONTEST_KEYS;
  for (const k of Object.keys(c)) {
    if (RAW_CONTENT_KEYS.has(k)) continue; // 159 territory — payloadCheck owns it
    if (!allowed.has(k))
      return { raw: 151, reason: "contest_schema_invalid", detail: { unknown_key: k } };
  }
  if (c.verb !== "dispute_as_judgment") {
    if (
      c.claimed_value === undefined ||
      typeof c.recompute_kind !== "string" ||
      !DIGEST_RE.test(c.evidence_digest ?? "")
    )
      return { raw: 151, reason: "contest_schema_invalid", detail: { part: "recompute_fields" } };
  }
  return null;
}

function schemaCheck(cc) {
  if (!cc || typeof cc !== "object" || cc.schema !== VDP_COUNTER_CAPSULE_SCHEMA)
    return { raw: 151, reason: "vdp_counter_capsule_schema_invalid", detail: { part: "schema" } };
  for (const k of Object.keys(cc)) {
    if (RAW_CONTENT_KEYS.has(k)) continue; // 159 territory — payloadCheck owns top-level prose too
    if (!TOP_LEVEL_KEYS.has(k))
      return {
        raw: 151,
        reason: "vdp_counter_capsule_schema_invalid",
        detail: { unknown_top_key: k },
      };
  }
  if (!RESPONDENT_ROLES.includes(cc.respondent_role))
    return { raw: 151, reason: "unknown_respondent_role", detail: { role: cc.respondent_role } };
  if (!Array.isArray(cc.contests) || cc.contests.length === 0)
    return { raw: 151, reason: "contest_schema_invalid", detail: { part: "contests" } };
  // contests + anchor_contest + filed_at_beat all obey the same per-verb shape law.
  for (const c of [
    ...cc.contests,
    ...(cc.anchor_contest ? [cc.anchor_contest] : []),
    ...(cc.filed_at_beat ? [cc.filed_at_beat] : []),
  ]) {
    const e = contestShapeError(c);
    if (e) return e;
  }
  if (!Array.isArray(cc.respondent_census?.items))
    return { raw: 151, reason: "respondent_census_schema_invalid", detail: {} };
  if (!eqArray(cc.non_claims, VDP_NON_CLAIMS))
    return {
      raw: 151,
      reason: "vdp_counter_capsule_schema_invalid",
      detail: { part: "non_claims" },
    };
  return null;
}

function signatureCheck(cc, respondentPubKeyPem) {
  if (!respondentPubKeyPem || cc.respondent_key_digest !== keyDigest(respondentPubKeyPem))
    return { raw: 152, reason: "respondent_signature_invalid", detail: { part: "key_digest" } };
  let ok = false;
  try {
    ok = crypto.verify(
      null,
      Buffer.from(canonicalJson(unsignedCounterCapsule(cc))),
      crypto.createPublicKey(respondentPubKeyPem),
      Buffer.from(cc.signature ?? "", "hex")
    );
  } catch {
    ok = false;
  }
  return ok
    ? null
    : { raw: 152, reason: "respondent_signature_invalid", detail: { part: "signature" } };
}

// 159 — prose by digest only. Scans the TOP LEVEL + contests + anchor_contest +
// filed_at_beat (P0 #2, P1 #8). Any raw-content key anywhere is forbidden prose
// (a top-level `transcript` is smuggling, not a mere malformed field, so 159 not
// 151); judgment prose must be a well-formed digest, never inline text.
function payloadCheck(cc) {
  for (const k of Object.keys(cc))
    if (RAW_CONTENT_KEYS.has(k))
      return { raw: 159, reason: "vdp_forbidden_raw_payload", detail: { top_level_field: k } };
  const all = [
    ...cc.contests,
    ...(cc.anchor_contest ? [cc.anchor_contest] : []),
    ...(cc.filed_at_beat ? [cc.filed_at_beat] : []),
  ];
  for (const c of all) {
    for (const k of Object.keys(c))
      if (RAW_CONTENT_KEYS.has(k))
        return {
          raw: 159,
          reason: "vdp_forbidden_raw_payload",
          detail: { key: `${c.regime}/${c.section_id}`, field: k },
        };
    if (c.verb === "dispute_as_judgment" && !DIGEST_RE.test(c.judgment_text_digest ?? ""))
      return {
        raw: 159,
        reason: "vdp_forbidden_raw_payload",
        detail: { part: "judgment_text_digest" },
      };
  }
  return null;
}

const refuse = (envelopeBase, raw) => ({
  raw,
  envelope: { ...envelopeBase, result: { refused: true, raw } },
});

export function evaluateContest(capsuleBundle, cc, opts = {}) {
  const ctx = {
    chainVerdict: (a) =>
      !opts.publicTier && opts.stageVerifiers?.stage4s_chain_bundle
        ? opts.stageVerifiers.stage4s_chain_bundle(a)
        : a.recorded_verdict,
  };
  // Subpoena: the contest forces the capsule to re-prove itself, sealed either way.
  const reverify = evaluateCapsuleSafe(capsuleBundle, {
    capsulePubKeyPem: opts.capsulePubKeyPem,
    stageVerifiers: opts.publicTier ? {} : (opts.stageVerifiers ?? {}),
    ...(opts.capsuleEvalOpts ?? {}),
  });
  const envelopeBase = {
    schema: VDP_OUTCOME_SCHEMA,
    capsule_reverify_result: reverify.raw,
    filed_at_beat_status: "not_supplied",
  };
  if (reverify.raw !== 0) return refuse(envelopeBase, reverify.raw);

  for (const check of [
    () => schemaCheck(cc),
    () => (opts.publicTier ? null : signatureCheck(cc, opts.respondentPubKeyPem)),
    () => verifyBinding(cc, capsuleBundle, opts.capsulePubKeyPem),
    () => verifyRespondentCensus(cc, capsuleBundle.content.epoch),
    () => payloadCheck(cc),
  ]) {
    const r = check();
    if (r) return { raw: r.raw, envelope: { ...envelopeBase, result: { refused: true, ...r } } };
  }

  const map = deriveConflictMap(capsuleBundle, cc, ctx);
  if (
    opts.expectedConflictMap !== undefined &&
    recordDigest(opts.expectedConflictMap) !== recordDigest(map)
  )
    return {
      raw: 160,
      envelope: {
        ...envelopeBase,
        result: { refused: true, raw: 160, reason: "vdp_conflict_map_mismatch" },
      },
    };

  let filedStatus = "not_supplied";
  if (cc.filed_at_beat) {
    const s = deriveSectionStatus({
      contest: cc.filed_at_beat,
      cls: "evidence_backed",
      operatorValue: cc.filed_at_beat.claimed_value,
      artifacts: respondentArtifactsIndex(cc),
      ctx,
    });
    filedStatus = s.status === "AGREED" ? "VERIFIED" : "FAILED"; // ledgered, never voids
  }
  return { raw: 0, envelope: { ...envelopeBase, filed_at_beat_status: filedStatus, result: map } };
}

export const evaluateContestPublic = (b, cc, opts = {}) =>
  evaluateContest(b, cc, { ...opts, publicTier: true });

export function evaluateContestSafe(capsuleBundle, cc, opts = {}) {
  try {
    return evaluateContest(capsuleBundle, cc, opts);
  } catch {
    return {
      raw: 161,
      envelope: {
        schema: VDP_OUTCOME_SCHEMA,
        result: { refused: true, raw: 161, reason: "internal_fail_closed" },
      },
    };
  }
}
```

Note the frozen-order consequence: binding (153/154) runs before census, and
the 154 duplicate check lives in `verifyBinding` (Task 3). `filed_at_beat`
verifies as `claimed_value`-vs-own-evidence (AGREED geometry against itself);
FAILED never changes `raw`.

- [ ] **Step 4: Run to verify PASS** — `node --test tests/unit/llmShield/stage4v/counterCapsuleCore.test.js`

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(4v): counter-capsule core — evaluateContest, outcome envelope, subpoena pre-verify"`

---

### Task 7: greenContest — honest five-status contest + Mirror Test

**Files:**

- Create: `tools/simurgh-attestation/stage4v/node/greenContest.mjs`
- Test: `tests/unit/llmShield/stage4v/greenContest.test.js`

**Interfaces:**

- Consumes: `buildGreenBundle`, `STAGE_VERIFIERS`, `EPOCH` from stage4t greenCapsule; Task 2–6 exports; fixture keys via the same `readKey` pattern (KEYDIR `tests/fixtures/llmShield/stage4v/test-keys`).
- Produces: `buildGreenContest() -> {capsuleBundle, counterCapsule, capsulePubKeyPem, respondentPubKeyPem}` (statuses: AGREED, CONFLICT_PROVEN, ABSENCE_REBUTTED, DISPUTE_RECORDED, DISPUTE_FAILED{recompute_failed}; anchor CONFLICT_PROVEN; filed_at_beat VERIFIED; role deployer); `buildMirrorContest() -> same shape` (all six evidence_backed sections re-derived → all AGREED); `resignCounterGreen(cc)`.

- [ ] **Step 1: Failing test**

```js
// tests/unit/llmShield/stage4v/greenContest.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildGreenContest,
  buildMirrorContest,
} from "../../../../tools/simurgh-attestation/stage4v/node/greenContest.mjs";
import { evaluateContestSafe } from "../../../../tools/simurgh-attestation/stage4v/core/counterCapsuleCore.mjs";
import {
  STAGE_VERIFIERS,
  buildGreenBundle,
} from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";
import { RECOMPUTE_REGISTRY } from "../../../../tools/simurgh-attestation/stage4t/core/projectionCore.mjs";
import { PARTITIONS } from "../../../../tools/simurgh-attestation/stage4t/constants.mjs";

// P1 #12 — preflight: fail loudly if a prior stage moved the assumed values, so a
// green-contest status drift is diagnosed here, not deep inside a status assertion.
test("preflight: 4T green capsule matches the values buildGreenContest assumes", () => {
  for (const k of [
    "kernel_block_record",
    "participant_count",
    "consent_manifest_scope",
    "stage4n_beat_index",
  ])
    assert.ok(RECOMPUTE_REGISTRY[k], `registry missing ${k}`);
  const ps = buildGreenBundle().bundle.content.projected_sections;
  const val = (r, s) => ps.find((p) => p.regime === r && p.section_id === s)?.value;
  assert.equal(val("art73_high_risk_draft", "remedial_actions"), 2);
  assert.equal(val("art73_high_risk_draft", "users_affected"), 2);
  assert.equal(PARTITIONS.gpai_art55.evidence_available, "not_derivable");
  assert.equal(buildGreenBundle().bundle.content.evidence_anchored_at_beat.value, 42);
});

test("green contest: raw 0, all five statuses, anchor conflict, deployer, beat verified", () => {
  const g = buildGreenContest();
  const { raw, envelope } = evaluateContestSafe(g.capsuleBundle, g.counterCapsule, {
    capsulePubKeyPem: g.capsulePubKeyPem,
    respondentPubKeyPem: g.respondentPubKeyPem,
    stageVerifiers: STAGE_VERIFIERS,
  });
  assert.equal(raw, 0);
  assert.equal(envelope.capsule_reverify_result, 0);
  assert.equal(envelope.filed_at_beat_status, "VERIFIED");
  const statuses = envelope.result.sections.map((s) => s.status).sort();
  assert.deepEqual([...new Set(statuses)].sort(), [
    "ABSENCE_REBUTTED",
    "AGREED",
    "CONFLICT_PROVEN",
    "DISPUTE_FAILED",
    "DISPUTE_RECORDED",
  ]);
  assert.equal(envelope.result.anchor_status.status, "CONFLICT_PROVEN");
  assert.equal(envelope.result.respondent_role, "deployer");
  assert.equal(envelope.result.partition_rescore_signals.length, 1);
});

test("mirror contest: all AGREED (mirror_contest_all_agreed hard gate twin)", () => {
  const m = buildMirrorContest();
  const { raw, envelope } = evaluateContestSafe(m.capsuleBundle, m.counterCapsule, {
    capsulePubKeyPem: m.capsulePubKeyPem,
    respondentPubKeyPem: m.respondentPubKeyPem,
    stageVerifiers: STAGE_VERIFIERS,
  });
  assert.equal(raw, 0);
  assert.ok(envelope.result.sections.length >= 6);
  assert.ok(envelope.result.sections.every((s) => s.status === "AGREED"));
});
```

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement** — contest content (concrete, all against the green 4T capsule; respondent evidence lives in the respondent census under the capsule's `EPOCH`):

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V green + mirror contests (spec §7 families 1 and 4).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest, sha256Hex, canonicalJson } from "../../stage4m/core/canonical.mjs";
import { buildGreenBundle, EPOCH } from "../../stage4t/node/greenCapsule.mjs";
import { PARTITIONS } from "../../stage4t/constants.mjs";
import { buildRespondentCensus } from "../core/contestCensus.mjs";
import { buildCounterCapsule, resignCounterCapsule } from "../core/counterCapsuleCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4v/test-keys");
const readKey = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");
const readPub = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pub.pem`), "utf8");

export const resignCounterGreen = (cc) => resignCounterCapsule(cc, readKey("vdp-respondent"));

const censusOf = (arts) =>
  buildRespondentCensus({
    epoch: EPOCH,
    items: arts.map((a) => ({ kind: a.kind, digest: recordDigest(a), epoch: EPOCH })),
  });

export function buildGreenContest() {
  const green = buildGreenBundle();
  // Respondent evidence (their OWN artifacts, sealed under the same epoch):
  const chain4 = {
    kind: "stage4s_chain_bundle",
    epoch: EPOCH,
    range: "2026-07-01/2026-07-02",
    participants: ["agent-a", "agent-b", "agent-c", "agent-d"],
    recorded_verdict: 108,
  };
  const kernel2 = {
    kind: "kernel_decision_records",
    epoch: EPOCH,
    decisions: [{ decision: "blocked" }, { decision: "blocked" }],
  };
  const consent = { kind: "stage4o_consent_manifests", epoch: EPOCH, scope: ["mail.read"] };
  const anchor40 = { kind: "stage4n_temporal_anchor", epoch: EPOCH, beat_index: 40 };
  const anchor43 = { kind: "stage4n_temporal_anchor", epoch: EPOCH, beat_index: 43 };
  const arts = [chain4, kernel2, consent, anchor40, anchor43];
  const d = (a) => recordDigest(a);

  const contests = [
    // AGREED: remedial_actions (operator 2) — own kernel evidence recomputes 2.
    {
      regime: "art73_high_risk_draft",
      section_id: "remedial_actions",
      verb: "dispute_by_recomputation",
      claimed_value: 2,
      recompute_kind: "kernel_block_record",
      evidence_digest: d(kernel2),
    },
    // CONFLICT_PROVEN: users_affected (operator 2) — own chain shows 4 participants.
    {
      regime: "art73_high_risk_draft",
      section_id: "users_affected",
      verb: "dispute_by_recomputation",
      claimed_value: 4,
      recompute_kind: "participant_count",
      evidence_digest: d(chain4),
    },
    // ABSENCE_REBUTTED: gpai evidence_available is not_derivable in the partition —
    // respondent derives a value through a registered kind.
    {
      regime: "gpai_art55",
      section_id: "evidence_available",
      verb: "dispute_by_recomputation",
      claimed_value: ["mail.read"],
      recompute_kind: "consent_manifest_scope",
      evidence_digest: d(consent),
    },
    // DISPUTE_RECORDED: judgment against root_cause_analysis, prose by digest.
    {
      regime: "gpai_art55",
      section_id: "root_cause_analysis",
      verb: "dispute_as_judgment",
      judgment_text_digest: "sha256:" + sha256Hex(canonicalJson({ note: "vdp-green-judgment" })),
    },
    // DISPUTE_FAILED{recompute_failed}: claims 5 blocks; own evidence recomputes 2.
    {
      regime: "gpai_art55",
      section_id: "serious_incident_response",
      verb: "dispute_by_recomputation",
      claimed_value: 5,
      recompute_kind: "kernel_block_record",
      evidence_digest: d(kernel2),
    },
  ];

  const counterCapsule = buildCounterCapsule({
    capsuleBundle: green.bundle,
    capsulePubKeyPem: green.pubKeyPem,
    contests,
    respondentRole: "deployer",
    respondentCensus: censusOf(arts),
    respondentArtifacts: arts,
    // Anchor contest (spec §4a): operator beat 42, respondent beat 40 -> CONFLICT_PROVEN.
    anchorContest: {
      regime: "meta",
      section_id: "evidence_anchored_at_beat",
      verb: "dispute_by_recomputation",
      claimed_value: 40,
      recompute_kind: "stage4n_beat_index",
      evidence_digest: d(anchor40),
    },
    // Clock on both sides: the answer's own beat, VERIFIED.
    filedAtBeat: {
      regime: "meta",
      section_id: "filed_at_beat",
      verb: "dispute_by_recomputation",
      claimed_value: 43,
      recompute_kind: "stage4n_beat_index",
      evidence_digest: d(anchor43),
    },
    privKeyPem: readKey("vdp-respondent"),
    pubKeyPem: readPub("vdp-respondent"),
  });
  return {
    capsuleBundle: green.bundle,
    counterCapsule,
    capsulePubKeyPem: green.pubKeyPem,
    respondentPubKeyPem: readPub("vdp-respondent"),
  };
}

// Mirror Test (spec §7 family 4): re-derive every evidence_backed section of the
// capsule from ITS OWN evidence, re-sealed as respondent census -> all AGREED.
export function buildMirrorContest() {
  const green = buildGreenBundle();
  const capsule = green.bundle.content;
  const arts = capsule.evidence_artifacts.map((a) => JSON.parse(JSON.stringify(a)));
  const byDigest = Object.fromEntries(arts.map((a) => [recordDigest(a), a]));
  // P1 #11 — one partition oracle (same source of truth deriveSectionStatus uses),
  // not the capsule's own `class` field, so mirror + derivation cannot drift apart.
  const contests = capsule.projected_sections
    .filter((p) => PARTITIONS[p.regime]?.[p.section_id] === "evidence_backed")
    .map((p) => ({
      regime: p.regime,
      section_id: p.section_id,
      verb: "dispute_by_recomputation",
      claimed_value: p.value,
      recompute_kind: p.recompute_kind,
      evidence_digest: p.evidence_digest,
    }));
  // Sanity: mirror evidence digests must resolve inside the mirrored census.
  for (const c of contests) if (!byDigest[c.evidence_digest]) throw new Error("mirror gap");
  const counterCapsule = buildCounterCapsule({
    capsuleBundle: green.bundle,
    capsulePubKeyPem: green.pubKeyPem,
    contests,
    respondentRole: "unspecified",
    respondentCensus: censusOf(arts),
    respondentArtifacts: arts,
    privKeyPem: readKey("vdp-respondent"),
    pubKeyPem: readPub("vdp-respondent"),
  });
  return {
    capsuleBundle: green.bundle,
    counterCapsule,
    capsulePubKeyPem: green.pubKeyPem,
    respondentPubKeyPem: readPub("vdp-respondent"),
  };
}
```

Watch one trap: the mirror's `stage4s_chain_verdict` contest recomputes via
`ctx.chainVerdict` — the audit tier reruns the REAL 4S verifier and gets 108,
which equals the capsule's recorded value, so AGREED holds on both tiers.

- [ ] **Step 4: Run to verify PASS**, commit: `git add -A && git commit -m "feat(4v): green five-status contest + Mirror Test builder"`

---

### Task 8: Lane A corpus — tamper/status/mirror/subpoena matrices

**Files:**

- Create: `tools/simurgh-attestation/stage4v/node/build-stage4v-fixtures.mjs`
- Test: `tests/unit/llmShield/stage4v/fixtures.test.js`
- Output: `tests/fixtures/llmShield/stage4v/expected-results/laneA/corpus.json`

**Interfaces:**

- Consumes: Tasks 6–7 exports; `resignBundle` (stage4t capsuleCore) + stage4t `readKey("vic")` equivalent for the subpoena fixture.
- Produces: `buildLaneAFixtures() -> fixtures[]` with entries `{name, expected_raw, counter_capsule, capsule_override?, eval_opts?, expected_envelope_digest}`; `corpusDocument()`, `writeCorpus()`. Corpus document carries `reference_capsule_bundle` ONCE (dedup) + `cases`.

- [ ] **Step 1: Failing test**

```js
// tests/unit/llmShield/stage4v/fixtures.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  buildLaneAFixtures,
  corpusDocument,
} from "../../../../tools/simurgh-attestation/stage4v/node/build-stage4v-fixtures.mjs";
import { evaluateContestSafe } from "../../../../tools/simurgh-attestation/stage4v/core/counterCapsuleCore.mjs";
import { STAGE_VERIFIERS } from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";

test("every fixture reproduces its expected_raw and envelope digest", () => {
  const doc = corpusDocument();
  for (const c of doc.cases) {
    const capsule = c.capsule_override ?? doc.reference_capsule_bundle;
    const res = evaluateContestSafe(capsule, c.counter_capsule, {
      capsulePubKeyPem: doc.capsule_pubkey_pem,
      respondentPubKeyPem: doc.respondent_pubkey_pem,
      stageVerifiers: STAGE_VERIFIERS,
      ...(c.eval_opts ?? {}),
    });
    assert.equal(res.raw, c.expected_raw, c.name);
    assert.equal(recordDigest(res.envelope), c.expected_envelope_digest, c.name);
  }
});

test("tamper-matrix meta-assertions (spec §7): sig discipline", () => {
  const fixtures = buildLaneAFixtures();
  const tamper = fixtures.filter((f) => f.expected_raw >= 151 && f.expected_raw <= 160);
  for (const f of tamper) {
    if (f.expected_raw === 152) continue;
    assert.notEqual(f.counter_capsule.signature, undefined, f.name);
  }
  // only_152_fixture_has_invalid_signature / all_153_to_160_fixtures_are_validly_resigned
  // are asserted structurally in the k7 e2e net (Task 14) by re-verifying each signature.
});

test("status matrix + locality: DISPUTE_FAILED at X leaves other statuses byte-identical", () => {
  const doc = corpusDocument();
  const withX = doc.cases.find((c) => c.name === "locality-with-failed-section");
  const withoutX = doc.cases.find((c) => c.name === "locality-without-failed-section");
  const run = (c) =>
    evaluateContestSafe(doc.reference_capsule_bundle, c.counter_capsule, {
      capsulePubKeyPem: doc.capsule_pubkey_pem,
      respondentPubKeyPem: doc.respondent_pubkey_pem,
      stageVerifiers: STAGE_VERIFIERS,
    }).envelope.result.sections;
  const a = run(withX).filter((s) => s.key !== "gpai_art55/serious_incident_response");
  const b = run(withoutX);
  assert.deepEqual(a, b);
});
```

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement `build-stage4v-fixtures.mjs`.** Follow the 4T builder's clone/add pattern. Fixture list (each mutation on a clone of the green counter-capsule, re-signed via `resignCounterGreen` EXCEPT the 152 fixture):

| name                            | expected_raw | construction                                                                                                                                                               |
| ------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| honest-contest                  | 0            | `buildGreenContest()` as-is                                                                                                                                                |
| mirror-contest                  | 0            | `buildMirrorContest()`                                                                                                                                                     |
| subpoena-capsule-tampered       | 134          | green counter-capsule, `capsule_override` = green 4T bundle with `content.signature = "00".repeat(32)` + resealed `attestation_digest` (import `capsuleAttestationDigest`) |
| schema-malformed                | 151          | `cc.schema = "not-a-vdp"` (no resign needed — schema precedes signature)                                                                                                   |
| role-invalid                    | 151          | `cc.respondent_role = "martian"`, resign                                                                                                                                   |
| signature-invalid               | 152          | `cc.signature = "00".repeat(32)` (left broken)                                                                                                                             |
| binding-root-mismatch           | 153          | `cc.binding.capsule_root = "sha256:"+"0".repeat(64)`, resign                                                                                                               |
| set-digest-mismatch             | 154          | drop one contest, keep binding, resign                                                                                                                                     |
| duplicate-contest               | 154          | duplicate first contest, rebuild binding for doubled keys, resign                                                                                                          |
| census-item-mismatch            | 155          | corrupt first census item digest, resign                                                                                                                                   |
| census-omits-evidence           | 156          | push an extra artifact not in census, resign                                                                                                                               |
| census-root-mismatch            | 157          | corrupt `respondent_census.census_root`, resign                                                                                                                            |
| census-epoch-mismatch           | 158          | first census item epoch = "other", resign                                                                                                                                  |
| raw-payload                     | 159          | add `judgment_text: "raw prose"` to the judgment contest, resign                                                                                                           |
| conflict-map-mismatch           | 160          | `eval_opts.expectedConflictMap` = derived map with one status flipped to "AGREED"                                                                                          |
| status-agreed-only              | 0            | single AGREED contest                                                                                                                                                      |
| status-judgment-only            | 0            | single DISPUTE_RECORDED contest                                                                                                                                            |
| status-not-contestable          | 0            | single judgment contest against `gpai_art55/no_such_section` (per-section failure, contest still scoreable)                                                                |
| locality-with-failed-section    | 0            | green contests including the recompute_failed dispute                                                                                                                      |
| locality-without-failed-section | 0            | same minus the failed dispute (binding rebuilt)                                                                                                                            |

`corpusDocument()` = `{ schema: "simurgh.vdp.lane_a_corpus.v1", reference_capsule_bundle, capsule_pubkey_pem, respondent_pubkey_pem, cases }` where each case gets `expected_envelope_digest = recordDigest(evaluateContestSafe(...).envelope)` computed at build time (audit tier, `STAGE_VERIFIERS`). `writeCorpus()` writes `canonicalJson(doc) + "\n"` to the laneA path. CLI main runs `writeCorpus()`.

For 154/duplicate and locality-without: rebuild binding with `buildBinding(bundle, pubKeyPem, contestTuples(cc))` before resigning (the digest must match the new set for the OTHER checks to be reachable; the 154 fixtures deliberately leave it stale/dup respectively).

- [ ] **Step 4: Build + verify byte-stability**

```bash
node tools/simurgh-attestation/stage4v/node/build-stage4v-fixtures.mjs
node tools/simurgh-attestation/stage4v/node/build-stage4v-fixtures.mjs && git status --short tests/fixtures/llmShield/stage4v
node --test tests/unit/llmShield/stage4v/fixtures.test.js
```

Expected: second build leaves tree clean (byte-stable); tests PASS. Add `tests/fixtures/llmShield/stage4v/expected-results/` to `.prettierignore` in the same commit.

- [ ] **Step 5: Commit:** `git add -A && git commit -m "feat(4v): Lane A corpus — tamper 151-160, status matrix, mirror, subpoena, locality pair"`

---

### Task 9: Lane B — two-process respondent-blind ceremony

**Files:**

- Create: `tools/simurgh-attestation/stage4v/laneb/run-laneb-contest-ceremony.mjs`
- Create: `tools/simurgh-attestation/stage4v/laneb/respondent-child.mjs`
- Test: `tests/e2e/llmShield/stage4v/laneb.test.js`
- Output: `docs/research/llm-shield/evidence/stage-4v/laneb/capture.json` (+ `.prettierignore` entry for `docs/research/llm-shield/evidence/stage-4v/` in the same commit)

**Interfaces:**

- Consumes: `captureLaneB` from `../../stage4t/laneb/run-laneb-incident-ceremony.mjs` (operator side: live 4S MCP hop → fresh capsule, ephemeral keys); Task 6 evaluate.
- Produces: `captureContestLaneB() -> capture`, `verifyContestLaneBCapture(capture) -> {ok, ...}`; CLI `--verify` mode (reproduce uses verify-only).

- [ ] **Step 1: Write `respondent-child.mjs`** — a standalone process that reads `{capsule_bundle, capsule_pubkey_pem}` JSON on stdin, generates an ephemeral Ed25519 pair IN-CHILD, builds a counter-capsule (one `CONFLICT_PROVEN` dispute on `art73_high_risk_draft/users_affected` claiming 3 with its own chain artifact of 3 participants — kind `stage4s_chain_bundle` to satisfy the KIND_EVIDENCE_SOURCE gate — one judgment on `gpai_art55/root_cause_analysis`, `respondent_role: "deployer"`), and prints `{counter_capsule, respondent_pubkey_pem, blindness}`.

  **P0 #4 — the blindness check must be a real regex, not a literal `OPERATOR*` glob, and must scan env VALUES too.** The parent passes the forbidden substrings to the child (operator private-key path + working-state path) via the stdin payload, and the child computes:

  ```js
  const envBlob = JSON.stringify(process.env);
  const blindness = {
    // key form: OPERATOR, OPERATOR_KEY, OPERATOR_STATE_DIR all caught; "COOPERATOR" not.
    env_has_operator_key_path:
      Object.keys(process.env).some((k) => /^OPERATOR(_|$)/.test(k)) ||
      envBlob.includes(forbiddenKeyPath),
    env_has_operator_state_path: envBlob.includes(forbiddenStatePath),
    argv_has_pem: process.argv.slice(2).some((a) => a.includes(".pem")),
  };
  if (
    blindness.env_has_operator_key_path ||
    blindness.env_has_operator_state_path ||
    blindness.argv_has_pem
  )
    process.exit(1);
  ```

  The child prints `{counter_capsule, respondent_pubkey_pem, blindness}` and exits 0 only when blind.

- [ ] **Step 2: Write `run-laneb-contest-ceremony.mjs`** — parent flow:

```text
1. operatorCapture = await captureLaneB()            // real 4S 2-process MCP hop inside
   // operatorCapture also exposes an ephemeral private-key path + working-state dir the
   // parent knows; these are the forbidden substrings the child must NOT be able to see.
2. spawn node respondent-child.mjs (stdio pipe), env: minimal {PATH, TZ:"UTC"} — NO operator paths
3. write {capsule_bundle: operatorCapture.capsule, capsule_pubkey_pem, forbiddenKeyPath, forbiddenStatePath} to child stdin
   // forbidden* are passed ONLY so the child can PROVE it can't find them in its own env; the
   // sealed capture stores only the boolean blindness result, never the paths themselves.
4. envelope = evaluateContestSafe(capsule, child.counter_capsule, {capsulePubKeyPem, respondentPubKeyPem: child.respondent_pubkey_pem, stageVerifiers})
5. assert raw === 0 AND child.blindness has all-false negatives; write capture.json:
   { schema: "simurgh.vdp.laneb_capture.v1",
     transport/process_isolation: from operatorCapture,
     respondent_process: { pid_isolated: true, blindness: child.blindness },
     capsule: operatorCapture.capsule, capsule_pubkey_pem,
     counter_capsule, respondent_pubkey_pem,
     contest_outcome: envelope,
     component_hashes: { capsule: recordDigest(...), counter_capsule: recordDigest(...), contest_outcome: recordDigest(...) } }  // harness-computed (3V-A rule)
```

`verifyContestLaneBCapture(capture)`: recompute all three component hashes; re-run `evaluateContestSafe` and require byte-equal envelope (`recordDigest` match against `component_hashes.contest_outcome`); require `capture.respondent_process.blindness.env_has_operator_key_path === false` and `...state_path === false`; require `contest_outcome.result.respondent_role === "deployer"` echo. CLI `--verify` reads committed capture, exits 0/1.

- [ ] **Step 3: e2e test** (`tests/e2e/llmShield/stage4v/laneb.test.js`): run `verifyContestLaneBCapture` over the committed capture; assert ok, scoreable, and the two blindness negatives (spec §7: `respondent_process_cannot_read_operator_private_key`, `respondent_process_cannot_read_operator_working_state`).

- [ ] **Step 4: Capture once, verify, commit**

```bash
node tools/simurgh-attestation/stage4v/laneb/run-laneb-contest-ceremony.mjs           # capture (live)
node tools/simurgh-attestation/stage4v/laneb/run-laneb-contest-ceremony.mjs --verify  # green
node --test tests/e2e/llmShield/stage4v/laneb.test.js
git add -A && git commit -m "feat(4v): Lane B two-process respondent-blind contest ceremony + committed capture"
```

---

### Task 10: Two-tier attestation + CLI verifier

**Files:**

- Create: `tools/simurgh-attestation/stage4v/node/build-stage4v-attestation.mjs`, `tools/simurgh-attestation/stage4v/node/verify-stage4v-attestation.mjs`
- Test: `tests/unit/llmShield/stage4v/attestation.test.js`
- Output: `docs/research/llm-shield/evidence/stage-4v/attestation/vdp-attestation.json`

**Interfaces:**

- Produces: `computeAttestation()`, `signAttestation()`, `writeAttestation()`, `bundleMerkleRoot(attestation)`; `verifyAttestation(attestation, {tier, pubKeyPem}) -> {ok}|{ok:false, reason}`.
- Model both files LINE-FOR-LINE on the 4T pair already read (`build-stage4t-attestation.mjs` / `verify-stage4t-attestation.mjs`), with these substitutions: key `vdp`; schema `VDP_ATTESTATION_SCHEMA`; four content groups = `{ lane_a_fixtures: corpusDocument().cases, lane_b_capture, parity_contract, honesty_ledger }` where `parity_contract = { excluded_fixtures: ["signature-invalid", "subpoena-capsule-tampered"], lines: ["python_public_core_does_not_verify_ed25519_signatures", "node_public_verifier_is_authoritative_for_raw_152"] }` and `honesty_ledger = { non_claims: VDP_NON_CLAIMS, known_limitations: VDP_KNOWN_LIMITATIONS, rails: VDP_RAILS, reserved_slots: VDP_RESERVED_SLOTS }`; audit tier re-runs `evaluateContestSafe` per Lane A case asserting `expected_raw` AND `expected_envelope_digest` (byte-identical envelope re-derivation), **AND (P1 #9) verifies the sealed Lane B capture**: call `verifyContestLaneBCapture(attestation.content.lane_b_capture)` and require `ok === true`, then re-derive the capture's `contest_outcome` and assert its `recordDigest` equals the sealed `component_hashes.contest_outcome` — otherwise return `{ ok: false, reason: "lane_b_capture_falsified" }`. Lane B is signed as evidence, not cargo.

- [ ] **Step 1: failing test** — sign+verify public tier ok; flip one byte of `bundle_merkle_root` → `bundle_merkle_root_mismatch`; audit tier over the corpus green; corrupt one case's `expected_raw` in a cloned attestation → `lane_a_fixture_falsified`.
- [ ] **Step 2: FAIL.** **Step 3: implement per the 4T model.** **Step 4: PASS**, write evidence file, commit: `git add -A && git commit -m "feat(4v): two-tier signed attestation over Lane A + Lane B + honesty ledger"`

---

### Task 11: Python parity (public-tier core incl. conflict map)

**Files:**

- Create: `tools/simurgh-attestation/stage4v/python/vdp_parity.py`
- Test: `tests/unit/llmShield/stage4v/parity.test.js`

**Interfaces:**

- Produces: `evaluate_contest(doc_case, reference_capsule) -> (raw, envelope_or_none)`; module CLI reads the corpus JSON and prints per-case `raw` + `recordDigest`-style sha256 of the derived envelope.
- Scope: mirror `evaluateContestPublic` EXACTLY — 4T pre-verify via the existing `stage4t/python/vic_parity.py` `evaluate_capsule` (import it via `sys.path` append), then schema → binding tuple compare → set digest → census (reusing vic_parity's merkle/record_digest helpers) → payload → conflict map with the frozen status table (recompute fns copied from vic_parity's `recompute`) → envelope digest. Excludes 152 and signature fixtures (`parity_contract.excluded_fixtures`).

- [ ] **Step 1: failing test** — `parity.test.js` spawns `python3 tools/simurgh-attestation/stage4v/python/vdp_parity.py tests/fixtures/llmShield/stage4v/expected-results/laneA/corpus.json` and compares, per non-excluded case, python's `raw` to `expected_raw` and python's envelope sha256 to a Node-recomputed PUBLIC-tier envelope digest (recompute in-test with `evaluateContestPublic`; note the public-tier envelope differs from the audit-tier `expected_envelope_digest` only when `stage4s_chain_verdict` reruns — the green capsule records the true verdict, so they coincide; assert coincidence explicitly).
- [ ] **Step 2: FAIL.** **Step 3: implement** (stdlib only: json/hashlib/sys/os; `canonical_json` with `sort_keys, separators=(",",":"), ensure_ascii=False` — matching vic_parity). **Step 4: PASS + commit:** `git add -A && git commit -m "feat(4v): python public-tier parity incl. conflict-map derivation"`

---

### Task 12: Browser verifier + CLI-parity gate

**Files:**

- Create: `tools/simurgh-attestation/stage4v/browser/vdp-verifier.html`
- Test: `tests/e2e/llmShield/stage4v/browserParity.test.js`

Model on `stage4t/browser/vic-verifier.html`: single static file, CSP meta
`default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`,
a `<script id="vdp-core">` block containing a PURE re-implementation of the
public-tier decision core (sha256 + canonicalJson + merkleRootSorted inlined
from the 4T browser core; binding compare; census; status table; map + envelope),
and a small UI: **THREE textareas — capsule bundle JSON, counter-capsule JSON,
and capsule public-key PEM (P0 #5)** → "Derive outcome" → renders raw +
per-section statuses. The capsule pubkey is REQUIRED: `verifyBinding` compares
`capsule_signing_key_fingerprint` = `keyDigest(capsulePubKeyPem)`, so the core
must compute that fingerprint from the pasted PEM — never skip the fingerprint
check (a browser core that ignores it is a weaker animal in the same feathers).
The pure core therefore also inlines `keyDigest` (SPKI-DER SHA-256, matching
`stage4s/core/receiptBuilder.mjs`). Banner text: "Convenience view — the Node
CLI verifier is authoritative."

- [ ] **Step 1: e2e parity test** — read the HTML, extract the `<script id="vdp-core">` source, evaluate in `node:vm` with a stub `globalThis`, run every non-excluded Lane A case (feeding capsule bundle + counter-capsule + the `corpusDocument().capsule_pubkey_pem`), compare `{raw, envelopeDigest}` to `evaluateContestPublic` results. FAIL first (file absent), implement, PASS.
- [ ] **Step 2: Commit:** `git add -A && git commit -m "feat(4v): static browser verifier with node:vm CLI-parity gate"`

---

### Task 13: Lean — five theorems

**Files:**

- Create: `proofs/stage4v/DueProcess.lean`, `proofs/stage4v/lean-toolchain` (copy from `proofs/stage4t/lean-toolchain`), `proofs/stage4v/lakefile.toml` (mirror stage4t's)
- Modify: CI lean job only if it enumerates proof dirs (check `.github/workflows/*.yml` for `proofs/stage4t`; add stage4v the same way)

Model: small closed model. Complete file skeleton (fill proofs, zero `sorry`):

```lean
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4V symbolic due-process laws (4V spec §11). Core Lean 4 only, no mathlib.
-- SCOPE: symbolic models only — no claim about real hash/curve arithmetic.
-- Motto: AnthropicSafe First, then ReviewerSafe.
namespace Simurgh.Stage4V

inductive Cls | evidenceBacked | notDerivable | requiresHumanInput
deriving DecidableEq
inductive Verb | agree | disputeByRecomputation | disputeAsJudgment
deriving DecidableEq
inductive Status | agreed | conflictProven | absenceRebutted | disputeRecorded | disputeFailed
deriving DecidableEq

/-- One contest: the target's class, the verb, whether the respondent's own
evidence recomputes their claim, and whether the claim equals the operator's. -/
structure Contest where
  cls : Cls
  verb : Verb
  recomputes : Bool
  matchesOperator : Bool

/-- The frozen status table (spec §3), a TOTAL function — geometry over intent. -/
def statusOf (c : Contest) : Status :=
  match c.verb with
  | .disputeAsJudgment => .disputeRecorded
  | .agree => match c.cls with
    | .evidenceBacked => if c.recomputes && c.matchesOperator then .agreed else .disputeFailed
    | _ => .disputeFailed
  | .disputeByRecomputation =>
    if !c.recomputes then .disputeFailed
    else match c.cls with
      | .evidenceBacked => if c.matchesOperator then .agreed else .conflictProven
      | _ => .absenceRebutted

/-- Theorem 1 — noTrialInAbsentia: every contestable class admits a well-formed
contest (judgment is always available). -/
theorem noTrialInAbsentia (cls : Cls) :
    ∃ c : Contest, c.cls = cls ∧ statusOf c = .disputeRecorded :=
  ⟨⟨cls, .disputeAsJudgment, false, false⟩, rfl, rfl⟩

/-- Binding model: the map derivation is defined only on the exact capsule id. -/
def derive (boundTo actual : Nat) (cs : List Contest) : Option (List Status) :=
  if boundTo = actual then some (cs.map statusOf) else none

/-- Theorem 2 — noStrawman: any binding mismatch yields no conflict map. -/
theorem noStrawman (b a : Nat) (cs : List Contest) (h : b ≠ a) :
    derive b a cs = none := by simp [derive, h]

/-- Census model: ONE predicate applied to both parties. -/
def censusOk (complete rootOk epochOk : Bool) : Bool := complete && rootOk && epochOk
def operatorCensusOk := censusOk
def respondentCensusOk := censusOk

/-- Theorem 3 — sameRulesForDefence: the defence predicate IS the operator predicate. -/
theorem sameRulesForDefence : respondentCensusOk = operatorCensusOk := rfl

/-- Theorem 4 — disputeLocality: statuses are computed pointwise; changing the
contest at one position never changes the status at another. -/
theorem disputeLocality (cs : List Contest) (i j : Nat) (c' : Contest)
    (hij : i ≠ j) (hj : j < cs.length) :
    (cs.set i c').map statusOf |>.get? j = cs.map statusOf |>.get? j := by
  simp [List.get?_map, List.get?_set_ne _ _ hij.symm]

/-- Mirror contest: re-derive the operator's own value — recomputes and matches. -/
def mirror (cls : Cls) : Contest := ⟨cls, .disputeByRecomputation, true, true⟩

/-- Theorem 5 — mirrorAllAgreed: a self-contest over evidence_backed sections is AGREED. -/
theorem mirrorAllAgreed : statusOf (mirror .evidenceBacked) = .agreed := rfl

end Simurgh.Stage4V
```

- [ ] **Step 1: create files; build:** `cd proofs/stage4v && ~/.elan/bin/lake build` (or the invocation `proofs/stage4t` uses — copy its README/workflow command). Expected: zero errors, zero `sorry`. If `List.get?_set_ne` differs in this toolchain, prove `disputeLocality` by induction on `cs` instead — the statement stays fixed.
- [ ] **Step 2: extend the CI lean job** exactly as stage4t is wired (grep `.github/workflows` for `stage4t`). Remember: Lean is NOT in `scripts/check.sh` (standing rule).
- [ ] **Step 3: Commit:** `git add -A && git commit -m "feat(4v): five machine-checked due-process theorems (Lean 4.15.0, zero sorry)"`

---

### Task 14: K7 all-functions e2e net + reproduce script + scripts/check.sh wiring

**Files:**

- Create: `tests/e2e/llmShield/stage4v/k7AllFunctions.test.js`
- Create: `scripts/reproduce-llm-shield-stage4v.sh`
- Modify: `scripts/check.sh` (mirror stage4t wiring — grep `stage4t` in check.sh and replicate each hook for stage4v; grep confirms the path is `scripts/check.sh`), `.prettierignore` (verify `evidence/stage-4v` + fixtures entries exist)

The K7 net composes EVERY stage4v export (import each module, assert every
exported symbol is exercised at least once) and asserts, as named gates:

1. **Tamper matrix**: each corpus case reproduces `expected_raw` (audit tier).
2. **Meta-assertions**: loop the corpus — `only_152_fixture_has_invalid_signature` (re-verify each counter-capsule signature with the respondent pub key: exactly the `signature-invalid` case fails) and `all_153_to_160_fixtures_are_validly_resigned`.
3. **`mirror_contest_all_agreed` hard gate**: rebuild `buildMirrorContest()`, evaluate, every status AGREED.
4. **Status-locality hard gate**: the Task 8 locality pair, byte-compared.
5. **Subpoena gate**: the subpoena case's envelope has `capsule_reverify_result === 134` and `result.refused === true`.
6. **Reference-capsule immutability**: `buildGreenBundle()` digests equal `STAGE4T_REFERENCE_CAPSULE` pins.
7. **Registry-authority invariant**: read every `tools/simurgh-attestation/stage4v/**/*.mjs` source with `node:fs` (never `rg`), assert none defines a recompute function (`/RECOMPUTE_REGISTRY\s*=/` absent, `/function recompute/` absent) and `conflictMap.mjs` imports the registry from `../../stage4t/core/projectionCore.mjs`.
8. **Read-only kernel**: `git diff --name-only v2.30.0-stage-4t-vic -- src/llmShield` empty via `execFileSync("git", ...)`; no `authorise_` token in stage4v sources.
9. **Frozen 4T/4S/4U artifacts**: `git diff --exit-code v2.30.0-stage-4t-vic -- tools/simurgh-attestation/stage4t tools/simurgh-attestation/stage4s tools/simurgh-attestation/stage4u` (expected: only additions elsewhere; the stage4t/4s/4u dirs byte-identical).
10. **Wrapper**: non-serialisable respondent artifact (e.g. a BigInt field) after a successful capsule pre-verify → 161 (a poisoned stage verifier would be caught by 4T's `evaluateCapsuleSafe` → 150; the throw must land inside 4V's own path — see Task 6 §"161 fail-closed").

`reproduce-llm-shield-stage4v.sh`: copy the 4T script structure verbatim
(env pins, `run_step`, exit wrapper) with steps: node≥26 → unit suites
(explicit globs for all Task 1–11 test files) → rebuild Lane A corpus + `git
diff --exit-code` → rebuild attestation + diff → verify attestation public +
audit tiers → python parity → browser parity e2e → Lane B `--verify` → k7 net.

- [ ] **Step 1:** write the k7 test, run: `node --test tests/e2e/llmShield/stage4v/k7AllFunctions.test.js` → PASS (fix anything it catches).
- [ ] **Step 2:** write the reproduce script; run `bash scripts/reproduce-llm-shield-stage4v.sh` twice → green + tree clean both times.
- [ ] **Step 3:** wire `scripts/check.sh` (unit globs + reproduce hook exactly as stage4t); run **full** `bash scripts/check.sh` locally → green (known pre-existing flakes per memory: Stage 2.x smoke — rerun clears).
- [ ] **Step 4: Commit:** `git add -A && git commit -m "test(4v): K7 all-functions e2e net + reproduce script + quality-gate wiring"`

---

### Task 15: Docs, closeout, accuracy pass

**Files:**

- Create: `docs/research/llm-shield/STAGE_4V_THREAT_MODEL.md`, `STAGE_4V_REVIEWER_CHECKLIST.md`, `STAGE_4V_CLOSEOUT.md`
- Modify: `docs/research/llm-shield/NORTH_STAR_VDCC.md` (status update: the wedge grows a right of reply), `README.md` (stage row after 4T's)

Content requirements (write from the spec, then verify against SHIPPED code):

- Closeout: banner; laws; codes table 151–161; the five statuses + frozen table; anchor contest + filed_at_beat; Mirror Test result; subpoena property; Lane A honest finding (how many sections proved contestable-by-recomputation vs judgment-only — count from the green contest + partition: 6 evidence_backed + anchor recomputable, absence-class reachable only via registered kinds); Lane B capture summary (live verdict, blindness assertions); four reserved slots restated; 4W socket pointed at; **re-scored** four-axis table with axis 3 = "Lab/regulator usefulness"; provider-agnostic gloss in the public wording; non-claims/limitations verbatim.
- Docs-accuracy pass (mandatory): for EVERY quantitative claim in the closeout (counts, codes, statuses, verdicts), locate the shipped source/test asserting it and note the file in a review pass; fix any drift in the doc, never in the evidence.
- Prettier: `npx prettier --write docs/research/llm-shield/STAGE_4V_*.md README.md docs/research/llm-shield/NORTH_STAR_VDCC.md docs/superpowers/plans/2026-07-07-stage-4v-vdp-counter-capsule-contest.md` then `npx prettier --check` the same list BEFORE committing (4T CI lesson: chained write+commit can race — check first).

- [ ] **Step 1:** write the three stage docs + north-star update + README row.
- [ ] **Step 2:** run the docs-accuracy pass against shipped code; fix drift.
- [ ] **Step 3:** `bash scripts/check.sh` full local run → green.
- [ ] **Step 4: Commit:** `git add -A && git commit -m "docs(4v): closeout + threat model + reviewer checklist + north-star update + README row"`
- [ ] **Step 5:** Push branch, open PR (neutral title "Stage 4V: verifiable due process — counter-capsule contest"), watch CI; after green + merge, tag `v2.31.0-stage-4v-vdp` on the merge commit (verify `git tag --sort=-creatordate` first), push tag, run `bash scripts/reproduce-llm-shield-stage4v.sh` on main, update memory files.
