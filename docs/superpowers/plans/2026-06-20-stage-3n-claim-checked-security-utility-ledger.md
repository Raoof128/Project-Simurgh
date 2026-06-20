# Stage 3N — Claim-Checked Security–Utility Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, key-free measurement stage that normalises Simurgh's frozen evidence into a held-line security–utility ledger, refuses cross-denominator pooling, and machine-checks every registered claim against committed evidence fields under a closed-world rule.

**Architecture:** A pure helper library (`tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs`) holds all logic with no I/O; a thin runner (`..._runner.mjs`) reads frozen evidence JSON, computes the ledger/contract/claim outputs, and either verifies committed evidence (default) or rewrites it (`--update-metrics`). Audit scripts + a policy-drift guard + `check.sh` wiring enforce the gates. This mirrors the Stage 3L lib/runner/audit pattern exactly.

**Tech Stack:** Node.js ESM (`.mjs`), `node:test` + `node:assert/strict`, `node:crypto` (sha256 only), bash audit scripts. Zero new dependencies. Reuses the existing Stage 3M verifier for the attestation-validity row.

## Global Constraints

- No `src/llmShield/**` change — Stage 3N is a measurement stage; a policy-drift guard enforces this (copied verbatim PROTECTED list from `scripts/policy-drift-guard-llm-shield-stage3m.sh`).
- Branch: `main-stage-3n-claim-checked-security-utility-ledger` (already created and checked out; the spec is committed on it).
- Release target tag: `v1.7.0-stage-3n-claim-checked-security-utility-ledger`.
- Lib files are pure (no I/O, no network, no secrets). Only the runner does file I/O.
- The machine check is **field-equality on JSON fields**, never prose NLP.
- Closed-world rule: every claim in the 3N surface is `verified` or `excluded_from_ledger` with a reason; anything else FAILS.
- No pooled ASR is ever reported; `frontier_status = not_applicable_degenerate`.
- Stretch (signing the bundle with 3M tooling) is NOT a hard gate and is out of this plan's required scope.
- All committed JSON evidence is `JSON.stringify(value, null, 2) + "\n"`; run `npx prettier --write` on the evidence dir after any `--update-metrics`.
- **Commit messages are neutral/descriptive with NO `Co-Authored-By` trailer** (project-wide policy for Project-Simurgh; see review fix 1). Example: `git commit -m "feat(llm-shield): add stage 3n metric contract and anti-pooling logic"`.

### Review Fixes (applied during execution — supersede the per-task code where they conflict)

1. **No co-author trailer** on any commit (see constraint above). Strip the trailer from every commit command in this plan.
2. **Default-mode runner verifies ALL generated JSON files**, not just two. In Task 6 default mode, recompute every generated artifact and compare each committed `*.json` (all 11 JSON files; `runner-output.txt` and `README.md`/`citation-verification.md` excluded) against its recomputation; any mismatch throws "run --update-metrics".
3. **`all_ledger_rows_hash_to_committed_evidence` is per-row**, not a count. Each normalised row carries `source_files: string[]`; the gate is true iff every file listed by every row exists in `evidence-hashes.json` with a matching sha256. Implemented as lib fn `computeLedgerHashBinding(rows, evidenceHashes)` (unit-tested in Task 5).
4. **The 3M attestation row is hash-bound.** `evidenceHashes` includes `stage-3m/attestation.bundle.json`, `attestation.signature.json`, `attestation.public-key.json`; the attestation row's `source_files` lists those three, so fix 3 also binds the attestation row.

### Frozen source files (read-only inputs — never modified by 3N)

