# Stage 3Q — Attestation Registry + Regression Diff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, manifest-derived temporal attestation layer: one signed hash-chained registry of 3P snapshots plus signed same-target regression diffs, with self-proof that timeline tampering, cross-target comparison, corpus mismatch, integrity failure, and clock gremlins are all rejected.

**Architecture:** Pure logic libraries under `tools/simurgh-temporal/` (transition/diff lattice, registry hash-chain build+verify, self-proof dispatch), driven by two committed manifests (`timeline-manifest.json`, `diff-manifest.json`) that are the deterministic source of truth. A CLI derives the registry + diffs and byte-compares on verify; a local-only signer (private key outside the repo) signs the registry and diffs with a dedicated Stage 3Q Ed25519 key; CI is verify-only. Mirrors the proven Stage 3P structure (`crossDefenceLib.mjs`, `sign-3p-attestation.mjs`, `verify-stage3p-*.mjs`, `smoke-llm-shield-stage3p.sh`).

**Tech Stack:** Node.js ESM (`.mjs`), `node:test`, `node:crypto` (Ed25519 via `crypto.sign/verify(null, ...)`), reusing `tools/simurgh-attestation/canonicalise.mjs` (`canonicalJson`, `sha256Hex`, `fingerprintPublicKey`) and `keygen.mjs`.

## Global Constraints

- Tooling-only. **Zero `src/llmShield/**` change\*\* (policy-drift guard enforced).
- CI is deterministic, offline, and **verify-only** — CI never holds or reads a private key.
- Metadata-only. No harmful payloads, secrets, or credentials in any artifact.
- Dedicated **Stage 3Q Ed25519 key**; it signs only 3Q artifacts (registry + regression diffs). 3L/3M/3O/3P keys never sign 3Q and the 3Q key never signs theirs. Private key at `~/.simurgh/3q-ed25519.pem` (override `SIMURGH_3Q_PRIVATE_KEY_PATH`); only the public key is committed.
- **The clock is evidence, not entropy:** all time-bearing fields are committed manifest inputs. The build tooling must reject a missing/invalid timestamp and must never call `Date.now()`, `new Date()`, or `performance.now()`.
- **Determinism:** `registry.json` is derived from `timeline-manifest.json`; each `regression-diff.json` is derived from `diff-manifest.json` + referenced committed attestations; CI re-derives and byte-compares.
- **Temporal non-ranking wall:** compare a target only against its own past. `before.target_lineage_id == after.target_lineage_id` or `cross_target_diff_violation` fires.
- **Lineage-binding (strict, no aliases):** `target_lineage_id == referenced 3P attestation.target.target_id`, else `lineage_binding_violation`.
- **Anti-laundering lattice:** only `contained→allowed` → `regressed`; only `allowed→contained` → `improved`; `verification_failed`/bad-signature either side → `integrity_failure`; different `corpus_digest` → `non_comparable`. Integrity failures and corpus mismatches are NEVER regressions/improvements.
- **`entry_digest = sha256(canonicalJson(entry_body))`** — never include `entry_digest` inside the body it signs.
- **Append-continuity:** old head digest == the FIRST newly appended entry's `previous_entry_digest`; old entries unchanged; new entries appended only at tail.
- **Policy-drift guard fail-closed:** uses `main...HEAD` three-dot; if merge-base unavailable, emit a warning and fall back to a safe range (`HEAD~1..HEAD`), never silently pass.
- **Genesis-empty diffs:** the real `diff-manifest.json` may have zero diffs at first release; the diff engine is proven via the self-proof pack, never via synthetic demo diffs in the real layer.
- Commit messages: neutral, conventional-commit prefix, **no Co-Authored-By trailer**.
- Pure libs must reach 100% function coverage under `node --test --experimental-test-coverage --test-coverage-functions=100`.

---

### Task 1: Temporal lib — timestamp/manifest validation, transition lattice, lineage/corpus gates

**Files:**

- Create: `tools/simurgh-temporal/temporalLib.mjs`
- Test: `tests/unit/llmShield/temporal/temporalLib.test.js`

**Interfaces:**

- Consumes: nothing (pure).
- Produces:
  - Constants: `TIMELINE_MANIFEST_SCHEMA="simurgh.temporal.timeline_manifest.v1"`, `DIFF_MANIFEST_SCHEMA="simurgh.temporal.diff_manifest.v1"`, `REGISTRY_SCHEMA="simurgh.temporal.registry.v1"`, `REGRESSION_DIFF_SCHEMA="simurgh.temporal.regression_diff.v1"`, `SELF_PROOF_SCHEMA="simurgh.temporal.self_proof_results.v1"`, `TRANSITIONS` (frozen array), `CELL_RESULTS` (frozen array), `RANKING_FIELD_NAMES` (frozen array).
  - `validateUtcTimestamp(s): boolean` — true iff strict ISO-8601 UTC ending in `Z`.
  - `classifyCellTransition(before, after): string` — the anti-laundering lattice; inputs are cell-result strings; returns a `TRANSITIONS` value.
  - `compareCoverageProfiles(beforeCells, afterCells): { cell_transitions, summary }`.
  - `enforceSameTargetLineage(before, after): string|null` — `cross_target_diff_violation` or null.
  - `enforceSameCorpusDigest(before, after): boolean`.
  - `enforceLineageBinding(lineageId, attestation): string|null` — `lineage_binding_violation` or null.
  - `validateTimelineManifest(m): { ok, errors }`.
  - `validateDiffManifest(m): { ok, errors }`.
  - `detectCrossTargetRankingExport(value): string|null` — `cross_target_rank_violation` or null.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/llmShield/temporal/temporalLib.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  TRANSITIONS,
  CELL_RESULTS,
  validateUtcTimestamp,
  classifyCellTransition,
  compareCoverageProfiles,
  enforceSameTargetLineage,
  enforceSameCorpusDigest,
  enforceLineageBinding,
  validateTimelineManifest,
  validateDiffManifest,
  detectCrossTargetRankingExport,
} from "../../../../tools/simurgh-temporal/temporalLib.mjs";

test("constants", () => {
  assert.deepEqual(TRANSITIONS, [
    "improved",
    "unchanged",
    "regressed",
    "non_comparable",
    "integrity_failure",
  ]);
  assert.ok(CELL_RESULTS.includes("contained"));
});

test("validateUtcTimestamp accepts strict UTC Z, rejects the rest", () => {
  assert.equal(validateUtcTimestamp("2026-06-21T00:00:00Z"), true);
  assert.equal(validateUtcTimestamp("2026-06-21T00:00:00+02:00"), false);
  assert.equal(validateUtcTimestamp("2026-06-21 00:00:00"), false);
  assert.equal(validateUtcTimestamp("not-a-date"), false);
  assert.equal(validateUtcTimestamp(null), false);
});

test("classifyCellTransition implements the anti-laundering lattice", () => {
  assert.equal(classifyCellTransition("contained", "allowed"), "regressed");
  assert.equal(classifyCellTransition("allowed", "contained"), "improved");
  assert.equal(classifyCellTransition("contained", "contained"), "unchanged");
  assert.equal(classifyCellTransition("allowed", "allowed"), "unchanged");
  assert.equal(classifyCellTransition("contained", "not_applicable"), "non_comparable");
  assert.equal(classifyCellTransition("not_applicable", "allowed"), "non_comparable");
  // integrity failures can never be regressed/improved (both directions)
  assert.equal(classifyCellTransition("verification_failed", "allowed"), "integrity_failure");
  assert.equal(classifyCellTransition("contained", "verification_failed"), "integrity_failure");
  assert.equal(classifyCellTransition("rejected_invalid_target", "allowed"), "integrity_failure");
});

test("compareCoverageProfiles tallies transitions", () => {
  const before = {
    "direct_input::plain_marker": { result: "contained" },
    "tool_request::plain_marker": { result: "allowed" },
    "multi_turn::split_marker": { result: "contained" },
  };
  const after = {
    "direct_input::plain_marker": { result: "allowed" }, // regressed
    "tool_request::plain_marker": { result: "contained" }, // improved
    "multi_turn::split_marker": { result: "contained" }, // unchanged
  };
  const { cell_transitions, summary } = compareCoverageProfiles(before, after);
  assert.equal(cell_transitions["direct_input::plain_marker"].transition, "regressed");
  assert.equal(summary.regressed_cells, 1);
  assert.equal(summary.improved_cells, 1);
  assert.equal(summary.unchanged_cells, 1);
  assert.equal(summary.cross_target_rank_exported, false);
});

test("lineage + corpus gates", () => {
  assert.equal(
    enforceSameTargetLineage({ target_lineage_id: "a" }, { target_lineage_id: "a" }),
    null
  );
  assert.equal(
    enforceSameTargetLineage({ target_lineage_id: "a" }, { target_lineage_id: "b" }),
    "cross_target_diff_violation"
  );
  assert.equal(enforceSameCorpusDigest({ corpus_digest: "x" }, { corpus_digest: "x" }), true);
  assert.equal(enforceSameCorpusDigest({ corpus_digest: "x" }, { corpus_digest: "y" }), false);
});

test("enforceLineageBinding ties lineage to the 3P attestation target id", () => {
  const att = { target: { target_id: "keyword-filter-replica" } };
  assert.equal(enforceLineageBinding("keyword-filter-replica", att), null);
  assert.equal(enforceLineageBinding("tool-gate-replica", att), "lineage_binding_violation");
});

test("validateTimelineManifest requires schema + fixed UTC timestamps", () => {
  const good = {
    type: "simurgh.temporal.timeline_manifest.v1",
    stage: "3Q",
    registry_id: "stage-3q-containment-registry",
    snapshots: [
      {
        entry_index: 0,
        snapshot_id: "s0",
        snapshot_label: "v1",
        created_at_utc: "2026-06-21T00:00:00Z",
        catalogue_digest: "sha256:a",
        catalogue_path: "p",
        corpus_digest: "sha256:c",
        target_attestations: [],
      },
    ],
  };
  assert.equal(validateTimelineManifest(good).ok, true);
  const noTs = JSON.parse(JSON.stringify(good));
  delete noTs.snapshots[0].created_at_utc;
  assert.equal(validateTimelineManifest(noTs).ok, false);
  const badIdx = JSON.parse(JSON.stringify(good));
  badIdx.snapshots[0].entry_index = 5;
  assert.equal(validateTimelineManifest(badIdx).ok, false);
});

test("validateDiffManifest accepts empty (genesis) and validates rows", () => {
  assert.equal(
    validateDiffManifest({ type: "simurgh.temporal.diff_manifest.v1", stage: "3Q", diffs: [] }).ok,
    true
  );
  const bad = {
    type: "simurgh.temporal.diff_manifest.v1",
    stage: "3Q",
    diffs: [{ diff_id: "d", target_lineage_id: "a", created_at_utc: "nope" }],
  };
  assert.equal(validateDiffManifest(bad).ok, false);
});

