# Stage 4N — Extraction Seismograph Implementation Plan

> **Motto.** AnthropicSafe First, then ReviewerSafe.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Stage 4N public extraction-telemetry heartbeat — one hash-chained record per synthetic reporting window in a single append-only JSONL feed whose root is signed by the stage manifest, where silence, reordering, equivocation, early/overdue reveals, budget-exceeding disclosure, and public linkability leaks are all machine-detectable offline at exact raw exit codes 47–54.

**Architecture:** IO-free core modules under `tools/simurgh-attestation/stage4n/core/` (validation, chain, gates — reusing 4M's `canonical.mjs` for canonical JSON / SHA-256 / Merkle roots), Node adapters under `stage4n/node/` (source-root recomputation from committed 4K/4L/4M fixtures, fixture builder, attestation signer, verifier CLI). Verdicts route through the shared `stage4CodeForRawCode` exit wrapper. Fixtures are deterministic and byte-compared by a one-command reproduce script.

**Tech Stack:** Node ≥ 26 ESM (`.mjs`), `node:test` + `node:assert/strict`, Ed25519 via `node:crypto`, Lean 4 (`leanprover/lean4:v4.15.0`, no mathlib), bash reproduce script, Prettier.

**Spec:** `docs/superpowers/specs/2026-07-04-stage-4n-extraction-seismograph-design.md` (frozen). Read §5 (data model), §6 (gates + pinned order), §7 (raw codes), §8 (falsifier matrix) before any task.

## Global Constraints

- **Raw codes 47–54 are 4N; 39 stays reserved/unmapped; 40–42 stay 4L; 43–46 stay 4M; unknown → run-level 3.** (spec §7)
- **Pinned gate order: Q10 → Q11 → Q15 → Q13 → Q14 → Q16 → Q12 → Q17.** First failure wins; every falsifier has exactly one legal answer. (spec §6)
- **Chain id:** `stage4n-extraction-seismograph-v0`. **Genesis window:** `synthetic-0000`. **Reveal delay d = 2 windows.** **Band dimensions (exactly two):** `breach_count: ["0","1-5",">5"]`, `consumer_count: ["0","1-10",">10"]` → vector space 9 → leakage bound 4 bits ≤ budget 4. (spec §5.1)
- **No signed record is ever mutated.** Reveals are separate chain records in the same feed (spec §5.0). Inclusion proofs are **bilateral only** — never committed under `docs/research/llm-shield/evidence/stage-4n/` (spec §5.4).
- **No wall clock anywhere in a verdict.** `as_of_window` is an explicit committed input. (spec §5.5)
- **CI runs `npm test` = `tests/unit` only.** E2E runs via the reproduce script. Always explicit `*.test.js` globs — `node --test <bare-dir>` fails on CI. Never shell out to `rg` in a unit test (Linux CI lacks it).
- **Byte-stable reproduce requires Node ≥ 26** (raw 28 gate in the reproduce script, same as 4M).
- **Committed deterministic fixtures go in `.prettierignore`** (`tests/fixtures/llmShield/stage4n/` and the stage-4n evidence feed), or Prettier will churn the bytes.
- **Non-claims verbatim** from spec §14 in constants, docs, and release notes. Never "model safe"; never "first transparency log".
- **Commit messages:** neutral conventional style (`feat(llm-shield): …`, `test(llm-shield): …`, `docs(llm-shield): …`). **No co-author trailers, no tool attribution, anywhere.**
- **License header** on every new source file: `// SPDX-License-Identifier: AGPL-3.0-or-later`.
- Run `npx prettier --write <files>` before every commit; run `npm test` before every commit that touches code.

## File Structure (locked)

```
tools/simurgh-attestation/stage4n/
  constants.mjs                     # schemas, domain, tiers, band policy, non-claims, limitations
  core/windowModel.mjs              # window id parse/format/successor, expected interleaved sequence
  core/genesisCore.mjs              # genesis-policy validation + leakage math
  core/recordCore.mjs               # heartbeat/reveal validation, banding, band-vector commitment
  core/chainCore.mjs                # chain build (positions/prev digests), Q10, Q11
  core/merklePath.mjs               # sorted-leaf Merkle path build + verify (matches merkleRootSorted)
  core/gatesCore.mjs                # Q12, Q13, Q14, Q16, Q17 + composed verdict (pinned order)
  node/sourceRoots.mjs              # Q15 roots recomputed from committed 4K/4L/4M fixtures
  node/build-stage4n-fixtures.mjs   # clean feed + tamper arms + expected matrix (deterministic)
  node/build-stage4n-attestation.mjs# attestation + Ed25519 domain-signed manifest
  node/verify-stage4n.mjs           # CLI verifier; writes report; exits via stage4CodeForRawCode
tests/unit/llmShield/stage4n/*.test.js
tests/e2e/llmShield/stage4n/seismographFullNet.test.js
tests/fixtures/llmShield/stage4n/   # feed/, tamper/, expected-results/seismograph-matrix.json
docs/research/llm-shield/evidence/stage-4n/  # genesis-policy.json, heartbeat-feed.jsonl,
                                    # heartbeat-manifest.json, stage4n-attestation.json, README.md
scripts/reproduce-llm-shield-stage4n.sh
proofs/stage4n/TemporalCompleteness.lean + lean-toolchain
docs/research/llm-shield/STAGE_4N_{THREAT_MODEL,VALIDATION_MATRIX,REVIEWER_CHECKLIST,CLOSEOUT,C9_ARTICLE73_PROJECTION}.md
```

---

### Task 1: Raw codes 47–54 + named golden refresh

**Files:**

- Modify: `tools/simurgh-attestation/stage4h/exitCodes.mjs` (append after the VXD block, extend `RUN_LEVEL_BY_RAW`)
- Modify: `tests/unit/llmShield/stage4k/exitWrapper.eba.test.js:36-37`
- Modify: `tests/unit/llmShield/stage4l/exitWrapper.ccb.test.js:25`
- Modify: `tests/unit/llmShield/stage4m/exitWrapper.vxd.test.js:24`
- Modify: `tests/e2e/llmShield/stage4l/fullChain.e2e.test.js:120,126`
- Modify: `tests/e2e/llmShield/stage4m/vxdFullNet.test.js:241`
- Regenerate: `docs/research/llm-shield/evidence/stage-4h/exit-map.json` + `tests/fixtures/llmShield/stage4h/expected-results/exit-map.json` (via the 4H fixture builder)
- Test: `tests/unit/llmShield/stage4n/exitWrapper.seismograph.test.js` (create)

**Interfaces:**

- Produces: `SEISMOGRAPH_RAW_CODES` (frozen object, 8 codes 47–54), `SEISMOGRAPH_REASONS_47` … `SEISMOGRAPH_REASONS_54` (frozen, sorted, closed enums), extended `RUN_LEVEL_BY_RAW` (47–54 → 1). All later tasks import these from `tools/simurgh-attestation/stage4h/exitCodes.mjs`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/llmShield/stage4n/exitWrapper.seismograph.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SEISMOGRAPH_RAW_CODES,
  SEISMOGRAPH_REASONS_47,
  SEISMOGRAPH_REASONS_48,
  SEISMOGRAPH_REASONS_49,
  SEISMOGRAPH_REASONS_50,
  SEISMOGRAPH_REASONS_51,
  SEISMOGRAPH_REASONS_52,
  SEISMOGRAPH_REASONS_53,
  SEISMOGRAPH_REASONS_54,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("seismograph raw codes are 47-54 and map to run-level 1", () => {
  assert.deepEqual(SEISMOGRAPH_RAW_CODES, {
    HEARTBEAT_MISSING: 47,
    HEARTBEAT_EQUIVOCATION: 48,
    HEARTBEAT_CHAIN_ORDER_INVALID: 49,
    HEARTBEAT_COMMITMENT_MISMATCH: 50,
    HEARTBEAT_INCLUSION_PROOF_INVALID: 51,
    HEARTBEAT_REVEAL_SCHEDULE_VIOLATION: 52,
    HEARTBEAT_REVEAL_BUDGET_EXCEEDED: 53,
    HEARTBEAT_PUBLIC_DISCLOSURE_VIOLATION: 54,
  });
  for (const code of Object.values(SEISMOGRAPH_RAW_CODES)) {
    assert.equal(stage4CodeForRawCode(code), 1);
  }
});

test("raw 39 stays reserved and unknown codes fail closed to 3", () => {
  for (const raw of [39, 55, 99, 999, -1, undefined, null, "forty-seven"]) {
    assert.equal(stage4CodeForRawCode(raw), 3);
  }
});

test("seismograph reason enums are closed, sorted, spec-exact", () => {
  assert.deepEqual(SEISMOGRAPH_REASONS_47, ["heartbeat_absent_for_expected_window"]);
  assert.deepEqual(SEISMOGRAPH_REASONS_48, ["cross_artifact_digest_mismatch"]);
  assert.deepEqual(SEISMOGRAPH_REASONS_49, [
    "duplicate_record",
    "interleave_order_violation",
    "position_discontinuity",
    "prev_digest_mismatch",
    "schema_invalid",
    "window_outside_schedule",
  ]);
  assert.deepEqual(SEISMOGRAPH_REASONS_50, [
    "private_evidence_root_mismatch",
    "reveal_commitment_mismatch",
    "source_root_mismatch",
  ]);
  assert.deepEqual(SEISMOGRAPH_REASONS_51, [
    "proof_path_invalid",
    "referenced_heartbeat_absent",
    "unknown_tier",
  ]);
  assert.deepEqual(SEISMOGRAPH_REASONS_52, ["reveal_early", "reveal_overdue"]);
  assert.deepEqual(SEISMOGRAPH_REASONS_53, [
    "band_vector_space_exceeds_budget",
    "self_leakage_recompute_mismatch",
    "undeclared_band_dimension",
  ]);
  assert.deepEqual(SEISMOGRAPH_REASONS_54, [
    "inclusion_proof_material_public",
    "raw_count_public",
    "respondent_material_public",
    "tier_label_public",
  ]);
  for (const e of [SEISMOGRAPH_REASONS_49, SEISMOGRAPH_REASONS_50, SEISMOGRAPH_REASONS_52]) {
    assert.deepEqual([...e].sort(), [...e]);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4n/exitWrapper.seismograph.test.js`
Expected: FAIL — `SyntaxError: The requested module ... does not provide an export named 'SEISMOGRAPH_RAW_CODES'`

- [ ] **Step 3: Extend `exitCodes.mjs`**

In `tools/simurgh-attestation/stage4h/exitCodes.mjs`, append after the `VXD_REASONS_46` block (before `HARNESS_CODES`):

```js
// Stage 4N Extraction Seismograph raw codes (47-54). Raw 39 stays reserved (v1
// extraction_scope_violation, prose only). Additive: each maps to run-level 1; unknown
// codes still fail closed to 3. Every 4N gate result MUST carry a `reason` from the
// closed enums below (4N spec §6-§7).
export const SEISMOGRAPH_RAW_CODES = Object.freeze({
  HEARTBEAT_MISSING: 47,
  HEARTBEAT_EQUIVOCATION: 48,
  HEARTBEAT_CHAIN_ORDER_INVALID: 49,
  HEARTBEAT_COMMITMENT_MISMATCH: 50,
  HEARTBEAT_INCLUSION_PROOF_INVALID: 51,
  HEARTBEAT_REVEAL_SCHEDULE_VIOLATION: 52,
  HEARTBEAT_REVEAL_BUDGET_EXCEEDED: 53,
  HEARTBEAT_PUBLIC_DISCLOSURE_VIOLATION: 54,
});

export const SEISMOGRAPH_REASONS_47 = Object.freeze(["heartbeat_absent_for_expected_window"]);
export const SEISMOGRAPH_REASONS_48 = Object.freeze(["cross_artifact_digest_mismatch"]);
export const SEISMOGRAPH_REASONS_49 = Object.freeze([
  "duplicate_record",
  "interleave_order_violation",
  "position_discontinuity",
  "prev_digest_mismatch",
  "schema_invalid",
  "window_outside_schedule",
]);
export const SEISMOGRAPH_REASONS_50 = Object.freeze([
  "private_evidence_root_mismatch",
  "reveal_commitment_mismatch",
  "source_root_mismatch",
]);
export const SEISMOGRAPH_REASONS_51 = Object.freeze([
  "proof_path_invalid",
  "referenced_heartbeat_absent",
  "unknown_tier",
]);
export const SEISMOGRAPH_REASONS_52 = Object.freeze(["reveal_early", "reveal_overdue"]);
export const SEISMOGRAPH_REASONS_53 = Object.freeze([
  "band_vector_space_exceeds_budget",
  "self_leakage_recompute_mismatch",
  "undeclared_band_dimension",
]);
export const SEISMOGRAPH_REASONS_54 = Object.freeze([
  "inclusion_proof_material_public",
  "raw_count_public",
  "respondent_material_public",
  "tier_label_public",
]);
```

In `RUN_LEVEL_BY_RAW`, after the `46: 1,` line add:

```js
  // Stage 4N Seismograph codes (reviewed extension of the shared ledger; 4N spec §7).
  47: 1,
  48: 1,
  49: 1,
  50: 1,
  51: 1,
  52: 1,
  53: 1,
  54: 1,
```

- [ ] **Step 4: Run the new test — passes; run full unit suite — see exactly the five expected golden breaks**

Run: `node --test tests/unit/llmShield/stage4n/exitWrapper.seismograph.test.js`
Expected: PASS (3 tests)

Run: `npm test`
Expected: FAIL in exactly three unit files (the two e2e files break later, in the reproduce path):
`tests/unit/llmShield/stage4k/exitWrapper.eba.test.js` (47 now maps to 1),
`tests/unit/llmShield/stage4l/exitWrapper.ccb.test.js` (same),
`tests/unit/llmShield/stage4m/exitWrapper.vxd.test.js` (same). Any OTHER failure is a
regression — stop and investigate before proceeding.

- [ ] **Step 5: Refresh the five golden probes (named task, not incidental)**

In `tests/unit/llmShield/stage4k/exitWrapper.eba.test.js` line 36–37, change:

```js
  // reserved/unmapped, 47+ unknown.
  for (const raw of [39, 47, 999, -1, undefined, null, "thirty"]) {
```

to:

```js
  // reserved/unmapped; 47-54 are Stage 4N (mapped); 55+ unknown.
  for (const raw of [39, 55, 999, -1, undefined, null, "thirty"]) {
```

In `tests/unit/llmShield/stage4l/exitWrapper.ccb.test.js` line 25, change `stage4CodeForRawCode(47)` to `stage4CodeForRawCode(99)`.

In `tests/unit/llmShield/stage4m/exitWrapper.vxd.test.js` line 24, change `stage4CodeForRawCode(47)` to `stage4CodeForRawCode(99)`.

In `tests/e2e/llmShield/stage4l/fullChain.e2e.test.js` line 120 change the comment to `// Stage 4N codes are now mapped (47-54 -> 1); 39 stays reserved, 99 stays unknown.` and line 126 change `[47, 3],` to `[99, 3],`.

In `tests/e2e/llmShield/stage4m/vxdFullNet.test.js` line 241, change `stage4CodeForRawCode(47)` to `stage4CodeForRawCode(99)` (keep the `// exhaustiveness: unknown -> 3` comment).

- [ ] **Step 6: Regenerate the 4H exit-map goldens**

Run: `node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs`
Then: `git status --short` and `git diff --stat`
Expected: only `docs/research/llm-shield/evidence/stage-4h/exit-map.json` and `tests/fixtures/llmShield/stage4h/expected-results/exit-map.json` changed (new keys `"47"`–`"54"`, all `1`). If ANY other file changed, revert and investigate — the builder must not churn unrelated fixtures.

- [ ] **Step 7: Full verification**

Run: `npm test`
Expected: PASS (all unit suites, including 4H closeout/reproduce tests that read exit-map.json).

Run: `node --test tests/e2e/llmShield/stage4l/fullChain.e2e.test.js tests/e2e/llmShield/stage4m/vxdFullNet.test.js`
Expected: PASS (both nets green with the refreshed probes).

- [ ] **Step 8: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4h/exitCodes.mjs tests/unit/llmShield/stage4n/exitWrapper.seismograph.test.js
git add tools/simurgh-attestation/stage4h/exitCodes.mjs tests/unit/llmShield/stage4n/ \
  tests/unit/llmShield/stage4k/exitWrapper.eba.test.js tests/unit/llmShield/stage4l/exitWrapper.ccb.test.js \
  tests/unit/llmShield/stage4m/exitWrapper.vxd.test.js tests/e2e/llmShield/stage4l/fullChain.e2e.test.js \
  tests/e2e/llmShield/stage4m/vxdFullNet.test.js docs/research/llm-shield/evidence/stage-4h/exit-map.json \
  tests/fixtures/llmShield/stage4h/expected-results/exit-map.json
git commit -m "feat(llm-shield): add stage 4n seismograph raw codes 47-54 and refresh exit-map goldens"
```

### Task 2: Constants + window model + genesis-policy core

**Files:**

- Create: `tools/simurgh-attestation/stage4n/constants.mjs`
- Create: `tools/simurgh-attestation/stage4n/core/windowModel.mjs`
- Create: `tools/simurgh-attestation/stage4n/core/genesisCore.mjs`
- Test: `tests/unit/llmShield/stage4n/windowModel.test.js`
- Test: `tests/unit/llmShield/stage4n/genesis.test.js`

**Interfaces:**

- Consumes: nothing from earlier tasks (constants are frozen literals).
- Produces:
  - `constants.mjs`: `SEISMOGRAPH_GENESIS_SCHEMA`, `SEISMOGRAPH_HEARTBEAT_SCHEMA`, `SEISMOGRAPH_REVEAL_SCHEMA`, `SEISMOGRAPH_INCLUSION_SCHEMA`, `SEISMOGRAPH_ATTESTATION_SCHEMA`, `SEISMOGRAPH_MANIFEST_SCHEMA`, `SEISMOGRAPH_MANIFEST_DOMAIN`, `SEISMOGRAPH_CHAIN_ID`, `SEISMOGRAPH_TIERS`, `BAND_DIMENSIONS`, `LEAKAGE_BITS_MAX`, `REVEAL_DELAY_WINDOWS`, `HEARTBEAT_NON_CLAIMS`, `REVEAL_NON_CLAIMS`, `SEISMOGRAPH_NON_CLAIMS`, `SEISMOGRAPH_KNOWN_LIMITATIONS`, `PUBLIC_FORBIDDEN_KEYS`
  - `windowModel.mjs`: `windowIndex(id: string): number` (throws on malformed), `windowIdOf(i: number): string`, `expectedSequence(delay: number, asOfIndex: number): Array<{record_type: "heartbeat"|"aggregate_reveal", window_id: string}>`
  - `genesisCore.mjs`: `bandVectorSpaceSize(dimensions): number`, `leakageBitsUpperBound(dimensions): number`, `validateGenesisPolicy(policy): {ok: true} | {ok: false, reason: string}`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/llmShield/stage4n/windowModel.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  expectedSequence,
  windowIdOf,
  windowIndex,
} from "../../../../tools/simurgh-attestation/stage4n/core/windowModel.mjs";

test("window ids round-trip and malformed ids throw", () => {
  assert.equal(windowIndex("synthetic-0003"), 3);
  assert.equal(windowIdOf(3), "synthetic-0003");
  assert.equal(windowIdOf(0), "synthetic-0000");
  for (const bad of ["synthetic-3", "synthetic-00030", "wall-0003", "synthetic-00a3", ""]) {
    assert.throws(() => windowIndex(bad), /window_id_malformed/);
  }
  assert.throws(() => windowIdOf(-1), /window_index_invalid/);
  assert.throws(() => windowIdOf(10000), /window_index_invalid/);
});

test("expectedSequence interleaves heartbeat(k) then reveal(k-d) — spec §5.0", () => {
  // d=2, as_of=3: hb0 hb1 hb2 rv0 hb3 rv1
  assert.deepEqual(expectedSequence(2, 3), [
    { record_type: "heartbeat", window_id: "synthetic-0000" },
    { record_type: "heartbeat", window_id: "synthetic-0001" },
    { record_type: "heartbeat", window_id: "synthetic-0002" },
    { record_type: "aggregate_reveal", window_id: "synthetic-0000" },
    { record_type: "heartbeat", window_id: "synthetic-0003" },
    { record_type: "aggregate_reveal", window_id: "synthetic-0001" },
  ]);
  // as_of=0: single heartbeat, nothing due
  assert.deepEqual(expectedSequence(2, 0), [
    { record_type: "heartbeat", window_id: "synthetic-0000" },
  ]);
});

test("expectedSequence is a pure function of (delay, asOf) — no clock", () => {
  const a = expectedSequence(2, 6);
  const b = expectedSequence(2, 6);
  assert.deepEqual(a, b);
  assert.equal(a.length, 7 + 5); // 7 heartbeats (0..6) + 5 reveals (0..4)
});
```

Create `tests/unit/llmShield/stage4n/genesis.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BAND_DIMENSIONS,
  LEAKAGE_BITS_MAX,
  SEISMOGRAPH_GENESIS_SCHEMA,
} from "../../../../tools/simurgh-attestation/stage4n/constants.mjs";
import {
  bandVectorSpaceSize,
  leakageBitsUpperBound,
  validateGenesisPolicy,
} from "../../../../tools/simurgh-attestation/stage4n/core/genesisCore.mjs";

const goodPolicy = () => ({
  schema: SEISMOGRAPH_GENESIS_SCHEMA,
  stage: "4N",
  chain_id: "stage4n-extraction-seismograph-v0",
  scope: { lane: "extraction", source_stages: ["4K", "4L", "4M"], reserved_exit_families: [] },
  publication: {
    surface: "in_repo_jsonl",
    feed_path: "docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl",
    append_only: true,
  },
  window_policy: {
    clock: "synthetic",
    cadence: "P1D",
    genesis_window: "synthetic-0000",
    max_overdue_heartbeats: 0,
  },
  reveal_policy: { aggregate_reveal_delay_windows: 2, freshest_oracle_non_claim: true },
  band_policy: {
    dimensions: BAND_DIMENSIONS,
    band_vector_space_size: 9,
    leakage_bits_per_reveal_max: LEAKAGE_BITS_MAX,
  },
  non_claims: [
    "band_not_count",
    "quiet_trace_not_safe_model",
    "reporting_liveness_not_detection_guarantee",
    "synthetic_clock_not_deployment_sla",
    "equivocation_detection_requires_two_artifacts",
    "inclusion_proofs_are_bilateral_not_public",
  ],
  crypto: { canonicalization: "RFC8785_JCS", digest: "SHA-256", signature: "Ed25519" },
});

test("leakage math is computed over the band VECTOR SPACE — spec §5.1 Fix 2", () => {
  assert.equal(bandVectorSpaceSize(BAND_DIMENSIONS), 9); // 3 × 3
  assert.equal(leakageBitsUpperBound(BAND_DIMENSIONS), 4); // ceil(log2 9)
  assert.equal(LEAKAGE_BITS_MAX, 4); // clean policy satisfies its own budget with equality
  // three 3-value dimensions would blow the v0 budget — the draft's defect, kept as a guard
  const three = { ...BAND_DIMENSIONS, cluster_count: ["0", "1-10", ">10"] };
  assert.equal(leakageBitsUpperBound(three), 5);
});

test("clean genesis policy validates; each mutation fails closed with a reason", () => {
  assert.deepEqual(validateGenesisPolicy(goodPolicy()), { ok: true });
  const cases = [
    [(p) => (p.schema = "wrong.v9"), "schema_mismatch"],
    [(p) => delete p.window_policy, "missing_field:window_policy"],
    [(p) => (p.window_policy.clock = "wall"), "clock_not_synthetic"],
    [(p) => (p.reveal_policy.aggregate_reveal_delay_windows = 0), "delay_not_positive_integer"],
    [(p) => (p.band_policy.band_vector_space_size = 27), "band_space_mismatch"],
    [(p) => (p.band_policy.leakage_bits_per_reveal_max = 3), "leakage_bound_exceeds_budget"],
    [(p) => (p.non_claims = p.non_claims.slice(1)), "non_claims_incomplete"],
    [(p) => (p.extra_top_level = 1), "unknown_field:extra_top_level"],
  ];
  for (const [mutate, reason] of cases) {
    const p = goodPolicy();
    mutate(p);
    assert.deepEqual(validateGenesisPolicy(p), { ok: false, reason }, reason);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/unit/llmShield/stage4n/windowModel.test.js tests/unit/llmShield/stage4n/genesis.test.js`
Expected: FAIL — `Cannot find module .../stage4n/core/windowModel.mjs`

- [ ] **Step 3: Implement `constants.mjs`**

Create `tools/simurgh-attestation/stage4n/constants.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4N frozen constants (spec §5). Motto: AnthropicSafe First, then ReviewerSafe.
// Changing ANY value invalidates every committed digest.
export const SEISMOGRAPH_GENESIS_SCHEMA = "simurgh.seismograph.genesis_policy.v1";
export const SEISMOGRAPH_HEARTBEAT_SCHEMA = "simurgh.seismograph.heartbeat.v1";
export const SEISMOGRAPH_REVEAL_SCHEMA = "simurgh.seismograph.aggregate_reveal.v1";
export const SEISMOGRAPH_INCLUSION_SCHEMA = "simurgh.seismograph.inclusion_proof.v1";
export const SEISMOGRAPH_ATTESTATION_SCHEMA = "simurgh.seismograph.attestation.v1";
export const SEISMOGRAPH_MANIFEST_SCHEMA = "simurgh.seismograph.manifest.v1";
export const SEISMOGRAPH_MANIFEST_DOMAIN = "SIMURGH_STAGE4N_SEISMOGRAPH_MANIFEST_V1\0";
export const SEISMOGRAPH_CHAIN_ID = "stage4n-extraction-seismograph-v0";
export const SEISMOGRAPH_TIERS = Object.freeze(["Tier-A", "Tier-P", "Tier-R"]);

// Band policy (spec §5.1, Fix 2): exactly two declared dimensions; vector space 9;
// leakage bound ceil(log2 9) = 4 bits; budget 4 — clean policy passes with equality.
export const BAND_DIMENSIONS = Object.freeze({
  breach_count: Object.freeze(["0", "1-5", ">5"]),
  consumer_count: Object.freeze(["0", "1-10", ">10"]),
});
export const LEAKAGE_BITS_MAX = 4;
export const REVEAL_DELAY_WINDOWS = 2;

export const HEARTBEAT_NON_CLAIMS = Object.freeze([
  "band_not_count",
  "quiet_trace_not_safe_model",
  "reporting_liveness_not_detection_guarantee",
]);
export const REVEAL_NON_CLAIMS = Object.freeze([
  "band_not_count",
  "no_noise_byte_reproducible_coarsening",
  "freshest_oracle_value_not_revealed",
]);

// Spec §14 verbatim (slug form) — carried in the genesis policy, attestation, and docs.
export const SEISMOGRAPH_NON_CLAIMS = Object.freeze([
  "band_not_count",
  "quiet_trace_not_safe_model",
  "reporting_liveness_not_detection_guarantee",
  "synthetic_clock_not_deployment_sla",
  "equivocation_detection_requires_two_artifacts",
  "inclusion_proofs_are_bilateral_not_public",
]);

export const SEISMOGRAPH_KNOWN_LIMITATIONS = Object.freeze([
  "detection_completeness_not_claimed",
  "inherits_4l_provider_supplied_cluster_commitment_assumption",
  "private_side_modelled_in_repo_synthetic_v0",
  "proof_is_of_model_not_implementation",
  "publication_refusal_only_made_visible_not_prevented",
  "respondent_contests_anchored_not_adjudicated",
  "reveal_commitment_binding_not_hiding_low_entropy_v0",
]);

// Q16 public-surface scan (spec §6, Fix 5): any of these keys in a PUBLIC artifact is a
// raw-54 violation — inclusion proofs, tier labels, and respondent material are bilateral.
export const PUBLIC_FORBIDDEN_KEYS = Object.freeze([
  "bundle_tier",
  "included_under",
  "proof_path",
  "respondent_id_digest",
]);
```

- [ ] **Step 4: Implement `core/windowModel.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Synthetic-window model (spec §5.0/§5.5). IO-free; no Date, no clock — verdicts are pure
// functions of committed inputs.
const WINDOW_RE = /^synthetic-(\d{4})$/;

export function windowIndex(id) {
  const m = typeof id === "string" ? id.match(WINDOW_RE) : null;
  if (!m) throw new Error(`window_id_malformed: ${String(id)}`);
  return Number(m[1]);
}

export function windowIdOf(i) {
  if (!Number.isInteger(i) || i < 0 || i > 9999) {
    throw new Error(`window_index_invalid: ${String(i)}`);
  }
  return `synthetic-${String(i).padStart(4, "0")}`;
}

// Deterministic interleave (spec §5.0): at window k append heartbeat(k), then — if
// k-d >= 0 — append aggregate_reveal(k-d). Pure function of (delay, asOfIndex).
export function expectedSequence(delay, asOfIndex) {
  if (!Number.isInteger(delay) || delay < 1) throw new Error("delay_invalid");
  if (!Number.isInteger(asOfIndex) || asOfIndex < 0) throw new Error("as_of_invalid");
  const seq = [];
  for (let k = 0; k <= asOfIndex; k++) {
    seq.push({ record_type: "heartbeat", window_id: windowIdOf(k) });
    if (k - delay >= 0) {
      seq.push({ record_type: "aggregate_reveal", window_id: windowIdOf(k - delay) });
    }
  }
  return seq;
}
```

- [ ] **Step 5: Implement `core/genesisCore.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Genesis-policy validation + leakage math (spec §5.1). The leakage bound is computed
// from the POLICY ALONE (Fix 2) — never trusted from any record.
import {
  BAND_DIMENSIONS,
  LEAKAGE_BITS_MAX,
  SEISMOGRAPH_GENESIS_SCHEMA,
  SEISMOGRAPH_NON_CLAIMS,
} from "../constants.mjs";

export const bandVectorSpaceSize = (dimensions) =>
  Object.values(dimensions).reduce((acc, bands) => acc * bands.length, 1);

export const leakageBitsUpperBound = (dimensions) =>
  Math.ceil(Math.log2(bandVectorSpaceSize(dimensions)));

const TOP_LEVEL_KEYS = Object.freeze([
  "band_policy",
  "chain_id",
  "crypto",
  "non_claims",
  "publication",
  "reveal_policy",
  "schema",
  "scope",
  "stage",
  "window_policy",
]);

export function validateGenesisPolicy(policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    return { ok: false, reason: "schema_invalid" };
  }
  for (const key of Object.keys(policy)) {
    if (!TOP_LEVEL_KEYS.includes(key)) return { ok: false, reason: `unknown_field:${key}` };
  }
  for (const key of TOP_LEVEL_KEYS) {
    if (!(key in policy)) return { ok: false, reason: `missing_field:${key}` };
  }
  if (policy.schema !== SEISMOGRAPH_GENESIS_SCHEMA) return { ok: false, reason: "schema_mismatch" };
  if (policy.window_policy.clock !== "synthetic")
    return { ok: false, reason: "clock_not_synthetic" };
  const d = policy.reveal_policy.aggregate_reveal_delay_windows;
  if (!Number.isInteger(d) || d < 1) return { ok: false, reason: "delay_not_positive_integer" };
  const dims = policy.band_policy.dimensions;
  if (policy.band_policy.band_vector_space_size !== bandVectorSpaceSize(dims)) {
    return { ok: false, reason: "band_space_mismatch" };
  }
  if (leakageBitsUpperBound(dims) > policy.band_policy.leakage_bits_per_reveal_max) {
    return { ok: false, reason: "leakage_bound_exceeds_budget" };
  }
  for (const nc of SEISMOGRAPH_NON_CLAIMS) {
    if (!policy.non_claims.includes(nc)) return { ok: false, reason: "non_claims_incomplete" };
  }
  return { ok: true };
}
```

Note `LEAKAGE_BITS_MAX` and `BAND_DIMENSIONS` are imported so the module fails loudly if constants drift, even though `validateGenesisPolicy` checks the policy's own values. If your linter flags them unused, reference them in a frozen sanity check at module load:

```js
if (leakageBitsUpperBound(BAND_DIMENSIONS) > LEAKAGE_BITS_MAX) {
  throw new Error("constants_inconsistent: v0 band dimensions exceed the leakage budget");
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `node --test tests/unit/llmShield/stage4n/windowModel.test.js tests/unit/llmShield/stage4n/genesis.test.js`
Expected: PASS (6 tests)

- [ ] **Step 7: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4n/ tests/unit/llmShield/stage4n/
npm test
git add tools/simurgh-attestation/stage4n/ tests/unit/llmShield/stage4n/
git commit -m "feat(llm-shield): stage 4n constants, synthetic window model, genesis-policy core"
```

---

### Task 3: Record cores — heartbeat/reveal validation, banding, band-vector commitment

**Files:**

- Create: `tools/simurgh-attestation/stage4n/core/recordCore.mjs`
- Test: `tests/unit/llmShield/stage4n/recordCore.test.js`

**Interfaces:**

- Consumes: `constants.mjs` (schemas, non-claims, `SEISMOGRAPH_CHAIN_ID`), `stage4m/core/canonical.mjs` (`recordDigest`, `DIGEST_RE`).
- Produces:
  - `bandFor(value: number, bands: string[]): string` — maps a raw count onto its band label; throws `band_unmappable` if no band matches.
  - `commitBandVector({window_id, bands, salt}): string` — `recordDigest` commitment (binding; hiding limitation declared, spec §18/Fix 2).
  - `validateHeartbeat(record): {ok:true}|{ok:false, reason}` — exact top-level keys `["chain_id","commitments","non_claims","position","prev_record_digest","record_type","reveal_commitment","schema","stage","window_id"]`; `commitments` exactly `["private_evidence_root","stage4k_exposure_root","stage4l_cluster_budget_root","stage4m_disclosure_root"]`, all matching `DIGEST_RE`; `reveal_commitment` exactly `["committed_band_vector_digest","reveal_due_window"]`; non-claims must equal `HEARTBEAT_NON_CLAIMS`. **No `aggregate_reveal` key exists (Fix 1).**
  - `validateReveal(record, dimensions): {ok:true}|{ok:false, reason}` — exact top-level keys `["bands","chain_id","non_claims","position","prev_record_digest","record_type","reveal_salt","revealed_at_window","schema","self_leakage","stage","window_id"]`; every `bands` key must be a declared dimension and every value a declared label **string** (`undeclared_band_dimension` / `raw_count_public` reasons feed Q14/Q16); `self_leakage` exactly `["band_vector_space_size","budget_bits","leakage_bits_upper_bound","within_budget"]`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/llmShield/stage4n/recordCore.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  BAND_DIMENSIONS,
  HEARTBEAT_NON_CLAIMS,
  REVEAL_NON_CLAIMS,
  SEISMOGRAPH_CHAIN_ID,
  SEISMOGRAPH_HEARTBEAT_SCHEMA,
  SEISMOGRAPH_REVEAL_SCHEMA,
} from "../../../../tools/simurgh-attestation/stage4n/constants.mjs";
import {
  bandFor,
  commitBandVector,
  validateHeartbeat,
  validateReveal,
} from "../../../../tools/simurgh-attestation/stage4n/core/recordCore.mjs";

const D = (v) => recordDigest({ v }); // shorthand valid sha256:… digests for fixtures

export const goodHeartbeat = () => ({
  schema: SEISMOGRAPH_HEARTBEAT_SCHEMA,
  record_type: "heartbeat",
  stage: "4N",
  chain_id: SEISMOGRAPH_CHAIN_ID,
  window_id: "synthetic-0003",
  position: 4,
  prev_record_digest: D("prev"),
  commitments: {
    stage4k_exposure_root: D("4k"),
    stage4l_cluster_budget_root: D("4l"),
    stage4m_disclosure_root: D("4m"),
    private_evidence_root: D("per"),
  },
  reveal_commitment: {
    committed_band_vector_digest: D("cbv"),
    reveal_due_window: "synthetic-0005",
  },
  non_claims: [...HEARTBEAT_NON_CLAIMS],
});

export const goodReveal = () => ({
  schema: SEISMOGRAPH_REVEAL_SCHEMA,
  record_type: "aggregate_reveal",
  stage: "4N",
  chain_id: SEISMOGRAPH_CHAIN_ID,
  window_id: "synthetic-0003",
  revealed_at_window: "synthetic-0005",
  position: 9,
  prev_record_digest: D("prev9"),
  bands: { breach_count: "1-5", consumer_count: "1-10" },
  reveal_salt: D("salt"),
  self_leakage: {
    band_vector_space_size: 9,
    leakage_bits_upper_bound: 4,
    budget_bits: 4,
    within_budget: true,
  },
  non_claims: [...REVEAL_NON_CLAIMS],
});

test("bandFor maps raw counts onto declared bands deterministically", () => {
  assert.equal(bandFor(0, BAND_DIMENSIONS.breach_count), "0");
  assert.equal(bandFor(1, BAND_DIMENSIONS.breach_count), "1-5");
  assert.equal(bandFor(5, BAND_DIMENSIONS.breach_count), "1-5");
  assert.equal(bandFor(6, BAND_DIMENSIONS.breach_count), ">5");
  assert.equal(bandFor(7, BAND_DIMENSIONS.consumer_count), "1-10");
  assert.throws(() => bandFor(-1, BAND_DIMENSIONS.breach_count), /band_unmappable/);
});

test("commitBandVector is order-independent and salt-sensitive", () => {
  const a = commitBandVector({
    window_id: "synthetic-0003",
    bands: { breach_count: "1-5", consumer_count: "1-10" },
    salt: D("s"),
  });
  const b = commitBandVector({
    window_id: "synthetic-0003",
    bands: { consumer_count: "1-10", breach_count: "1-5" },
    salt: D("s"),
  });
  assert.equal(a, b); // canonical JSON sorts keys
  assert.match(a, /^sha256:[a-f0-9]{64}$/);
  const c = commitBandVector({
    window_id: "synthetic-0003",
    bands: { breach_count: "1-5", consumer_count: "1-10" },
    salt: D("other"),
  });
  assert.notEqual(a, c);
});

test("clean heartbeat validates; mutations fail closed", () => {
  assert.deepEqual(validateHeartbeat(goodHeartbeat()), { ok: true });
  const cases = [
    [(r) => (r.aggregate_reveal = null), "unknown_field:aggregate_reveal"], // Fix 1 guard
    [(r) => delete r.commitments.private_evidence_root, "commitments_keys_invalid"],
    [(r) => (r.commitments.stage4k_exposure_root = "not-a-digest"), "digest_malformed"],
    [(r) => (r.record_type = "aggregate_reveal"), "record_type_mismatch"],
    [(r) => (r.non_claims = []), "non_claims_incomplete"],
    [(r) => (r.position = "4"), "position_not_integer"],
  ];
  for (const [mutate, reason] of cases) {
    const r = goodHeartbeat();
    mutate(r);
    assert.deepEqual(validateHeartbeat(r), { ok: false, reason }, reason);
  }
});

test("clean reveal validates; raw counts and undeclared dimensions fail closed", () => {
  assert.deepEqual(validateReveal(goodReveal(), BAND_DIMENSIONS), { ok: true });
  const cases = [
    [(r) => (r.bands.breach_count = 7), "raw_count_public"], // T10 seed
    [(r) => (r.bands.cluster_count = "1-10"), "undeclared_band_dimension"], // T9 seed
    [(r) => (r.bands.breach_count = "2-6"), "band_label_unknown"],
    [(r) => delete r.reveal_salt, "missing_field:reveal_salt"],
    [(r) => (r.self_leakage.within_budget = "yes"), "self_leakage_invalid"],
  ];
  for (const [mutate, reason] of cases) {
    const r = goodReveal();
    mutate(r);
    assert.deepEqual(validateReveal(r, BAND_DIMENSIONS), { ok: false, reason }, reason);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4n/recordCore.test.js`
Expected: FAIL — `Cannot find module .../stage4n/core/recordCore.mjs`

- [ ] **Step 3: Implement `core/recordCore.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Heartbeat/reveal record validation, banding, and the band-vector commitment (spec §5.2/§5.3).
// Exact-key discipline: unknown top-level fields fail closed. NO aggregate_reveal field may
// exist on a heartbeat (Fix 1 — reveals are separate chain records, signed records never mutate).
import { DIGEST_RE, recordDigest } from "../../stage4m/core/canonical.mjs";
import {
  HEARTBEAT_NON_CLAIMS,
  REVEAL_NON_CLAIMS,
  SEISMOGRAPH_CHAIN_ID,
  SEISMOGRAPH_HEARTBEAT_SCHEMA,
  SEISMOGRAPH_REVEAL_SCHEMA,
} from "../constants.mjs";

// Band grammar (spec §5.1): "0" exact zero; "a-b" inclusive integer range; ">n" strictly greater.
export function bandFor(value, bands) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`band_unmappable: ${String(value)}`);
  for (const label of bands) {
    if (/^\d+$/.test(label) && value === Number(label)) return label;
    const range = label.match(/^(\d+)-(\d+)$/);
    if (range && value >= Number(range[1]) && value <= Number(range[2])) return label;
    const gt = label.match(/^>(\d+)$/);
    if (gt && value > Number(gt[1])) return label;
  }
  throw new Error(`band_unmappable: ${String(value)}`);
}

export const commitBandVector = ({ window_id, bands, salt }) =>
  recordDigest({ bands, salt, window_id });

const HEARTBEAT_KEYS = Object.freeze([
  "chain_id",
  "commitments",
  "non_claims",
  "position",
  "prev_record_digest",
  "record_type",
  "reveal_commitment",
  "schema",
  "stage",
  "window_id",
]);
const COMMITMENT_KEYS = Object.freeze([
  "private_evidence_root",
  "stage4k_exposure_root",
  "stage4l_cluster_budget_root",
  "stage4m_disclosure_root",
]);
const REVEAL_KEYS = Object.freeze([
  "bands",
  "chain_id",
  "non_claims",
  "position",
  "prev_record_digest",
  "record_type",
  "reveal_salt",
  "revealed_at_window",
  "schema",
  "stage",
  "window_id",
]);
const SELF_LEAKAGE_KEYS = Object.freeze([
  "band_vector_space_size",
  "budget_bits",
  "leakage_bits_upper_bound",
  "within_budget",
]);

const fail = (reason) => ({ ok: false, reason });
const keysExactly = (obj, keys) =>
  obj &&
  typeof obj === "object" &&
  !Array.isArray(obj) &&
  Object.keys(obj).sort().join("|") === [...keys].sort().join("|");

function commonChecks(record, keys, schema, recordType, nonClaims) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return fail("schema_invalid");
  for (const key of Object.keys(record)) {
    if (!keys.includes(key)) return fail(`unknown_field:${key}`);
  }
  for (const key of keys) {
    if (!(key in record)) return fail(`missing_field:${key}`);
  }
  if (record.schema !== schema) return fail("schema_mismatch");
  if (record.record_type !== recordType) return fail("record_type_mismatch");
  if (record.stage !== "4N") return fail("stage_mismatch");
  if (record.chain_id !== SEISMOGRAPH_CHAIN_ID) return fail("chain_id_mismatch");
  if (!Number.isInteger(record.position) || record.position < 0)
    return fail("position_not_integer");
  if (!DIGEST_RE.test(record.prev_record_digest)) return fail("digest_malformed");
  for (const nc of nonClaims) {
    if (!Array.isArray(record.non_claims) || !record.non_claims.includes(nc)) {
      return fail("non_claims_incomplete");
    }
  }
  return null;
}

export function validateHeartbeat(record) {
  // A heartbeat carrying aggregate_reveal (or any stray field) fails at the unknown_field
  // guard in commonChecks — the Fix 1 invariant.
  const common = commonChecks(
    record,
    HEARTBEAT_KEYS,
    SEISMOGRAPH_HEARTBEAT_SCHEMA,
    "heartbeat",
    HEARTBEAT_NON_CLAIMS
  );
  if (common) return common;
  if (!keysExactly(record.commitments, COMMITMENT_KEYS)) return fail("commitments_keys_invalid");
  for (const key of COMMITMENT_KEYS) {
    if (!DIGEST_RE.test(record.commitments[key])) return fail("digest_malformed");
  }
  if (
    !keysExactly(record.reveal_commitment, ["committed_band_vector_digest", "reveal_due_window"])
  ) {
    return fail("reveal_commitment_keys_invalid");
  }
  if (!DIGEST_RE.test(record.reveal_commitment.committed_band_vector_digest)) {
    return fail("digest_malformed");
  }
  return { ok: true };
}

export function validateReveal(record, dimensions) {
  const common = commonChecks(
    record,
    REVEAL_KEYS.concat("self_leakage"),
    SEISMOGRAPH_REVEAL_SCHEMA,
    "aggregate_reveal",
    REVEAL_NON_CLAIMS
  );
  if (common) return common;
  if (!DIGEST_RE.test(record.reveal_salt)) return fail("digest_malformed");
  if (!record.bands || typeof record.bands !== "object" || Array.isArray(record.bands)) {
    return fail("bands_invalid");
  }
  // Dimension SEMANTICS run only when dimensions are supplied. Q10 calls this with null
  // (structural check only) so that dimension violations surface at their own gates —
  // Q14 (undeclared_band_dimension) and Q16 (raw_count_public) — instead of collapsing
  // every band defect into a raw-49 chain error. Gate separation, same rationale as Q10/Q11.
  if (dimensions) {
    for (const [dim, value] of Object.entries(record.bands)) {
      if (!(dim in dimensions)) return fail("undeclared_band_dimension");
      if (typeof value === "number") return fail("raw_count_public");
      if (!dimensions[dim].includes(value)) return fail("band_label_unknown");
    }
    for (const dim of Object.keys(dimensions)) {
      if (!(dim in record.bands)) return fail("band_dimension_missing");
    }
  }
  if (!keysExactly(record.self_leakage, SELF_LEAKAGE_KEYS)) return fail("self_leakage_invalid");
  const sl = record.self_leakage;
  if (
    !Number.isInteger(sl.band_vector_space_size) ||
    !Number.isInteger(sl.leakage_bits_upper_bound) ||
    !Number.isInteger(sl.budget_bits) ||
    typeof sl.within_budget !== "boolean"
  ) {
    return fail("self_leakage_invalid");
  }
  return { ok: true };
}
```

Note: `validateReveal` passes `REVEAL_KEYS.concat("self_leakage")` — `self_leakage` is validated structurally afterwards; the concat keeps `REVEAL_KEYS` frozen while allowing the nested object through the exact-key gate.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage4n/recordCore.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4n/ tests/unit/llmShield/stage4n/
npm test
git add tools/simurgh-attestation/stage4n/core/recordCore.mjs tests/unit/llmShield/stage4n/recordCore.test.js
git commit -m "feat(llm-shield): stage 4n record cores — banding, band-vector commitment, exact-key validation"
```

### Task 4: Chain build + Q10 (chain/interleave integrity) + Q11 (temporal completeness)

**Files:**

- Create: `tools/simurgh-attestation/stage4n/core/chainCore.mjs`
- Test: `tests/unit/llmShield/stage4n/chainCore.test.js`

**Interfaces:**

- Consumes: `windowModel.mjs` (`expectedSequence`, `windowIndex`), `recordCore.mjs` (`validateHeartbeat`, `validateReveal`, `commitBandVector`, `bandFor`), `stage4m/core/canonical.mjs` (`recordDigest`), `constants.mjs`, `exitCodes.mjs` (`SEISMOGRAPH_RAW_CODES`).
- Produces:
  - `buildChain({policy, asOfIndex, perWindow}): object[]` — `perWindow` is `Map<number, {roots: {stage4k_exposure_root, stage4l_cluster_budget_root, stage4m_disclosure_root}, rawCounts: {breach_count: number, consumer_count: number}}>`. Returns the full interleaved record array with computed `position` and `prev_record_digest` (record 0's prev = `recordDigest(policy)` — the chain is bound to its genesis policy). `private_evidence_root = recordDigest({stage4k_exposure_root, stage4l_cluster_budget_root, stage4m_disclosure_root, window_id})`. `reveal_salt = recordDigest({band_inputs: rawCounts, window_id})` — a digest of the **private** source counts (never `private_evidence_root`, which is public and would give zero pre-reveal hiding over the 9-element band space). The commitment is unconditionally binding but only weakly hiding: `reveal_salt` is a deterministic function of low-entropy counts, so a party who can enumerate plausible counts can brute-force the bands early. This is the signed known limitation `reveal_commitment_binding_not_hiding_low_entropy_v0`; commit-now/reveal-later buys binding + ordering + timing discipline, not information-theoretic secrecy (random salts would strengthen hiding but break byte-reproducibility — v0 chooses reproducibility and declares the trade).
  - `verifyChainIntegrity(records, policy, asOfIndex): {raw: 0}|{raw: 49, reason}` — Q10.
  - `verifyTemporalCompleteness(records, policy, asOfIndex): {raw: 0}|{raw: 47, reason}` — Q11 (heartbeats only; missing due reveals are Q13's `reveal_overdue`).
  - Gate results always shaped `{raw, reason?}` with `reason` from the closed enums in `exitCodes.mjs`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/llmShield/stage4n/chainCore.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  buildChain,
  verifyChainIntegrity,
  verifyTemporalCompleteness,
} from "../../../../tools/simurgh-attestation/stage4n/core/chainCore.mjs";

// Minimal inline policy: only the fields chainCore reads (delay). Full-policy validation
// is genesisCore's job and is tested there.
const policy = {
  reveal_policy: { aggregate_reveal_delay_windows: 2 },
};
const roots = (tag) => ({
  stage4k_exposure_root: recordDigest({ tag, s: "4k" }),
  stage4l_cluster_budget_root: recordDigest({ tag, s: "4l" }),
  stage4m_disclosure_root: recordDigest({ tag, s: "4m" }),
});
const perWindow = (n) => {
  const m = new Map();
  for (let k = 0; k <= n; k++) {
    m.set(k, { roots: roots(k), rawCounts: { breach_count: k % 7, consumer_count: k * 3 } });
  }
  return m;
};

test("buildChain produces the exact interleaved sequence with linked digests", () => {
  const records = buildChain({ policy, asOfIndex: 3, perWindow: perWindow(3) });
  assert.equal(records.length, 6); // hb0 hb1 hb2 rv0 hb3 rv1
  assert.deepEqual(
    records.map((r) => [r.record_type, r.window_id, r.position]),
    [
      ["heartbeat", "synthetic-0000", 0],
      ["heartbeat", "synthetic-0001", 1],
      ["heartbeat", "synthetic-0002", 2],
      ["aggregate_reveal", "synthetic-0000", 3],
      ["heartbeat", "synthetic-0003", 4],
      ["aggregate_reveal", "synthetic-0001", 5],
    ]
  );
  assert.equal(records[0].prev_record_digest, recordDigest(policy));
  for (let i = 1; i < records.length; i++) {
    assert.equal(records[i].prev_record_digest, recordDigest(records[i - 1]));
  }
  // reveal bands derive from the raw counts: window 0 -> breach 0, consumers 0
  assert.deepEqual(records[3].bands, { breach_count: "0", consumer_count: "0" });
});

// Re-forge positions and prev digests after a mutation, so ONLY the intended violation
// remains visible (the realistic cover-up adversary; same helper the fixture builder uses).
const relink = (records) => {
  let prev = recordDigest(policy);
  return records.map((r, i) => {
    const linked = { ...r, position: i, prev_record_digest: prev };
    prev = recordDigest(linked);
    return linked;
  });
};

test("Q10 passes clean and fails each tamper with the exact reason", () => {
  const clean = buildChain({ policy, asOfIndex: 3, perWindow: perWindow(3) });
  assert.deepEqual(verifyChainIntegrity(clean, policy, 3), { raw: 0 });

  const reordered = [...clean];
  [reordered[1], reordered[2]] = [reordered[2], reordered[1]]; // T3, cover-up variant
  assert.deepEqual(verifyChainIntegrity(relink(reordered), policy, 3), {
    raw: 49,
    reason: "interleave_order_violation",
  });

  const dup = relink([...clean, clean[4]]); // duplicate heartbeat window 3, links re-forged
  assert.deepEqual(verifyChainIntegrity(dup, policy, 3), {
    raw: 49,
    reason: "duplicate_record",
  });

  const forkedPrev = clean.map((r, i) =>
    i === 2 ? { ...r, prev_record_digest: recordDigest({ evil: 1 }) } : r
  );
  assert.deepEqual(verifyChainIntegrity(forkedPrev, policy, 3), {
    raw: 49,
    reason: "prev_digest_mismatch",
  });

  const skipped = clean.map((r, i) => (i === 2 ? { ...r, position: 7 } : r));
  assert.deepEqual(verifyChainIntegrity(skipped, policy, 3), {
    raw: 49,
    reason: "position_discontinuity",
  });

  const badRecord = clean.map((r, i) => (i === 1 ? { ...r, extra: true } : r));
  assert.deepEqual(verifyChainIntegrity(badRecord, policy, 3), {
    raw: 49,
    reason: "schema_invalid",
  });

  // Gate separation (Fix to draft): a drop with RE-FORGED links passes Q10 — silence is
  // Q11's verdict, not a chain error. This is what keeps raw 47 reachable.
  const coverUp = relink(
    clean.filter((r) => !(r.record_type === "heartbeat" && r.window_id === "synthetic-0002"))
  );
  assert.deepEqual(verifyChainIntegrity(coverUp, policy, 3), { raw: 0 });
});

test("Q11 detects a covered-up dropped heartbeat (T1)", () => {
  const clean = buildChain({ policy, asOfIndex: 3, perWindow: perWindow(3) });
  assert.deepEqual(verifyTemporalCompleteness(clean, policy, 3), { raw: 0 });

  const coverUp = relink(
    clean.filter((r) => !(r.record_type === "heartbeat" && r.window_id === "synthetic-0002"))
  );
  assert.deepEqual(verifyTemporalCompleteness(coverUp, policy, 3), {
    raw: 47,
    reason: "heartbeat_absent_for_expected_window",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4n/chainCore.test.js`
Expected: FAIL — `Cannot find module .../stage4n/core/chainCore.mjs`

- [ ] **Step 3: Implement `core/chainCore.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Single interleaved append-only chain (spec §5.0, Fix 1) + Q10/Q11 (spec §6).
// Q10 = the chain is internally consistent (positions, prev digests, interleave order).
// Q11 = every expected heartbeat up to as_of exists. Missing due reveals are Q13's lane.
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import {
  BAND_DIMENSIONS,
  HEARTBEAT_NON_CLAIMS,
  REVEAL_NON_CLAIMS,
  SEISMOGRAPH_CHAIN_ID,
  SEISMOGRAPH_HEARTBEAT_SCHEMA,
  SEISMOGRAPH_REVEAL_SCHEMA,
} from "../constants.mjs";
import { bandVectorSpaceSize, leakageBitsUpperBound } from "./genesisCore.mjs";
import { bandFor, commitBandVector, validateHeartbeat, validateReveal } from "./recordCore.mjs";
import { expectedSequence, windowIdOf, windowIndex } from "./windowModel.mjs";

const privateEvidenceRoot = (roots, window_id) =>
  recordDigest({
    stage4k_exposure_root: roots.stage4k_exposure_root,
    stage4l_cluster_budget_root: roots.stage4l_cluster_budget_root,
    stage4m_disclosure_root: roots.stage4m_disclosure_root,
    window_id,
  });

const revealSalt = (rawCounts, window_id) => recordDigest({ band_inputs: rawCounts, window_id });

export const bandsOf = (rawCounts) => ({
  breach_count: bandFor(rawCounts.breach_count, BAND_DIMENSIONS.breach_count),
  consumer_count: bandFor(rawCounts.consumer_count, BAND_DIMENSIONS.consumer_count),
});

export function buildChain({ policy, asOfIndex, perWindow }) {
  const d = policy.reveal_policy.aggregate_reveal_delay_windows;
  const seq = expectedSequence(d, asOfIndex);
  const records = [];
  let prev = recordDigest(policy); // genesis: chain bound to its policy (spec §5.0)
  for (let position = 0; position < seq.length; position++) {
    const { record_type, window_id } = seq[position];
    const k = windowIndex(window_id);
    const input = perWindow.get(k);
    if (!input) throw new Error(`per_window_input_missing: ${window_id}`);
    let record;
    if (record_type === "heartbeat") {
      const salt = revealSalt(input.rawCounts, window_id);
      record = {
        schema: SEISMOGRAPH_HEARTBEAT_SCHEMA,
        record_type,
        stage: "4N",
        chain_id: SEISMOGRAPH_CHAIN_ID,
        window_id,
        position,
        prev_record_digest: prev,
        commitments: {
          ...input.roots,
          private_evidence_root: privateEvidenceRoot(input.roots, window_id),
        },
        reveal_commitment: {
          committed_band_vector_digest: commitBandVector({
            window_id,
            bands: bandsOf(input.rawCounts),
            salt,
          }),
          reveal_due_window: windowIdOf(k + d),
        },
        non_claims: [...HEARTBEAT_NON_CLAIMS],
      };
    } else {
      record = {
        schema: SEISMOGRAPH_REVEAL_SCHEMA,
        record_type,
        stage: "4N",
        chain_id: SEISMOGRAPH_CHAIN_ID,
        window_id,
        revealed_at_window: windowIdOf(k + d),
        position,
        prev_record_digest: prev,
        bands: bandsOf(input.rawCounts),
        reveal_salt: revealSalt(input.rawCounts, window_id),
        self_leakage: {
          band_vector_space_size: bandVectorSpaceSize(BAND_DIMENSIONS),
          leakage_bits_upper_bound: leakageBitsUpperBound(BAND_DIMENSIONS),
          budget_bits: policy.band_policy?.leakage_bits_per_reveal_max ?? 4,
          within_budget:
            leakageBitsUpperBound(BAND_DIMENSIONS) <=
            (policy.band_policy?.leakage_bits_per_reveal_max ?? 4),
        },
        non_claims: [...REVEAL_NON_CLAIMS],
      };
    }
    records.push(record);
    prev = recordDigest(record);
  }
  return records;
}

// Q10 — raw 49. Gate separation is load-bearing: Q10 judges ONLY what exists (schema,
// consecutive positions, prev-digest links, no duplicates, and interleave order as an
// ordered SUBSEQUENCE of the expected schedule). What is MISSING is judged by Q11
// (heartbeats, raw 47) and Q13 (reveals, raw 52). A strict slot-by-slot schedule match
// here would subsume Q11 and make raw 47 unreachable — the T1 cover-up arm (drop +
// re-forged links) must pass Q10 and fail Q11.
export function verifyChainIntegrity(records, policy, asOfIndex) {
  const d = policy.reveal_policy.aggregate_reveal_delay_windows;
  const seq = expectedSequence(d, asOfIndex);
  let prev = recordDigest(policy);
  const seen = new Set();
  let cursor = 0; // subsequence cursor into the expected schedule
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const valid =
      r?.record_type === "heartbeat"
        ? validateHeartbeat(r)
        : r?.record_type === "aggregate_reveal"
          ? validateReveal(r, null) // structural only — dimension semantics belong to Q14/Q16
          : { ok: false };
    if (!valid.ok) return { raw: 49, reason: "schema_invalid" };
    if (r.position !== i) return { raw: 49, reason: "position_discontinuity" };
    if (r.prev_record_digest !== prev) return { raw: 49, reason: "prev_digest_mismatch" };
    const key = `${r.record_type}|${r.window_id}`;
    if (seen.has(key)) return { raw: 49, reason: "duplicate_record" };
    seen.add(key);
    // advance the schedule cursor to this record; failure to find it in the REMAINING
    // schedule means it is out of order (seen earlier than allowed) or alien to the plan
    let found = -1;
    for (let j = cursor; j < seq.length; j++) {
      if (seq[j].record_type === r.record_type && seq[j].window_id === r.window_id) {
        found = j;
        break;
      }
    }
    if (found === -1) {
      const inSchedule = seq.some(
        (s) => s.record_type === r.record_type && s.window_id === r.window_id
      );
      return {
        raw: 49,
        reason: inSchedule ? "interleave_order_violation" : "window_outside_schedule",
      };
    }
    cursor = found + 1;
    prev = recordDigest(r);
  }
  return { raw: 0 };
}

// Q11 — raw 47. Heartbeat liveness only: every expected heartbeat window <= as_of present.
export function verifyTemporalCompleteness(records, policy, asOfIndex) {
  const present = new Set(
    records.filter((r) => r?.record_type === "heartbeat").map((r) => r.window_id)
  );
  for (let k = 0; k <= asOfIndex; k++) {
    if (!present.has(windowIdOf(k))) {
      return { raw: 47, reason: "heartbeat_absent_for_expected_window" };
    }
  }
  return { raw: 0 };
}
```

Implementation note — **gate separation is the point of this module**: Q10's subsequence matching (not slot-by-slot schedule matching) is what keeps Q11's raw 47 reachable. If you find yourself "simplifying" Q10 into a strict `seq[i]` comparison, you have re-introduced the draft defect where a covered-up drop reports a chain error and silence becomes undetectable as silence. The pinned in-gate check order is: schema → position → prev-digest → duplicate → subsequence.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage4n/chainCore.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4n/ tests/unit/llmShield/stage4n/
npm test
git add tools/simurgh-attestation/stage4n/core/chainCore.mjs tests/unit/llmShield/stage4n/chainCore.test.js
git commit -m "feat(llm-shield): stage 4n interleaved chain build with Q10 integrity and Q11 silence gates"
```

---

### Task 5: Sorted-leaf Merkle path + Q12 (bilateral inclusion) + Q17 (two-artifact equivocation)

**Files:**

- Create: `tools/simurgh-attestation/stage4n/core/merklePath.mjs`
- Create: `tools/simurgh-attestation/stage4n/core/inclusionCore.mjs`
- Test: `tests/unit/llmShield/stage4n/inclusion.test.js`

**Interfaces:**

- Consumes: `stage4m/core/canonical.mjs` (`sha256Hex`, `DIGEST_RE`, `merkleRootSorted`, `recordDigest`), `constants.mjs` (`SEISMOGRAPH_INCLUSION_SCHEMA`, `SEISMOGRAPH_TIERS`).
- Produces:
  - `merklePathSorted(digests: string[], leaf: string): Array<{sibling: string|null, side: "left"|"right"|"promote"}>` — path in the exact tree `merkleRootSorted` builds (leaves sorted lexicographically, level-order pairing `sha256(a|b)`, odd node promotes).
  - `verifyMerklePath(leaf: string, path, root: string): boolean`.
  - `verifyInclusionProof({proof, feedRecords}): {raw: 0}|{raw: 51, reason}` — Q12. `proof` is the **bilateral** `simurgh.seismograph.inclusion_proof.v1` object (spec §5.4); `feedRecords` is the public chain. Checks: tier ∈ `SEISMOGRAPH_TIERS`; the referenced `heartbeat_digest` equals `recordDigest` of the feed's heartbeat for `window_id` (else `referenced_heartbeat_absent`); `verifyMerklePath(bundle_digest, proof_path→typed, root)` and `root === included_under` value committed in that heartbeat's `commitments.stage4m_disclosure_root` (else `proof_path_invalid`).
  - `verifyNoEquivocation({feedRecords, secondArtifact}): {raw: 0}|{raw: 48, reason}` — Q17. `secondArtifact = {record_type, window_id, digest}`; compares against `recordDigest` of the feed's record for the same `(record_type, window_id)`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/llmShield/stage4n/inclusion.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  merkleRootSorted,
  recordDigest,
} from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  merklePathSorted,
  verifyMerklePath,
} from "../../../../tools/simurgh-attestation/stage4n/core/merklePath.mjs";
import {
  verifyInclusionProof,
  verifyNoEquivocation,
} from "../../../../tools/simurgh-attestation/stage4n/core/inclusionCore.mjs";
import { buildChain } from "../../../../tools/simurgh-attestation/stage4n/core/chainCore.mjs";
import { SEISMOGRAPH_INCLUSION_SCHEMA } from "../../../../tools/simurgh-attestation/stage4n/constants.mjs";

const leaves = [recordDigest({ b: 1 }), recordDigest({ b: 2 }), recordDigest({ b: 3 })];
const root = merkleRootSorted(leaves);

test("merklePathSorted round-trips against merkleRootSorted for every leaf", () => {
  for (const leaf of leaves) {
    const path = merklePathSorted(leaves, leaf);
    assert.equal(verifyMerklePath(leaf, path, root), true);
  }
  // wrong root / wrong leaf both fail
  assert.equal(verifyMerklePath(leaves[0], merklePathSorted(leaves, leaves[0]), leaves[1]), false);
  assert.equal(
    verifyMerklePath(recordDigest({ evil: 1 }), merklePathSorted(leaves, leaves[0]), root),
    false
  );
  // singleton tree: empty path, leaf === root
  assert.deepEqual(merklePathSorted([leaves[0]], leaves[0]), []);
  assert.equal(verifyMerklePath(leaves[0], [], leaves[0]), true);
});

const policy = { reveal_policy: { aggregate_reveal_delay_windows: 2 } };
const mkFeed = (disclosureRoot) => {
  const perWindow = new Map();
  for (let k = 0; k <= 3; k++) {
    perWindow.set(k, {
      roots: {
        stage4k_exposure_root: recordDigest({ k, s: "4k" }),
        stage4l_cluster_budget_root: recordDigest({ k, s: "4l" }),
        stage4m_disclosure_root: disclosureRoot,
      },
      rawCounts: { breach_count: 1, consumer_count: 2 },
    });
  }
  return buildChain({ policy, asOfIndex: 3, perWindow });
};

const mkProof = (feed, bundleDigest) => ({
  schema: SEISMOGRAPH_INCLUSION_SCHEMA,
  stage: "4N",
  distribution: "bilateral_only",
  window_id: "synthetic-0003",
  heartbeat_digest: recordDigest(
    feed.find((r) => r.record_type === "heartbeat" && r.window_id === "synthetic-0003")
  ),
  bundle_digest: bundleDigest,
  bundle_tier: "Tier-A",
  included_under: "stage4m_disclosure_root",
  proof_path: merklePathSorted(leaves, bundleDigest),
  root,
});

test("Q12 accepts a valid bilateral proof and fails each tamper", () => {
  const feed = mkFeed(root);
  assert.deepEqual(verifyInclusionProof({ proof: mkProof(feed, leaves[1]), feedRecords: feed }), {
    raw: 0,
  });

  const badTier = { ...mkProof(feed, leaves[1]), bundle_tier: "Tier-X" };
  assert.deepEqual(verifyInclusionProof({ proof: badTier, feedRecords: feed }), {
    raw: 51,
    reason: "unknown_tier",
  });

  const absent = { ...mkProof(feed, leaves[1]), heartbeat_digest: recordDigest({ ghost: 1 }) }; // T5
  assert.deepEqual(verifyInclusionProof({ proof: absent, feedRecords: feed }), {
    raw: 51,
    reason: "referenced_heartbeat_absent",
  });

  const badPath = { ...mkProof(feed, leaves[1]), bundle_digest: recordDigest({ other: 1 }) };
  assert.deepEqual(verifyInclusionProof({ proof: badPath, feedRecords: feed }), {
    raw: 51,
    reason: "proof_path_invalid",
  });
});

test("Q17 needs two artifacts and detects a forked story (T2)", () => {
  const feed = mkFeed(root);
  const hb3 = feed.find((r) => r.record_type === "heartbeat" && r.window_id === "synthetic-0003");
  const honest = {
    record_type: "heartbeat",
    window_id: "synthetic-0003",
    digest: recordDigest(hb3),
  };
  assert.deepEqual(verifyNoEquivocation({ feedRecords: feed, secondArtifact: honest }), { raw: 0 });

  const forked = { ...honest, digest: recordDigest({ otherStory: true }) };
  assert.deepEqual(verifyNoEquivocation({ feedRecords: feed, secondArtifact: forked }), {
    raw: 48,
    reason: "cross_artifact_digest_mismatch",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4n/inclusion.test.js`
Expected: FAIL — `Cannot find module .../stage4n/core/merklePath.mjs`

- [ ] **Step 3: Implement `core/merklePath.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Sorted-leaf Merkle PATHS for the exact tree stage4m/core/canonical.mjs#merkleRootSorted
// builds: leaves sorted lexicographically, level-order pairing sha256(a|b), odd node promotes.
import { DIGEST_RE, sha256Hex } from "../../stage4m/core/canonical.mjs";

const pair = (a, b) => `sha256:${sha256Hex(`${a}|${b}`)}`;

export function merklePathSorted(digests, leaf) {
  for (const d of digests) {
    if (!DIGEST_RE.test(d)) throw new Error(`merkle_leaf_invalid: ${d}`);
  }
  let level = [...digests].sort();
  let index = level.indexOf(leaf);
  if (index === -1) throw new Error("merkle_leaf_not_found");
  const path = [];
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) {
        if (i === index) {
          path.push({ sibling: null, side: "promote" });
          index = next.length;
        }
        next.push(level[i]);
      } else {
        if (i === index || i + 1 === index) {
          path.push(
            i === index
              ? { sibling: level[i + 1], side: "right" }
              : { sibling: level[i], side: "left" }
          );
          index = next.length;
        }
        next.push(pair(level[i], level[i + 1]));
      }
    }
    level = next;
  }
  return path;
}

export function verifyMerklePath(leaf, path, root) {
  if (!DIGEST_RE.test(leaf) || !DIGEST_RE.test(root) || !Array.isArray(path)) return false;
  let acc = leaf;
  for (const step of path) {
    if (!step || typeof step !== "object") return false;
    if (step.side === "promote" && step.sibling === null) continue;
    if (step.side === "right" && DIGEST_RE.test(step.sibling)) acc = pair(acc, step.sibling);
    else if (step.side === "left" && DIGEST_RE.test(step.sibling)) acc = pair(step.sibling, acc);
    else return false;
  }
  return acc === root;
}
```

- [ ] **Step 4: Implement `core/inclusionCore.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Q12 bilateral inclusion binding + Q17 two-artifact equivocation (spec §6, Fixes 4+5).
// Inclusion proofs are BILATERAL inputs supplied by the bundle holder — they are verified
// AGAINST the public feed and are never read from, or written to, any public artifact.
// Q17 scoping is honest: a single feed cannot show a fork; equivocation is detectable
// exactly when two artifacts meet (spec non-claim: equivocation_detection_requires_two_artifacts).
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { SEISMOGRAPH_INCLUSION_SCHEMA, SEISMOGRAPH_TIERS } from "../constants.mjs";
import { verifyMerklePath } from "./merklePath.mjs";

export function verifyInclusionProof({ proof, feedRecords }) {
  if (!proof || proof.schema !== SEISMOGRAPH_INCLUSION_SCHEMA) {
    return { raw: 51, reason: "proof_path_invalid" };
  }
  if (!SEISMOGRAPH_TIERS.includes(proof.bundle_tier)) return { raw: 51, reason: "unknown_tier" };
  const heartbeat = feedRecords.find(
    (r) => r?.record_type === "heartbeat" && r?.window_id === proof.window_id
  );
  if (!heartbeat || recordDigest(heartbeat) !== proof.heartbeat_digest) {
    return { raw: 51, reason: "referenced_heartbeat_absent" };
  }
  const committedRoot = heartbeat.commitments?.[proof.included_under];
  if (
    proof.included_under !== "stage4m_disclosure_root" ||
    proof.root !== committedRoot ||
    !verifyMerklePath(proof.bundle_digest, proof.proof_path, proof.root)
  ) {
    return { raw: 51, reason: "proof_path_invalid" };
  }
  return { raw: 0 };
}

export function verifyNoEquivocation({ feedRecords, secondArtifact }) {
  const { record_type, window_id, digest } = secondArtifact ?? {};
  const mine = feedRecords.find(
    (r) => r?.record_type === record_type && r?.window_id === window_id
  );
  if (!mine || recordDigest(mine) !== digest) {
    return { raw: 48, reason: "cross_artifact_digest_mismatch" };
  }
  return { raw: 0 };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage4n/inclusion.test.js`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4n/ tests/unit/llmShield/stage4n/
npm test
git add tools/simurgh-attestation/stage4n/core/merklePath.mjs tools/simurgh-attestation/stage4n/core/inclusionCore.mjs tests/unit/llmShield/stage4n/inclusion.test.js
git commit -m "feat(llm-shield): stage 4n merkle paths, Q12 bilateral inclusion, Q17 two-artifact equivocation"
```

---

### Task 6: Q13 (commit-now/reveal-later schedule) + Q14 (self-leakage budget) + Q16 (public-surface scan)

**Files:**

- Create: `tools/simurgh-attestation/stage4n/core/gatesCore.mjs`
- Test: `tests/unit/llmShield/stage4n/gates.test.js`

**Interfaces:**

- Consumes: `recordCore.mjs` (`commitBandVector`), `genesisCore.mjs` (`bandVectorSpaceSize`, `leakageBitsUpperBound`), `windowModel.mjs` (`windowIndex`), `constants.mjs` (`PUBLIC_FORBIDDEN_KEYS`, `BAND_DIMENSIONS`).
- Produces:
  - `verifyRevealSchedule(records, policy, asOfIndex): {raw:0}|{raw:52, reason}|{raw:50, reason:"reveal_commitment_mismatch"}` — Q13. For each reveal: `revealed_at_window` must equal its heartbeat's `reveal_due_window` and reveal must not appear before it (`reveal_early`); every window `k ≤ asOfIndex − d` must have a reveal (`reveal_overdue` — Fix 3: pending-within-delay is NOT overdue); recomputed `commitBandVector({window_id, bands, salt: reveal_salt})` must equal the heartbeat's `committed_band_vector_digest` (else raw 50 `reveal_commitment_mismatch`).
  - `verifyLeakageBudget(records, policy): {raw:0}|{raw:53, reason}` — Q14. Recomputes space/bits **from the policy alone** and compares to the record's `self_leakage` copy (`self_leakage_recompute_mismatch`); bound > budget → `band_vector_space_exceeds_budget`; a reveal with a dimension not in the policy → `undeclared_band_dimension`.
  - `scanPublicSurface(artifacts: Array<{name: string, value: unknown}>): {raw:0}|{raw:54, reason}` — Q16. Deep-walks each artifact: any key in `PUBLIC_FORBIDDEN_KEYS` → `inclusion_proof_material_public` (or `tier_label_public` for `bundle_tier`, `respondent_material_public` for `respondent_id_digest`); any **number** value under a band-dimension key (`breach_count`/`consumer_count`) → `raw_count_public`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/llmShield/stage4n/gates.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { buildChain } from "../../../../tools/simurgh-attestation/stage4n/core/chainCore.mjs";
import {
  scanPublicSurface,
  verifyLeakageBudget,
  verifyRevealSchedule,
} from "../../../../tools/simurgh-attestation/stage4n/core/gatesCore.mjs";

const policy = {
  reveal_policy: { aggregate_reveal_delay_windows: 2 },
  band_policy: {
    dimensions: {
      breach_count: ["0", "1-5", ">5"],
      consumer_count: ["0", "1-10", ">10"],
    },
    band_vector_space_size: 9,
    leakage_bits_per_reveal_max: 4,
  },
};
const perWindow = (n) => {
  const m = new Map();
  for (let k = 0; k <= n; k++) {
    m.set(k, {
      roots: {
        stage4k_exposure_root: recordDigest({ k, s: "4k" }),
        stage4l_cluster_budget_root: recordDigest({ k, s: "4l" }),
        stage4m_disclosure_root: recordDigest({ k, s: "4m" }),
      },
      rawCounts: { breach_count: 3, consumer_count: 7 },
    });
  }
  return m;
};
const clean = () => buildChain({ policy, asOfIndex: 4, perWindow: perWindow(4) });

test("Q13 passes clean; early (T6), overdue (T7), and commitment mismatch (T8) fail exactly", () => {
  assert.deepEqual(verifyRevealSchedule(clean(), policy, 4), { raw: 0 });

  const early = clean().map((r) =>
    r.record_type === "aggregate_reveal" && r.window_id === "synthetic-0000"
      ? { ...r, revealed_at_window: "synthetic-0000" }
      : r
  );
  assert.deepEqual(verifyRevealSchedule(early, policy, 4), { raw: 52, reason: "reveal_early" });

  const overdue = clean().filter(
    (r) => !(r.record_type === "aggregate_reveal" && r.window_id === "synthetic-0001")
  );
  assert.deepEqual(verifyRevealSchedule(overdue, policy, 4), { raw: 52, reason: "reveal_overdue" });

  const mismatched = clean().map((r) =>
    r.record_type === "aggregate_reveal" && r.window_id === "synthetic-0000"
      ? { ...r, bands: { ...r.bands, breach_count: ">5" } }
      : r
  );
  assert.deepEqual(verifyRevealSchedule(mismatched, policy, 4), {
    raw: 50,
    reason: "reveal_commitment_mismatch",
  });

  // Fix 3: windows inside the delay horizon are PENDING, never overdue — as_of=1, d=2
  const young = buildChain({ policy, asOfIndex: 1, perWindow: perWindow(1) });
  assert.deepEqual(verifyRevealSchedule(young, policy, 1), { raw: 0 });
});

test("Q14 recomputes leakage from policy alone (T9 + recompute mismatch)", () => {
  assert.deepEqual(verifyLeakageBudget(clean(), policy), { raw: 0 });

  const lyingCopy = clean().map((r) =>
    r.record_type === "aggregate_reveal"
      ? { ...r, self_leakage: { ...r.self_leakage, leakage_bits_upper_bound: 2 } }
      : r
  );
  assert.deepEqual(verifyLeakageBudget(lyingCopy, policy), {
    raw: 53,
    reason: "self_leakage_recompute_mismatch",
  });

  const fatPolicy = structuredClone(policy);
  fatPolicy.band_policy.dimensions.cluster_count = ["0", "1-10", ">10"]; // 27 vectors -> 5 bits
  fatPolicy.band_policy.band_vector_space_size = 27;
  assert.deepEqual(verifyLeakageBudget(clean(), fatPolicy), {
    raw: 53,
    reason: "band_vector_space_exceeds_budget",
  });
});

test("Q16 catches raw counts (T10) and bilateral material in public artifacts (T11)", () => {
  const publicArtifacts = [
    { name: "heartbeat-feed.jsonl", value: clean() },
    { name: "genesis-policy.json", value: policy },
  ];
  assert.deepEqual(scanPublicSurface(publicArtifacts), { raw: 0 });

  const rawCount = [...publicArtifacts, { name: "summary.json", value: { breach_count: 7 } }];
  assert.deepEqual(scanPublicSurface(rawCount), { raw: 54, reason: "raw_count_public" });

  const proofLeak = [
    ...publicArtifacts,
    { name: "oops.json", value: { nested: { proof_path: [] } } },
  ];
  assert.deepEqual(scanPublicSurface(proofLeak), {
    raw: 54,
    reason: "inclusion_proof_material_public",
  });

  const tierLeak = [...publicArtifacts, { name: "oops2.json", value: { bundle_tier: "Tier-R" } }];
  assert.deepEqual(scanPublicSurface(tierLeak), { raw: 54, reason: "tier_label_public" });

  const respondentLeak = [
    ...publicArtifacts,
    { name: "oops3.json", value: [{ respondent_id_digest: "sha256:aa" }] },
  ];
  assert.deepEqual(scanPublicSurface(respondentLeak), {
    raw: 54,
    reason: "respondent_material_public",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4n/gates.test.js`
Expected: FAIL — `Cannot find module .../stage4n/core/gatesCore.mjs`

- [ ] **Step 3: Implement `core/gatesCore.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Q13 schedule, Q14 self-leakage, Q16 public-surface scan (spec §6, Fixes 2/3/5).
// Q14 NEVER trusts a record's self_leakage copy — it recomputes from the policy alone.
// Q16 is the linkability tripwire: bilateral material in a public artifact is raw 54.
import { commitBandVector } from "./recordCore.mjs";
import { bandVectorSpaceSize, leakageBitsUpperBound } from "./genesisCore.mjs";
import { windowIndex } from "./windowModel.mjs";
import { PUBLIC_FORBIDDEN_KEYS } from "../constants.mjs";

export function verifyRevealSchedule(records, policy, asOfIndex) {
  const d = policy.reveal_policy.aggregate_reveal_delay_windows;
  const heartbeats = new Map(
    records.filter((r) => r?.record_type === "heartbeat").map((r) => [r.window_id, r])
  );
  const reveals = new Map(
    records.filter((r) => r?.record_type === "aggregate_reveal").map((r) => [r.window_id, r])
  );
  for (const [window_id, reveal] of reveals) {
    const heartbeat = heartbeats.get(window_id);
    if (!heartbeat) return { raw: 52, reason: "reveal_early" }; // reveal without commitment
    if (
      reveal.revealed_at_window !== heartbeat.reveal_commitment.reveal_due_window ||
      windowIndex(reveal.revealed_at_window) < windowIndex(window_id) + d
    ) {
      return { raw: 52, reason: "reveal_early" };
    }
    const recomputed = commitBandVector({
      window_id,
      bands: reveal.bands,
      salt: reveal.reveal_salt,
    });
    if (recomputed !== heartbeat.reveal_commitment.committed_band_vector_digest) {
      return { raw: 50, reason: "reveal_commitment_mismatch" };
    }
  }
  // Fix 3: due means window <= as_of - d. Later windows are pending, not overdue.
  for (const [window_id] of heartbeats) {
    if (windowIndex(window_id) <= asOfIndex - d && !reveals.has(window_id)) {
      return { raw: 52, reason: "reveal_overdue" };
    }
  }
  return { raw: 0 };
}

export function verifyLeakageBudget(records, policy) {
  const dims = policy.band_policy.dimensions;
  const space = bandVectorSpaceSize(dims);
  const bits = leakageBitsUpperBound(dims);
  const budget = policy.band_policy.leakage_bits_per_reveal_max;
  if (bits > budget) return { raw: 53, reason: "band_vector_space_exceeds_budget" };
  for (const r of records) {
    if (r?.record_type !== "aggregate_reveal") continue;
    for (const dim of Object.keys(r.bands ?? {})) {
      if (!(dim in dims)) return { raw: 53, reason: "undeclared_band_dimension" };
    }
    const sl = r.self_leakage ?? {};
    if (
      sl.band_vector_space_size !== space ||
      sl.leakage_bits_upper_bound !== bits ||
      sl.budget_bits !== budget ||
      sl.within_budget !== bits <= budget
    ) {
      return { raw: 53, reason: "self_leakage_recompute_mismatch" };
    }
  }
  return { raw: 0 };
}

const BAND_KEY_NAMES = Object.freeze(["breach_count", "consumer_count"]);

function scanValue(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = scanValue(item);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "bundle_tier") return "tier_label_public";
      if (key === "respondent_id_digest") return "respondent_material_public";
      if (PUBLIC_FORBIDDEN_KEYS.includes(key)) return "inclusion_proof_material_public";
      if (BAND_KEY_NAMES.includes(key) && typeof child === "number") return "raw_count_public";
      const hit = scanValue(child);
      if (hit) return hit;
    }
  }
  return null;
}

export function scanPublicSurface(artifacts) {
  for (const { value } of artifacts) {
    const hit = scanValue(value);
    if (hit) return { raw: 54, reason: hit };
  }
  return { raw: 0 };
}
```

Note the in-function order in `scanValue`: `bundle_tier` and `respondent_id_digest` are matched **before** the generic `PUBLIC_FORBIDDEN_KEYS` check so their specific reasons win; both are also members of `PUBLIC_FORBIDDEN_KEYS` for defence in depth.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage4n/gates.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4n/ tests/unit/llmShield/stage4n/
npm test
git add tools/simurgh-attestation/stage4n/core/gatesCore.mjs tests/unit/llmShield/stage4n/gates.test.js
git commit -m "feat(llm-shield): stage 4n schedule, self-leakage, and public-surface gates"
```

### Task 7: Q15 source-stage roots (Node adapter)

**Files:**

- Create: `tools/simurgh-attestation/stage4n/node/sourceRoots.mjs`
- Test: `tests/unit/llmShield/stage4n/sourceRoots.test.js`

**Interfaces:**

- Consumes: committed fixtures `tests/fixtures/llmShield/stage4k/expected-results/exposure-matrix.json`, `tests/fixtures/llmShield/stage4l/expected-results/cluster-matrix.json`, `tests/fixtures/llmShield/stage4m/expected-results/vxd-matrix.json`, and each 4M bundle's `disclosure.json` under `tests/fixtures/llmShield/stage4m/bundles/<name>/`; `stage4m/core/canonical.mjs` (`recordDigest`, `merkleRootSorted`).
- Produces:
  - `computeSourceRoots(repoRoot: string): Promise<{stage4k_exposure_root, stage4l_cluster_budget_root, stage4m_disclosure_root, disclosure_leaves: string[]}>` — `stage4k_exposure_root = recordDigest(parsed exposure-matrix.json)`; `stage4l_cluster_budget_root = recordDigest(parsed cluster-matrix.json)`; `stage4m_disclosure_root = merkleRootSorted(disclosure_leaves)` where `disclosure_leaves` = `recordDigest(parsed disclosure.json)` for every bundle directory (sorted by name) that contains one. `disclosure_leaves` is exported so the fixture builder can construct bilateral inclusion proofs.
  - `verifySourceRoots(heartbeats, roots): {raw:0}|{raw:50, reason}` — Q15: every heartbeat's three source roots match `roots` (`source_root_mismatch`) and `private_evidence_root` re-derives from them (`private_evidence_root_mismatch`, recomputed exactly as `chainCore.buildChain` derives it: `recordDigest({stage4k_exposure_root, stage4l_cluster_budget_root, stage4m_disclosure_root, window_id})`).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/llmShield/stage4n/sourceRoots.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { buildChain } from "../../../../tools/simurgh-attestation/stage4n/core/chainCore.mjs";
import {
  computeSourceRoots,
  verifySourceRoots,
} from "../../../../tools/simurgh-attestation/stage4n/node/sourceRoots.mjs";

const policy = { reveal_policy: { aggregate_reveal_delay_windows: 2 } };

test("computeSourceRoots derives stable roots from the committed 4K/4L/4M fixtures", async () => {
  const a = await computeSourceRoots(process.cwd());
  const b = await computeSourceRoots(process.cwd());
  assert.deepEqual(a, b); // deterministic
  for (const key of [
    "stage4k_exposure_root",
    "stage4l_cluster_budget_root",
    "stage4m_disclosure_root",
  ]) {
    assert.match(a[key], /^sha256:[a-f0-9]{64}$/, key);
  }
  assert.ok(Array.isArray(a.disclosure_leaves) && a.disclosure_leaves.length >= 1);
});

test("Q15 passes a chain built on the real roots and fails a mutated root (T4)", async () => {
  const { disclosure_leaves, ...roots } = await computeSourceRoots(process.cwd());
  const perWindow = new Map();
  for (let k = 0; k <= 2; k++) {
    perWindow.set(k, { roots, rawCounts: { breach_count: 0, consumer_count: 0 } });
  }
  const records = buildChain({ policy, asOfIndex: 2, perWindow });
  const heartbeats = records.filter((r) => r.record_type === "heartbeat");
  assert.deepEqual(verifySourceRoots(heartbeats, roots), { raw: 0 });

  const tampered = heartbeats.map((h, i) =>
    i === 1
      ? {
          ...h,
          commitments: { ...h.commitments, stage4k_exposure_root: recordDigest({ evil: 1 }) },
        }
      : h
  );
  assert.deepEqual(verifySourceRoots(tampered, roots), { raw: 50, reason: "source_root_mismatch" });

  const badPer = heartbeats.map((h, i) =>
    i === 0
      ? { ...h, commitments: { ...h.commitments, private_evidence_root: recordDigest({ x: 2 }) } }
      : h
  );
  assert.deepEqual(verifySourceRoots(badPer, roots), {
    raw: 50,
    reason: "private_evidence_root_mismatch",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4n/sourceRoots.test.js`
Expected: FAIL — `Cannot find module .../stage4n/node/sourceRoots.mjs`

- [ ] **Step 3: Implement `node/sourceRoots.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Q15 — heartbeats must bind REAL 4K/4L/4M evidence, not decorative digests (spec §6).
// Roots are recomputed from the committed source-stage fixtures; v0 models the private
// side in-repo because everything is synthetic (known limitation, spec §14).
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { merkleRootSorted, recordDigest } from "../../stage4m/core/canonical.mjs";

const parse = async (path) => JSON.parse(await readFile(path, "utf8"));

export async function computeSourceRoots(repoRoot) {
  const fx = join(repoRoot, "tests/fixtures/llmShield");
  const stage4k_exposure_root = recordDigest(
    await parse(join(fx, "stage4k/expected-results/exposure-matrix.json"))
  );
  const stage4l_cluster_budget_root = recordDigest(
    await parse(join(fx, "stage4l/expected-results/cluster-matrix.json"))
  );
  const bundlesDir = join(fx, "stage4m/bundles");
  const disclosure_leaves = [];
  for (const name of (await readdir(bundlesDir)).sort()) {
    try {
      disclosure_leaves.push(recordDigest(await parse(join(bundlesDir, name, "disclosure.json"))));
    } catch {
      // bundle without a disclosure.json — not a leaf
    }
  }
  return {
    stage4k_exposure_root,
    stage4l_cluster_budget_root,
    stage4m_disclosure_root: merkleRootSorted(disclosure_leaves),
    disclosure_leaves,
  };
}

export function verifySourceRoots(heartbeats, roots) {
  for (const h of heartbeats) {
    const c = h?.commitments ?? {};
    if (
      c.stage4k_exposure_root !== roots.stage4k_exposure_root ||
      c.stage4l_cluster_budget_root !== roots.stage4l_cluster_budget_root ||
      c.stage4m_disclosure_root !== roots.stage4m_disclosure_root
    ) {
      return { raw: 50, reason: "source_root_mismatch" };
    }
    const expected = recordDigest({
      stage4k_exposure_root: c.stage4k_exposure_root,
      stage4l_cluster_budget_root: c.stage4l_cluster_budget_root,
      stage4m_disclosure_root: c.stage4m_disclosure_root,
      window_id: h.window_id,
    });
    if (c.private_evidence_root !== expected) {
      return { raw: 50, reason: "private_evidence_root_mismatch" };
    }
  }
  return { raw: 0 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage4n/sourceRoots.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4n/ tests/unit/llmShield/stage4n/
npm test
git add tools/simurgh-attestation/stage4n/node/sourceRoots.mjs tests/unit/llmShield/stage4n/sourceRoots.test.js
git commit -m "feat(llm-shield): stage 4n Q15 source-root recomputation from committed 4K/4L/4M fixtures"
```

---

### Task 8: Composed verdict (pinned gate order) + verifier CLI

**Files:**

- Create: `tools/simurgh-attestation/stage4n/core/verdictCore.mjs`
- Create: `tools/simurgh-attestation/stage4n/node/verify-stage4n.mjs`
- Test: `tests/unit/llmShield/stage4n/verdict.test.js`

**Interfaces:**

- Consumes: every gate from Tasks 4–7, `genesisCore.mjs` (`validateGenesisPolicy`), `windowModel.mjs` (`windowIndex`), `constants.mjs`.
- Produces:
  - `seismographVerdict({policy, records, asOfWindow, sourceRoots, publicArtifacts, inclusionProof?, secondArtifact?}): {rawCode: number, reason: string|null, gate: string|null, as_of_window: string}` — applies the **pinned order Q10 → Q11 → Q15 → Q13 → Q14 → Q16 → Q12 → Q17** (Global Constraints); first failure wins; a malformed genesis policy or malformed `asOfWindow` is `{rawCode: 49, reason: "schema_invalid", gate: "Q10"}` (fail closed, chain can't be judged); clean → `{rawCode: 0, reason: null, gate: null}`. Q12/Q17 run only when their bilateral input is supplied.
  - CLI `node tools/simurgh-attestation/stage4n/node/verify-stage4n.mjs --feed <path.jsonl> --policy <path.json> --as-of <window-id> --repo-root <dir> [--inclusion-proof <path.json>] [--second-artifact <path.json>] --out <report.json>` — reads the feed (one JSON object per line), computes source roots via `computeSourceRoots`, collects `publicArtifacts` = the parsed feed + policy, writes `{schema: "simurgh.seismograph.verdict.v1", rawCode, runLevel, reason, gate, as_of_window, record_count}` to `--out`, and exits `process.exit(stage4CodeForRawCode(rawCode))`. **Never throws:** any internal error → report `{rawCode: 29, …}` and exit via the wrapper (fail closed).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/llmShield/stage4n/verdict.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { buildChain } from "../../../../tools/simurgh-attestation/stage4n/core/chainCore.mjs";
import { seismographVerdict } from "../../../../tools/simurgh-attestation/stage4n/core/verdictCore.mjs";
import {
  BAND_DIMENSIONS,
  LEAKAGE_BITS_MAX,
  SEISMOGRAPH_CHAIN_ID,
  SEISMOGRAPH_GENESIS_SCHEMA,
  SEISMOGRAPH_NON_CLAIMS,
} from "../../../../tools/simurgh-attestation/stage4n/constants.mjs";

const fullPolicy = () => ({
  schema: SEISMOGRAPH_GENESIS_SCHEMA,
  stage: "4N",
  chain_id: SEISMOGRAPH_CHAIN_ID,
  scope: { lane: "extraction", source_stages: ["4K", "4L", "4M"], reserved_exit_families: [] },
  publication: {
    surface: "in_repo_jsonl",
    feed_path: "docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl",
    append_only: true,
  },
  window_policy: {
    clock: "synthetic",
    cadence: "P1D",
    genesis_window: "synthetic-0000",
    max_overdue_heartbeats: 0,
  },
  reveal_policy: { aggregate_reveal_delay_windows: 2, freshest_oracle_non_claim: true },
  band_policy: {
    dimensions: BAND_DIMENSIONS,
    band_vector_space_size: 9,
    leakage_bits_per_reveal_max: LEAKAGE_BITS_MAX,
  },
  non_claims: [...SEISMOGRAPH_NON_CLAIMS],
  crypto: { canonicalization: "RFC8785_JCS", digest: "SHA-256", signature: "Ed25519" },
});

const roots = {
  stage4k_exposure_root: recordDigest({ s: "4k" }),
  stage4l_cluster_budget_root: recordDigest({ s: "4l" }),
  stage4m_disclosure_root: recordDigest({ s: "4m" }),
};
const mkArgs = () => {
  const policy = fullPolicy();
  const perWindow = new Map();
  for (let k = 0; k <= 4; k++) {
    perWindow.set(k, { roots, rawCounts: { breach_count: 1, consumer_count: 4 } });
  }
  const records = buildChain({ policy, asOfIndex: 4, perWindow });
  return {
    policy,
    records,
    asOfWindow: "synthetic-0004",
    sourceRoots: roots,
    publicArtifacts: [
      { name: "heartbeat-feed.jsonl", value: records },
      { name: "genesis-policy.json", value: policy },
    ],
  };
};

test("clean chain verdicts 0 with no gate", () => {
  assert.deepEqual(seismographVerdict(mkArgs()), {
    rawCode: 0,
    reason: null,
    gate: null,
    as_of_window: "synthetic-0004",
  });
});

test("pinned order: a covered-up drop reports Q11 raw 47 (silence, not a chain error)", () => {
  const args = mkArgs();
  // Cover-up: drop heartbeat 0002, re-number positions, re-forge prev digests. Q10 must
  // pass (the chain is internally perfect); Q11 must catch the silence. This is the T1
  // arm's semantics and the reason Q10 does subsequence matching.
  let prev = recordDigest(args.policy);
  args.records = args.records
    .filter((r) => !(r.record_type === "heartbeat" && r.window_id === "synthetic-0002"))
    .map((r, i) => {
      const relinked = { ...r, position: i, prev_record_digest: prev };
      prev = recordDigest(relinked);
      return relinked;
    });
  const verdict = seismographVerdict(args);
  assert.equal(verdict.rawCode, 47);
  assert.equal(verdict.gate, "Q11");
  assert.equal(verdict.reason, "heartbeat_absent_for_expected_window");
});

test("Q17 fires only when a second artifact is supplied", () => {
  const args = mkArgs();
  const hb = args.records.find(
    (r) => r.record_type === "heartbeat" && r.window_id === "synthetic-0003"
  );
  args.secondArtifact = {
    record_type: "heartbeat",
    window_id: "synthetic-0003",
    digest: recordDigest({ fork: true }),
  };
  const verdict = seismographVerdict(args);
  assert.deepEqual({ rawCode: verdict.rawCode, gate: verdict.gate }, { rawCode: 48, gate: "Q17" });
  // same artifact honest -> clean
  args.secondArtifact.digest = recordDigest(hb);
  assert.equal(seismographVerdict(args).rawCode, 0);
});

test("malformed policy or as_of fails closed at Q10", () => {
  const args = mkArgs();
  args.policy = { schema: "nope" };
  assert.equal(seismographVerdict(args).rawCode, 49);
  const args2 = mkArgs();
  args2.asOfWindow = "wall-clock-now";
  assert.equal(seismographVerdict(args2).rawCode, 49);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4n/verdict.test.js`
Expected: FAIL — `Cannot find module .../stage4n/core/verdictCore.mjs`

- [ ] **Step 3: Implement `core/verdictCore.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Composed verdict — the PINNED gate order (spec §6): Q10 → Q11 → Q15 → Q13 → Q14 → Q16
// → Q12 → Q17. First failure wins so every falsifier has exactly one legal answer.
// The verdict is a pure function of committed inputs (Fix 3): no clock, no IO.
import { validateGenesisPolicy } from "./genesisCore.mjs";
import { verifyChainIntegrity, verifyTemporalCompleteness } from "./chainCore.mjs";
import { verifyInclusionProof, verifyNoEquivocation } from "./inclusionCore.mjs";
import { scanPublicSurface, verifyLeakageBudget, verifyRevealSchedule } from "./gatesCore.mjs";
import { verifySourceRoots } from "../node/sourceRoots.mjs";
import { windowIndex } from "./windowModel.mjs";

export function seismographVerdict({
  policy,
  records,
  asOfWindow,
  sourceRoots,
  publicArtifacts,
  inclusionProof = null,
  secondArtifact = null,
}) {
  const done = (rawCode, reason, gate) => ({
    rawCode,
    reason,
    gate,
    as_of_window: typeof asOfWindow === "string" ? asOfWindow : null,
  });
  let asOfIndex;
  try {
    asOfIndex = windowIndex(asOfWindow);
  } catch {
    return done(49, "schema_invalid", "Q10");
  }
  if (!validateGenesisPolicy(policy).ok) return done(49, "schema_invalid", "Q10");

  const heartbeats = records.filter((r) => r?.record_type === "heartbeat");
  const gates = [
    ["Q10", () => verifyChainIntegrity(records, policy, asOfIndex)],
    ["Q11", () => verifyTemporalCompleteness(records, policy, asOfIndex)],
    ["Q15", () => verifySourceRoots(heartbeats, sourceRoots)],
    ["Q13", () => verifyRevealSchedule(records, policy, asOfIndex)],
    ["Q14", () => verifyLeakageBudget(records, policy)],
    ["Q16", () => scanPublicSurface(publicArtifacts)],
    [
      "Q12",
      () =>
        inclusionProof
          ? verifyInclusionProof({ proof: inclusionProof, feedRecords: records })
          : { raw: 0 },
    ],
    [
      "Q17",
      () =>
        secondArtifact
          ? verifyNoEquivocation({ feedRecords: records, secondArtifact })
          : { raw: 0 },
    ],
  ];
  for (const [gate, run] of gates) {
    const result = run();
    if (result.raw !== 0) return done(result.raw, result.reason, gate);
  }
  return done(0, null, null);
}
```

- [ ] **Step 4: Implement the CLI `node/verify-stage4n.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Offline Stage 4N verifier CLI. Fail-closed and total: never throws; every path exits
// through stage4CodeForRawCode. No network, no clock — as_of_window is an explicit input
// committed into the report (Fix 3).
import { readFile, writeFile } from "node:fs/promises";
import { stage4CodeForRawCode } from "../../stage4h/exitCodes.mjs";
import { seismographVerdict } from "../core/verdictCore.mjs";
import { computeSourceRoots } from "./sourceRoots.mjs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

const outPath = arg("--out");

async function main() {
  const feedPath = arg("--feed");
  const policyPath = arg("--policy");
  const asOfWindow = arg("--as-of");
  const repoRoot = arg("--repo-root") ?? process.cwd();
  if (!feedPath || !policyPath || !asOfWindow || !outPath) {
    return { rawCode: 29, reason: "usage_invalid", gate: null, as_of_window: asOfWindow ?? null };
  }
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  const records = (await readFile(feedPath, "utf8"))
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
  const { disclosure_leaves, ...sourceRoots } = await computeSourceRoots(repoRoot);
  void disclosure_leaves;
  const inclusionProofPath = arg("--inclusion-proof");
  const secondArtifactPath = arg("--second-artifact");
  return seismographVerdict({
    policy,
    records,
    asOfWindow,
    sourceRoots,
    publicArtifacts: [
      { name: "heartbeat-feed.jsonl", value: records },
      { name: "genesis-policy.json", value: policy },
    ],
    inclusionProof: inclusionProofPath
      ? JSON.parse(await readFile(inclusionProofPath, "utf8"))
      : null,
    secondArtifact: secondArtifactPath
      ? JSON.parse(await readFile(secondArtifactPath, "utf8"))
      : null,
  });
}

let verdict;
try {
  verdict = await main();
} catch {
  verdict = { rawCode: 29, reason: "internal_error_fail_closed", gate: null, as_of_window: null };
}
const report = {
  schema: "simurgh.seismograph.verdict.v1",
  rawCode: verdict.rawCode,
  runLevel: stage4CodeForRawCode(verdict.rawCode),
  reason: verdict.reason,
  gate: verdict.gate,
  as_of_window: verdict.as_of_window,
};
try {
  if (outPath) await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
} catch {
  report.rawCode = 29;
}
process.exit(stage4CodeForRawCode(report.rawCode));
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage4n/verdict.test.js`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4n/ tests/unit/llmShield/stage4n/
npm test
git add tools/simurgh-attestation/stage4n/core/verdictCore.mjs tools/simurgh-attestation/stage4n/node/verify-stage4n.mjs tests/unit/llmShield/stage4n/verdict.test.js
git commit -m "feat(llm-shield): stage 4n composed verdict with pinned gate order and fail-closed verifier cli"
```

---

### Task 9: Deterministic fixture builder — clean feed + tamper matrix (T0–T11)

**Files:**

- Create: `tools/simurgh-attestation/stage4n/node/build-stage4n-fixtures.mjs`
- Create (generated, committed): `tests/fixtures/llmShield/stage4n/` (`genesis-policy.json`, `feed/heartbeat-feed.jsonl`, `tamper/<arm>/…`, `bilateral/inclusion-proof-valid.json`, `expected-results/seismograph-matrix.json`)
- Modify: `.prettierignore` (add `tests/fixtures/llmShield/stage4n/`)
- Test: `tests/unit/llmShield/stage4n/fixtures.test.js`

**Interfaces:**

- Consumes: `buildChain`, `computeSourceRoots` (+ `disclosure_leaves`), `merklePathSorted`, all constants.
- Produces (files later tasks and the reproduce script depend on):
  - `tests/fixtures/llmShield/stage4n/genesis-policy.json` — the exact §5.1 policy.
  - `tests/fixtures/llmShield/stage4n/feed/heartbeat-feed.jsonl` — clean chain, `as_of = synthetic-0006`, d = 2 → 7 heartbeats + 5 reveals = 12 lines. Raw-count inputs are the fixed table below (private side modelled in-repo, synthetic).
  - `tests/fixtures/llmShield/stage4n/tamper/<arm>/heartbeat-feed.jsonl` for arms `t1-drop-heartbeat`, `t3-reorder`, `t4-mutate-4k-root`, `t6-early-reveal`, `t7-drop-due-reveal`, `t8-reveal-band-mismatch`, `t9-undeclared-dimension`, `t10-raw-count`; plus `tamper/t2-fork/second-artifact.json`, `tamper/t5-absent-heartbeat/inclusion-proof.json`, `tamper/t11-proof-material-public/public-extra.json`.
  - `tests/fixtures/llmShield/stage4n/bilateral/inclusion-proof-valid.json` — valid Tier-A proof over the real 4M `disclosure_leaves` (bilateral fixture: allowed under `tests/fixtures/`, NEVER under `docs/…/evidence/stage-4n/`).
  - `tests/fixtures/llmShield/stage4n/expected-results/seismograph-matrix.json` — `{arm: {raw, reason, gate}}` for T0–T11, the frozen one-legal-answer table.
- Builder honours `STAGE4N_FIXTURE_OUT` env var (temp regeneration for byte-compare, same pattern as 4M).

**Fixed raw-count table (deterministic, private side modelled in-repo):**

| window k | breach_count raw | consumer_count raw | bands          |
| -------- | ---------------- | ------------------ | -------------- |
| 0        | 0                | 0                  | `0` / `0`      |
| 1        | 2                | 4                  | `1-5` / `1-10` |
| 2        | 5                | 10                 | `1-5` / `1-10` |
| 3        | 3                | 7                  | `1-5` / `1-10` |
| 4        | 6                | 11                 | `>5` / `>10`   |
| 5        | 1                | 1                  | `1-5` / `1-10` |
| 6        | 0                | 2                  | `0` / `1-10`   |

- [ ] **Step 1: Write the failing test**

Create `tests/unit/llmShield/stage4n/fixtures.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const FIX = "tests/fixtures/llmShield/stage4n";
const readJson = async (p) => JSON.parse(await readFile(p, "utf8"));
const readFeed = async (p) =>
  (await readFile(p, "utf8"))
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l));

test("committed clean feed has the exact 12-record interleave at as_of synthetic-0006", async () => {
  const feed = await readFeed(`${FIX}/feed/heartbeat-feed.jsonl`);
  assert.equal(feed.length, 12);
  assert.deepEqual(
    feed.map((r) => [r.record_type, r.window_id]),
    [
      ["heartbeat", "synthetic-0000"],
      ["heartbeat", "synthetic-0001"],
      ["heartbeat", "synthetic-0002"],
      ["aggregate_reveal", "synthetic-0000"],
      ["heartbeat", "synthetic-0003"],
      ["aggregate_reveal", "synthetic-0001"],
      ["heartbeat", "synthetic-0004"],
      ["aggregate_reveal", "synthetic-0002"],
      ["heartbeat", "synthetic-0005"],
      ["aggregate_reveal", "synthetic-0003"],
      ["heartbeat", "synthetic-0006"],
      ["aggregate_reveal", "synthetic-0004"],
    ]
  );
});

test("expected-results matrix pins one legal answer per arm", async () => {
  const matrix = await readJson(`${FIX}/expected-results/seismograph-matrix.json`);
  assert.deepEqual(matrix["t0-clean"], { raw: 0, reason: null, gate: null });
  assert.deepEqual(matrix["t1-drop-heartbeat"], {
    raw: 47,
    reason: "heartbeat_absent_for_expected_window",
    gate: "Q11",
  });
  assert.deepEqual(matrix["t2-fork"], {
    raw: 48,
    reason: "cross_artifact_digest_mismatch",
    gate: "Q17",
  });
  assert.equal(matrix["t3-reorder"].raw, 49);
  assert.deepEqual(matrix["t4-mutate-4k-root"], {
    raw: 50,
    reason: "source_root_mismatch",
    gate: "Q15",
  });
  assert.deepEqual(matrix["t5-absent-heartbeat"], {
    raw: 51,
    reason: "referenced_heartbeat_absent",
    gate: "Q12",
  });
  assert.deepEqual(matrix["t6-early-reveal"], { raw: 52, reason: "reveal_early", gate: "Q13" });
  assert.deepEqual(matrix["t7-drop-due-reveal"], {
    raw: 52,
    reason: "reveal_overdue",
    gate: "Q13",
  });
  assert.deepEqual(matrix["t8-reveal-band-mismatch"], {
    raw: 50,
    reason: "reveal_commitment_mismatch",
    gate: "Q13",
  });
  assert.equal(matrix["t9-undeclared-dimension"].raw, 53);
  assert.equal(matrix["t10-raw-count"].raw, 54);
  assert.deepEqual(matrix["t11-proof-material-public"], {
    raw: 54,
    reason: "inclusion_proof_material_public",
    gate: "Q16",
  });
});

test("no bilateral material under the public fixture surfaces", async () => {
  // The clean feed and policy must scan clean — proof material lives ONLY under bilateral/
  const feed = await readFeed(`${FIX}/feed/heartbeat-feed.jsonl`);
  const flat = JSON.stringify(feed);
  for (const forbidden of ["proof_path", "bundle_tier", "respondent_id_digest"]) {
    assert.equal(flat.includes(forbidden), false, forbidden);
  }
});
```

Design note frozen here — **why T1 pins Q11 raw 47, not Q10 raw 49**: a naive drop of heartbeat `synthetic-0002` also breaks positions and prev-digest links, so Q10 would fire first and Q11 would never be exercised. The builder therefore constructs T1 as a _cover-up_: drop the heartbeat, then re-number positions and re-forge prev digests (the `relink` helper) so the chain looks internally perfect and only the silence remains. That is the realistic adversary (a producer hiding a window, not a producer leaving broken links), and it is the only way the pinned order yields exactly one legal answer per arm. The unforged variant — a drop with stale links — is arm T3's territory (chain-order violation, raw 49).

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4n/fixtures.test.js`
Expected: FAIL — `ENOENT … tests/fixtures/llmShield/stage4n/feed/heartbeat-feed.jsonl`

- [ ] **Step 3: Implement `node/build-stage4n-fixtures.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic Stage 4N fixture builder (spec §8). Clean feed + tamper arms + the frozen
// one-legal-answer matrix. Honours STAGE4N_FIXTURE_OUT for temp regeneration (byte-compare
// in the reproduce script). No randomness, no clock, no network.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import {
  BAND_DIMENSIONS,
  LEAKAGE_BITS_MAX,
  SEISMOGRAPH_CHAIN_ID,
  SEISMOGRAPH_GENESIS_SCHEMA,
  SEISMOGRAPH_INCLUSION_SCHEMA,
  SEISMOGRAPH_NON_CLAIMS,
} from "../constants.mjs";
import { buildChain } from "../core/chainCore.mjs";
import { merklePathSorted } from "../core/merklePath.mjs";
import { commitBandVector } from "../core/recordCore.mjs";
import { computeSourceRoots } from "./sourceRoots.mjs";

const OUT = process.env.STAGE4N_FIXTURE_OUT ?? "tests/fixtures/llmShield/stage4n";
const AS_OF = "synthetic-0006";

const RAW_COUNTS = [
  { breach_count: 0, consumer_count: 0 },
  { breach_count: 2, consumer_count: 4 },
  { breach_count: 5, consumer_count: 10 },
  { breach_count: 3, consumer_count: 7 },
  { breach_count: 6, consumer_count: 11 },
  { breach_count: 1, consumer_count: 1 },
  { breach_count: 0, consumer_count: 2 },
];

const policy = {
  schema: SEISMOGRAPH_GENESIS_SCHEMA,
  stage: "4N",
  chain_id: SEISMOGRAPH_CHAIN_ID,
  scope: { lane: "extraction", source_stages: ["4K", "4L", "4M"], reserved_exit_families: [] },
  publication: {
    surface: "in_repo_jsonl",
    feed_path: "docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl",
    append_only: true,
  },
  window_policy: {
    clock: "synthetic",
    cadence: "P1D",
    genesis_window: "synthetic-0000",
    max_overdue_heartbeats: 0,
  },
  reveal_policy: { aggregate_reveal_delay_windows: 2, freshest_oracle_non_claim: true },
  band_policy: {
    dimensions: BAND_DIMENSIONS,
    band_vector_space_size: 9,
    leakage_bits_per_reveal_max: LEAKAGE_BITS_MAX,
  },
  non_claims: [...SEISMOGRAPH_NON_CLAIMS],
  crypto: { canonicalization: "RFC8785_JCS", digest: "SHA-256", signature: "Ed25519" },
};

const toJsonl = (records) => `${records.map((r) => JSON.stringify(r)).join("\n")}\n`;
async function write(path, content) {
  await mkdir(dirname(join(OUT, path)), { recursive: true });
  await writeFile(join(OUT, path), content);
}
const writeJson = (path, value) => write(path, `${JSON.stringify(value, null, 2)}\n`);

// Re-link a mutated record list so ONLY the intended violation remains visible (used by
// arms that must reach gates past Q10).
function relink(records) {
  let prev = recordDigest(policy);
  return records.map((r, i) => {
    const linked = { ...r, position: i, prev_record_digest: prev };
    prev = recordDigest(linked);
    return linked;
  });
}

const { disclosure_leaves, ...roots } = await computeSourceRoots(process.cwd());
const perWindow = new Map(RAW_COUNTS.map((rawCounts, k) => [k, { roots, rawCounts }]));
const clean = buildChain({ policy, asOfIndex: 6, perWindow });

const hb = (feed, id) => feed.find((r) => r.record_type === "heartbeat" && r.window_id === id);
const isRv = (r, id) => r.record_type === "aggregate_reveal" && r.window_id === id;

// T1: drop heartbeat 0002 AND re-forge links — pure silence, Q11 raw 47.
const t1 = relink(
  clean.filter((r) => !(r.record_type === "heartbeat" && r.window_id === "synthetic-0002"))
);
// T3: swap two records THEN re-forge links — the surviving violation is pure interleave
// order (Q10 raw 49). Without the relink, position_discontinuity would fire instead and
// the arm would have two plausible answers.
const t3Swapped = [...clean];
[t3Swapped[1], t3Swapped[2]] = [t3Swapped[2], t3Swapped[1]];
const t3 = relink(t3Swapped);
// T4: mutate the 4K root in heartbeat 0003, re-forge links — Q15 raw 50.
const t4 = relink(
  clean.map((r) =>
    r.record_type === "heartbeat" && r.window_id === "synthetic-0003"
      ? {
          ...r,
          commitments: { ...r.commitments, stage4k_exposure_root: recordDigest({ evil: 1 }) },
        }
      : r
  )
);
// T6: reveal 0000 claims it was revealed at its own window — Q13 reveal_early.
const t6 = relink(
  clean.map((r) => (isRv(r, "synthetic-0000") ? { ...r, revealed_at_window: "synthetic-0000" } : r))
);
// T7: drop the due reveal for 0001 — Q13 reveal_overdue.
const t7 = relink(clean.filter((r) => !isRv(r, "synthetic-0001")));
// T8: reveal bands contradict the committed vector — raw 50 reveal_commitment_mismatch.
const t8 = relink(
  clean.map((r) =>
    isRv(r, "synthetic-0000") ? { ...r, bands: { ...r.bands, breach_count: ">5" } } : r
  )
);
// T9: a producer who CONSISTENTLY discloses an undeclared cluster_count dimension — the
// reveal carries the third band AND its heartbeat's committed vector is re-forged to match,
// so Q10 (structural) and Q13 (commitment recompute) both pass and the violation surfaces
// exactly at Q14 undeclared_band_dimension. A sloppy variant (band added, commitment stale)
// would stop at Q13 raw 50 — that is arm T8's territory.
const t9Reveal = clean.find((r) => isRv(r, "synthetic-0000"));
const t9Bands = { ...t9Reveal.bands, cluster_count: "1-10" };
const t9 = relink(
  clean.map((r) => {
    if (isRv(r, "synthetic-0000")) return { ...r, bands: t9Bands };
    if (r.record_type === "heartbeat" && r.window_id === "synthetic-0000") {
      return {
        ...r,
        reveal_commitment: {
          ...r.reveal_commitment,
          committed_band_vector_digest: commitBandVector({
            window_id: "synthetic-0000",
            bands: t9Bands,
            salt: t9Reveal.reveal_salt,
          }),
        },
      };
    }
    return r;
  })
);
// T10: a public summary artifact discloses a raw count — Q16 raw_count_public.
const t10Extra = { name: "public-extra.json", value: { breach_count: 7 } };
// T11: inclusion-proof material in a public artifact — Q16 inclusion_proof_material_public.
const t11Extra = { name: "public-extra.json", value: { nested: { proof_path: [] } } };
// T2: a second artifact telling a different story for window 0003 — Q17 raw 48.
const t2Second = {
  record_type: "heartbeat",
  window_id: "synthetic-0003",
  digest: recordDigest({ other_story: true }),
};
// T5: bilateral proof referencing a heartbeat absent from the feed — Q12 raw 51.
const bundleLeaf = disclosure_leaves[0];
const validProof = {
  schema: SEISMOGRAPH_INCLUSION_SCHEMA,
  stage: "4N",
  distribution: "bilateral_only",
  window_id: "synthetic-0003",
  heartbeat_digest: recordDigest(hb(clean, "synthetic-0003")),
  bundle_digest: bundleLeaf,
  bundle_tier: "Tier-A",
  included_under: "stage4m_disclosure_root",
  proof_path: merklePathSorted(disclosure_leaves, bundleLeaf),
  root: roots.stage4m_disclosure_root,
};
const t5Proof = { ...validProof, heartbeat_digest: recordDigest({ ghost: 1 }) };

const matrix = {
  "t0-clean": { raw: 0, reason: null, gate: null },
  "t1-drop-heartbeat": { raw: 47, reason: "heartbeat_absent_for_expected_window", gate: "Q11" },
  "t2-fork": { raw: 48, reason: "cross_artifact_digest_mismatch", gate: "Q17" },
  "t3-reorder": { raw: 49, reason: "interleave_order_violation", gate: "Q10" },
  "t4-mutate-4k-root": { raw: 50, reason: "source_root_mismatch", gate: "Q15" },
  "t5-absent-heartbeat": { raw: 51, reason: "referenced_heartbeat_absent", gate: "Q12" },
  "t6-early-reveal": { raw: 52, reason: "reveal_early", gate: "Q13" },
  "t7-drop-due-reveal": { raw: 52, reason: "reveal_overdue", gate: "Q13" },
  "t8-reveal-band-mismatch": { raw: 50, reason: "reveal_commitment_mismatch", gate: "Q13" },
  "t9-undeclared-dimension": { raw: 53, reason: "undeclared_band_dimension", gate: "Q14" },
  "t10-raw-count": { raw: 54, reason: "raw_count_public", gate: "Q16" },
  "t11-proof-material-public": { raw: 54, reason: "inclusion_proof_material_public", gate: "Q16" },
};

await writeJson("genesis-policy.json", policy);
await write("feed/heartbeat-feed.jsonl", toJsonl(clean));
await write("tamper/t1-drop-heartbeat/heartbeat-feed.jsonl", toJsonl(t1));
await writeJson("tamper/t2-fork/second-artifact.json", t2Second);
await write("tamper/t3-reorder/heartbeat-feed.jsonl", toJsonl(t3));
await write("tamper/t4-mutate-4k-root/heartbeat-feed.jsonl", toJsonl(t4));
await writeJson("tamper/t5-absent-heartbeat/inclusion-proof.json", t5Proof);
await write("tamper/t6-early-reveal/heartbeat-feed.jsonl", toJsonl(t6));
await write("tamper/t7-drop-due-reveal/heartbeat-feed.jsonl", toJsonl(t7));
await write("tamper/t8-reveal-band-mismatch/heartbeat-feed.jsonl", toJsonl(t8));
await write("tamper/t9-undeclared-dimension/heartbeat-feed.jsonl", toJsonl(t9));
await writeJson("tamper/t10-raw-count/public-extra.json", t10Extra.value);
await writeJson("tamper/t11-proof-material-public/public-extra.json", t11Extra.value);
await writeJson("bilateral/inclusion-proof-valid.json", validProof);
await writeJson("expected-results/seismograph-matrix.json", matrix);
console.log(`stage4n fixtures written to ${OUT}`);
```

Design note frozen here: **T9 pins `undeclared_band_dimension` at Q14** via the consistent-producer cover-up (band added AND commitment re-forged), the only construction that survives Q10 and Q13 to reach Q14. The policy-level `band_vector_space_exceeds_budget` reason — the draft's original arithmetic defect — stays covered as a permanent regression guard by the `fatPolicy` unit case in Task 6.

- [ ] **Step 4: Add fixtures to `.prettierignore`**

Append to `.prettierignore` (after the `tests/fixtures/llmShield/stage4m/` line):

```
tests/fixtures/llmShield/stage4n/
docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl
```

- [ ] **Step 5: Generate, verify, commit**

Run: `node tools/simurgh-attestation/stage4n/node/build-stage4n-fixtures.mjs`
Expected: `stage4n fixtures written to tests/fixtures/llmShield/stage4n`

Run: `node tools/simurgh-attestation/stage4n/node/build-stage4n-fixtures.mjs && git status --short tests/fixtures/llmShield/stage4n`
Expected: second run produces **no changes** (byte-stable).

Run: `node --test tests/unit/llmShield/stage4n/fixtures.test.js`
Expected: PASS (3 tests)

```bash
npx prettier --write tools/simurgh-attestation/stage4n/ tests/unit/llmShield/stage4n/ .prettierignore
npm test
git add tools/simurgh-attestation/stage4n/node/build-stage4n-fixtures.mjs tests/fixtures/llmShield/stage4n/ tests/unit/llmShield/stage4n/fixtures.test.js .prettierignore
git commit -m "test(llm-shield): stage 4n deterministic fixtures with twelve-arm tamper matrix"
```

### Task 10: Attestation + signed manifest + public evidence artifacts

**Files:**

- Create: `tools/simurgh-attestation/stage4n/node/build-stage4n-attestation.mjs`
- Create (generated, committed): `docs/research/llm-shield/evidence/stage-4n/genesis-policy.json`, `heartbeat-feed.jsonl`, `stage4n-attestation.json`, `heartbeat-manifest.json`
- Create (committed): `tests/fixtures/llmShield/stage4n/seismograph-signer.pub`
- Test: `tests/unit/llmShield/stage4n/attestation.test.js`

**Interfaces:**

- Consumes: `stage4d/stage4dCrypto.mjs` (`domainBytes`, `publicKeyFingerprint`) — same crypto discipline as 4M's `build-stage4m-attestation.mjs`; `stage4m/core/canonical.mjs` (`recordDigest`, `merkleRootSorted`); constants; the Task 9 fixtures.
- Produces:
  - `buildSeismographAttestation({policy, records, asOfWindow, sourceRoots}): object` — `{schema: SEISMOGRAPH_ATTESTATION_SCHEMA, chain_id, as_of_window, genesis_policy_digest, feed_root: merkleRootSorted(records.map(recordDigest)), chain_head_digest: recordDigest(last record), record_counts: {heartbeat, aggregate_reveal}, source_roots, known_limitations, non_claims}`. Guard clause (mirrors 4M's Tier-P leak guard): serialise the attestation and throw `public_surface_leak` if any `PUBLIC_FORBIDDEN_KEYS` name appears.
  - `buildSeismographManifest({attestation, privateKey, publicKeyPem})` / `verifySeismographManifest({manifest, attestation, publicKey})` — byte-for-byte the 4M pattern over `SEISMOGRAPH_MANIFEST_DOMAIN` (payload `{schema, attestation_digest}`, `ed25519:` signature, `public_key_fingerprint`).
  - CLI mode: `node tools/simurgh-attestation/stage4n/node/build-stage4n-attestation.mjs --private-key <path.pem> --out-dir docs/research/llm-shield/evidence/stage-4n` — copies the fixture policy + feed, builds and signs. Ephemeral-key mode for tests: `--ephemeral` generates a keypair in-process and writes `seismograph-signer.pub` (SPKI PEM) beside the outputs, exactly like the 4M fixture builder's `generateKeyPairSync` pattern. The committed evidence is signed ONCE with the stage4n key (generated via the existing `tools/simurgh-attestation/keygen.mjs`, private key stored OUTSIDE the repo — same as every prior stage).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/llmShield/stage4n/attestation.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  buildSeismographAttestation,
  buildSeismographManifest,
  verifySeismographManifest,
} from "../../../../tools/simurgh-attestation/stage4n/node/build-stage4n-attestation.mjs";
import { computeSourceRoots } from "../../../../tools/simurgh-attestation/stage4n/node/sourceRoots.mjs";

const FIX = "tests/fixtures/llmShield/stage4n";
const policy = JSON.parse(await readFile(`${FIX}/genesis-policy.json`, "utf8"));
const records = (await readFile(`${FIX}/feed/heartbeat-feed.jsonl`, "utf8"))
  .split("\n")
  .filter((l) => l.trim() !== "")
  .map((l) => JSON.parse(l));
const { disclosure_leaves, ...sourceRoots } = await computeSourceRoots(process.cwd());
void disclosure_leaves;

test("attestation binds as_of_window, policy digest, feed root, and head digest", () => {
  const a = buildSeismographAttestation({
    policy,
    records,
    asOfWindow: "synthetic-0006",
    sourceRoots,
  });
  assert.equal(a.schema, "simurgh.seismograph.attestation.v1");
  assert.equal(a.as_of_window, "synthetic-0006");
  assert.equal(a.genesis_policy_digest, recordDigest(policy));
  assert.equal(a.chain_head_digest, recordDigest(records.at(-1)));
  assert.deepEqual(a.record_counts, { heartbeat: 7, aggregate_reveal: 5 });
  assert.deepEqual(a.source_roots, sourceRoots);
  assert.ok(a.non_claims.includes("equivocation_detection_requires_two_artifacts"));
  assert.ok(a.known_limitations.includes("reveal_commitment_binding_not_hiding_low_entropy_v0"));
});

test("manifest signs and verifies; key substitution and digest tamper fail", () => {
  const a = buildSeismographAttestation({
    policy,
    records,
    asOfWindow: "synthetic-0006",
    sourceRoots,
  });
  const signer = generateKeyPairSync("ed25519");
  const stranger = generateKeyPairSync("ed25519");
  const publicKeyPem = signer.publicKey.export({ type: "spki", format: "pem" });
  const manifest = buildSeismographManifest({
    attestation: a,
    privateKey: signer.privateKey,
    publicKeyPem,
  });
  assert.deepEqual(
    verifySeismographManifest({ manifest, attestation: a, publicKey: signer.publicKey }),
    { ok: true }
  );
  assert.deepEqual(
    verifySeismographManifest({ manifest, attestation: a, publicKey: stranger.publicKey }),
    { ok: false, reason: "signature_invalid" }
  );
  const tampered = { ...a, as_of_window: "synthetic-0009" };
  assert.deepEqual(
    verifySeismographManifest({ manifest, attestation: tampered, publicKey: signer.publicKey }),
    { ok: false, reason: "attestation_digest_mismatch" }
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4n/attestation.test.js`
Expected: FAIL — `Cannot find module .../stage4n/node/build-stage4n-attestation.mjs`

- [ ] **Step 3: Implement `node/build-stage4n-attestation.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Attestation + manifest for the public heartbeat (spec §5.5). The attestation commits
// the verdict inputs — as_of_window included (Fix 3) — so "overdue" is recomputable on
// any machine on any day. Same crypto discipline as 4M (domain-separated Ed25519).
import { sign, verify } from "node:crypto";
import { canonicalJson, merkleRootSorted, recordDigest } from "../../stage4m/core/canonical.mjs";
import { domainBytes, publicKeyFingerprint } from "../../stage4d/stage4dCrypto.mjs";
import {
  PUBLIC_FORBIDDEN_KEYS,
  SEISMOGRAPH_ATTESTATION_SCHEMA,
  SEISMOGRAPH_CHAIN_ID,
  SEISMOGRAPH_KNOWN_LIMITATIONS,
  SEISMOGRAPH_MANIFEST_DOMAIN,
  SEISMOGRAPH_MANIFEST_SCHEMA,
  SEISMOGRAPH_NON_CLAIMS,
} from "../constants.mjs";

export const seismographAttestationDigest = (a) => recordDigest(a);

export function buildSeismographAttestation({ policy, records, asOfWindow, sourceRoots }) {
  const attestation = {
    schema: SEISMOGRAPH_ATTESTATION_SCHEMA,
    chain_id: SEISMOGRAPH_CHAIN_ID,
    as_of_window: asOfWindow,
    genesis_policy_digest: recordDigest(policy),
    feed_root: merkleRootSorted(records.map(recordDigest)),
    chain_head_digest: recordDigest(records.at(-1)),
    record_counts: {
      heartbeat: records.filter((r) => r.record_type === "heartbeat").length,
      aggregate_reveal: records.filter((r) => r.record_type === "aggregate_reveal").length,
    },
    source_roots: {
      stage4k_exposure_root: sourceRoots.stage4k_exposure_root,
      stage4l_cluster_budget_root: sourceRoots.stage4l_cluster_budget_root,
      stage4m_disclosure_root: sourceRoots.stage4m_disclosure_root,
    },
    known_limitations: [...SEISMOGRAPH_KNOWN_LIMITATIONS],
    non_claims: [...SEISMOGRAPH_NON_CLAIMS],
  };
  // Public-surface guard (mirrors 4M's Tier-P leak guard): the attestation is PUBLIC.
  const flat = canonicalJson(attestation);
  for (const key of PUBLIC_FORBIDDEN_KEYS) {
    if (flat.includes(`"${key}"`)) throw new Error(`public_surface_leak: ${key}`);
  }
  return attestation;
}

export function buildSeismographManifest({ attestation, privateKey, publicKeyPem }) {
  const payload = {
    schema: SEISMOGRAPH_MANIFEST_SCHEMA,
    attestation_digest: seismographAttestationDigest(attestation),
  };
  const signature = `ed25519:${sign(null, domainBytes(SEISMOGRAPH_MANIFEST_DOMAIN, payload), privateKey).toString("base64")}`;
  return {
    ...payload,
    signature,
    public_key_fingerprint: `sha256:${publicKeyFingerprint(publicKeyPem)}`,
  };
}

export function verifySeismographManifest({ manifest, attestation, publicKey }) {
  const { signature, public_key_fingerprint, ...payload } = manifest;
  void public_key_fingerprint;
  if (payload.schema !== SEISMOGRAPH_MANIFEST_SCHEMA) {
    return { ok: false, reason: "manifest_schema_mismatch" };
  }
  if (payload.attestation_digest !== seismographAttestationDigest(attestation)) {
    return { ok: false, reason: "attestation_digest_mismatch" };
  }
  if (typeof signature !== "string" || !signature.startsWith("ed25519:")) {
    return { ok: false, reason: "signature_malformed" };
  }
  try {
    const ok = verify(
      null,
      domainBytes(SEISMOGRAPH_MANIFEST_DOMAIN, payload),
      publicKey,
      Buffer.from(signature.slice("ed25519:".length), "base64")
    );
    return ok ? { ok: true } : { ok: false, reason: "signature_invalid" };
  } catch {
    return { ok: false, reason: "signature_invalid" };
  }
}
```

Then add the CLI tail (guarded so imports stay side-effect-free for tests):

```js
// CLI: build + sign the public evidence dir. --ephemeral for tests; a real key otherwise.
if (process.argv[1] && process.argv[1].endsWith("build-stage4n-attestation.mjs")) {
  const { readFile, writeFile, mkdir, copyFile } = await import("node:fs/promises");
  const { createPrivateKey, generateKeyPairSync } = await import("node:crypto");
  const { join } = await import("node:path");
  const { computeSourceRoots } = await import("./sourceRoots.mjs");
  const arg = (name) => {
    const i = process.argv.indexOf(name);
    return i === -1 ? null : process.argv[i + 1];
  };
  const outDir = arg("--out-dir") ?? "docs/research/llm-shield/evidence/stage-4n";
  const FIX = "tests/fixtures/llmShield/stage4n";
  await mkdir(outDir, { recursive: true });
  await copyFile(`${FIX}/genesis-policy.json`, join(outDir, "genesis-policy.json"));
  await copyFile(`${FIX}/feed/heartbeat-feed.jsonl`, join(outDir, "heartbeat-feed.jsonl"));
  const policy = JSON.parse(await readFile(join(outDir, "genesis-policy.json"), "utf8"));
  const records = (await readFile(join(outDir, "heartbeat-feed.jsonl"), "utf8"))
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l));
  const { disclosure_leaves, ...sourceRoots } = await computeSourceRoots(process.cwd());
  void disclosure_leaves;
  let privateKey;
  let publicKeyPem;
  if (process.argv.includes("--ephemeral")) {
    const pair = generateKeyPairSync("ed25519");
    privateKey = pair.privateKey;
    publicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" });
  } else {
    const keyPath = arg("--private-key");
    if (!keyPath) {
      console.error("usage: --private-key <pem> [--out-dir <dir>] | --ephemeral");
      process.exit(29);
    }
    privateKey = createPrivateKey(await readFile(keyPath, "utf8"));
    publicKeyPem = JSON.parse(
      await readFile("tests/fixtures/llmShield/stage4n/seismograph-signer.pub", "utf8")
    ).public_key_pem;
  }
  const attestation = buildSeismographAttestation({
    policy,
    records,
    asOfWindow: "synthetic-0006",
    sourceRoots,
  });
  const manifest = buildSeismographManifest({ attestation, privateKey, publicKeyPem });
  await writeFile(
    join(outDir, "stage4n-attestation.json"),
    `${JSON.stringify(attestation, null, 2)}\n`
  );
  await writeFile(
    join(outDir, "heartbeat-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  if (process.argv.includes("--ephemeral")) {
    await writeFile(
      join(outDir, "seismograph-signer.pub"),
      `${JSON.stringify({ key_type: "Ed25519", format: "spki-pem", public_key_pem: publicKeyPem }, null, 2)}\n`
    );
  }
  console.log(`stage4n attestation written to ${outDir}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage4n/attestation.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Generate the ONE-TIME signing key and the committed evidence**

```bash
mkdir -p ~/.simurgh-keys
node tools/simurgh-attestation/keygen.mjs \
  --out-private ~/.simurgh-keys/stage4n-seismograph.pem \
  --out-public tests/fixtures/llmShield/stage4n/seismograph-signer.pub
node tools/simurgh-attestation/stage4n/node/build-stage4n-attestation.mjs \
  --private-key ~/.simurgh-keys/stage4n-seismograph.pem
```

Expected: `stage4n attestation written to docs/research/llm-shield/evidence/stage-4n`. Verify the private key is NOT in the repo: `git status --short | grep -c "pem"` → `0`.

- [ ] **Step 6: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4n/ tests/unit/llmShield/stage4n/
npm test
git add tools/simurgh-attestation/stage4n/node/build-stage4n-attestation.mjs \
  tests/unit/llmShield/stage4n/attestation.test.js tests/fixtures/llmShield/stage4n/seismograph-signer.pub \
  docs/research/llm-shield/evidence/stage-4n/
git commit -m "feat(llm-shield): stage 4n signed attestation, manifest, and public evidence feed"
```

---

### Task 11: K7-style all-functions E2E net

**Files:**

- Create: `tests/e2e/llmShield/stage4n/seismographFullNet.test.js`

**Interfaces:**

- Consumes: everything shipped in Tasks 1–10 — the CLI (`verify-stage4n.mjs`), the fixture tree, the matrix, the attestation modules, `stage4CodeForRawCode`.
- Produces: the stage's integrated proof — clean path, all matrix arms at exact raw + run-level, exit-wrapper exhaustiveness, anti-theatre deletion, byte-idempotent rebuild, evidence-artifact inventory. Run by the reproduce script (Task 12), NOT by `npm test`.

- [ ] **Step 1: Write the E2E net (it must pass immediately — everything exists)**

Create `tests/e2e/llmShield/stage4n/seismographFullNet.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4N all-functions E2E net (spec §9). Composes every export: fixture build →
// clean verify → all tamper arms at EXACT raw code and run-level → exit-wrapper
// exhaustiveness → anti-theatre deletion → attestation verify → artifact inventory.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createPublicKey } from "node:crypto";
import {
  SEISMOGRAPH_RAW_CODES,
  stage4CodeForRawCode,
} from "../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import {
  buildSeismographAttestation,
  verifySeismographManifest,
} from "../../../tools/simurgh-attestation/stage4n/node/build-stage4n-attestation.mjs";
import { computeSourceRoots } from "../../../tools/simurgh-attestation/stage4n/node/sourceRoots.mjs";

const FIX = "tests/fixtures/llmShield/stage4n";
const EVID = "docs/research/llm-shield/evidence/stage-4n";
const CLI = "tools/simurgh-attestation/stage4n/node/verify-stage4n.mjs";
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// Run the verifier CLI; return {exitCode, report}. Never throws on non-zero exit.
function runVerify({ feed, policy = `${FIX}/genesis-policy.json`, extra = [] }) {
  const out = join(mkdtempSync(join(tmpdir(), "s4n-")), "report.json");
  let exitCode = 0;
  try {
    execFileSync(
      process.execPath,
      [
        CLI,
        "--feed",
        feed,
        "--policy",
        policy,
        "--as-of",
        "synthetic-0006",
        "--out",
        out,
        ...extra,
      ],
      { stdio: "pipe" }
    );
  } catch (err) {
    exitCode = err.status ?? 3;
  }
  return { exitCode, report: readJson(out) };
}

const matrix = readJson(`${FIX}/expected-results/seismograph-matrix.json`);

test("T0 clean feed verifies raw 0, run-level 0", () => {
  const { exitCode, report } = runVerify({ feed: `${FIX}/feed/heartbeat-feed.jsonl` });
  assert.equal(report.rawCode, 0);
  assert.equal(exitCode, 0);
});

test("feed-tamper arms hit their exact raw code and run-level", () => {
  const feedArms = [
    "t1-drop-heartbeat",
    "t3-reorder",
    "t4-mutate-4k-root",
    "t6-early-reveal",
    "t7-drop-due-reveal",
    "t8-reveal-band-mismatch",
    "t9-undeclared-dimension",
  ];
  for (const arm of feedArms) {
    const { exitCode, report } = runVerify({ feed: `${FIX}/tamper/${arm}/heartbeat-feed.jsonl` });
    assert.equal(report.rawCode, matrix[arm].raw, `${arm} raw`);
    assert.equal(report.reason, matrix[arm].reason, `${arm} reason`);
    assert.equal(report.gate, matrix[arm].gate, `${arm} gate`);
    assert.equal(exitCode, stage4CodeForRawCode(matrix[arm].raw), `${arm} run-level`);
  }
});

test("T2 fork (second artifact) and T5 invalid inclusion proof (bilateral inputs)", () => {
  const t2 = runVerify({
    feed: `${FIX}/feed/heartbeat-feed.jsonl`,
    extra: ["--second-artifact", `${FIX}/tamper/t2-fork/second-artifact.json`],
  });
  assert.equal(t2.report.rawCode, 48);
  const t5 = runVerify({
    feed: `${FIX}/feed/heartbeat-feed.jsonl`,
    extra: ["--inclusion-proof", `${FIX}/tamper/t5-absent-heartbeat/inclusion-proof.json`],
  });
  assert.equal(t5.report.rawCode, 51);
  // valid bilateral proof stays green
  const ok = runVerify({
    feed: `${FIX}/feed/heartbeat-feed.jsonl`,
    extra: ["--inclusion-proof", `${FIX}/bilateral/inclusion-proof-valid.json`],
  });
  assert.equal(ok.report.rawCode, 0);
});

test("exit wrapper exhaustiveness over the 4N band and unknowns", () => {
  for (const code of Object.values(SEISMOGRAPH_RAW_CODES)) {
    assert.equal(stage4CodeForRawCode(code), 1);
  }
  assert.equal(stage4CodeForRawCode(39), 3);
  assert.equal(stage4CodeForRawCode(99), 3); // T12: unknown fails closed
});

test("anti-theatre (T13): deleting the tail record cannot stay green", () => {
  const tmp = mkdtempSync(join(tmpdir(), "s4n-theatre-"));
  const lines = readFileSync(`${FIX}/feed/heartbeat-feed.jsonl`, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "");
  writeFileSync(join(tmp, "truncated.jsonl"), `${lines.slice(0, -1).join("\n")}\n`);
  const { report } = runVerify({ feed: join(tmp, "truncated.jsonl") });
  assert.notEqual(report.rawCode, 0); // silence is never green
  rmSync(tmp, { recursive: true, force: true });
});

test("committed evidence: attestation recomputes and manifest verifies offline", async () => {
  const policy = readJson(`${EVID}/genesis-policy.json`);
  const records = readFileSync(`${EVID}/heartbeat-feed.jsonl`, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l));
  const { disclosure_leaves, ...sourceRoots } = await computeSourceRoots(process.cwd());
  void disclosure_leaves;
  const rebuilt = buildSeismographAttestation({
    policy,
    records,
    asOfWindow: "synthetic-0006",
    sourceRoots,
  });
  assert.deepEqual(rebuilt, readJson(`${EVID}/stage4n-attestation.json`));
  const pub = createPublicKey(readJson(`${FIX}/seismograph-signer.pub`).public_key_pem);
  assert.deepEqual(
    verifySeismographManifest({
      manifest: readJson(`${EVID}/heartbeat-manifest.json`),
      attestation: rebuilt,
      publicKey: pub,
    }),
    { ok: true }
  );
});

test("byte-idempotency: fixture rebuild into temp matches the committed tree", () => {
  const tmp = mkdtempSync(join(tmpdir(), "s4n-rebuild-"));
  execFileSync(
    process.execPath,
    ["tools/simurgh-attestation/stage4n/node/build-stage4n-fixtures.mjs"],
    { env: { ...process.env, STAGE4N_FIXTURE_OUT: tmp }, stdio: "pipe" }
  );
  for (const rel of [
    "genesis-policy.json",
    "feed/heartbeat-feed.jsonl",
    "expected-results/seismograph-matrix.json",
    "tamper/t1-drop-heartbeat/heartbeat-feed.jsonl",
    "tamper/t9-undeclared-dimension/heartbeat-feed.jsonl",
    "bilateral/inclusion-proof-valid.json",
  ]) {
    assert.equal(
      readFileSync(join(tmp, rel), "utf8"),
      readFileSync(join(FIX, rel), "utf8"),
      `byte-stable: ${rel}`
    );
  }
  rmSync(tmp, { recursive: true, force: true });
});

test("public evidence inventory is exactly the documented artifact list", () => {
  const artifacts = [
    "genesis-policy.json",
    "heartbeat-feed.jsonl",
    "heartbeat-manifest.json",
    "stage4n-attestation.json",
  ];
  for (const artifact of artifacts) {
    assert.doesNotThrow(() => readFileSync(join(EVID, artifact)), artifact);
  }
  // Fix 5 tripwire: no bilateral material anywhere under the public evidence dir
  for (const artifact of artifacts) {
    const content = readFileSync(join(EVID, artifact), "utf8");
    for (const forbidden of ["proof_path", "bundle_tier", "respondent_id_digest"]) {
      assert.equal(content.includes(forbidden), false, `${artifact} leaks ${forbidden}`);
    }
  }
});
```

- [ ] **Step 2: Run the net**

Run: `node --test tests/e2e/llmShield/stage4n/seismographFullNet.test.js`
Expected: PASS (8 tests). Any failure here is a real integration defect from Tasks 1–10 — fix the module, never the expectation, unless the matrix itself was mis-pinned (then fix matrix + builder together and regenerate).

- [ ] **Step 3: Commit**

```bash
npx prettier --write tests/e2e/llmShield/stage4n/
git add tests/e2e/llmShield/stage4n/
git commit -m "test(llm-shield): stage 4n all-functions e2e net with tamper matrix and anti-theatre arms"
```

---

### Task 12: One-command reproduce script + byte-idempotency

**Files:**

- Create: `scripts/reproduce-llm-shield-stage4n.sh` (chmod +x)

**Interfaces:**

- Consumes: everything. Mirrors `scripts/reproduce-llm-shield-stage4m.sh` structure exactly (env pins, `exit_via_wrapper`, `run_step`, temp regeneration + `cmp`).
- Produces: the reviewer's single command. Output ends `[stage4n] ALL GREEN`.

- [ ] **Step 1: Write the script**

Create `scripts/reproduce-llm-shield-stage4n.sh`:

```bash
#!/usr/bin/env bash
# Stage 4N / Extraction Seismograph one-command reproduce (spec §11). Final exit ALWAYS
# routed through stage4CodeForRawCode — never a bare exit 1. No network, no wall clock:
# as_of is the committed synthetic-0006.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
export PATH="/opt/homebrew/bin:$PATH"

RAW=0
FIX="tests/fixtures/llmShield/stage4n"
EVID="docs/research/llm-shield/evidence/stage-4n"
EXIT_WRAPPER='import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))'

exit_via_wrapper() { node -e "$EXIT_WRAPPER" "$1"; }
run_step() { # run_step <raw-on-failure> <cmd...>
  local raw="$1"
  shift
  if ! "$@"; then
    RAW="$raw"
    echo "[stage4n] step failed -> raw $RAW" >&2
    exit_via_wrapper "$RAW"
  fi
}

echo "[stage4n] [1/8] env + node major >= 26"
run_step 28 node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)'

echo "[stage4n] [2/8] regenerate fixtures into temp (never committed paths)"
T1="$(mktemp -d)"
trap 'rm -rf "$T1"' EXIT
run_step 29 env STAGE4N_FIXTURE_OUT="$T1" node tools/simurgh-attestation/stage4n/node/build-stage4n-fixtures.mjs

echo "[stage4n] [3/8] unit suite (all stage4n modules, explicit globs)"
run_step 29 node --test tests/unit/llmShield/stage4n/*.test.js

echo "[stage4n] [4/8] committed deterministic artifacts match temp regeneration byte-for-byte"
for f in genesis-policy.json feed/heartbeat-feed.jsonl expected-results/seismograph-matrix.json \
  bilateral/inclusion-proof-valid.json \
  tamper/t1-drop-heartbeat/heartbeat-feed.jsonl tamper/t2-fork/second-artifact.json \
  tamper/t3-reorder/heartbeat-feed.jsonl tamper/t4-mutate-4k-root/heartbeat-feed.jsonl \
  tamper/t5-absent-heartbeat/inclusion-proof.json tamper/t6-early-reveal/heartbeat-feed.jsonl \
  tamper/t7-drop-due-reveal/heartbeat-feed.jsonl tamper/t8-reveal-band-mismatch/heartbeat-feed.jsonl \
  tamper/t9-undeclared-dimension/heartbeat-feed.jsonl; do
  run_step 29 cmp "$FIX/$f" "$T1/$f"
done

echo "[stage4n] [5/8] public evidence feed matches the fixture feed byte-for-byte"
run_step 29 cmp "$FIX/feed/heartbeat-feed.jsonl" "$EVID/heartbeat-feed.jsonl"
run_step 29 cmp "$FIX/genesis-policy.json" "$EVID/genesis-policy.json"

echo "[stage4n] [6/8] all-functions e2e net (tamper matrix + anti-theatre + attestation)"
run_step 29 node --test tests/e2e/llmShield/stage4n/*.test.js

echo "[stage4n] [7/8] clean verdict on the committed public feed"
REPORT="$T1/final-report.json"
set +e
node tools/simurgh-attestation/stage4n/node/verify-stage4n.mjs \
  --feed "$EVID/heartbeat-feed.jsonl" --policy "$EVID/genesis-policy.json" \
  --as-of synthetic-0006 --out "$REPORT" >/dev/null 2>&1
VERIFY_EXIT=$?
set -e
if [ "$VERIFY_EXIT" != "0" ]; then
  echo "[stage4n] committed feed did not verify clean (exit $VERIFY_EXIT)" >&2
  exit_via_wrapper 29
fi

echo "[stage4n] [8/8] working tree unchanged by this reproduce"
if [ -n "$(git status --porcelain -- "$FIX" "$EVID")" ]; then
  echo "[stage4n] reproduce dirtied the tree" >&2
  exit_via_wrapper 29
fi

echo "[stage4n] ALL GREEN"
exit_via_wrapper 0
```

- [ ] **Step 2: Make it executable and run it twice**

```bash
chmod +x scripts/reproduce-llm-shield-stage4n.sh
bash scripts/reproduce-llm-shield-stage4n.sh
bash scripts/reproduce-llm-shield-stage4n.sh
```

Expected: both runs print `[stage4n] ALL GREEN` and exit 0; `git status --short` unchanged after both (byte-idempotent).

- [ ] **Step 3: Commit**

```bash
git add scripts/reproduce-llm-shield-stage4n.sh
git commit -m "feat(llm-shield): stage 4n one-command reproduce with byte-idempotency gate"
```

---

### Task 13: Lean proof lane — temporal completeness

**Files:**

- Create: `proofs/stage4n/TemporalCompleteness.lean`
- Create: `proofs/stage4n/lean-toolchain` (copy of `proofs/stage4m/lean-toolchain` — pins `leanprover/lean4:v4.15.0`)
- Modify: `.github/workflows/stage-4-lean-proofs.yml` (add one line after the AntiMonotonicity line)
- Modify: `proofs/README.md` (add the theorem row + prose)

**Interfaces:**

- Consumes: nothing from the JS side — self-contained core Lean 4, no mathlib (repo proof-lane rule).
- Produces: machine-checked Lemma 1 (spec §10): an interleaved chain that is position-perfect cannot omit an expected record — omission forces a detectable discontinuity.

- [ ] **Step 1: Write the proof**

Create `proofs/stage4n/TemporalCompleteness.lean`:

```lean
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4N temporal completeness (spec §10, Lemma 1). Self-contained: core Lean 4 only,
-- no mathlib. Model: the expected schedule is a function `expected : Nat → Rec` (the
-- deterministic interleave of spec §5.0); a published chain is a list of records carrying
-- consecutive positions. THE THEOREM: if the chain is position-perfect (record i is
-- exactly expected i) and long enough to cover slot k, then slot k's record IS present —
-- contrapositively, omitting an expected record forces either a position/successor
-- discontinuity (Q10, raw 49) or a too-short chain (Q11/Q13, raw 47/52). Silence is
-- never invisible. Limitation (signed): proof_is_of_model_not_implementation.

namespace Simurgh.Stage4N

/-- A record in the model: its kind and window index. -/
structure Rec where
  kind : Nat -- 0 = heartbeat, 1 = aggregate_reveal
  window : Nat
  deriving Repr, DecidableEq

/-- A chain is well-formed w.r.t. a schedule iff every held position matches it. -/
def wellFormed (expected : Nat → Rec) (chain : List Rec) : Prop :=
  ∀ i, (h : i < chain.length) → chain.get ⟨i, h⟩ = expected i

/-- Temporal completeness: a well-formed chain covering slot k contains expected k. -/
theorem expected_present (expected : Nat → Rec) (chain : List Rec)
    (hwf : wellFormed expected chain) (k : Nat) (hk : k < chain.length) :
    chain.get ⟨k, hk⟩ = expected k :=
  hwf k hk

/-- Omission detectability (contrapositive form): if expected k is NOT in the chain,
    the chain is either too short to cover k (liveness failure — detectable by length)
    or not well-formed (a discontinuity — detectable by position/successor check). -/
theorem omission_detectable (expected : Nat → Rec) (chain : List Rec) (k : Nat)
    (habsent : ∀ i, (h : i < chain.length) → chain.get ⟨i, h⟩ ≠ expected k) :
    chain.length ≤ k ∨ ¬ wellFormed expected chain := by
  by_cases hlen : chain.length ≤ k
  · exact Or.inl hlen
  · apply Or.inr
    intro hwf
    have hk : k < chain.length := Nat.lt_of_not_le hlen
    exact habsent k hk (hwf k hk)

/-- Two well-formed chains over the same schedule agree on every shared position —
    the non-equivocation core of Q17: a fork requires breaking well-formedness. -/
theorem no_silent_fork (expected : Nat → Rec) (c₁ c₂ : List Rec)
    (h₁ : wellFormed expected c₁) (h₂ : wellFormed expected c₂)
    (i : Nat) (hi₁ : i < c₁.length) (hi₂ : i < c₂.length) :
    c₁.get ⟨i, hi₁⟩ = c₂.get ⟨i, hi₂⟩ := by
  rw [h₁ i hi₁, h₂ i hi₂]

end Simurgh.Stage4N
```

- [ ] **Step 2: Type-check it**

```bash
cp proofs/stage4m/lean-toolchain proofs/stage4n/lean-toolchain
lean proofs/stage4n/TemporalCompleteness.lean
```

Expected: exit 0, no output, no `sorry`. If `lean` is not installed locally: `elan toolchain install leanprover/lean4:v4.15.0` first; if elan is unavailable in this environment, record a controlled skip — the CI workflow is the gate of record (consistent with prior stages) — and note the skip in the Task 14 closeout doc.

- [ ] **Step 3: Wire CI + README**

In `.github/workflows/stage-4-lean-proofs.yml`, after the line `lean proofs/stage4m/AntiMonotonicity.lean`, add:

```yaml
lean proofs/stage4n/TemporalCompleteness.lean
```

In `proofs/README.md`: add `lean proofs/stage4n/TemporalCompleteness.lean` to the run-locally block, and append this row to the theorem table:

```markdown
| `expected_present`, `omission_detectable`, `no_silent_fork` | `stage4n/TemporalCompleteness.lean` | 4N | A position-perfect chain covering slot k contains expected k; omitting an expected record forces a too-short chain or a detectable discontinuity; two well-formed chains cannot fork silently. |
```

- [ ] **Step 4: Commit**

```bash
git add proofs/stage4n/ proofs/README.md .github/workflows/stage-4-lean-proofs.yml
git commit -m "feat(proofs): stage 4n machine-checked temporal-completeness and no-silent-fork lemmas"
```

---

### Task 14: Reviewer docs + closeout test + final docs-accuracy pass

**Files:**

- Create: `docs/research/llm-shield/STAGE_4N_THREAT_MODEL.md`
- Create: `docs/research/llm-shield/STAGE_4N_VALIDATION_MATRIX.md`
- Create: `docs/research/llm-shield/STAGE_4N_REVIEWER_CHECKLIST.md`
- Create: `docs/research/llm-shield/STAGE_4N_CLOSEOUT.md`
- Create: `docs/research/llm-shield/STAGE_4N_C9_ARTICLE73_PROJECTION.md`
- Create: `docs/research/llm-shield/evidence/stage-4n/README.md`
- Test: `tests/unit/llmShield/stage4n/closeout.test.js`

**Content requirements (all five docs carry the motto header `> **Motto.** AnthropicSafe First, then ReviewerSafe.`):**

- **THREAT_MODEL**: spec §13 verbatim structure (adversary / trusted base / out of scope), plus the Fix 4 scoping statement ("a single feed proves its own integrity, not the absence of a fork elsewhere") and the Fix 5 bilateral rule.
- **VALIDATION_MATRIX**: the T0–T13 table from spec §8 with the FROZEN answers from `expected-results/seismograph-matrix.json` (T1 = 47/Q11 cover-up semantics, T3 = 49/Q10, T9 = 53 `undeclared_band_dimension`, T12 = run-level 3 via wrapper, T13 = anti-theatre), plus the gate order Q10 → Q11 → Q15 → Q13 → Q14 → Q16 → Q12 → Q17.
- **REVIEWER_CHECKLIST**: the three commands (`bash scripts/reproduce-llm-shield-stage4n.sh`; `node --test tests/e2e/llmShield/stage4n/*.test.js`; `node tools/simurgh-attestation/stage4n/node/verify-stage4n.mjs --feed docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl --policy docs/research/llm-shield/evidence/stage-4n/genesis-policy.json --as-of synthetic-0006 --out /tmp/report.json`) with expected outputs.
- **CLOSEOUT**: what shipped, the spec §14 non-claims **verbatim**, known limitations from `constants.mjs` verbatim, the honest prior-art positioning (CT / SCITT / warrant canaries — **no "first transparency log" claim**), and "Out of scope (deferred, seeded)": real-cadence deployment profile, additional exit families, cross-provider corroboration (4P/CPC), VFR.
- **C9_ARTICLE73_PROJECTION**: docs-only mapping of heartbeat cadence + `max_overdue_heartbeats` onto the EU GPAI Commitment-9 / Article-73 severity-based 2/5/10/15-day initial-report deadlines (template published 2025-11-04; guidance applies 2026-08-02), carrying `not_legal_compliance_certification` verbatim, plus the related-work paragraph on arXiv:2605.08192 ("evidential inversion"; tiered public/controlled/claim-restricted disclosure ≙ P/A/R + public anchor). Same discipline as 4M's Article-73 projection.
- **evidence README**: what each of the four public artifacts is, the one-command verify, and the Fix 5 note that inclusion proofs are bilateral and intentionally absent.

- [ ] **Step 1: Write the closeout test FIRST (drives doc completeness)**

Create `tests/unit/llmShield/stage4n/closeout.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  SEISMOGRAPH_KNOWN_LIMITATIONS,
  SEISMOGRAPH_NON_CLAIMS,
} from "../../../../tools/simurgh-attestation/stage4n/constants.mjs";

const DOCS = "docs/research/llm-shield";
const read = (p) => readFile(p, "utf8");

test("all five reviewer docs exist and carry the motto header", async () => {
  for (const doc of [
    "STAGE_4N_THREAT_MODEL.md",
    "STAGE_4N_VALIDATION_MATRIX.md",
    "STAGE_4N_REVIEWER_CHECKLIST.md",
    "STAGE_4N_CLOSEOUT.md",
    "STAGE_4N_C9_ARTICLE73_PROJECTION.md",
  ]) {
    const content = await read(`${DOCS}/${doc}`);
    assert.ok(content.includes("AnthropicSafe First, then ReviewerSafe"), `${doc} missing motto`);
  }
});

test("closeout carries every non-claim and known limitation verbatim", async () => {
  const closeout = await read(`${DOCS}/STAGE_4N_CLOSEOUT.md`);
  for (const nc of SEISMOGRAPH_NON_CLAIMS) assert.ok(closeout.includes(nc), nc);
  for (const kl of SEISMOGRAPH_KNOWN_LIMITATIONS) assert.ok(closeout.includes(kl), kl);
});

test("no forbidden overclaims anywhere in the 4N docs", async () => {
  for (const doc of [
    "STAGE_4N_THREAT_MODEL.md",
    "STAGE_4N_VALIDATION_MATRIX.md",
    "STAGE_4N_REVIEWER_CHECKLIST.md",
    "STAGE_4N_CLOSEOUT.md",
    "STAGE_4N_C9_ARTICLE73_PROJECTION.md",
  ]) {
    const content = (await read(`${DOCS}/${doc}`)).toLowerCase();
    assert.equal(content.includes("first transparency log"), false, doc);
    assert.equal(content.includes("model is safe"), false, doc);
    assert.equal(content.includes("prevents extraction"), false, doc);
  }
});

test("validation matrix documents the frozen answers and pinned gate order", async () => {
  const matrixDoc = await read(`${DOCS}/STAGE_4N_VALIDATION_MATRIX.md`);
  assert.ok(matrixDoc.includes("Q10 → Q11 → Q15 → Q13 → Q14 → Q16 → Q12 → Q17"));
  const frozen = JSON.parse(
    await read("tests/fixtures/llmShield/stage4n/expected-results/seismograph-matrix.json")
  );
  for (const [arm, { raw }] of Object.entries(frozen)) {
    assert.ok(matrixDoc.includes(arm), `matrix doc missing ${arm}`);
    if (raw !== 0) assert.ok(matrixDoc.includes(String(raw)), `matrix doc missing raw ${raw}`);
  }
});

test("projection doc carries the compliance non-claim verbatim", async () => {
  const projection = await read(`${DOCS}/STAGE_4N_C9_ARTICLE73_PROJECTION.md`);
  assert.ok(projection.includes("not_legal_compliance_certification"));
  assert.ok(projection.includes("2605.08192")); // related-work anchor
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/stage4n/closeout.test.js`
Expected: FAIL — `ENOENT … STAGE_4N_THREAT_MODEL.md`

- [ ] **Step 3: Write the five docs + evidence README**

Write each doc per the content requirements above. Structure each with: title, motto blockquote, then sections. Copy non-claims and known limitations **from `constants.mjs`**, never retype them. For the VALIDATION_MATRIX table, transcribe `expected-results/seismograph-matrix.json` exactly and add rows for T12 (unknown raw → run-level 3 via wrapper; unit-tested) and T13 (anti-theatre deletion; e2e-tested). Keep every claim scoped: reporting liveness and non-equivocation, never detection or prevention.

- [ ] **Step 4: Run the closeout test until green**

Run: `node --test tests/unit/llmShield/stage4n/closeout.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Final docs-accuracy pass (spec N15 — verify every claim against shipped code)**

Run each and confirm zero drift:

```bash
# raw codes named in docs must match exitCodes.mjs
grep -o "raw 4[7-9]\|raw 5[0-4]" docs/research/llm-shield/STAGE_4N_*.md | sort -u
# schema names in docs must exist in constants.mjs
grep -o "simurgh\.seismograph\.[a-z_]*\.v1" docs/research/llm-shield/STAGE_4N_*.md | sort -u | \
  while read -r s; do grep -q "$s" tools/simurgh-attestation/stage4n/constants.mjs || echo "DRIFT: $s"; done
# artifact list in docs matches the repo
ls docs/research/llm-shield/evidence/stage-4n/
# no raw counts in public artifacts (Q16 discipline, checked textually too)
grep -rn '"breach_count": [0-9]' docs/research/llm-shield/evidence/stage-4n/ && echo "LEAK" || echo "clean"
# full gates
npm test && npm run format:check && bash scripts/reproduce-llm-shield-stage4n.sh
```

Expected: no `DRIFT:`, `clean`, all suites green, `[stage4n] ALL GREEN`.

- [ ] **Step 6: Commit**

```bash
npx prettier --write docs/research/llm-shield/STAGE_4N_*.md docs/research/llm-shield/evidence/stage-4n/README.md tests/unit/llmShield/stage4n/
npm test
git add docs/research/llm-shield/STAGE_4N_*.md docs/research/llm-shield/evidence/stage-4n/README.md tests/unit/llmShield/stage4n/closeout.test.js
git commit -m "docs(llm-shield): stage 4n threat model, validation matrix, reviewer checklist, closeout, and c9/article-73 projection"
```

---

## Release gate (spec §16 — verify before tagging, in order)

- [ ] `npm test` green (includes all stage4n unit suites + refreshed goldens)
- [ ] `node --test tests/e2e/llmShield/stage4n/*.test.js` green
- [ ] `bash scripts/reproduce-llm-shield-stage4n.sh` → `[stage4n] ALL GREEN`, twice, tree clean
- [ ] `node --test tests/e2e/llmShield/stage4l/fullChain.e2e.test.js tests/e2e/llmShield/stage4m/vxdFullNet.test.js tests/e2e/llmShield/stage4kAllFunctions.test.js tests/e2e/llmShield/stage4hFullSmoke.test.js` green (cross-stage golden sanity after the 47–54 extension)
- [ ] Lean proof type-checks in CI (or controlled documented skip recorded in the closeout)
- [ ] `scripts/check.sh` — the two pre-existing local failures (`node --check` on stale `.worktrees/`, prettier on untracked `wiki/`) are the ONLY failures
- [ ] `git tag --sort=-creatordate | head -3` to confirm the next version number BEFORE tagging (4J gotcha: stages have shipped elsewhere)
- [ ] Release notes: use the honesty lines from spec §15, non-claims verbatim, no "first transparency log" wording, neutral attribution

## Self-review record (plan-time)

- **Spec coverage:** §5.0–§5.5 → Tasks 2–4, 9, 10; §6 Q10–Q17 → Tasks 4–8; §7 → Task 1; §8 T0–T13 → Tasks 9, 11 (T12 unit + e2e, T13 e2e); §9 → Task 11; §10 → Task 13; §11 → Task 12; §12 N1–N15 → Tasks 1–14; §13/§14 → Task 14 + constants; §16 → release gate above.
- **Known deliberate deltas from the spec text (frozen during planning, all tightenings):** (1) Q10 does subsequence matching so Q11's raw 47 stays reachable — T1 is the cover-up construction; (2) T9 pins `undeclared_band_dimension` via the consistent-producer construction (spec §8's table said raw 53; the reason is now exact); (3) reveal records live in the SAME chain as heartbeats (spec §5.0 already fixed this — reaffirmed here because the draft's two-file variant keeps tempting); (4) `heartbeat-manifest.json` signs the attestation digest (4M pattern) rather than a separate root set — one signature, same binding strength.
- **Type consistency:** gate results are `{raw, reason}` everywhere; the composed verdict re-shapes to `{rawCode, reason, gate, as_of_window}`; the CLI report adds `runLevel` + `schema`. `computeSourceRoots` returns the three roots + `disclosure_leaves`; every consumer destructures and `void`s the leaves when unused.