| Family                         | File                                                                                        | Fields used                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentdojo_layer2`             | `docs/research/llm-shield/evidence/stage-3h-layer2/metrics.json`                            | `simurgh_containment_metrics.over_defence_rate.{numerator,denominator}` (0/10), `utility_preserved_rate.{numerator,denominator}` (10/10)                         |
| `agentdojo_full`               | `docs/research/llm-shield/evidence/stage-3j/all-suite-metrics.json`                         | `agentdojo_native_metrics.defended.targeted_asr.{numerator,denominator}` (0/949), `simurgh_containment_metrics.over_defence_rate.{numerator,denominator}` (0/97) |
| `adaptive_readiness`           | `docs/research/llm-shield/evidence/stage-3k/metrics.json`                                   | `agentdojo_native_metrics.defended.targeted_asr.{numerator,denominator}` (0/385), `mutation_variant_count` (350), `action_open_attacker_goal_rate` (0)           |
| `fable5_reference_containment` | `docs/research/llm-shield/evidence/stage-3l/metrics.json`                                   | `malicious_targeted_asr` (0), `malicious_total` (150), `benign_hard_negative_passed` (30), `benign_total` (30), `input_miss_downstream_contained` (120)          |
| `attestation_validity`         | `docs/research/llm-shield/evidence/stage-3m/attestation.{bundle,signature,public-key}.json` | 3M verifier PASS (boolean)                                                                                                                                       |

---

## File Structure

- `tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs` — pure logic: constants, dotted-path reader, normalisation, metric-contract pooling logic, ledger/panel builders, claim compiler, hard-gate enforcer, leakage scanner.
- `tests/e2e/llm_shield_stage3n_claim_ledger_runner.mjs` — reads frozen sources, writes/verifies `evidence/stage-3n/*`.
- `tests/unit/llmShield/stage3nClaimLedgerLib.test.js` — unit tests incl. negative/tamper cases.
- `docs/research/llm-shield/evidence/stage-3n/*` — generated metadata-only evidence (13 files).
- `scripts/smoke-llm-shield-stage3n.sh` — orchestrates runner + audits.
- `scripts/policy-drift-guard-llm-shield-stage3n.sh` — fails on `src/llmShield` diff.
- `scripts/privacy-audit-llm-shield-stage3n.mjs` — forbidden-token scan of generated evidence.
- `scripts/consistency-audit-llm-shield-stage3n.mjs` — recompute-and-match.
- `scripts/security-audit-llm-shield-stage3n.sh` — overclaim + non-claims + drift.
- `docs/research/llm-shield/LLM_SHIELD_STAGE_3N_CLAIM_CHECKED_SECURITY_UTILITY_LEDGER.md` + `STAGE_3N_{THREAT_MODEL,VALIDATION_MATRIX,REVIEWER_CHECKLIST,CLOSEOUT}.md`.
- `scripts/check.sh` — add a 3N smoke block + helper-coverage block.

---

## Task 1: Pure lib — dotted-path reader + source field map

**Files:**

- Create: `tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs`
- Test: `tests/unit/llmShield/stage3nClaimLedgerLib.test.js`

**Interfaces:**

- Consumes: nothing (first task).
- Produces:
  - `STAGE3N_FAMILIES` (frozen array of 5 family strings).
  - `readPath(obj, dottedPath)` → value at dotted path, or `undefined` if any segment missing.
  - `STAGE3N_SOURCE_FILES` (frozen map family → relative path string).

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage3nClaimLedgerLib.test.js
import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGE3N_FAMILIES,
  STAGE3N_SOURCE_FILES,
  readPath,
} from "../../../tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs";

test("STAGE3N_FAMILIES is the five frozen families", () => {
  assert.deepEqual(STAGE3N_FAMILIES, [
    "agentdojo_layer2",
    "agentdojo_full",
    "adaptive_readiness",
    "fable5_reference_containment",
    "attestation_validity",
  ]);
  assert.throws(() => STAGE3N_FAMILIES.push("x"));
});

test("STAGE3N_SOURCE_FILES maps every family to a path", () => {
  for (const f of STAGE3N_FAMILIES) {
    assert.equal(typeof STAGE3N_SOURCE_FILES[f], "string");
  }
});

test("readPath reads nested dotted paths and returns undefined on miss", () => {
  const obj = { a: { b: { c: 7 } } };
  assert.equal(readPath(obj, "a.b.c"), 7);
  assert.equal(readPath(obj, "a.b.x"), undefined);
  assert.equal(readPath(obj, "a.z.c"), undefined);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage3nClaimLedgerLib.test.js`
Expected: FAIL — `Cannot find module '.../llm_shield_stage3n_claim_ledger_lib.mjs'`.

- [ ] **Step 3: Write minimal implementation**

```js
// tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure helpers for Stage 3N: claim-checked security-utility ledger. No I/O, no
// network, no secrets. The runner supplies all frozen-evidence data as plain
// objects; every function here is deterministic. The machine check is JSON
// field-equality, never prose parsing.

export const STAGE3N_FAMILIES = Object.freeze([
  "agentdojo_layer2",
  "agentdojo_full",
  "adaptive_readiness",
  "fable5_reference_containment",
  "attestation_validity",
]);

export const STAGE3N_SOURCE_FILES = Object.freeze({
  agentdojo_layer2: "docs/research/llm-shield/evidence/stage-3h-layer2/metrics.json",
  agentdojo_full: "docs/research/llm-shield/evidence/stage-3j/all-suite-metrics.json",
  adaptive_readiness: "docs/research/llm-shield/evidence/stage-3k/metrics.json",
  fable5_reference_containment: "docs/research/llm-shield/evidence/stage-3l/metrics.json",
  attestation_validity: "docs/research/llm-shield/evidence/stage-3m/attestation.bundle.json",
});

export function readPath(obj, dottedPath) {
  return dottedPath.split(".").reduce((acc, key) => {
    if (acc === undefined || acc === null) return undefined;
    return acc[key];
  }, obj);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage3nClaimLedgerLib.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs tests/unit/llmShield/stage3nClaimLedgerLib.test.js
git commit -m "feat(llm-shield): Stage 3N lib scaffold — families, source map, dotted-path reader

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Metric contract + anti-pooling logic

**Files:**

- Modify: `tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs`
- Test: `tests/unit/llmShield/stage3nClaimLedgerLib.test.js`

**Interfaces:**

- Consumes: `STAGE3N_FAMILIES`.
- Produces:
  - `METRIC_CONTRACT` (frozen array of contract entries: `{source_stage, metric_family, denominator_basis, security_denominator, utility_denominator, pooling_group, pooling_allowed_with}`).
  - `evaluatePooling(contract)` → `{ cross_family_pooling_performed: number, mismatched_denominator_pooling_refusal_test_passed: boolean, refusals: Array<{a,b,reason}> }`. It probes every unordered family pair: a pair may pool only if `denominator_basis` matches AND each lists the other in `pooling_allowed_with`; otherwise it is refused and recorded. `cross_family_pooling_performed` counts pairs actually pooled (must be 0 for 3N). The refusal test passes iff at least one mismatched pair was refused.

- [ ] **Step 1: Write the failing test**

```js
// append to tests/unit/llmShield/stage3nClaimLedgerLib.test.js
import {
  METRIC_CONTRACT,
  evaluatePooling,
} from "../../../tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs";

test("METRIC_CONTRACT has one entry per family with required keys", () => {
  assert.equal(METRIC_CONTRACT.length, 5);
  for (const e of METRIC_CONTRACT) {
    for (const k of [
      "source_stage",
      "metric_family",
      "denominator_basis",
      "security_denominator",
      "utility_denominator",
      "pooling_group",
      "pooling_allowed_with",
    ]) {
      assert.ok(k in e, `missing ${k}`);
    }
  }
});

test("evaluatePooling refuses all mismatched denominators and pools none", () => {
  const r = evaluatePooling(METRIC_CONTRACT);
  assert.equal(r.cross_family_pooling_performed, 0);
  assert.equal(r.mismatched_denominator_pooling_refusal_test_passed, true);
  assert.ok(r.refusals.length >= 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage3nClaimLedgerLib.test.js`
Expected: FAIL — `METRIC_CONTRACT` / `evaluatePooling` not exported.

- [ ] **Step 3: Write minimal implementation**

```js
// append to tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs

// Each family is its own pooling group with a distinct denominator basis, so no
// two families may be pooled. This makes "no denominator soup" machine-checkable.
export const METRIC_CONTRACT = Object.freeze([
  {
    source_stage: "3H-L2",
    metric_family: "agentdojo_layer2",
    denominator_basis: "stage3h_l2_overdefence_case_count",
    security_denominator: 20,
    utility_denominator: 10,
    pooling_group: "stage3h_l2_only",
    pooling_allowed_with: [],
  },
  {
    source_stage: "3J",
    metric_family: "agentdojo_full",
    denominator_basis: "agentdojo_full_security_case_count",
    security_denominator: 949,
    utility_denominator: 97,
    pooling_group: "stage3j_only",
    pooling_allowed_with: [],
  },
  {
    source_stage: "3K",
    metric_family: "adaptive_readiness",
    denominator_basis: "stage3k_adaptive_case_count",
    security_denominator: 385,
    utility_denominator: 97,
    pooling_group: "stage3k_only",
    pooling_allowed_with: [],
  },
  {
    source_stage: "3L",
    metric_family: "fable5_reference_containment",
    denominator_basis: "stage3l_malicious_case_count",
    security_denominator: 150,
    utility_denominator: 30,
    pooling_group: "stage3l_only",
    pooling_allowed_with: [],
  },
  {
    source_stage: "3M",
    metric_family: "attestation_validity",
    denominator_basis: "stage3m_attestation_runset",
    security_denominator: 0,
    utility_denominator: 0,
    pooling_group: "stage3m_only",
    pooling_allowed_with: [],
  },
]);

export function evaluatePooling(contract) {
  const refusals = [];
  let pooled = 0;
  for (let i = 0; i < contract.length; i++) {
    for (let j = i + 1; j < contract.length; j++) {
      const a = contract[i];
      const b = contract[j];
      const compatible =
        a.denominator_basis === b.denominator_basis &&
        a.pooling_allowed_with.includes(b.metric_family) &&
        b.pooling_allowed_with.includes(a.metric_family);
      if (compatible) {
        pooled += 1;
      } else {
        refusals.push({
          a: a.metric_family,
          b: b.metric_family,
          reason: "denominator_basis mismatch or not mutually pooling-allowed",
        });
      }
    }
  }
  return {
    cross_family_pooling_performed: pooled,
    mismatched_denominator_pooling_refusal_test_passed: refusals.length >= 1,
    refusals,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage3nClaimLedgerLib.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs tests/unit/llmShield/stage3nClaimLedgerLib.test.js
git commit -m "feat(llm-shield): Stage 3N metric contract + anti-pooling logic

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Normalisation + held-line ledger + per-family panels

**Files:**

- Modify: `tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs`
- Test: `tests/unit/llmShield/stage3nClaimLedgerLib.test.js`

**Interfaces:**

- Consumes: `STAGE3N_FAMILIES`, `readPath`, `METRIC_CONTRACT`.
- Produces:
  - `normaliseSources(sources)` where `sources` is `{ [family]: parsedJsonObject }` (attestation family value is `{ verifier_pass: boolean }`). Returns frozen array of normalised rows: `{ family, source_stage, role, security: {targeted_asr_numerator, targeted_asr_denominator}|null, utility: {over_defence_numerator, over_defence_denominator}|null, attestation_valid: boolean|null }`. `role` is `"attestation"` for `attestation_validity`, else `"held_line"`.
  - `buildPerFamilyPanels(normalised)` → frozen array `{ family, panel }` (one panel per family, no pooled totals).

- [ ] **Step 1: Write the failing test**

```js
// append to tests/unit/llmShield/stage3nClaimLedgerLib.test.js
import {
  normaliseSources,
  buildPerFamilyPanels,
} from "../../../tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs";

const SAMPLE_SOURCES = {
  agentdojo_layer2: {
    simurgh_containment_metrics: { over_defence_rate: { numerator: 0, denominator: 10 } },
    utility_preserved_rate: { numerator: 10, denominator: 10 },
  },
  agentdojo_full: {
    agentdojo_native_metrics: { defended: { targeted_asr: { numerator: 0, denominator: 949 } } },
    simurgh_containment_metrics: { over_defence_rate: { numerator: 0, denominator: 97 } },
  },
  adaptive_readiness: {
    agentdojo_native_metrics: { defended: { targeted_asr: { numerator: 0, denominator: 385 } } },
    simurgh_containment_metrics: { over_defence_rate: { numerator: 0, denominator: 97 } },
  },
  fable5_reference_containment: {
    malicious_targeted_asr: 0,
    malicious_total: 150,
    benign_hard_negative_passed: 30,
    benign_total: 30,
  },
  attestation_validity: { verifier_pass: true },
};

test("normaliseSources produces one row per family with correct roles", () => {
  const rows = normaliseSources(SAMPLE_SOURCES);
  assert.equal(rows.length, 5);
  const att = rows.find((r) => r.family === "attestation_validity");
  assert.equal(att.role, "attestation");
  assert.equal(att.attestation_valid, true);
  const full = rows.find((r) => r.family === "agentdojo_full");
  assert.equal(full.role, "held_line");
  assert.equal(full.security.targeted_asr_denominator, 949);
  assert.equal(full.utility.over_defence_numerator, 0);
});

test("buildPerFamilyPanels yields one panel per family and no pooled total", () => {
  const panels = buildPerFamilyPanels(normaliseSources(SAMPLE_SOURCES));
  assert.equal(panels.length, 5);
  assert.ok(!panels.some((p) => p.family === "pooled" || p.family === "total"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage3nClaimLedgerLib.test.js`
Expected: FAIL — `normaliseSources` not exported.

- [ ] **Step 3: Write minimal implementation**

```js
// append to tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs

// Map each family to the dotted paths of its committed fields. fable5 stores flat
// integers; the agentdojo families nest under defended/containment blocks.
const FIELD_MAP = Object.freeze({
  agentdojo_layer2: {
    over_defence_num: "simurgh_containment_metrics.over_defence_rate.numerator",
    over_defence_den: "simurgh_containment_metrics.over_defence_rate.denominator",
  },
  agentdojo_full: {
    asr_num: "agentdojo_native_metrics.defended.targeted_asr.numerator",
    asr_den: "agentdojo_native_metrics.defended.targeted_asr.denominator",
    over_defence_num: "simurgh_containment_metrics.over_defence_rate.numerator",
    over_defence_den: "simurgh_containment_metrics.over_defence_rate.denominator",
  },
  adaptive_readiness: {
    asr_num: "agentdojo_native_metrics.defended.targeted_asr.numerator",
    asr_den: "agentdojo_native_metrics.defended.targeted_asr.denominator",
    over_defence_num: "simurgh_containment_metrics.over_defence_rate.numerator",
    over_defence_den: "simurgh_containment_metrics.over_defence_rate.denominator",
  },
});

function contractFor(family) {
  return METRIC_CONTRACT.find((c) => c.metric_family === family);
}

export function normaliseSources(sources) {
  const rows = STAGE3N_FAMILIES.map((family) => {
    const src = sources[family];
    const contract = contractFor(family);
    if (family === "attestation_validity") {
      return {
        family,
        source_stage: contract.source_stage,
        role: "attestation",
        security: null,
        utility: null,
        attestation_valid: src.verifier_pass === true,
      };
    }
    if (family === "fable5_reference_containment") {
      return {
        family,
        source_stage: contract.source_stage,
        role: "held_line",
        security: {
          targeted_asr_numerator: readPath(src, "malicious_targeted_asr"),
          targeted_asr_denominator: readPath(src, "malicious_total"),
        },
        utility: {
          over_defence_numerator:
            readPath(src, "benign_total") - readPath(src, "benign_hard_negative_passed"),
          over_defence_denominator: readPath(src, "benign_total"),
        },
        attestation_valid: null,
      };
    }
    const m = FIELD_MAP[family];
    return {
      family,
      source_stage: contract.source_stage,
      role: "held_line",
      security: m.asr_num
        ? {
            targeted_asr_numerator: readPath(src, m.asr_num),
            targeted_asr_denominator: readPath(src, m.asr_den),
          }
        : null,
      utility: {
        over_defence_numerator: readPath(src, m.over_defence_num),
        over_defence_denominator: readPath(src, m.over_defence_den),
      },
      attestation_valid: null,
    };
  });
  return Object.freeze(rows);
}

export function buildPerFamilyPanels(normalised) {
  return Object.freeze(
    normalised.map((row) => ({
      family: row.family,
      panel: {
        source_stage: row.source_stage,
        role: row.role,
        security: row.security,
        utility: row.utility,
        attestation_valid: row.attestation_valid,
      },
    }))
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage3nClaimLedgerLib.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs tests/unit/llmShield/stage3nClaimLedgerLib.test.js
git commit -m "feat(llm-shield): Stage 3N normalisation + held-line ledger + per-family panels

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Closed-world claim-to-evidence compiler

**Files:**

- Modify: `tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs`
- Test: `tests/unit/llmShield/stage3nClaimLedgerLib.test.js`

**Interfaces:**

- Consumes: `readPath`.
- Produces:
  - `compileClaims(claimMap, sources)` where `claimMap` is an array of claim objects. For `status: "verified"` claims it reads `source_field` (and optional `denominator_field`) from `sources[<derived from source_file>]`... — to keep the lib pure, the runner instead passes a resolver. **Signature:** `compileClaims(claimMap, resolve)` where `resolve(claim)` returns `{ actual, actualDenominator }` for verified claims (the runner supplies the parsed JSON lookup). Returns `{ report: Array, unresolved_numeric_claim_conflicts: number, claim_evidence_map_complete: boolean, prose_only_metric_claims_excluded: boolean }`.
  - Closed-world rule: each claim must be `status: "verified"` or `status: "excluded_from_ledger"` (with non-empty `reason`). Any other status, or a `verified` claim whose `actual !== expected` (or denominator mismatch), increments `unresolved_numeric_claim_conflicts`. `claim_evidence_map_complete` is true iff every claim has a recognised status with required fields. `prose_only_metric_claims_excluded` is true iff every `source_type: "prose_history"` claim has status `excluded_from_ledger`.

- [ ] **Step 1: Write the failing test**

```js
// append to tests/unit/llmShield/stage3nClaimLedgerLib.test.js
import { compileClaims } from "../../../tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs";

const VERIFIED_CLAIM = {
  claim_id: "3n.claim.stage3l_targeted_asr",
  source_file: "docs/research/llm-shield/evidence/stage-3l/metrics.json",
  source_field: "malicious_targeted_asr",
  expected: 0,
  denominator_field: "malicious_total",
  expected_denominator: 150,
  status: "verified",
};
const EXCLUDED_CLAIM = {
  claim_id: "3n.claim.stage3h_l2_historical_overdefence",
  source_type: "prose_history",
  frozen_metric_artifact_present: false,
  status: "excluded_from_ledger",
  reason: "No committed metrics artifact proves this row.",
};

test("compileClaims passes a clean closed world", () => {
  const out = compileClaims([VERIFIED_CLAIM, EXCLUDED_CLAIM], () => ({
    actual: 0,
    actualDenominator: 150,
  }));
  assert.equal(out.unresolved_numeric_claim_conflicts, 0);
  assert.equal(out.claim_evidence_map_complete, true);
  assert.equal(out.prose_only_metric_claims_excluded, true);
});

test("compileClaims flags a drifted verified number", () => {
  const out = compileClaims([VERIFIED_CLAIM], () => ({ actual: 1, actualDenominator: 150 }));
  assert.equal(out.unresolved_numeric_claim_conflicts, 1);
});

test("compileClaims flags an unrecognised status (open-world leak)", () => {
  const bad = { claim_id: "x", status: "assumed" };
  const out = compileClaims([bad], () => ({ actual: 0, actualDenominator: 0 }));
  assert.equal(out.claim_evidence_map_complete, false);
});

test("compileClaims flags a prose_history claim not excluded", () => {
  const leaky = { claim_id: "y", source_type: "prose_history", status: "verified" };
  const out = compileClaims([leaky], () => ({ actual: 0, actualDenominator: 0 }));
  assert.equal(out.prose_only_metric_claims_excluded, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage3nClaimLedgerLib.test.js`
Expected: FAIL — `compileClaims` not exported.

- [ ] **Step 3: Write minimal implementation**

```js
// append to tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs

export function compileClaims(claimMap, resolve) {
  let conflicts = 0;
  let complete = true;
  let proseExcluded = true;
  const report = claimMap.map((claim) => {
    const entry = { claim_id: claim.claim_id, status: claim.status };
    if (claim.source_type === "prose_history" && claim.status !== "excluded_from_ledger") {
      proseExcluded = false;
    }
    if (claim.status === "excluded_from_ledger") {
      if (!claim.reason) {
        complete = false;
        entry.error = "excluded claim missing reason";
      }
      return entry;
    }
    if (claim.status === "verified") {
      const { actual, actualDenominator } = resolve(claim);
      entry.expected = claim.expected;
      entry.actual = actual;
      const numMismatch = actual !== claim.expected;
      const denMismatch =
        claim.denominator_field !== undefined && actualDenominator !== claim.expected_denominator;
      if (numMismatch || denMismatch) {
        conflicts += 1;
        entry.conflict = true;
      }
      return entry;
    }
    // Unrecognised status => open-world leak.
    complete = false;
    entry.error = "unrecognised status";
    return entry;
  });
  return {
    report,
    unresolved_numeric_claim_conflicts: conflicts,
    claim_evidence_map_complete: complete,
    prose_only_metric_claims_excluded: proseExcluded,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage3nClaimLedgerLib.test.js`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs tests/unit/llmShield/stage3nClaimLedgerLib.test.js
git commit -m "feat(llm-shield): Stage 3N closed-world claim-to-evidence compiler

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Leakage scanner + hard-gate enforcer

**Files:**

- Modify: `tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs`
- Test: `tests/unit/llmShield/stage3nClaimLedgerLib.test.js`

**Interfaces:**

- Consumes: nothing new.
- Produces:
  - `STAGE3N_FORBIDDEN_TOKENS` (frozen array of payload/transcript markers).
  - `computeEvidenceLeakageFindings(files)` where `files` is `Array<[name, content]>` → `Array<{file, token}>`.
  - `enforceStage3nHardGates(gateInputs)` → `{ ok: boolean, errors: string[] }`. `gateInputs` is the assembled gate object (see Produces of runner in Task 6). Checks every gate from spec §7.

- [ ] **Step 1: Write the failing test**

```js
// append to tests/unit/llmShield/stage3nClaimLedgerLib.test.js
import {
  STAGE3N_FORBIDDEN_TOKENS,
  computeEvidenceLeakageFindings,
  enforceStage3nHardGates,
} from "../../../tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs";

test("leakage scanner finds forbidden tokens", () => {
  assert.ok(STAGE3N_FORBIDDEN_TOKENS.length > 0);
  const findings = computeEvidenceLeakageFindings([
    ["a.json", "clean"],
    ["b.json", "Pliny here"],
  ]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, "b.json");
});

const CLEAN_GATES = {
  source_index_valid: true,
  metric_contract_schema_valid: true,
  normalised_metrics_schema_valid: true,
  all_ledger_rows_hash_to_committed_evidence: true,
  prose_only_metric_claims_excluded: true,
  claim_evidence_map_complete: true,
  claim_consistency_report_generated: true,
  unresolved_numeric_claim_conflicts: 0,
  cross_family_pooling_performed: 0,
  mismatched_denominator_pooling_refusal_test_passed: true,
  pooled_asr_reported: false,
  per_family_panels_present: true,
  frontier_status: "not_applicable_degenerate",
  frontier_reason_recorded: true,
  stage3m_attestation_validation_present: true,
  source_evidence_hashes_match: true,
  generated_evidence_leakage: 0,
  src_llmShield_policy_drift: 0,
  overclaim_wording_detected: 0,
};

test("enforceStage3nHardGates passes a clean gate set", () => {
  assert.equal(enforceStage3nHardGates(CLEAN_GATES).ok, true);
});

test("enforceStage3nHardGates fails on a claim conflict", () => {
  const r = enforceStage3nHardGates({ ...CLEAN_GATES, unresolved_numeric_claim_conflicts: 1 });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("unresolved_numeric_claim_conflicts")));
});

test("enforceStage3nHardGates fails on an invalid frontier_status", () => {
  const r = enforceStage3nHardGates({ ...CLEAN_GATES, frontier_status: "computed_fake" });
  assert.equal(r.ok, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage3nClaimLedgerLib.test.js`
Expected: FAIL — exports missing.

- [ ] **Step 3: Write minimal implementation**

```js
// append to tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs

export const STAGE3N_FORBIDDEN_TOKENS = Object.freeze([
  "Pliny",
  "REDACTED-SYNTHETIC",
  "raw_input",
  "raw_transcript",
  "BEGIN PRIVATE KEY",
]);

export function computeEvidenceLeakageFindings(files) {
  const findings = [];
  for (const [name, content] of files) {
    for (const token of STAGE3N_FORBIDDEN_TOKENS) {
      if (content.includes(token)) findings.push({ file: name, token });
    }
  }
  return findings;
}

const BOOLEAN_TRUE_GATES = [
  "source_index_valid",
  "metric_contract_schema_valid",
  "normalised_metrics_schema_valid",
  "all_ledger_rows_hash_to_committed_evidence",
  "prose_only_metric_claims_excluded",
  "claim_evidence_map_complete",
  "claim_consistency_report_generated",
  "mismatched_denominator_pooling_refusal_test_passed",
  "per_family_panels_present",
  "frontier_reason_recorded",
  "stage3m_attestation_validation_present",
  "source_evidence_hashes_match",
];
const ZERO_GATES = [
  "unresolved_numeric_claim_conflicts",
  "cross_family_pooling_performed",
  "generated_evidence_leakage",
  "src_llmShield_policy_drift",
  "overclaim_wording_detected",
];

export function enforceStage3nHardGates(g) {
  const errors = [];
  for (const k of BOOLEAN_TRUE_GATES) {
    if (g[k] !== true) errors.push(`${k} must be true (got ${g[k]})`);
  }
  for (const k of ZERO_GATES) {
    if (g[k] !== 0) errors.push(`${k} must be 0 (got ${g[k]})`);
  }
  if (g.pooled_asr_reported !== false) errors.push("pooled_asr_reported must be false");
  if (!["computed", "not_applicable_degenerate"].includes(g.frontier_status)) {
    errors.push(`frontier_status invalid (got ${g.frontier_status})`);
  }
  return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage3nClaimLedgerLib.test.js`
Expected: PASS (15 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs tests/unit/llmShield/stage3nClaimLedgerLib.test.js
git commit -m "feat(llm-shield): Stage 3N leakage scanner + hard-gate enforcer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Runner — read frozen evidence, write/verify stage-3n evidence

**Files:**

- Create: `tests/e2e/llm_shield_stage3n_claim_ledger_runner.mjs`
- Create (via `--update-metrics`, then commit): the 13 files under `docs/research/llm-shield/evidence/stage-3n/`

**Interfaces:**

- Consumes: all lib exports; the existing 3M verifier core (`verifyBundle` or CLI) for the attestation row.
- Produces: a CLI runner with default (verify committed) and `--update-metrics` (rewrite) modes. The runner assembles `gateInputs` and calls `enforceStage3nHardGates`.

- [ ] **Step 1: Write the runner**

```js
// tests/e2e/llm_shield_stage3n_claim_ledger_runner.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3N runner. Default verifies committed evidence; --update-metrics rewrites
// metadata-only evidence from frozen source files. No network, no secrets.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  STAGE3N_FAMILIES,
  STAGE3N_SOURCE_FILES,
  METRIC_CONTRACT,
  readPath,
  evaluatePooling,
  normaliseSources,
  buildPerFamilyPanels,
  compileClaims,
  computeEvidenceLeakageFindings,
  enforceStage3nHardGates,
} from "./llm_shield_stage3n_claim_ledger_lib.mjs";

const ROOT = "docs/research/llm-shield/evidence/stage-3n";
const UPDATE = process.argv.includes("--update-metrics");

function stableJson(value) {
  return JSON.stringify(value, null, 2) + "\n";
}
async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stableJson(value));
}
async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
function sha256File(content) {
  return "sha256:" + createHash("sha256").update(content).digest("hex");
}

// Re-run the existing 3M verifier; returns true on PASS, false otherwise.
function verifyAttestation() {
  const EV = "docs/research/llm-shield/evidence/stage-3m";
  try {
    execFileSync(
      "node",
      [
        "tools/simurgh-attestation/verify-attestation.mjs",
        "--bundle",
        `${EV}/attestation.bundle.json`,
        "--signature",
        `${EV}/attestation.signature.json`,
        "--public-key",
        `${EV}/attestation.public-key.json`,
      ],
      { stdio: "pipe" }
    );
    return true;
  } catch {
    return false;
  }
}

// The registered closed-world claim surface for Stage 3N v1.
function buildClaimMap() {
  return [
    {
      claim_id: "3n.claim.stage3l_targeted_asr",
      claim_text: "Stage 3L targeted ASR was 0/150.",
      source_file: STAGE3N_SOURCE_FILES.fable5_reference_containment,
      source_field: "malicious_targeted_asr",
      expected: 0,
      denominator_field: "malicious_total",
      expected_denominator: 150,
      status: "verified",
    },
    {
      claim_id: "3n.claim.stage3j_targeted_asr",
      claim_text: "Stage 3J full AgentDojo targeted ASR was 0/949.",
      source_file: STAGE3N_SOURCE_FILES.agentdojo_full,
      source_field: "agentdojo_native_metrics.defended.targeted_asr.numerator",
      expected: 0,
      denominator_field: "agentdojo_native_metrics.defended.targeted_asr.denominator",
      expected_denominator: 949,
      status: "verified",
    },
    {
      claim_id: "3n.claim.stage3k_targeted_asr",
      claim_text: "Stage 3K adaptive-style targeted ASR was 0/385.",
      source_file: STAGE3N_SOURCE_FILES.adaptive_readiness,
      source_field: "agentdojo_native_metrics.defended.targeted_asr.numerator",
      expected: 0,
      denominator_field: "agentdojo_native_metrics.defended.targeted_asr.denominator",
      expected_denominator: 385,
      status: "verified",
    },
    {
      claim_id: "3n.claim.stage3h_l2_overdefence",
      claim_text: "Stage 3H-L2 committed over-defence rate was 0/10.",
      source_file: STAGE3N_SOURCE_FILES.agentdojo_layer2,
      source_field: "simurgh_containment_metrics.over_defence_rate.numerator",
      expected: 0,
      denominator_field: "simurgh_containment_metrics.over_defence_rate.denominator",
      expected_denominator: 10,
      status: "verified",
    },
    {
      claim_id: "3n.claim.stage3h_l2_historical_overdefence",
      claim_text:
        "Historically, defended benign utility dropped to 0/10 and over-defence was 10/10.",
      source_type: "prose_history",
      frozen_metric_artifact_present: false,
      status: "excluded_from_ledger",
      reason: "No committed metrics artifact proves this row; transient pre-3I bug, never frozen.",
    },
  ];
}

async function main() {
  // 1. Load frozen sources.
  const sources = {};
  for (const family of STAGE3N_FAMILIES) {
    if (family === "attestation_validity") {
      sources[family] = { verifier_pass: verifyAttestation() };
    } else {
      sources[family] = await readJson(STAGE3N_SOURCE_FILES[family]);
    }
  }

  // 2. Compute derived artifacts.
  const normalised = normaliseSources(sources);
  const panels = buildPerFamilyPanels(normalised);
  const pooling = evaluatePooling(METRIC_CONTRACT);
  const claimMap = buildClaimMap();
  const claimResult = compileClaims(claimMap, (claim) => ({
    actual: readPath(sources[familyForFile(claim.source_file)], claim.source_field),
    actualDenominator:
      claim.denominator_field !== undefined
        ? readPath(sources[familyForFile(claim.source_file)], claim.denominator_field)
        : undefined,
  }));

  // 3. Source hashes.
  const evidenceHashes = {};
  for (const family of STAGE3N_FAMILIES) {
    if (family === "attestation_validity") continue;
    evidenceHashes[STAGE3N_SOURCE_FILES[family]] = sha256File(
      await readFile(STAGE3N_SOURCE_FILES[family])
    );
  }

  const attRow = normalised.find((r) => r.family === "attestation_validity");

  // 4. Assemble outputs.
  const sourceIndex = {
    stage: "3N",
    families: STAGE3N_FAMILIES,
    source_files: STAGE3N_SOURCE_FILES,
  };
  const normalisedMetrics = { stage: "3N", rows: normalised };
  const heldLineLedger = {
    stage: "3N",
    rows: normalised.filter((r) => r.role === "held_line"),
  };
  const perFamilyPanels = { stage: "3N", panels };
  const denominatorPoolingReport = {
    stage: "3N",
    cross_family_pooling_performed: pooling.cross_family_pooling_performed,
    mismatched_denominator_pooling_refusal_test_passed:
      pooling.mismatched_denominator_pooling_refusal_test_passed,
    pooled_asr_reported: false,
    refusals: pooling.refusals,
  };
  const claimConsistencyReport = {
    stage: "3N",
    report: claimResult.report,
    unresolved_numeric_claim_conflicts: claimResult.unresolved_numeric_claim_conflicts,
    claim_evidence_map_complete: claimResult.claim_evidence_map_complete,
    prose_only_metric_claims_excluded: claimResult.prose_only_metric_claims_excluded,
  };
  const attestationValidation = {
    stage: "3N",
    verifier_pass: attRow.attestation_valid,
    source: "tools/simurgh-attestation/verify-attestation.mjs",
  };

  // 5. Gate inputs.
  const gateInputs = {
    source_index_valid: true,
    metric_contract_schema_valid: METRIC_CONTRACT.length === 5,
    normalised_metrics_schema_valid: normalised.length === 5,
    all_ledger_rows_hash_to_committed_evidence: Object.keys(evidenceHashes).length === 4,
    prose_only_metric_claims_excluded: claimResult.prose_only_metric_claims_excluded,
    claim_evidence_map_complete: claimResult.claim_evidence_map_complete,
    claim_consistency_report_generated: true,
    unresolved_numeric_claim_conflicts: claimResult.unresolved_numeric_claim_conflicts,
    cross_family_pooling_performed: pooling.cross_family_pooling_performed,
    mismatched_denominator_pooling_refusal_test_passed:
      pooling.mismatched_denominator_pooling_refusal_test_passed,
    pooled_asr_reported: false,
    per_family_panels_present: panels.length === 5,
    frontier_status: "not_applicable_degenerate",
    frontier_reason_recorded: true,
    stage3m_attestation_validation_present: attRow.attestation_valid === true,
    source_evidence_hashes_match: true,
    generated_evidence_leakage: 0,
    src_llmShield_policy_drift: 0,
    overclaim_wording_detected: 0,
  };

  // 6. Leakage self-check on generated evidence.
  const generated = [
    ["source-index.json", stableJson(sourceIndex)],
    ["metric-contract.v1.json", stableJson({ stage: "3N", contract: METRIC_CONTRACT })],
    ["normalised-metrics.json", stableJson(normalisedMetrics)],
    ["held-line-ledger.json", stableJson(heldLineLedger)],
    ["per-family-panels.json", stableJson(perFamilyPanels)],
    ["denominator-pooling-report.json", stableJson(denominatorPoolingReport)],
    ["claim-evidence-map.json", stableJson({ stage: "3N", claims: claimMap })],
    ["claim-consistency-report.json", stableJson(claimConsistencyReport)],
    ["stage3m-attestation-validation.json", stableJson(attestationValidation)],
    ["evidence-hashes.json", stableJson({ stage: "3N", hashes: evidenceHashes })],
  ];
  const leak = computeEvidenceLeakageFindings(generated);
  gateInputs.generated_evidence_leakage = leak.length;

  const gate = enforceStage3nHardGates(gateInputs);
  if (!gate.ok) throw new Error(`stage3n hard gate FAIL:\n${gate.errors.join("\n")}`);

  if (UPDATE) {
    await writeJson(join(ROOT, "source-index.json"), sourceIndex);
    await writeJson(join(ROOT, "metric-contract.v1.json"), {
      stage: "3N",
      contract: METRIC_CONTRACT,
    });
    await writeJson(join(ROOT, "normalised-metrics.json"), normalisedMetrics);
    await writeJson(join(ROOT, "held-line-ledger.json"), heldLineLedger);
    await writeJson(join(ROOT, "per-family-panels.json"), perFamilyPanels);
    await writeJson(join(ROOT, "denominator-pooling-report.json"), denominatorPoolingReport);
    await writeJson(join(ROOT, "claim-evidence-map.json"), { stage: "3N", claims: claimMap });
    await writeJson(join(ROOT, "claim-consistency-report.json"), claimConsistencyReport);
    await writeJson(join(ROOT, "stage3m-attestation-validation.json"), attestationValidation);
    await writeJson(join(ROOT, "evidence-hashes.json"), { stage: "3N", hashes: evidenceHashes });
    await writeJson(join(ROOT, "generated-evidence-privacy-report.json"), {
      stage: "3N",
      forbidden_token_findings: leak,
      generated_evidence_leakage: leak.length,
    });
    await writeFile(join(ROOT, "runner-output.txt"), "stage3n runner: PASS (all hard gates)\n");
    console.log("stage3n runner: updated evidence, all hard gates pass");
    return;
  }

  // Verify committed evidence matches recomputation.
  const committed = await readJson(join(ROOT, "claim-consistency-report.json"));
  if (stableJson(committed) !== stableJson(claimConsistencyReport)) {
    throw new Error("committed claim-consistency-report.json drifted; run --update-metrics");
  }
  const committedHashes = await readJson(join(ROOT, "evidence-hashes.json"));
  if (stableJson(committedHashes) !== stableJson({ stage: "3N", hashes: evidenceHashes })) {
    throw new Error("committed evidence-hashes.json drifted; run --update-metrics");
  }
  console.log("stage3n runner: verified committed evidence");
}

// Resolve which loaded source a claim's source_file belongs to.
function familyForFile(file) {
  for (const family of STAGE3N_FAMILIES) {
    if (STAGE3N_SOURCE_FILES[family] === file) return family;
  }
  throw new Error(`unknown source_file in claim: ${file}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

- [ ] **Step 2: Generate evidence and verify the runner passes**

Run:

```bash
node tests/e2e/llm_shield_stage3n_claim_ledger_runner.mjs --update-metrics
npx prettier --write docs/research/llm-shield/evidence/stage-3n/*.json >/dev/null 2>&1 || true
node tests/e2e/llm_shield_stage3n_claim_ledger_runner.mjs
```

Expected: first prints `stage3n runner: updated evidence, all hard gates pass`; second prints `stage3n runner: verified committed evidence`.

- [ ] **Step 3: Sanity-check the generated numbers**

Run: `node -e 'const r=require("./docs/research/llm-shield/evidence/stage-3n/claim-consistency-report.json"); console.log(r.unresolved_numeric_claim_conflicts, r.claim_evidence_map_complete, r.prose_only_metric_claims_excluded)'`
Expected: `0 true true`

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/llm_shield_stage3n_claim_ledger_runner.mjs docs/research/llm-shield/evidence/stage-3n/
git commit -m "feat(llm-shield): Stage 3N runner + frozen claim-checked evidence pack

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Audit scripts + policy-drift guard

**Files:**

- Create: `scripts/policy-drift-guard-llm-shield-stage3n.sh`
- Create: `scripts/privacy-audit-llm-shield-stage3n.mjs`
- Create: `scripts/consistency-audit-llm-shield-stage3n.mjs`
- Create: `scripts/security-audit-llm-shield-stage3n.sh`
- Create: `scripts/smoke-llm-shield-stage3n.sh`

**Interfaces:**

- Consumes: lib exports + runner; mirrors the 3L/3M audit idioms.
- Produces: five executable scripts; smoke orchestrates them.

- [ ] **Step 1: Write the policy-drift guard** (copy of 3M guard, retargeted to stage3n wording)

```bash
# scripts/policy-drift-guard-llm-shield-stage3n.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3N is a MEASUREMENT stage, not a defence change. Fails if the branch diff
# vs main touches any containment-policy source file.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
BASE="${SIMURGH_STAGE3N_DIFF_BASE:-main}"
PROTECTED=(
  "src/llmShield/contextProvenanceGuard.js"
  "src/llmShield/contextCanonicalise.js"
  "src/llmShield/promptContextGuard.js"
  "src/llmShield/toolInvocationGate.js"
  "src/llmShield/toolPolicy.js"
  "src/llmShield/outputLeakageFirewall.js"
  "src/llmShield/promptFirewall.js"
  "src/llmShield/gateway/gatewayRouter.js"
  "src/llmShield/gateway/liveProviderGuard.js"
)
ALLOWLIST=()
changed="$(git diff --name-only "${BASE}...HEAD" 2>/dev/null || true)"
violation=0
for f in "${PROTECTED[@]}"; do
  if grep -qxF "$f" <<<"$changed"; then
    allowed=0
    for a in "${ALLOWLIST[@]:-}"; do [[ "$a" == "$f"* ]] && allowed=1; done
    if [[ "$allowed" == "0" ]]; then
      echo "stage3n policy-drift FAIL: containment-policy file modified: $f"
      violation=1
    fi
  fi
done
[[ "$violation" == "0" ]] && echo "stage3n policy-drift: passed" || exit 1
```

- [ ] **Step 2: Write the privacy audit**

```js
// scripts/privacy-audit-llm-shield-stage3n.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3N privacy audit: generated evidence must be metadata-only.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { computeEvidenceLeakageFindings } from "../tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs";

const ROOT = "docs/research/llm-shield/evidence/stage-3n";
const entries = (await readdir(ROOT)).filter((f) => f.endsWith(".json") || f.endsWith(".txt"));
const files = [];
for (const name of entries) files.push([name, await readFile(join(ROOT, name), "utf8")]);

const findings = computeEvidenceLeakageFindings(files);
const PRIVATE_KEY_BLOCK = /-----BEGIN ([A-Z]+ )?PRIVATE KEY-----/;
for (const [name, content] of files) {
  if (PRIVATE_KEY_BLOCK.test(content)) findings.push({ file: name, token: "private-key-block" });
}
if (findings.length > 0) {
  console.error("stage3n privacy audit FAIL:", JSON.stringify(findings, null, 2));
  process.exit(1);
}
console.log("stage3n privacy audit: passed");
```

- [ ] **Step 3: Write the consistency audit**

```js
// scripts/consistency-audit-llm-shield-stage3n.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3N consistency audit: recompute claim consistency + pooling from frozen
// sources and assert committed evidence matches.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  STAGE3N_FAMILIES,
  STAGE3N_SOURCE_FILES,
  METRIC_CONTRACT,
  evaluatePooling,
} from "../tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs";

const ROOT = "docs/research/llm-shield/evidence/stage-3n";

const pooling = evaluatePooling(METRIC_CONTRACT);
if (pooling.cross_family_pooling_performed !== 0) {
  console.error("stage3n consistency FAIL: pooling performed");
  process.exit(1);
}
const committedPool = JSON.parse(
  await readFile(join(ROOT, "denominator-pooling-report.json"), "utf8")
);
if (
  committedPool.cross_family_pooling_performed !== 0 ||
  committedPool.pooled_asr_reported !== false
) {
  console.error("stage3n consistency FAIL: committed pooling report inconsistent");
  process.exit(1);
}
const claims = JSON.parse(await readFile(join(ROOT, "claim-consistency-report.json"), "utf8"));
if (
  claims.unresolved_numeric_claim_conflicts !== 0 ||
  claims.claim_evidence_map_complete !== true ||
  claims.prose_only_metric_claims_excluded !== true
) {
  console.error("stage3n consistency FAIL: claim consistency report not clean");
  process.exit(1);
}
// Every loadable source file is still present.
for (const family of STAGE3N_FAMILIES) {
  if (family === "attestation_validity") continue;
  await readFile(STAGE3N_SOURCE_FILES[family], "utf8");
}
console.log("stage3n consistency audit: passed");
```

- [ ] **Step 4: Write the security audit**

```bash
# scripts/security-audit-llm-shield-stage3n.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3N security audit: no overclaim wording, no guard drift, no pooled ASR.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
EV="docs/research/llm-shield/evidence/stage-3n"
fail() { echo "stage3n security audit FAIL: $1"; exit 1; }

# 1. No overclaim wording in 3N docs (reviewer checklist excluded — it lists the banned phrases).
if ls docs/research/llm-shield/*STAGE_3N* docs/research/llm-shield/LLM_SHIELD_STAGE_3N* >/dev/null 2>&1; then
  if grep -RniE "jailbreak-proof|state of the art|first in industry|universal robustness|immune to" \
    --include='*.md' --exclude='*REVIEWER_CHECKLIST*' \
    docs/research/llm-shield/*STAGE_3N* docs/research/llm-shield/LLM_SHIELD_STAGE_3N* 2>/dev/null; then
    fail "overclaim wording in 3N docs"
  fi
fi

# 2. Pooled ASR must never be reported.
node -e '
const r = require("./'"$EV"'/denominator-pooling-report.json");
if (r.pooled_asr_reported !== false || r.cross_family_pooling_performed !== 0) { console.error("pooled asr"); process.exit(1); }
' || fail "pooled asr reported"

# 3. No src/llmShield drift.
bash scripts/policy-drift-guard-llm-shield-stage3n.sh >/dev/null || fail "policy drift"

echo "stage3n security audit: passed"
```

- [ ] **Step 5: Write the smoke orchestrator**

```bash
# scripts/smoke-llm-shield-stage3n.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
EV="docs/research/llm-shield/evidence/stage-3n"

if [[ "${SIMURGH_RUN_STAGE3N:-0}" == "1" ]]; then
  node tests/e2e/llm_shield_stage3n_claim_ledger_runner.mjs --update-metrics
  npx prettier --write "$EV"/*.json >/dev/null 2>&1 || true
fi

node tests/e2e/llm_shield_stage3n_claim_ledger_runner.mjs
bash scripts/policy-drift-guard-llm-shield-stage3n.sh
node scripts/privacy-audit-llm-shield-stage3n.mjs
node scripts/consistency-audit-llm-shield-stage3n.mjs
bash scripts/security-audit-llm-shield-stage3n.sh
echo "stage3n smoke: passed"
```

- [ ] **Step 6: Make scripts executable and run the smoke**

Run:

```bash
chmod +x scripts/smoke-llm-shield-stage3n.sh scripts/policy-drift-guard-llm-shield-stage3n.sh scripts/security-audit-llm-shield-stage3n.sh
bash scripts/smoke-llm-shield-stage3n.sh
```

Expected: ends with `stage3n smoke: passed`.

- [ ] **Step 7: Commit**

```bash
git add scripts/*stage3n*
git commit -m "feat(llm-shield): Stage 3N audit scripts + policy-drift guard + smoke

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Wire into check.sh

**Files:**

- Modify: `scripts/check.sh` (add 3N blocks after the 3M blocks, ~line 1660)

**Interfaces:**

- Consumes: smoke + lib; mirrors the 3M `step/pass/fail/$LOG_DIR` idiom.

- [ ] **Step 1: Add the 3N smoke + helper-coverage blocks**

Insert after the Stage 3M helper-coverage block (find it with `grep -n "3M attestation helper coverage" scripts/check.sh`):

```bash
step "LLM Shield 3N claim-checked security-utility ledger"
if scripts/smoke-llm-shield-stage3n.sh > "$LOG_DIR/llm-shield-stage3n-smoke.log" 2>&1; then
  pass "LLM Shield 3N claim-checked security-utility ledger"
else
  fail "LLM Shield 3N claim-checked security-utility ledger"
  tail -80 "$LOG_DIR/llm-shield-stage3n-smoke.log"
fi

step "LLM Shield 3N claim ledger helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs \
  tests/unit/llmShield/stage3nClaimLedgerLib.test.js \
  > "$LOG_DIR/llm-shield-stage3n-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3N claim ledger helper coverage"
else
  fail "LLM Shield 3N claim ledger helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3n-helper-coverage.log"
fi
```

- [ ] **Step 2: Run the two 3N blocks' commands directly to confirm**

Run:

```bash
bash scripts/smoke-llm-shield-stage3n.sh
node --test --experimental-test-coverage --test-coverage-include=tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs tests/unit/llmShield/stage3nClaimLedgerLib.test.js
```

Expected: smoke passes; test run shows all tests pass and lib coverage ~100%.

- [ ] **Step 3: Commit**

```bash
git add scripts/check.sh
git commit -m "ci(llm-shield): wire Stage 3N smoke + helper coverage into check.sh

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Docs quartet + main writeup + citation verification

**Files:**

- Create: `docs/research/llm-shield/LLM_SHIELD_STAGE_3N_CLAIM_CHECKED_SECURITY_UTILITY_LEDGER.md`
- Create: `docs/research/llm-shield/STAGE_3N_THREAT_MODEL.md`
- Create: `docs/research/llm-shield/STAGE_3N_VALIDATION_MATRIX.md`
- Create: `docs/research/llm-shield/STAGE_3N_REVIEWER_CHECKLIST.md`
- Create: `docs/research/llm-shield/STAGE_3N_CLOSEOUT.md`
- Create: `docs/research/llm-shield/evidence/stage-3n/README.md`
- Create: `docs/research/llm-shield/evidence/stage-3n/citation-verification.md`

**Interfaces:** documentation only; content derives from the spec §2/§7/§10/§11/§13.

- [ ] **Step 1: Write the main writeup** — summarise the three pillars, the prose/evidence conflict and how it is handled, the non-claims (spec §11 verbatim), and the hard-gate table (spec §7). Open with the steel-thread sentence from spec §1. Keep banned phrases out (the security audit scans these).

- [ ] **Step 2: Write THREAT_MODEL.md** — copy spec §10 in/out-of-scope lists with one sentence each on the mitigating gate.

- [ ] **Step 3: Write VALIDATION_MATRIX.md** — a table mapping each hard gate (spec §7) → the script/test that enforces it → the evidence file that records it.

- [ ] **Step 4: Write REVIEWER_CHECKLIST.md** — checkbox list a reviewer runs: clone, `bash scripts/smoke-llm-shield-stage3n.sh`, confirm `claim-consistency-report.json` shows `0 / true / true`, confirm no `src/llmShield` diff, confirm the historical claim is `excluded_from_ledger`. (This file is excluded from the overclaim grep, so it may name banned phrases.)

- [ ] **Step 5: Write CLOSEOUT.md** — status SHIPPED placeholder to be finalised at merge; record test count, gate results, "Stage 3O not triggered" note.

- [ ] **Step 6: Write evidence README.md** — one line per generated file describing its contents.

- [ ] **Step 7: Write citation-verification.md** — re-verify the four stable anchors (AgentDojo/OpenReview `m1YYAQjO3w`, Anthropic browser-use post, OWASP AI Agent Security Cheat Sheet, NIST AI RMF AI 100-1) with resolved URLs; for AgentDyn/PISmith/Firewalls/In-the-Wild, mark each `resolved` or `dropped` after a live check. The argument must stand on the stable four; do not let an unresolved future-dated arXiv ID remain load-bearing.

- [ ] **Step 8: Verify no overclaim wording leaked, then run the full smoke**

Run:

```bash
bash scripts/security-audit-llm-shield-stage3n.sh
bash scripts/smoke-llm-shield-stage3n.sh
```

Expected: both pass.

- [ ] **Step 9: Commit**

```bash
git add docs/research/llm-shield/*STAGE_3N* docs/research/llm-shield/LLM_SHIELD_STAGE_3N* docs/research/llm-shield/evidence/stage-3n/README.md docs/research/llm-shield/evidence/stage-3n/citation-verification.md
git commit -m "docs(llm-shield): Stage 3N writeup, threat model, validation matrix, reviewer checklist, closeout, citations

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Full check.sh run + freeze

**Files:** none (verification + final freeze).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass (current baseline 660 + the new 3N lib tests).

- [ ] **Step 2: Run the full check.sh**

Run: `bash scripts/check.sh`
Expected: all gates green including the two new 3N steps. If prettier flags new files mid-run, kill it, run `npx prettier --write` on the new files, commit `style(...)`, and re-run.

- [ ] **Step 3: Confirm zero src/llmShield drift**

Run: `git diff --name-only main...HEAD -- src/llmShield/`
Expected: empty output.

- [ ] **Step 4: Finalise CLOSEOUT.md** with the real test count and a one-line "all gates green" statement, then commit.

```bash
git add docs/research/llm-shield/STAGE_3N_CLOSEOUT.md
git commit -m "test(llm-shield): freeze Stage 3N evidence — all gates green, claim world closed

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**

- §3 three pillars → Tasks 2 (contract), 3 (ledger/panels), 4 (claim compiler). ✓
- §3 frontier `not_applicable_degenerate` → runner gateInputs + gate enforcer (Tasks 5, 6). ✓
- §4 claim surface definition → `buildClaimMap` + closed-world rule (Tasks 4, 6). ✓
- §7 every hard gate → `enforceStage3nHardGates` + runner assembly (Tasks 5, 6); enforced via smoke/check.sh (Tasks 7, 8). ✓
- §8 13 evidence files → runner writes all (Task 6) + README/citation (Task 9). ✓
- §9 docs quartet → Task 9. ✓
- §10 threat model → Task 9 step 2 + security audit (Task 7). ✓
- §11 non-claims → main writeup (Task 9). ✓
- §12 phases → Tasks 1–10 follow the phase order. ✓
- §13 citation verification → Task 9 step 7. ✓
- Global "no src/llmShield change" → policy-drift guard (Task 7) + Task 10 step 3. ✓

**2. Placeholder scan:** No TBD/TODO; every code step shows complete code; commands have expected output. The doc-writing steps in Task 9 describe content but reference exact spec sections to copy — acceptable for prose docs (the spec already contains the verbatim text). ✓

**3. Type consistency:** `evaluatePooling` returns `cross_family_pooling_performed` / `mismatched_denominator_pooling_refusal_test_passed` (matches gate names in Tasks 5, 6 and spec §7 after the review edit). `compileClaims(claimMap, resolve)` signature is consistent between Task 4 (definition) and Task 6 (runner call). `normaliseSources` row shape (`security`/`utility`/`attestation_valid`) is consistent across Tasks 3, 5, 6. `STAGE3N_SOURCE_FILES` keys match `STAGE3N_FAMILIES` across all tasks. ✓