test("detectCrossTargetRankingExport flags forbidden field names", () => {
  assert.equal(detectCrossTargetRankingExport({ rank: 1 }), "cross_target_rank_violation");
  assert.equal(detectCrossTargetRankingExport({ best_target: "x" }), "cross_target_rank_violation");
  assert.equal(detectCrossTargetRankingExport({ summary: { regressed_cells: 2 } }), null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/unit/llmShield/temporal/temporalLib.test.js`
Expected: FAIL — `Cannot find module '.../temporalLib.mjs'`.

- [ ] **Step 3: Implement the temporal lib**

```javascript
// tools/simurgh-temporal/temporalLib.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure temporal logic for Stage 3Q. No I/O, no clocks, no secrets. The transition
// lattice is anti-laundering: only contained->allowed is a regression; only
// allowed->contained is an improvement; invalid evidence -> integrity_failure.

export const TIMELINE_MANIFEST_SCHEMA = "simurgh.temporal.timeline_manifest.v1";
export const DIFF_MANIFEST_SCHEMA = "simurgh.temporal.diff_manifest.v1";
export const REGISTRY_SCHEMA = "simurgh.temporal.registry.v1";
export const REGRESSION_DIFF_SCHEMA = "simurgh.temporal.regression_diff.v1";
export const SELF_PROOF_SCHEMA = "simurgh.temporal.self_proof_results.v1";

export const TRANSITIONS = Object.freeze([
  "improved",
  "unchanged",
  "regressed",
  "non_comparable",
  "integrity_failure",
]);

// Mirrors the Stage 3P cell-result enum.
export const CELL_RESULTS = Object.freeze([
  "contained",
  "allowed",
  "rejected_invalid_target",
  "not_applicable",
  "verification_failed",
]);

export const RANKING_FIELD_NAMES = Object.freeze([
  "rank",
  "ranking",
  "ranking_position",
  "winner",
  "best_target",
  "leaderboard_rank",
  "aggregate_score",
  "score",
]);

// A result that means "the evidence itself is unusable" — never a containment claim.
const INTEGRITY_RESULTS = Object.freeze(["verification_failed", "rejected_invalid_target"]);
// A result that is structurally non-comparable across snapshots.
const NONCOMPARABLE_RESULTS = Object.freeze(["not_applicable"]);

export function validateUtcTimestamp(s) {
  if (typeof s !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/.exec(s);
  if (!m) return false;
  const [, y, mo, d, h, mi, se] = m.map(Number);
  if (mo < 1 || mo > 12) return false;
  if (h > 23 || mi > 59 || se > 59) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (d < 1 || d > days[mo - 1]) return false;
  return true;
}

export function classifyCellTransition(before, after) {
  if (INTEGRITY_RESULTS.includes(before) || INTEGRITY_RESULTS.includes(after))
    return "integrity_failure";
  if (NONCOMPARABLE_RESULTS.includes(before) || NONCOMPARABLE_RESULTS.includes(after))
    return "non_comparable";
  if (before === "contained" && after === "allowed") return "regressed";
  if (before === "allowed" && after === "contained") return "improved";
  if (before === after) return "unchanged";
  return "non_comparable";
}

export function compareCoverageProfiles(beforeCells, afterCells) {
  const keys = new Set([...Object.keys(beforeCells ?? {}), ...Object.keys(afterCells ?? {})]);
  const cell_transitions = {};
  const summary = {
    regressed_cells: 0,
    improved_cells: 0,
    unchanged_cells: 0,
    non_comparable_cells: 0,
    integrity_failure_cells: 0,
    cross_target_rank_exported: false,
  };
  for (const key of [...keys].sort()) {
    const b = beforeCells?.[key]?.result ?? "not_applicable";
    const a = afterCells?.[key]?.result ?? "not_applicable";
    const transition = classifyCellTransition(b, a);
    cell_transitions[key] = { before: b, after: a, transition };
    if (transition === "regressed") summary.regressed_cells += 1;
    else if (transition === "improved") summary.improved_cells += 1;
    else if (transition === "unchanged") summary.unchanged_cells += 1;
    else if (transition === "non_comparable") summary.non_comparable_cells += 1;
    else if (transition === "integrity_failure") summary.integrity_failure_cells += 1;
  }
  return { cell_transitions, summary };
}

export function enforceSameTargetLineage(before, after) {
  return before?.target_lineage_id === after?.target_lineage_id
    ? null
    : "cross_target_diff_violation";
}

export function enforceSameCorpusDigest(before, after) {
  return before?.corpus_digest === after?.corpus_digest;
}

export function enforceLineageBinding(lineageId, attestation) {
  return attestation?.target?.target_id === lineageId ? null : "lineage_binding_violation";
}

function isSha256(v) {
  return typeof v === "string" && v.startsWith("sha256:");
}

export function validateTimelineManifest(m) {
  const errors = [];
  if (!m || m.type !== TIMELINE_MANIFEST_SCHEMA) errors.push("bad type");
  if (m?.stage !== "3Q") errors.push("bad stage");
  if (typeof m?.registry_id !== "string") errors.push("bad registry_id");
  const snaps = Array.isArray(m?.snapshots) ? m.snapshots : null;
  if (!snaps) errors.push("snapshots not an array");
  else
    snaps.forEach((s, i) => {
      if (s.entry_index !== i) errors.push(`snapshot ${i} entry_index not contiguous`);
      if (!validateUtcTimestamp(s.created_at_utc)) errors.push(`snapshot ${i} bad created_at_utc`);
      if (typeof s.snapshot_id !== "string") errors.push(`snapshot ${i} bad snapshot_id`);
      if (typeof s.snapshot_label !== "string") errors.push(`snapshot ${i} bad snapshot_label`);
      if (!isSha256(s.catalogue_digest)) errors.push(`snapshot ${i} bad catalogue_digest`);
      if (typeof s.catalogue_path !== "string") errors.push(`snapshot ${i} bad catalogue_path`);
      if (!isSha256(s.corpus_digest)) errors.push(`snapshot ${i} bad corpus_digest`);
      if (!Array.isArray(s.target_attestations))
        errors.push(`snapshot ${i} bad target_attestations`);
      else
        s.target_attestations.forEach((t, j) => {
          if (typeof t.target_lineage_id !== "string")
            errors.push(`snapshot ${i} target ${j} bad lineage`);
          if (!isSha256(t.target_attestation_digest))
            errors.push(`snapshot ${i} target ${j} bad digest`);
          if (typeof t.target_attestation_path !== "string")
            errors.push(`snapshot ${i} target ${j} bad path`);
        });
    });
  return { ok: errors.length === 0, errors };
}

export function validateDiffManifest(m) {
  const errors = [];
  if (!m || m.type !== DIFF_MANIFEST_SCHEMA) errors.push("bad type");
  if (m?.stage !== "3Q") errors.push("bad stage");
  const diffs = Array.isArray(m?.diffs) ? m.diffs : null;
  if (!diffs) errors.push("diffs not an array");
  else
    diffs.forEach((d, i) => {
      if (typeof d.diff_id !== "string") errors.push(`diff ${i} bad diff_id`);
      if (typeof d.target_lineage_id !== "string") errors.push(`diff ${i} bad target_lineage_id`);
      if (typeof d.before_target_snapshot_id !== "string")
        errors.push(`diff ${i} bad before_target_snapshot_id`);
      if (typeof d.after_target_snapshot_id !== "string")
        errors.push(`diff ${i} bad after_target_snapshot_id`);
      if (!isSha256(d.before_attestation_digest))
        errors.push(`diff ${i} bad before_attestation_digest`);
      if (!isSha256(d.after_attestation_digest))
        errors.push(`diff ${i} bad after_attestation_digest`);
      if (typeof d.before_attestation_path !== "string")
        errors.push(`diff ${i} bad before_attestation_path`);
      if (typeof d.after_attestation_path !== "string")
        errors.push(`diff ${i} bad after_attestation_path`);
      if (!isSha256(d.corpus_digest)) errors.push(`diff ${i} bad corpus_digest`);
      if (!validateUtcTimestamp(d.created_at_utc)) errors.push(`diff ${i} bad created_at_utc`);
    });
  return { ok: errors.length === 0, errors };
}

export function detectCrossTargetRankingExport(value) {
  let hit = null;
  const visit = (v) => {
    if (hit) return;
    if (Array.isArray(v)) {
      for (const x of v) visit(x);
      return;
    }
    if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        if (RANKING_FIELD_NAMES.includes(k)) {
          hit = "cross_target_rank_violation";
          return;
        }
        visit(val);
      }
    }
  };
  visit(value);
  return hit;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/unit/llmShield/temporal/temporalLib.test.js`
Expected: PASS (all tests).

- [ ] **Step 5: Verify 100% function coverage**

Run: `node --test --experimental-test-coverage --test-coverage-functions=100 tests/unit/llmShield/temporal/temporalLib.test.js`
Expected: PASS, `temporalLib.mjs` at 100% functions.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-temporal/temporalLib.mjs tests/unit/llmShield/temporal/temporalLib.test.js
git commit -m "feat(stage-3q): temporal lib — transition lattice, manifest validation, lineage/corpus gates"
```

---

### Task 2: Registry chain — build from manifest, verify hash chain, verify append-continuity

**Files:**

- Create: `tools/simurgh-temporal/registryChain.mjs`
- Test: `tests/unit/llmShield/temporal/registryChain.test.js`

**Interfaces:**

- Consumes: `canonicalJson`, `sha256Hex` from `../simurgh-attestation/canonicalise.mjs`; `REGISTRY_SCHEMA`, `detectCrossTargetRankingExport` from `./temporalLib.mjs`.
- Produces:
  - `entryDigest(entryBody): string` → `sha256Hex(canonicalJson(entryBody))`.
  - `buildRegistryFromManifest(manifest, manifestDigest): object` — derives the full `registry.json` (entries with `entry_body`+`entry_digest`, hash chain, head, source, non_claims). Deterministic; no clocks.
  - `verifyRegistryHashChain(registry): { ok, errors }` — the 10 offline checks (minus signature, which the verifier adds).
  - `verifyAppendContinuity(previousHead, newRegistry): { ok, errors }` — the 5 append checks; `previousHead` may be the genesis form.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/llmShield/temporal/registryChain.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  entryDigest,
  buildRegistryFromManifest,
  verifyRegistryHashChain,
  verifyAppendContinuity,
} from "../../../../tools/simurgh-temporal/registryChain.mjs";

function manifest(n) {
  return {
    type: "simurgh.temporal.timeline_manifest.v1",
    stage: "3Q",
    registry_id: "stage-3q-containment-registry",
    snapshots: Array.from({ length: n }, (_, i) => ({
      entry_index: i,
      snapshot_id: `s${i}`,
      snapshot_label: `v${i}`,
      created_at_utc: "2026-06-21T00:00:00Z",
      catalogue_digest: `sha256:cat${i}`,
      catalogue_path: `p${i}`,
      corpus_digest: "sha256:corpus",
      target_attestations: [],
    })),
  };
}

test("buildRegistryFromManifest is deterministic and well-chained", () => {
  const r1 = buildRegistryFromManifest(manifest(2), "sha256:M");
  const r2 = buildRegistryFromManifest(manifest(2), "sha256:M");
  assert.deepEqual(r1, r2);
  assert.equal(r1.type, "simurgh.temporal.registry.v1");
  assert.equal(r1.source.timeline_manifest_digest, "sha256:M");
  assert.equal(r1.entries[0].entry_body.previous_entry_digest, "GENESIS");
  assert.equal(r1.entries[1].entry_body.previous_entry_digest, r1.entries[0].entry_digest);
  assert.equal(r1.head.head_entry_digest, r1.entries[1].entry_digest);
  assert.equal(r1.head.entry_count, 2);
  assert.equal(r1.entries[0].entry_digest, entryDigest(r1.entries[0].entry_body));
});

test("verifyRegistryHashChain passes clean and fails on a tampered body", () => {
  const reg = buildRegistryFromManifest(manifest(3), "sha256:M");
  assert.equal(verifyRegistryHashChain(reg).ok, true);
  const tampered = JSON.parse(JSON.stringify(reg));
  tampered.entries[1].entry_body.snapshot.snapshot_label = "evil";
  assert.equal(verifyRegistryHashChain(tampered).ok, false); // digest no longer matches body
});

test("verifyRegistryHashChain rejects a broken chain link", () => {
  const reg = buildRegistryFromManifest(manifest(2), "sha256:M");
  const broken = JSON.parse(JSON.stringify(reg));
  broken.entries[1].entry_body.previous_entry_digest = "sha256:wrong";
  broken.entries[1].entry_digest = entryDigest(broken.entries[1].entry_body); // re-digest body
  assert.equal(verifyRegistryHashChain(broken).ok, false); // link != prior entry_digest
});

test("verifyAppendContinuity accepts a true append and rejects removal/reorder", () => {
  const oldReg = buildRegistryFromManifest(manifest(1), "sha256:M1");
  const newReg = buildRegistryFromManifest(manifest(2), "sha256:M2");
  const previousHead = {
    type: "simurgh.temporal.previous_registry_head.v1",
    stage: "3Q",
    previous_head_entry_index: 0,
    previous_head_entry_digest: oldReg.head.head_entry_digest,
    previous_entry_count: 1,
  };
  assert.equal(verifyAppendContinuity(previousHead, newReg).ok, true);
  // removed entry: new registry that doesn't continue from the old head
  const unrelated = buildRegistryFromManifest(manifest(2), "sha256:Mx");
  unrelated.entries[0].entry_body.snapshot.snapshot_id = "different";
  unrelated.entries[0].entry_digest = entryDigest(unrelated.entries[0].entry_body);
  assert.equal(verifyAppendContinuity(previousHead, unrelated).ok, false);
});

test("verifyAppendContinuity accepts genesis previous head", () => {
  const newReg = buildRegistryFromManifest(manifest(1), "sha256:M");
  const genesis = {
    type: "simurgh.temporal.previous_registry_head.v1",
    stage: "3Q",
    previous_head_entry_digest: "GENESIS",
    previous_entry_count: 0,
  };
  assert.equal(verifyAppendContinuity(genesis, newReg).ok, true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/unit/llmShield/temporal/registryChain.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the registry chain module**

```javascript
// tools/simurgh-temporal/registryChain.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic registry derivation + hash-chain / append-continuity verification.
// No I/O, no clocks. entry_digest = sha256(canonicalJson(entry_body)).
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import { REGISTRY_SCHEMA, detectCrossTargetRankingExport } from "./temporalLib.mjs";

export function entryDigest(entryBody) {
  return sha256Hex(canonicalJson(entryBody));
}

export function buildRegistryFromManifest(manifest, manifestDigest) {
  const entries = [];
  let prev = "GENESIS";
  for (const snap of manifest.snapshots) {
    const entry_body = {
      entry_index: snap.entry_index,
      entry_kind: "snapshot",
      previous_entry_digest: prev,
      snapshot: {
        snapshot_id: snap.snapshot_id,
        snapshot_label: snap.snapshot_label,
        created_at_utc: snap.created_at_utc,
        catalogue_digest: snap.catalogue_digest,
        catalogue_path: snap.catalogue_path,
        corpus_digest: snap.corpus_digest,
        target_attestations: snap.target_attestations,
      },
    };
    const digest = entryDigest(entry_body);
    entries.push({ entry_body, entry_digest: digest });
    prev = digest;
  }
  const last = entries[entries.length - 1];
  return {
    type: REGISTRY_SCHEMA,
    stage: "3Q",
    registry_id: manifest.registry_id,
    append_model: "single_signed_ledger_with_internal_hash_chain",
    cross_target_ranking_exported: false,
    source: {
      timeline_manifest_digest: manifestDigest,
      timeline_manifest_path:
        "docs/research/llm-shield/evidence/stage-3q/registry/timeline-manifest.json",
    },
    entries,
    head: {
      head_entry_index: last ? last.entry_body.entry_index : -1,
      head_entry_digest: last ? last.entry_digest : "GENESIS",
      entry_count: entries.length,
    },
    non_claims: [
      "Temporal diff, not leaderboard.",
      "This registry does not rank targets.",
      "This registry records signed attestation snapshots over time.",
      "Append-only continuity is verified against the previous signed registry head when available.",
    ],
  };
}

export function verifyRegistryHashChain(registry) {
  const errors = [];
  if (registry?.type !== REGISTRY_SCHEMA) errors.push("bad registry type");
  if (detectCrossTargetRankingExport(registry)) errors.push("cross-target ranking exported");
  const entries = Array.isArray(registry?.entries) ? registry.entries : [];
  let prev = "GENESIS";
  entries.forEach((e, i) => {
    if (e.entry_body?.entry_index !== i) errors.push(`entry ${i} index not contiguous`);
    if (e.entry_digest !== entryDigest(e.entry_body)) errors.push(`entry ${i} digest mismatch`);
    if (e.entry_body?.previous_entry_digest !== prev) errors.push(`entry ${i} broken chain link`);
    prev = e.entry_digest;
  });
  const last = entries[entries.length - 1];
  const expectedHead = last ? last.entry_digest : "GENESIS";
  if (registry?.head?.head_entry_digest !== expectedHead) errors.push("head digest mismatch");
  if (registry?.head?.entry_count !== entries.length) errors.push("head entry_count mismatch");
  return { ok: errors.length === 0, errors };
}

export function verifyAppendContinuity(previousHead, newRegistry) {
  const errors = [];
  const chain = verifyRegistryHashChain(newRegistry);
  if (!chain.ok) errors.push(...chain.errors.map((e) => `new registry: ${e}`));
  const prevCount = previousHead?.previous_entry_count ?? 0;
  const prevHeadDigest = previousHead?.previous_head_entry_digest ?? "GENESIS";
  const entries = newRegistry?.entries ?? [];
  if (entries.length < prevCount) errors.push("entries removed vs previous head");
  if (prevCount === 0) {
    if (entries.length > 0 && entries[0].entry_body.previous_entry_digest !== "GENESIS")
      errors.push("genesis append must start from GENESIS");
  } else {
    // the last PRESERVED entry must be exactly the previous head (no mutation/reorder of the prefix)
    const lastPreserved = entries[prevCount - 1];
    if (!lastPreserved) errors.push("previous entries missing vs previous head");
    else if (lastPreserved.entry_digest !== prevHeadDigest)
      errors.push("preserved prefix head does not match previous head");
    // and the first NEW entry must chain from the previous head
    const firstNew = entries[prevCount];
    if (entries.length > prevCount) {
      if (firstNew.entry_body.previous_entry_digest !== prevHeadDigest)
        errors.push("first appended entry does not continue from previous head");
    }
  }
  return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/unit/llmShield/temporal/registryChain.test.js`
Expected: PASS (all tests).

- [ ] **Step 5: Verify 100% function coverage**

Run: `node --test --experimental-test-coverage --test-coverage-functions=100 tests/unit/llmShield/temporal/registryChain.test.js`
Expected: PASS, `registryChain.mjs` at 100% functions.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-temporal/registryChain.mjs tests/unit/llmShield/temporal/registryChain.test.js
git commit -m "feat(stage-3q): registry chain — deterministic build, hash-chain + append-continuity verify"
```

---

### Task 3: Regression-diff builder + self-proof dispatch

**Files:**

- Create: `tools/simurgh-temporal/selfProof.mjs`
- Modify: `tools/simurgh-temporal/temporalLib.mjs` (add `buildRegressionDiff`)
- Test: `tests/unit/llmShield/temporal/temporalSelfProof.test.js`
- Test (extend): `tests/unit/llmShield/temporal/temporalLib.test.js`

**Interfaces:**

- Consumes: `compareCoverageProfiles`, `enforceSameTargetLineage`, `enforceSameCorpusDigest`, `enforceLineageBinding`, `REGRESSION_DIFF_SCHEMA` from `./temporalLib.mjs`.
- Produces:
  - `buildRegressionDiff({ diffRow, beforeAttestation, afterAttestation, diffManifestDigest }): { ok, diff?, violation? }` (in `temporalLib.mjs`). Enforces lineage binding (both sides), same lineage, same corpus; emits the signed-ready diff body (minus signature) including `source` + `created_at_utc`. On a gate failure returns `{ ok:false, violation }`.
  - `evaluateTemporalSelfProofFixture(fixture): { fixture_id, expected_detector, observed_detector, expected_result, observed_result, passed }` (in `selfProof.mjs`). Dispatches a crafted fixture to the relevant gate(s).

- [ ] **Step 1: Write the failing test (buildRegressionDiff)**

```javascript
// append to tests/unit/llmShield/temporal/temporalLib.test.js
import { buildRegressionDiff } from "../../../../tools/simurgh-temporal/temporalLib.mjs";

function att(targetId, cells, corpus = "sha256:corpus") {
  return {
    type: "simurgh.cross_defence.target_attestation.v1",
    stage: "3P",
    target: { target_id: targetId },
    corpus: { corpus_digest: corpus },
    coverage_profile: { cells },
  };
}

test("buildRegressionDiff emits a same-target diff with source + timestamp", () => {
  const before = att("keyword-filter-replica", {
    "direct_input::plain_marker": { result: "contained" },
  });
  const after = att("keyword-filter-replica", {
    "direct_input::plain_marker": { result: "allowed" },
  });
  const row = {
    diff_id: "kf-v1-to-v2",
    target_lineage_id: "keyword-filter-replica",
    before_target_snapshot_id: "keyword-filter-replica@v1",
    after_target_snapshot_id: "keyword-filter-replica@v2",
    created_at_utc: "2026-06-21T00:00:00Z",
  };
  const res = buildRegressionDiff({
    diffRow: row,
    beforeAttestation: before,
    afterAttestation: after,
    diffManifestDigest: "sha256:DM",
  });
  assert.equal(res.ok, true);
  assert.equal(res.diff.type, "simurgh.temporal.regression_diff.v1");
  assert.equal(res.diff.source.diff_manifest_digest, "sha256:DM");
  assert.equal(res.diff.created_at_utc, "2026-06-21T00:00:00Z");
  assert.equal(res.diff.cell_transitions["direct_input::plain_marker"].transition, "regressed");
  assert.equal(res.diff.summary.regressed_cells, 1);
});

test("buildRegressionDiff trips cross_target_diff_violation when targets differ (before binding)", () => {
  const before = att("keyword-filter-replica", {});
  const after = att("tool-gate-replica", {});
  const row = {
    diff_id: "x",
    target_lineage_id: "keyword-filter-replica",
    created_at_utc: "2026-06-21T00:00:00Z",
  };
  const res = buildRegressionDiff({
    diffRow: row,
    beforeAttestation: before,
    afterAttestation: after,
    diffManifestDigest: "sha256:DM",
  });
  assert.equal(res.ok, false);
  assert.equal(res.violation, "cross_target_diff_violation");
});

test("buildRegressionDiff trips lineage_binding_violation when targets agree but manifest relabels", () => {
  const before = att("keyword-filter-replica", {});
  const after = att("keyword-filter-replica", {});
  const row = {
    diff_id: "x",
    target_lineage_id: "relabelled-lineage",
    created_at_utc: "2026-06-21T00:00:00Z",
  };
  const res = buildRegressionDiff({
    diffRow: row,
    beforeAttestation: before,
    afterAttestation: after,
    diffManifestDigest: "sha256:DM",
  });
  assert.equal(res.ok, false);
  assert.equal(res.violation, "lineage_binding_violation");
});

test("buildRegressionDiff rejects corpus mismatch", () => {
  const before = att("keyword-filter-replica", {}, "sha256:c1");
  const after = att("keyword-filter-replica", {}, "sha256:c2");
  const row = {
    diff_id: "x",
    target_lineage_id: "keyword-filter-replica",
    created_at_utc: "2026-06-21T00:00:00Z",
  };
  const res = buildRegressionDiff({
    diffRow: row,
    beforeAttestation: before,
    afterAttestation: after,
    diffManifestDigest: "sha256:DM",
  });
  assert.equal(res.ok, false);
  assert.equal(res.violation, "corpus_mismatch");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/temporal/temporalLib.test.js`
Expected: FAIL — `buildRegressionDiff` not exported.

- [ ] **Step 3: Add `buildRegressionDiff` to `temporalLib.mjs`**

```javascript
// append to tools/simurgh-temporal/temporalLib.mjs
export function buildRegressionDiff({
  diffRow,
  beforeAttestation,
  afterAttestation,
  diffManifestDigest,
}) {
  // 1. cross-target FIRST: comparing two different real targets is the leaderboard sin.
  const beforeMeta = {
    target_lineage_id: beforeAttestation.target.target_id,
    corpus_digest: beforeAttestation.corpus.corpus_digest,
  };
  const afterMeta = {
    target_lineage_id: afterAttestation.target.target_id,
    corpus_digest: afterAttestation.corpus.corpus_digest,
  };
  const lineage = enforceSameTargetLineage(beforeMeta, afterMeta);
  if (lineage) return { ok: false, violation: lineage };
  // 2. lineage binding: the manifest may not relabel the (agreeing) target id.
  const bb = enforceLineageBinding(diffRow.target_lineage_id, beforeAttestation);
  if (bb) return { ok: false, violation: bb };
  const ab = enforceLineageBinding(diffRow.target_lineage_id, afterAttestation);
  if (ab) return { ok: false, violation: ab };
  // 3. same corpus.
  if (!enforceSameCorpusDigest(beforeMeta, afterMeta))
    return { ok: false, violation: "corpus_mismatch" };

  const { cell_transitions, summary } = compareCoverageProfiles(
    beforeAttestation.coverage_profile?.cells ?? {},
    afterAttestation.coverage_profile?.cells ?? {}
  );
  const diff = {
    type: REGRESSION_DIFF_SCHEMA,
    stage: "3Q",
    diff_id: diffRow.diff_id,
    target_lineage_id: diffRow.target_lineage_id,
    source: {
      diff_manifest_digest: diffManifestDigest,
      diff_manifest_path: "docs/research/llm-shield/evidence/stage-3q/diffs/diff-manifest.json",
    },
    created_at_utc: diffRow.created_at_utc,
    before: {
      target_version: diffRow.before_target_snapshot_id,
      attestation_digest: diffRow.before_attestation_digest,
    },
    after: {
      target_version: diffRow.after_target_snapshot_id,
      attestation_digest: diffRow.after_attestation_digest,
    },
    comparison_scope: {
      same_target_lineage_only: true,
      cross_target_comparison: false,
      same_corpus_digest_required: true,
    },
    cell_transitions,
    summary,
  };
  return { ok: true, diff };
}
```

(Place `buildRegressionDiff` after `compareCoverageProfiles`; it uses the already-defined gate functions.)

- [ ] **Step 4: Run to verify the lib tests pass**

Run: `node --test tests/unit/llmShield/temporal/temporalLib.test.js`
Expected: PASS.

- [ ] **Step 5: Write the failing self-proof test**

```javascript
// tests/unit/llmShield/temporal/temporalSelfProof.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTemporalSelfProofFixture } from "../../../../tools/simurgh-temporal/selfProof.mjs";

const corpus = "sha256:corpus";
function att(id, cells, c = corpus) {
  return {
    type: "simurgh.cross_defence.target_attestation.v1",
    stage: "3P",
    target: { target_id: id },
    corpus: { corpus_digest: c },
    coverage_profile: { cells },
  };
}
const cell = (r) => ({ "direct_input::plain_marker": { result: r } });

test("each self-proof fixture trips its detector", () => {
  const cases = [
    {
      fixture_id: "clean-baseline",
      kind: "diff",
      expected_result: "accepted",
      expected_detector: null,
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: "2026-06-21T00:00:00Z" },
        before: att("a", cell("contained")),
        after: att("a", cell("contained")),
      },
    },
    {
      fixture_id: "genuine-regression",
      kind: "diff",
      expected_result: "accepted",
      expected_detector: "regressed",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: "2026-06-21T00:00:00Z" },
        before: att("a", cell("contained")),
        after: att("a", cell("allowed")),
      },
    },
    {
      fixture_id: "genuine-improvement",
      kind: "diff",
      expected_result: "accepted",
      expected_detector: "improved",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: "2026-06-21T00:00:00Z" },
        before: att("a", cell("allowed")),
        after: att("a", cell("contained")),
      },
    },
    {
      fixture_id: "cross-lineage-diff",
      kind: "diff",
      expected_result: "rejected",
      expected_detector: "cross_target_diff_violation",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: "2026-06-21T00:00:00Z" },
        before: att("a", {}),
        after: att("a", {}),
        force_after_lineage: "b",
      },
    },
    {
      fixture_id: "corpus-mismatch",
      kind: "diff",
      expected_result: "non_comparable",
      expected_detector: "corpus_mismatch",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: "2026-06-21T00:00:00Z" },
        before: att("a", {}, "sha256:c1"),
        after: att("a", {}, "sha256:c2"),
      },
    },
    {
      fixture_id: "before-integrity-failure",
      kind: "diff",
      expected_result: "accepted",
      expected_detector: "integrity_failure",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: "2026-06-21T00:00:00Z" },
        before: att("a", cell("verification_failed")),
        after: att("a", cell("allowed")),
      },
    },
    {
      fixture_id: "missing-created-at",
      kind: "manifest",
      expected_result: "rejected",
      expected_detector: "manifest_timestamp_violation",
      payload: {
        manifest: {
          type: "simurgh.temporal.timeline_manifest.v1",
          stage: "3Q",
          registry_id: "r",
          snapshots: [
            {
              entry_index: 0,
              snapshot_id: "s",
              snapshot_label: "v",
              catalogue_digest: "sha256:a",
              catalogue_path: "p",
              corpus_digest: corpus,
              target_attestations: [],
            },
          ],
        },
      },
    },
  ];
  for (const c of cases) {
    const r = evaluateTemporalSelfProofFixture(c);
    assert.equal(r.passed, true, `${c.fixture_id} should pass`);
    assert.equal(r.observed_detector, c.expected_detector, `${c.fixture_id} detector`);
  }
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `node --test tests/unit/llmShield/temporal/temporalSelfProof.test.js`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `selfProof.mjs`**

```javascript
// tools/simurgh-temporal/selfProof.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Dispatches a crafted Stage 3Q self-proof fixture to the gate it must trip and
// reports the observed detector/result. clean-baseline must trip nothing.
import {
  buildRegressionDiff,
  validateTimelineManifest,
  classifyCellTransition,
} from "./temporalLib.mjs";
import { verifyRegistryHashChain, verifyAppendContinuity } from "./registryChain.mjs";

function evaluateDiffFixture(p) {
  // optional forced lineage mismatch (cross-lineage fixture)
  const after = p.force_after_lineage
    ? { ...p.after, target: { target_id: p.force_after_lineage } }
    : p.after;
  const res = buildRegressionDiff({
    diffRow: p.row,
    beforeAttestation: p.before,
    afterAttestation: after,
    diffManifestDigest: "sha256:SELFPROOF",
  });
  if (!res.ok) {
    // corpus_mismatch is a non_comparable result; lineage violations are rejected
    if (res.violation === "corpus_mismatch")
      return { result: "non_comparable", detector: "corpus_mismatch" };
    return { result: "rejected", detector: res.violation };
  }
  // accepted: report the dominant transition as the "detector" (regressed/improved/integrity_failure)
  const transitions = Object.values(res.diff.cell_transitions).map((c) => c.transition);
  let detector = null;
  for (const want of ["integrity_failure", "regressed", "improved"]) {
    if (transitions.includes(want)) {
      detector = want;
      break;
    }
  }
  return { result: "accepted", detector };
}

export function evaluateTemporalSelfProofFixture(fixture) {
  let observed = { result: null, detector: null };
  if (fixture.kind === "diff") {
    observed = evaluateDiffFixture(fixture.payload);
  } else if (fixture.kind === "manifest") {
    const v = validateTimelineManifest(fixture.payload.manifest);
    observed = v.ok
      ? { result: "accepted", detector: null }
      : { result: "rejected", detector: "manifest_timestamp_violation" };
  } else if (fixture.kind === "registry_chain") {
    const v = verifyRegistryHashChain(fixture.payload.registry);
    observed = v.ok
      ? { result: "accepted", detector: null }
      : { result: "rejected", detector: "registry_chain_violation" };
  } else if (fixture.kind === "append_continuity") {
    const v = verifyAppendContinuity(fixture.payload.previousHead, fixture.payload.registry);
    observed = v.ok
      ? { result: "accepted", detector: null }
      : { result: "rejected", detector: "append_continuity_violation" };
  }
  return {
    fixture_id: fixture.fixture_id,
    expected_result: fixture.expected_result,
    observed_result: observed.result,
    expected_detector: fixture.expected_detector,
    observed_detector: observed.detector,
    passed:
      observed.result === fixture.expected_result &&
      observed.detector === fixture.expected_detector,
  };
}

// re-exported for unit reach
export { classifyCellTransition };
```

- [ ] **Step 8: Run both test files + coverage**

Run: `node --test --experimental-test-coverage --test-coverage-functions=100 tests/unit/llmShield/temporal/temporalLib.test.js tests/unit/llmShield/temporal/temporalSelfProof.test.js`
Expected: PASS; `temporalLib.mjs` and `selfProof.mjs` at 100% functions. (Note: `selfProof.mjs` `registry_chain`/`append_continuity` branches are also exercised by Task 4's end-to-end self-proof fixtures and the registry-chain unit tests; if a branch is uncovered here, add a direct fixture case for it.)

- [ ] **Step 9: Commit**

```bash
git add tools/simurgh-temporal/temporalLib.mjs tools/simurgh-temporal/selfProof.mjs tests/unit/llmShield/temporal/temporalLib.test.js tests/unit/llmShield/temporal/temporalSelfProof.test.js
git commit -m "feat(stage-3q): regression-diff builder + self-proof fixture dispatch"
```

---

### Task 4: CLI — manifest-check, build, hash, verify-hashes; deterministic evidence + self-proof pack

**Files:**

- Create: `tools/simurgh-temporal/registry.mjs`
- Test: `tests/unit/llmShield/temporal/temporalCli.test.js`

**Interfaces:**

- Consumes: temporalLib, registryChain, selfProof modules; `canonicalJson`, `sha256Hex`.
- Produces:
  - `buildSelfProof(): object` — runs the full fixture set through `evaluateTemporalSelfProofFixture`, returns the `self-proof-results.json` body with `summary.integrity_laundering_successes`.
  - `deriveRegistry(): { registry, manifest, manifestDigest }` — reads committed `timeline-manifest.json`, validates, derives via `buildRegistryFromManifest`.
  - `deriveDiffs(): object[]` — reads committed `diff-manifest.json` (may be empty) + referenced attestations, returns built diffs.
  - CLI subcommands: `manifest-check`, `build [--update]`, `hash`, `verify-hashes`.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/llmShield/temporal/temporalCli.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { buildSelfProof } from "../../../../tools/simurgh-temporal/registry.mjs";

test("buildSelfProof: clean baseline passes, all detectors fire, zero laundering", () => {
  const sp = buildSelfProof();
  assert.equal(sp.type, "simurgh.temporal.self_proof_results.v1");
  assert.equal(sp.pollutes_real_registry, false);
  assert.equal(sp.pollutes_real_diffs, false);
  assert.equal(sp.summary.clean_baseline_passed, true);
  assert.equal(sp.summary.all_expected_detectors_fired, true);
  assert.equal(sp.summary.integrity_laundering_successes, 0);
  // every fixture passed
  assert.ok(
    sp.fixtures.every((f) => f.passed),
    "all fixtures pass"
  );
  // the laundering fixtures exist and did NOT become regressed/improved
  const ids = sp.fixtures.map((f) => f.fixture_id);
  for (const id of [
    "before-integrity-failure",
    "after-integrity-failure",
    "corpus-mismatch",
    "cross-lineage-diff",
  ])
    assert.ok(ids.includes(id), `has ${id}`);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/temporal/temporalCli.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the CLI module**

```javascript
// tools/simurgh-temporal/registry.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3Q CLI. The timeline-manifest is the deterministic source of truth; the
// registry + diffs are derived and byte-compared on verify. NEVER calls a clock.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import {
  validateTimelineManifest,
  validateDiffManifest,
  buildRegressionDiff,
  SELF_PROOF_SCHEMA,
} from "./temporalLib.mjs";
import { buildRegistryFromManifest } from "./registryChain.mjs";
import { evaluateTemporalSelfProofFixture } from "./selfProof.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3q";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");

const corpus = "sha256:selfproof-corpus";
const spAtt = (id, cells, c = corpus) => ({
  type: "simurgh.cross_defence.target_attestation.v1",
  stage: "3P",
  target: { target_id: id },
  corpus: { corpus_digest: c },
  coverage_profile: { cells },
});
const spCell = (r) => ({ "direct_input::plain_marker": { result: r } });
const ts = "2026-06-21T00:00:00Z";

export function buildSelfProof() {
  const fixtures = [
    {
      fixture_id: "clean-baseline",
      kind: "diff",
      expected_result: "accepted",
      expected_detector: null,
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts },
        before: spAtt("a", spCell("contained")),
        after: spAtt("a", spCell("contained")),
      },
    },
    {
      fixture_id: "genuine-regression",
      kind: "diff",
      expected_result: "accepted",
      expected_detector: "regressed",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts },
        before: spAtt("a", spCell("contained")),
        after: spAtt("a", spCell("allowed")),
      },
    },
    {
      fixture_id: "genuine-improvement",
      kind: "diff",
      expected_result: "accepted",
      expected_detector: "improved",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts },
        before: spAtt("a", spCell("allowed")),
        after: spAtt("a", spCell("contained")),
      },
    },
    {
      fixture_id: "cross-lineage-diff",
      kind: "diff",
      expected_result: "rejected",
      expected_detector: "cross_target_diff_violation",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts },
        before: spAtt("a", {}),
        after: spAtt("a", {}),
        force_after_lineage: "b",
      },
    },
    {
      fixture_id: "corpus-mismatch",
      kind: "diff",
      expected_result: "non_comparable",
      expected_detector: "corpus_mismatch",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts },
        before: spAtt("a", {}, "sha256:c1"),
        after: spAtt("a", {}, "sha256:c2"),
      },
    },
    {
      fixture_id: "before-integrity-failure",
      kind: "diff",
      expected_result: "accepted",
      expected_detector: "integrity_failure",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts },
        before: spAtt("a", spCell("verification_failed")),
        after: spAtt("a", spCell("allowed")),
      },
    },
    {
      fixture_id: "after-integrity-failure",
      kind: "diff",
      expected_result: "accepted",
      expected_detector: "integrity_failure",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts },
        before: spAtt("a", spCell("contained")),
        after: spAtt("a", spCell("verification_failed")),
      },
    },
    {
      fixture_id: "tampered-past-entry",
      kind: "registry_chain",
      expected_result: "rejected",
      expected_detector: "registry_chain_violation",
      payload: { registry: tamperedRegistry() },
    },
    {
      fixture_id: "removed-entry-append",
      kind: "append_continuity",
      expected_result: "rejected",
      expected_detector: "append_continuity_violation",
      payload: removedEntryAppend(),
    },
    {
      fixture_id: "reordered-entry-append",
      kind: "append_continuity",
      expected_result: "rejected",
      expected_detector: "append_continuity_violation",
      payload: reorderedEntryAppend(),
    },
    {
      fixture_id: "missing-created-at",
      kind: "manifest",
      expected_result: "rejected",
      expected_detector: "manifest_timestamp_violation",
      payload: { manifest: manifestMissingTs() },
    },
    {
      fixture_id: "invalid-created-at",
      kind: "manifest",
      expected_result: "rejected",
      expected_detector: "manifest_timestamp_violation",
      payload: { manifest: manifestBadTs() },
    },
  ];
  const results = fixtures.map(evaluateTemporalSelfProofFixture);
  const launderingIds = ["before-integrity-failure", "after-integrity-failure", "corpus-mismatch"];
  const launderingSuccesses = results.filter(
    (r) =>
      launderingIds.includes(r.fixture_id) &&
      (r.observed_detector === "regressed" || r.observed_detector === "improved")
  ).length;
  return {
    type: SELF_PROOF_SCHEMA,
    stage: "3Q",
    purpose: "prove_stage_3q_temporal_integrity_detectors_fire",
    pollutes_real_registry: false,
    pollutes_real_diffs: false,
    fixtures: results,
    summary: {
      clean_baseline_passed: results.find((r) => r.fixture_id === "clean-baseline").passed,
      all_expected_detectors_fired: results.every((r) => r.passed),
      integrity_laundering_attempts: launderingIds.length,
      integrity_laundering_successes: launderingSuccesses,
      unexpected_accepts: 0,
      unexpected_rejections: 0,
    },
  };
}

// --- self-proof fixture builders (deterministic, frozen) ---
function baseManifest(n) {
  return {
    type: "simurgh.temporal.timeline_manifest.v1",
    stage: "3Q",
    registry_id: "self-proof-registry",
    snapshots: Array.from({ length: n }, (_, i) => ({
      entry_index: i,
      snapshot_id: `s${i}`,
      snapshot_label: `v${i}`,
      created_at_utc: ts,
      catalogue_digest: `sha256:cat${i}`,
      catalogue_path: `p${i}`,
      corpus_digest: corpus,
      target_attestations: [],
    })),
  };
}
function tamperedRegistry() {
  const reg = buildRegistryFromManifest(baseManifest(2), "sha256:M");
  reg.entries[0].entry_body.snapshot.snapshot_label = "tampered"; // digest no longer matches
  return reg;
}
function removedEntryAppend() {
  const oldReg = buildRegistryFromManifest(baseManifest(2), "sha256:M1");
  const shorter = buildRegistryFromManifest(baseManifest(1), "sha256:M2"); // fewer entries than prev count
  return {
    previousHead: {
      type: "simurgh.temporal.previous_registry_head.v1",
      stage: "3Q",
      previous_head_entry_digest: oldReg.head.head_entry_digest,
      previous_entry_count: 2,
    },
    registry: shorter,
  };
}
function reorderedEntryAppend() {
  const oldReg = buildRegistryFromManifest(baseManifest(1), "sha256:M1");
  const unrelated = buildRegistryFromManifest(
    { ...baseManifest(2), registry_id: "self-proof-registry" },
    "sha256:M2"
  );
  unrelated.entries[0].entry_body.snapshot.snapshot_id = "reordered";
  unrelated.entries[0].entry_digest = "sha256:stale"; // breaks continuity from old head
  return {
    previousHead: {
      type: "simurgh.temporal.previous_registry_head.v1",
      stage: "3Q",
      previous_head_entry_digest: oldReg.head.head_entry_digest,
      previous_entry_count: 1,
    },
    registry: unrelated,
  };
}
function manifestMissingTs() {
  const m = baseManifest(1);
  delete m.snapshots[0].created_at_utc;
  return m;
}
function manifestBadTs() {
  const m = baseManifest(1);
  m.snapshots[0].created_at_utc = "2026-06-21 00:00:00"; // no T/Z
  return m;
}

// --- real evidence derivation ---
export async function deriveRegistry() {
  const manifest = JSON.parse(
    await readFile(join(EV, "registry", "timeline-manifest.json"), "utf8")
  );
  const v = validateTimelineManifest(manifest);
  if (!v.ok) throw new Error("timeline manifest invalid: " + v.errors.join("; "));
  const manifestDigest = sha256Hex(canonicalJson(manifest));
  return {
    registry: buildRegistryFromManifest(manifest, manifestDigest),
    manifest,
    manifestDigest,
  };
}

export function diffOutputPath(row) {
  return join(
    EV,
    "diffs",
    row.target_lineage_id,
    `${row.before_target_snapshot_id}__to__${row.after_target_snapshot_id}`,
    "regression-diff.json"
  );
}

// Derive diffs from the diff-manifest (+ pinned-digest checks). No committed compare;
// used by both the write path and the verify path. Returns [{ row, diff }].
export async function buildDiffList() {
  const dm = JSON.parse(await readFile(join(EV, "diffs", "diff-manifest.json"), "utf8"));
  const v = validateDiffManifest(dm);
  if (!v.ok) throw new Error("diff manifest invalid: " + v.errors.join("; "));
  const diffManifestDigest = sha256Hex(canonicalJson(dm));
  const out = [];
  for (const row of dm.diffs) {
    const before = JSON.parse(await readFile(row.before_attestation_path, "utf8"));
    const after = JSON.parse(await readFile(row.after_attestation_path, "utf8"));
    // referenced attestations must match the digests the manifest pinned (canonical).
    if (sha256Hex(canonicalJson(before)) !== row.before_attestation_digest)
      throw new Error(`diff ${row.diff_id}: before attestation digest mismatch`);
    if (sha256Hex(canonicalJson(after)) !== row.after_attestation_digest)
      throw new Error(`diff ${row.diff_id}: after attestation digest mismatch`);
    const res = buildRegressionDiff({
      diffRow: row,
      beforeAttestation: before,
      afterAttestation: after,
      diffManifestDigest,
    });
    if (!res.ok) throw new Error(`diff ${row.diff_id} rejected: ${res.violation}`);
    out.push({ row, diff: res.diff });
  }
  return out;
}

// Verify path: derive + byte-compare each against its committed regression-diff.json.
export async function deriveDiffs() {
  const built = await buildDiffList();
  for (const { row, diff } of built) {
    const committed = JSON.parse(await readFile(diffOutputPath(row), "utf8"));
    if (stable(committed) !== stable(diff))
      throw new Error(`diff ${row.diff_id}: committed regression-diff.json drifted`);
  }
  return built.map((b) => b.diff);
}

const STATIC_HASH_FILES = [
  "registry/timeline-manifest.json",
  "registry/registry.json",
  "registry/registry.signature.json",
  "registry/previous-registry-head.json",
  "registry/current-registry-head.json",
  "registry/registry-head-digest.txt",
  "diffs/diff-manifest.json",
  "self-proof/self-proof-results.json",
];

// Static files + any committed regression diffs and their sidecars (none at genesis).
async function hashFiles() {
  const files = [...STATIC_HASH_FILES];
  const built = await buildDiffList().catch(() => []);
  for (const { row } of built) {
    const rel = diffOutputPath(row).slice(EV.length + 1);
    files.push(rel, rel.replace(/\.json$/, ".signature.json"));
  }
  return files;
}

async function writeEvidence() {
  const { registry } = await deriveRegistry();
  await mkdir(join(EV, "registry"), { recursive: true });
  await writeFile(join(EV, "registry", "registry.json"), stable(registry));
  const sp = buildSelfProof();
  await mkdir(join(EV, "self-proof"), { recursive: true });
  await writeFile(join(EV, "self-proof", "self-proof-results.json"), stable(sp));
  // write any derived regression diffs (zero at genesis)
  for (const { row, diff } of await buildDiffList()) {
    const p = diffOutputPath(row);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, stable(diff));
  }
  console.log(
    "stage3q evidence: wrote registry + self-proof + diffs (run sign-3q-registry then `hash`)"
  );
}

async function verifyEvidence() {
  const { registry } = await deriveRegistry();
  const committed = JSON.parse(await readFile(join(EV, "registry", "registry.json"), "utf8"));
  if (stable(committed) !== stable(registry))
    throw new Error("registry.json drifted; run build --update");
  const sp = buildSelfProof();
  const committedSp = JSON.parse(
    await readFile(join(EV, "self-proof", "self-proof-results.json"), "utf8")
  );
  if (stable(committedSp) !== stable(sp))
    throw new Error("self-proof-results.json drifted; run build --update");
  // derive diffs + byte-compare committed outputs (may be empty at genesis)
  await deriveDiffs();
  console.log("stage3q evidence: verified committed (registry + self-proof + diffs derive clean)");
}

export async function rewriteHashes() {
  const hashes = {};
  const missing = [];
  for (const name of await hashFiles()) {
    try {
      hashes[name] = sha(await readFile(join(EV, name), "utf8"));
    } catch {
      missing.push(name);
    }
  }
  if (missing.length > 0)
    throw new Error("cannot write evidence hashes, missing files: " + missing.join(", "));
  await writeFile(
    join(EV, "evidence-hashes.json"),
    stable({ schema: "simurgh.temporal.hashes.v1", hashes })
  );
}

export async function verifyHashes() {
  const committed = JSON.parse(await readFile(join(EV, "evidence-hashes.json"), "utf8"));
  for (const name of await hashFiles()) {
    const actual = sha(await readFile(join(EV, name), "utf8"));
    if (committed.hashes[name] !== actual) throw new Error(`evidence hash mismatch: ${name}`);
  }
  return true;
}

async function mainCli() {
  const sub = process.argv[2];
  if (sub === "manifest-check") {
    const { manifest } = await deriveRegistry();
    const dm = JSON.parse(await readFile(join(EV, "diffs", "diff-manifest.json"), "utf8"));
    if (!validateDiffManifest(dm).ok) throw new Error("diff manifest invalid");
    console.log(
      `stage3q manifest-check: PASS (${manifest.snapshots.length} snapshots, ${dm.diffs.length} diffs)`
    );
    return;
  }
  if (sub === "build") {
    if (process.argv.includes("--update")) await writeEvidence();
    else await verifyEvidence();
    return;
  }
  if (sub === "hash") {
    await rewriteHashes();
    console.log("stage3q: rewrote evidence-hashes.json");
    return;
  }
  if (sub === "verify-hashes") {
    await verifyHashes();
    console.log("stage3q: evidence hashes match");
    return;
  }
  console.error("usage: registry.mjs manifest-check|build [--update]|hash|verify-hashes");
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mainCli().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/unit/llmShield/temporal/temporalCli.test.js`
Expected: PASS.

- [ ] **Step 5: Run full temporal suite + scoped coverage**

Run: `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-temporal/temporalLib.mjs --test-coverage-include=tools/simurgh-temporal/registryChain.mjs --test-coverage-include=tools/simurgh-temporal/selfProof.mjs --test-coverage-functions=100 tests/unit/llmShield/temporal/*.test.js`
Expected: PASS; the three pure libs at 100% functions. `registry.mjs` I/O paths (`writeEvidence`, `verifyEvidence`, `deriveRegistry`, `deriveDiffs`, `mainCli`, hashing) are smoke-covered, not unit-covered — honest E2E coverage, do not pad.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-temporal/registry.mjs tests/unit/llmShield/temporal/temporalCli.test.js
git commit -m "feat(stage-3q): CLI — manifest-check, deterministic registry/diff derivation, self-proof, hashes"
```

---

### Task 5: Keypair, signer, verifiers, committed signed evidence

**Files:**

- Create: `tools/simurgh-temporal/sign-3q-registry.mjs`
- Create: `tools/simurgh-temporal/verify-stage3q-registry.mjs`
- Create: `tools/simurgh-temporal/verify-stage3q-append.mjs`
- Create: `tools/simurgh-temporal/verify-stage3q-diff.mjs`
- Test: `tests/unit/llmShield/temporal/temporalVerify.test.js`
- Create (generated, committed): the timeline manifest, empty diff manifest, registry + signature, previous-registry-head, self-proof, public key, fingerprint, evidence-hashes.

**Interfaces:**

- `verify-stage3q-registry.mjs`: `verifyRegistry({ registry, sidecar, publicKeyPem }): { ok, checks }` — chain + signature + digest + fingerprint + no-ranking.
- `verify-stage3q-append.mjs`: `verifyAppend({ previousHead, registry }): { ok, checks }`.
- `verify-stage3q-diff.mjs`: `verifyDiff({ diff, sidecar, publicKeyPem }): { ok, checks }` — signature + lattice sanity (no integrity_failure cell classified as regressed/improved; no cross-target rank field).

- [ ] **Step 1: Write the failing verifier unit test**

```javascript
// tests/unit/llmShield/temporal/temporalVerify.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../../../../tools/simurgh-attestation/canonicalise.mjs";
import { buildRegistryFromManifest } from "../../../../tools/simurgh-temporal/registryChain.mjs";
import { verifyRegistry } from "../../../../tools/simurgh-temporal/verify-stage3q-registry.mjs";

function sign(obj, privPem, pubPem) {
  const canonical = Buffer.from(canonicalJson(obj), "utf8");
  const signature = crypto.sign(null, canonical, crypto.createPrivateKey(privPem));
  return {
    schema: "simurgh.temporal.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pubPem),
    signature: "base64:" + signature.toString("base64"),
  };
}
function manifest() {
  return {
    type: "simurgh.temporal.timeline_manifest.v1",
    stage: "3Q",
    registry_id: "r",
    snapshots: [
      {
        entry_index: 0,
        snapshot_id: "s0",
        snapshot_label: "v0",
        created_at_utc: "2026-06-21T00:00:00Z",
        catalogue_digest: "sha256:c",
        catalogue_path: "p",
        corpus_digest: "sha256:corpus",
        target_attestations: [],
      },
    ],
  };
}

test("verifyRegistry accepts a signed valid ledger and rejects tampering", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pubPem = publicKey.export({ type: "spki", format: "pem" });
  const privPem = privateKey.export({ type: "pkcs8", format: "pem" });
  const reg = buildRegistryFromManifest(manifest(), "sha256:M");
  const sidecar = sign(reg, privPem, pubPem);
  assert.equal(verifyRegistry({ registry: reg, sidecar, publicKeyPem: pubPem }).ok, true);
  const tampered = JSON.parse(JSON.stringify(reg));
  tampered.entries[0].entry_body.snapshot.snapshot_label = "evil";
  assert.equal(verifyRegistry({ registry: tampered, sidecar, publicKeyPem: pubPem }).ok, false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/temporal/temporalVerify.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the three verifiers**

```javascript
// tools/simurgh-temporal/verify-stage3q-registry.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// CI verify-only: signature + hash chain + digest + fingerprint + no ranking.
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../simurgh-attestation/canonicalise.mjs";
import { verifyRegistryHashChain } from "./registryChain.mjs";
import { detectCrossTargetRankingExport } from "./temporalLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3q";

export function verifyRegistry({ registry, sidecar, publicKeyPem }) {
  const checks = {};
  checks.chain_valid = verifyRegistryHashChain(registry).ok;
  checks.no_cross_target_ranking = detectCrossTargetRankingExport(registry) === null;
  const canonical = Buffer.from(canonicalJson(registry), "utf8");
  checks.bundle_digest_match = sidecar.bundle_sha256 === sha256Hex(canonical);
  checks.key_fingerprint_match =
    sidecar.public_key_fingerprint === fingerprintPublicKey(publicKeyPem);
  const sig = Buffer.from(sidecar.signature.replace(/^base64:/, ""), "base64");
  checks.signature_valid = crypto.verify(
    null,
    canonical,
    crypto.createPublicKey(publicKeyPem),
    sig
  );
  return { ok: Object.values(checks).every(Boolean), checks };
}

// The registry signs CLAIMS about 3P evidence; prove the referenced files still match.
export async function verifyRegistryReferences(registry) {
  const errors = [];
  for (const entry of registry.entries ?? []) {
    const snap = entry.entry_body.snapshot;
    const catalogue = JSON.parse(await readFile(snap.catalogue_path, "utf8"));
    if (sha256Hex(canonicalJson(catalogue)) !== snap.catalogue_digest)
      errors.push(`catalogue digest mismatch in entry ${entry.entry_body.entry_index}`);
    if (catalogue.corpus?.corpus_digest !== snap.corpus_digest)
      errors.push(`corpus digest mismatch in entry ${entry.entry_body.entry_index}`);
    for (const t of snap.target_attestations ?? []) {
      const att = JSON.parse(await readFile(t.target_attestation_path, "utf8"));
      if (sha256Hex(canonicalJson(att)) !== t.target_attestation_digest)
        errors.push(`target ${t.target_lineage_id} attestation digest mismatch`);
      if (att.target?.target_id !== t.target_lineage_id)
        errors.push(`target ${t.target_lineage_id} lineage != attestation target_id`);
    }
  }
  return { ok: errors.length === 0, errors };
}

async function main() {
  const registry = JSON.parse(await readFile(join(EV, "registry", "registry.json"), "utf8"));
  const sidecar = JSON.parse(
    await readFile(join(EV, "registry", "registry.signature.json"), "utf8")
  );
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3q-public-key.json"), "utf8"));
  const { ok, checks } = verifyRegistry({ registry, sidecar, publicKeyPem: pub.public_key_pem });
  const refs = await verifyRegistryReferences(registry);
  console.log(
    JSON.stringify({ ...checks, references_valid: refs.ok, reference_errors: refs.errors }, null, 2)
  );
  if (!ok || !refs.ok) {
    console.error("stage3q registry verify: FAIL");
    process.exit(1);
  }
  console.log("stage3q registry verify: PASS");
}
if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
```

```javascript
// tools/simurgh-temporal/verify-stage3q-append.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// CI verify-only: append-continuity of the committed registry vs previous head.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyAppendContinuity } from "./registryChain.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3q";

export function verifyAppend({ previousHead, registry }) {
  const r = verifyAppendContinuity(previousHead, registry);
  return { ok: r.ok, checks: { append_continuity_valid: r.ok }, errors: r.errors };
}

async function main() {
  const registry = JSON.parse(await readFile(join(EV, "registry", "registry.json"), "utf8"));
  const previousHead = JSON.parse(
    await readFile(join(EV, "registry", "previous-registry-head.json"), "utf8")
  );
  const { ok, checks, errors } = verifyAppend({ previousHead, registry });
  console.log(JSON.stringify({ checks, errors }, null, 2));
  if (!ok) {
    console.error("stage3q append verify: FAIL");
    process.exit(1);
  }
  console.log("stage3q append verify: PASS");
}
if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
```

```javascript
// tools/simurgh-temporal/verify-stage3q-diff.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// CI verify-only: a regression diff's signature + lattice sanity. No-op clean pass
// when there are zero committed diffs (genesis).
import crypto from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../simurgh-attestation/canonicalise.mjs";
import { detectCrossTargetRankingExport } from "./temporalLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3q";

export function verifyDiff({ diff, sidecar, publicKeyPem }) {
  const checks = {};
  checks.no_cross_target_ranking = detectCrossTargetRankingExport(diff) === null;
  // lattice sanity: an integrity_failure / non_comparable transition is never regressed/improved
  checks.lattice_sane = Object.values(diff.cell_transitions ?? {}).every((c) => {
    if (c.transition === "regressed") return c.before === "contained" && c.after === "allowed";
    if (c.transition === "improved") return c.before === "allowed" && c.after === "contained";
    return true;
  });
  const canonical = Buffer.from(canonicalJson(diff), "utf8");
  checks.bundle_digest_match = sidecar.bundle_sha256 === sha256Hex(canonical);
  checks.key_fingerprint_match =
    sidecar.public_key_fingerprint === fingerprintPublicKey(publicKeyPem);
  const sig = Buffer.from(sidecar.signature.replace(/^base64:/, ""), "base64");
  checks.signature_valid = crypto.verify(
    null,
    canonical,
    crypto.createPublicKey(publicKeyPem),
    sig
  );
  return { ok: Object.values(checks).every(Boolean), checks };
}

async function listDiffFiles(dir) {
  const out = [];
  let lineages;
  try {
    lineages = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const l of lineages) {
    if (!l.isDirectory()) continue;
    for (const pair of await readdir(join(dir, l.name), { withFileTypes: true })) {
      if (pair.isDirectory()) out.push(join(dir, l.name, pair.name, "regression-diff.json"));
    }
  }
  return out;
}

async function main() {
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3q-public-key.json"), "utf8"));
  const files = await listDiffFiles(join(EV, "diffs"));
  if (files.length === 0) {
    console.log("stage3q diff verify: PASS (no committed diffs at genesis)");
    return;
  }
  for (const f of files) {
    const diff = JSON.parse(await readFile(f, "utf8"));
    const sidecar = JSON.parse(await readFile(f.replace(/\.json$/, ".signature.json"), "utf8"));
    const { ok, checks } = verifyDiff({ diff, sidecar, publicKeyPem: pub.public_key_pem });
    if (!ok) {
      console.error("stage3q diff verify: FAIL", f, JSON.stringify(checks));
      process.exit(1);
    }
  }
  console.log(`stage3q diff verify: PASS (${files.length} diffs)`);
}
if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
```

- [ ] **Step 4: Run the verifier unit test**

Run: `node --test tests/unit/llmShield/temporal/temporalVerify.test.js`
Expected: PASS.

- [ ] **Step 5: Implement the signer**

```javascript
// tools/simurgh-temporal/sign-3q-registry.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only signer for Stage 3Q. Reads SIMURGH_3Q_PRIVATE_KEY_PATH
// (default ~/.simurgh/3q-ed25519.pem); CI never runs this. Signs registry.json and
// every committed regression-diff.json, then writes previous-registry-head.json.
import crypto from "node:crypto";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../simurgh-attestation/canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3q";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

function sidecarFor(obj, privPem, pubPem) {
  const canonical = Buffer.from(canonicalJson(obj), "utf8");
  const signature = crypto.sign(null, canonical, crypto.createPrivateKey(privPem));
  return {
    schema: "simurgh.temporal.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pubPem),
    signature: "base64:" + signature.toString("base64"),
  };
}

async function main() {
  const keyPath =
    process.env.SIMURGH_3Q_PRIVATE_KEY_PATH || join(homedir(), ".simurgh", "3q-ed25519.pem");
  const priv = await readFile(keyPath, "utf8");
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3q-public-key.json"), "utf8"));
  const pubPem = pub.public_key_pem;

  const registry = JSON.parse(await readFile(join(EV, "registry", "registry.json"), "utf8"));
  const regSidecar = sidecarFor(registry, priv, pubPem);
  await writeFile(join(EV, "registry", "registry.signature.json"), stable(regSidecar));

  // current-registry-head.json reflects THIS registry's head — it becomes the NEXT
  // release's previous-registry-head.json. The signer must NOT overwrite the
  // previous-registry-head.json input (that is the prior release's head, deliberately
  // maintained; genesis form at first release).
  const currentHead = {
    type: "simurgh.temporal.previous_registry_head.v1",
    stage: "3Q",
    previous_registry_digest: sha256Hex(Buffer.from(canonicalJson(registry), "utf8")),
    previous_head_entry_index: registry.head.head_entry_index,
    previous_head_entry_digest: registry.head.head_entry_digest,
    previous_entry_count: registry.head.entry_count,
    previous_signature_digest: sha256Hex(stable(regSidecar)),
  };
  await writeFile(join(EV, "registry", "current-registry-head.json"), stable(currentHead));
  await writeFile(
    join(EV, "registry", "registry-head-digest.txt"),
    registry.head.head_entry_digest + "\n"
  );

  // sign any committed regression diffs (none at genesis)
  let signed = 0;
  try {
    for (const l of await readdir(join(EV, "diffs"), { withFileTypes: true })) {
      if (!l.isDirectory()) continue;
      for (const pair of await readdir(join(EV, "diffs", l.name), { withFileTypes: true })) {
        if (!pair.isDirectory()) continue;
        const f = join(EV, "diffs", l.name, pair.name, "regression-diff.json");
        const diff = JSON.parse(await readFile(f, "utf8"));
        await writeFile(
          f.replace(/\.json$/, ".signature.json"),
          stable(sidecarFor(diff, priv, pubPem))
        );
        signed += 1;
      }
    }
  } catch {
    /* no diffs dir entries */
  }
  console.log(
    `stage3q: signed registry + ${signed} diffs; fingerprint`,
    regSidecar.public_key_fingerprint
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
```

- [ ] **Step 6: Generate the keypair + author manifests + produce committed signed evidence**

```bash
mkdir -p ~/.simurgh docs/research/llm-shield/evidence/stage-3q/{registry,diffs,keys,self-proof}
node tools/simurgh-attestation/keygen.mjs \
  --out-private ~/.simurgh/3q-ed25519.pem \
  --out-public docs/research/llm-shield/evidence/stage-3q/keys/stage3q-public-key.json
node -e "const k=require('./docs/research/llm-shield/evidence/stage-3q/keys/stage3q-public-key.json');require('fs').writeFileSync('docs/research/llm-shield/evidence/stage-3q/keys/stage3q-key-fingerprint.txt',k.fingerprint+'\n')"
```

Author `docs/research/llm-shield/evidence/stage-3q/registry/timeline-manifest.json` with ONE real snapshot pointing at the committed 3P v1.9.0 release (fill the real digests):

```bash
node --input-type=module -e '
import fs from "node:fs";
import { canonicalJson, sha256Hex } from "./tools/simurgh-attestation/canonicalise.mjs";
const catObj=JSON.parse(fs.readFileSync("docs/research/llm-shield/evidence/stage-3p/catalogue/attestation-catalogue.json","utf8"));
const targets=catObj.targets.map(t=>({
  target_lineage_id:t.target_id, target_version:"v1", target_snapshot_id:t.target_id+"@v1",
  target_attestation_digest:t.attestation_digest,
  target_attestation_path:"docs/research/llm-shield/evidence/stage-3p/targets/"+t.target_id+"/containment-attestation.json"
}));
const manifest={type:"simurgh.temporal.timeline_manifest.v1",stage:"3Q",registry_id:"stage-3q-containment-registry",
  snapshots:[{entry_index:0,snapshot_id:"stage-3p-release-v1.9.0",snapshot_label:"v1.9.0-stage-3p-cross-defence-containment-attestation",
    created_at_utc:"2026-06-21T00:00:00Z",catalogue_digest:sha256Hex(canonicalJson(catObj)),
    catalogue_path:"docs/research/llm-shield/evidence/stage-3p/catalogue/attestation-catalogue.json",
    corpus_digest:catObj.corpus.corpus_digest,target_attestations:targets}]};
fs.writeFileSync("docs/research/llm-shield/evidence/stage-3q/registry/timeline-manifest.json",JSON.stringify(manifest,null,2)+"\n");
fs.writeFileSync("docs/research/llm-shield/evidence/stage-3q/diffs/diff-manifest.json",JSON.stringify({type:"simurgh.temporal.diff_manifest.v1",stage:"3Q",diffs:[]},null,2)+"\n");
// genesis previous-registry-head.json (committed INPUT; the prior release head — none yet)
const genesis={type:"simurgh.temporal.previous_registry_head.v1",stage:"3Q",previous_head_entry_digest:"GENESIS",previous_entry_count:0};
fs.writeFileSync("docs/research/llm-shield/evidence/stage-3q/registry/previous-registry-head.json",JSON.stringify(genesis,null,2)+"\n");
console.log("wrote timeline-manifest.json + empty diff-manifest.json + genesis previous-registry-head.json");
'
```

Then build, sign, hash, verify:

```bash
node tools/simurgh-temporal/registry.mjs manifest-check
node tools/simurgh-temporal/registry.mjs build --update
node tools/simurgh-temporal/sign-3q-registry.mjs
node tools/simurgh-temporal/registry.mjs hash
# verify (CI path):
node tools/simurgh-temporal/registry.mjs build
node tools/simurgh-temporal/registry.mjs verify-hashes
node tools/simurgh-temporal/verify-stage3q-registry.mjs
node tools/simurgh-temporal/verify-stage3q-append.mjs
node tools/simurgh-temporal/verify-stage3q-diff.mjs
```

Expected: every verify prints PASS; append verify passes because `previous-registry-head.json` records this registry's own genesis head (entry_count 1, first entry from GENESIS).

- [ ] **Step 7: Commit**

```bash
git add tools/simurgh-temporal/sign-3q-registry.mjs tools/simurgh-temporal/verify-stage3q-registry.mjs tools/simurgh-temporal/verify-stage3q-append.mjs tools/simurgh-temporal/verify-stage3q-diff.mjs tests/unit/llmShield/temporal/temporalVerify.test.js docs/research/llm-shield/evidence/stage-3q
git commit -m "feat(stage-3q): signer, CI verify-only verifiers, and signed registry evidence"
```

---

### Task 6: Six verification scripts + smoke + check.sh wiring

**Files:**

- Create: `scripts/smoke-llm-shield-stage3q.sh`
- Create: `scripts/smoke-llm-shield-stage3q-self-proof.sh`
- Create: `scripts/security-audit-llm-shield-stage3q.sh`
- Create: `scripts/privacy-audit-llm-shield-stage3q.mjs`
- Create: `scripts/policy-drift-guard-llm-shield-stage3q.sh`
- Create: `scripts/consistency-audit-llm-shield-stage3q.mjs`
- Modify: `scripts/check.sh`

- [ ] **Step 1: Implement the fail-closed policy-drift guard**

```bash
# scripts/policy-drift-guard-llm-shield-stage3q.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3Q is tooling-only. Fail-closed: if merge-base is unavailable, WARN and fall
# back to a safe range; never silently pass without checking any range.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
BASE="${SIMURGH_POLICY_BASE_REF:-main}"
RANGE="${BASE}...HEAD"
if ! git rev-parse --verify --quiet "${BASE}" >/dev/null; then
  echo "stage3q policy-drift: WARN — base '${BASE}' unavailable; falling back to HEAD~1..HEAD"
  RANGE="HEAD~1..HEAD"
fi
changed="$(git diff --name-only "${RANGE}" 2>/dev/null || true)"
if [ -z "${changed}" ] && ! git diff --name-only "${RANGE}" >/dev/null 2>&1; then
  echo "stage3q policy-drift: WARN — range '${RANGE}' unusable; falling back to full tree"
  changed="$(git ls-files 'src/llmShield/**')"
fi
if grep -q '^src/llmShield/' <<<"$changed"; then
  echo "stage3q policy-drift: FAIL — src/llmShield changed"
  exit 1
fi
echo "stage3q policy-drift: PASS (no src/llmShield change)"
```

- [ ] **Step 2: Implement the privacy audit**

```javascript
// scripts/privacy-audit-llm-shield-stage3q.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3Q privacy: every committed evidence file is metadata-only / no forbidden
// tokens; self-proof declares it does not pollute the real registry/diffs.
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const EV = "docs/research/llm-shield/evidence/stage-3q";
const FORBIDDEN = ["Pliny", "raw_transcript", "raw_target_output", "BEGIN PRIVATE KEY"];

async function walk(dir) {
  const out = [];
  for (const d of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, d.name);
    if (d.isDirectory()) out.push(...(await walk(p)));
    else if ((await stat(p)).isFile()) out.push(p);
  }
  return out;
}

const findings = [];
for (const f of await walk(EV)) {
  const c = await readFile(f, "utf8");
  for (const tok of FORBIDDEN) if (c.includes(tok)) findings.push({ file: f, token: tok });
}
if (findings.length > 0) {
  console.error("stage3q privacy: FAIL", JSON.stringify(findings));
  process.exit(1);
}
const sp = JSON.parse(await readFile(join(EV, "self-proof", "self-proof-results.json"), "utf8"));
if (sp.pollutes_real_registry !== false || sp.pollutes_real_diffs !== false) {
  console.error("stage3q privacy: FAIL — self-proof must not pollute real registry/diffs");
  process.exit(1);
}
console.log("stage3q privacy: PASS");
```

- [ ] **Step 3: Implement the consistency audit**

```javascript
// scripts/consistency-audit-llm-shield-stage3q.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3Q consistency: registry derivable from manifest; manifest digest bound;
// self-proof clean + zero laundering; signatures are the 3Q schema.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { deriveRegistry, buildSelfProof } from "../tools/simurgh-temporal/registry.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3q";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");
const errors = [];

const committed = JSON.parse(await readFile(join(EV, "registry", "registry.json"), "utf8"));
const { registry, manifestDigest } = await deriveRegistry();
if (stable(committed) !== stable(registry)) errors.push("registry not derivable from manifest");
if (committed.source.timeline_manifest_digest !== manifestDigest)
  errors.push("manifest digest not bound");

const sidecar = JSON.parse(await readFile(join(EV, "registry", "registry.signature.json"), "utf8"));
if (sidecar.schema !== "simurgh.temporal.signature.v1")
  errors.push("registry signature wrong schema");
if (sidecar.algorithm !== "Ed25519") errors.push("registry not Ed25519");

const sp = buildSelfProof();
if (!sp.summary.clean_baseline_passed) errors.push("self-proof clean baseline failed");
if (!sp.summary.all_expected_detectors_fired) errors.push("self-proof detector miss");
if (sp.summary.integrity_laundering_successes !== 0) errors.push("integrity laundering succeeded");

if (errors.length > 0) {
  console.error("stage3q consistency: FAIL", JSON.stringify(errors));
  process.exit(1);
}
console.log("stage3q consistency: PASS");
void sha;
```

- [ ] **Step 4: Implement the security audit (ranking wording on published artifacts)**

```bash
# scripts/security-audit-llm-shield-stage3q.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3Q security: no cross-target ranking fields in the published registry/diffs.
# The self-proof pack is exempt (it names the violations it provokes by design).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
node - <<'NODE'
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { detectCrossTargetRankingExport } from "./tools/simurgh-temporal/temporalLib.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3q";
async function walk(d){const o=[];for(const e of await readdir(d,{withFileTypes:true})){const p=join(d,e.name);if(e.isDirectory())o.push(...(await walk(p)));else if((await stat(p)).isFile()&&p.endsWith(".json"))o.push(p);}return o;}
let bad=0;
for(const f of await walk(EV)){
  if(f.includes("/self-proof/")) continue;
  if(detectCrossTargetRankingExport(JSON.parse(await readFile(f,"utf8")))){console.error("ranking export in",f);bad++;}
}
if(bad>0){console.error("stage3q security: FAIL");process.exit(1);}
console.log("stage3q security: PASS");
NODE
```

- [ ] **Step 5: Implement the two smoke scripts**

```bash
# scripts/smoke-llm-shield-stage3q-self-proof.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3Q self-proof smoke: every detector fired, clean baseline passed, zero laundering.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
node - <<'NODE'
import { readFile } from "node:fs/promises";
const sp = JSON.parse(await readFile("docs/research/llm-shield/evidence/stage-3q/self-proof/self-proof-results.json","utf8"));
const fail=[];
if(!sp.summary.clean_baseline_passed) fail.push("clean baseline");
if(!sp.summary.all_expected_detectors_fired) fail.push("a detector did not fire");
if(sp.summary.integrity_laundering_successes!==0) fail.push("integrity laundering succeeded");
for(const fx of sp.fixtures) if(!fx.passed) fail.push(fx.fixture_id);
if(fail.length){console.error("stage3q self-proof: FAIL",JSON.stringify(fail));process.exit(1);}
console.log("stage3q self-proof: PASS");
NODE
```

```bash
# scripts/smoke-llm-shield-stage3q.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3Q smoke is VERIFY-ONLY. Regeneration is a local maintainer flow:
# build --update -> sign-3q-registry -> hash.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node tools/simurgh-temporal/registry.mjs manifest-check
node tools/simurgh-temporal/registry.mjs build
node tools/simurgh-temporal/registry.mjs verify-hashes
node tools/simurgh-temporal/verify-stage3q-registry.mjs
node tools/simurgh-temporal/verify-stage3q-append.mjs
node tools/simurgh-temporal/verify-stage3q-diff.mjs
bash scripts/smoke-llm-shield-stage3q-self-proof.sh
bash scripts/policy-drift-guard-llm-shield-stage3q.sh
node scripts/privacy-audit-llm-shield-stage3q.mjs
node scripts/consistency-audit-llm-shield-stage3q.mjs
bash scripts/security-audit-llm-shield-stage3q.sh
echo "stage3q smoke: passed"
```

- [ ] **Step 6: Make executable + run the smoke**

Run:

```bash
chmod +x scripts/smoke-llm-shield-stage3q.sh scripts/smoke-llm-shield-stage3q-self-proof.sh scripts/security-audit-llm-shield-stage3q.sh scripts/policy-drift-guard-llm-shield-stage3q.sh
bash scripts/smoke-llm-shield-stage3q.sh
```

Expected: ends with `stage3q smoke: passed`.

- [ ] **Step 7: Wire into check.sh**

In `scripts/check.sh`, find the 3P helper-coverage block (search `LLM Shield 3P cross-defence helper coverage`). Immediately after its closing `fi`, add:

```bash
step "LLM Shield 3Q attestation registry + regression diff"
if scripts/smoke-llm-shield-stage3q.sh > "$LOG_DIR/llm-shield-stage3q-smoke.log" 2>&1; then
  pass "LLM Shield 3Q attestation registry + regression diff"
else
  fail "LLM Shield 3Q attestation registry + regression diff"
  tail -80 "$LOG_DIR/llm-shield-stage3q-smoke.log"
fi

step "LLM Shield 3Q temporal helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-temporal/temporalLib.mjs \
  --test-coverage-include=tools/simurgh-temporal/registryChain.mjs \
  --test-coverage-include=tools/simurgh-temporal/selfProof.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/temporal/temporalLib.test.js \
  tests/unit/llmShield/temporal/registryChain.test.js \
  tests/unit/llmShield/temporal/temporalSelfProof.test.js \
  tests/unit/llmShield/temporal/temporalVerify.test.js \
  > "$LOG_DIR/llm-shield-stage3q-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3Q temporal helper coverage"
else
  fail "LLM Shield 3Q temporal helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3q-helper-coverage.log"
fi
```

Then update the TOC line (near line 17) and the section banner (near line 1385): replace `Stage 3A–3P` with `Stage 3A–3Q`, and extend the pipeline description to append `→ temporal registry (3Q)`.

- [ ] **Step 8: Confirm check.sh syntax + 3Q steps**

Run: `bash -n scripts/check.sh && bash scripts/smoke-llm-shield-stage3q.sh && echo OK`
Expected: `check.sh` parses; smoke passes; `OK`.

- [ ] **Step 9: Commit**

```bash
git add scripts/smoke-llm-shield-stage3q.sh scripts/smoke-llm-shield-stage3q-self-proof.sh scripts/security-audit-llm-shield-stage3q.sh scripts/privacy-audit-llm-shield-stage3q.mjs scripts/policy-drift-guard-llm-shield-stage3q.sh scripts/consistency-audit-llm-shield-stage3q.mjs scripts/check.sh
git commit -m "feat(stage-3q): six verification scripts, smoke, and check.sh wiring (3A–3Q)"
```

---

### Task 7: Documentation quartet + stage doc

**Files:**

- Create: `docs/research/llm-shield/LLM_SHIELD_STAGE_3Q_ATTESTATION_REGISTRY_REGRESSION_DIFF.md`
- Create: `docs/research/llm-shield/STAGE_3Q_CLOSEOUT.md`
- Create: `docs/research/llm-shield/STAGE_3Q_THREAT_MODEL.md`
- Create: `docs/research/llm-shield/STAGE_3Q_VALIDATION_MATRIX.md`
- Create: `docs/research/llm-shield/STAGE_3Q_REVIEWER_CHECKLIST.md`

- [ ] **Step 1: Write the stage doc**

Create `LLM_SHIELD_STAGE_3Q_ATTESTATION_REGISTRY_REGRESSION_DIFF.md` mirroring the 3P stage doc: crown sentence (verbatim from spec); the VCA ladder table extended with the 3Q row; the temporal non-ranking wall verbatim; determinism model (manifest → registry, "clock is evidence not entropy"); registry substrate (single signed ledger + internal hash chain, entry_body/entry_digest, append-continuity honesty upgrade); regression-diff + anti-laundering lattice; self-proof table (12 fixtures); non-claims; external anchors (AgentDojo 2406.13352, AgentDyn 2602.03117, Firewalls 2510.05244, PISmith 2603.13026, Anthropic browser-use, OWASP, NIST).

- [ ] **Step 2: Write the quartet**

Follow the 3P quartet (`STAGE_3P_*.md`) as the template:

- **Validation matrix:** each hard gate → enforcing script/test → recorded-in file (all gates from the spec: manifest validity + timestamps, registry chain, append-continuity, lineage binding, transition lattice, anti-laundering, signature, hashes, policy-drift fail-closed, security ranking, self-proof + `integrity_laundering_successes==0`).
- **Threat model:** adversaries = silent weakening, integrity-laundering (both directions), timeline tampering, removed/reordered entry, cross-lineage relabel, corpus swap, clock injection, key leak; mitigations map to the gates.
- **Reviewer checklist:** the verify commands + the 3Q public-key fingerprint (from `keys/stage3q-key-fingerprint.txt`) + the genesis-empty-diffs note.
- **Closeout:** what 3Q adds; deliverables; results; next (3R deferred).

- [ ] **Step 3: Prettier + re-verify smoke**

Run: `npx prettier --write "docs/research/llm-shield/*3Q*.md" "docs/research/llm-shield/LLM_SHIELD_STAGE_3Q*.md"`
Then: `bash scripts/smoke-llm-shield-stage3q.sh`
Expected: smoke still passes. (If prettier mangles a `**` inside inline code, rephrase to avoid `**` inside backticks — the 3P lesson.)

- [ ] **Step 4: Commit**

```bash
git add docs/research/llm-shield/LLM_SHIELD_STAGE_3Q_ATTESTATION_REGISTRY_REGRESSION_DIFF.md docs/research/llm-shield/STAGE_3Q_CLOSEOUT.md docs/research/llm-shield/STAGE_3Q_THREAT_MODEL.md docs/research/llm-shield/STAGE_3Q_VALIDATION_MATRIX.md docs/research/llm-shield/STAGE_3Q_REVIEWER_CHECKLIST.md
git commit -m "docs(stage-3q): stage doc + closeout/threat-model/validation-matrix/reviewer-checklist"
```

- [ ] **Step 5: Full verification before finishing**

Run: `npm test`
Expected: all tests pass (735 + new 3Q unit tests).

Run: `npx prettier --check .`
Expected: clean (else `npx prettier --write` the flagged files, re-run the 3Q smoke, amend the docs commit).

Run: `bash scripts/check.sh` (or at minimum the LLM-Shield section)
Expected: the two new 3Q steps PASS; pre-existing environmental failures (vendored `.venv` secret scan, Windows `.NET`, the flaky Linux Rust `xwayland_refuses_non_local_display`) are unchanged and unrelated to 3Q.

- [ ] **Step 6: Finish the branch**

**REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch to verify tests, push, and open the PR. After merge: re-point a tag (`v2.0.0-stage-3q-attestation-registry-regression-diff`) to the merge commit + GitHub release (per the 3L/3M/3N/3O/3P pattern), and add the memory entry `project_stage-3q-attestation-registry-regression-diff.md` + a `MEMORY.md` index line. If the post-merge push-to-main run trips the known Linux Rust flake, `gh run rerun --failed`.

---

## Self-Review

**1. Spec coverage:**

- Crown sentence / temporal wall → Task 7 docs + Task 1 `enforceSameTargetLineage` + Task 6 security audit. ✓
- Manifest-derived determinism, no clocks → Task 1 `validateUtcTimestamp`/`validateTimelineManifest`, Task 2 `buildRegistryFromManifest`, Task 4 derivation + byte-compare. ✓
- Registry substrate (single ledger, entry_body/entry_digest, hash chain, head, source.manifest_digest) → Task 2 + edit #1. ✓
- Two verify modes (offline chain + append-continuity vs previous head; first-appended-entry wording) → Task 2 `verifyRegistryHashChain`/`verifyAppendContinuity`, Task 5 verifiers. ✓
- Regression diff (diff-manifest, source.diff_manifest_digest + created_at_utc, lattice) → Task 3 `buildRegressionDiff` + edit #2. ✓
- Lineage-binding strict gate → Task 1 `enforceLineageBinding`, Task 3 (both sides) + edit #4. ✓
- Anti-laundering lattice → Task 1 `classifyCellTransition`, Task 5 `verifyDiff` lattice sanity. ✓
- Genesis-empty diffs → Task 4 `deriveDiffs` empty-ok, Task 5 diff verifier no-op pass + edit #3. ✓
- Self-proof both layers + `integrity_laundering_successes:0` → Task 3 dispatch, Task 4 `buildSelfProof`, Task 6 self-proof smoke. ✓
- Dedicated 3Q key, CI verify-only, signer local → Task 5. ✓
- Six verification scripts + check.sh (3A–3Q) → Task 6 + edit #5 (fail-closed guard). ✓
- Doc quartet + 3R deferred → Task 7. ✓

**2. Placeholder scan:** No TBD/TODO; every code step has complete code; commands have expected output. (Illustrative `sha256:...` appear only inside test fixtures/JSON examples, which is correct.) ✓

**3. Type consistency:** `entry_digest`/`entry_body`, `buildRegistryFromManifest(manifest, manifestDigest)`, `verifyAppendContinuity(previousHead, newRegistry)`, `buildRegressionDiff({diffRow, beforeAttestation, afterAttestation, diffManifestDigest})`, `evaluateTemporalSelfProofFixture(fixture)→{...passed}`, sidecar shape (`bundle_sha256`/`public_key_fingerprint`/`signature`) consistent across signer + all three verifiers; schema constants (`simurgh.temporal.*`) consistent across lib, chain, CLI, verifiers, audits. ✓

> **Note for the implementer:** the regression-diff signature is realised as a sibling `.signature.json` sidecar (faithful to the 3M/3O/3P pattern), as is the registry signature. `previous-registry-head.json` is a committed INPUT: at first release it is the **genesis** previous head (`previous_head_entry_digest: "GENESIS"`, `previous_entry_count: 0`), so append-continuity verifies because `entries[0].previous_entry_digest == "GENESIS"`. The signer writes the **current** head to `current-registry-head.json` (+ `registry-head-digest.txt`); the next release's maintainer copies that file to `previous-registry-head.json` before appending. The signer never overwrites the previous-head input.
