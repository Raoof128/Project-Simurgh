# Stage 3U — Red-Team-Hardened Capability-Extraction Attestation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert red-team findings A10 (volume false-fire) and A9 (metadata smuggling) into a new frozen detector-v2 identity with grammar-enforced metadata, a signed offline-reproducible attestation, and regression self-proof — additively, without touching any Stage 3T v1 code or evidence.

**Architecture:** Add v2 modules beside the frozen 3T modules in `tools/simurgh-extraction/` (V2 suffixes), reusing only `canonicalise.mjs`. Detector v2 splits signal families into STRONG vs CONTEXTUAL and requires ≥2 distinct STRONG families to declare extraction (volume can never corroborate). Metadata is enforced as a grammar (enum/regex per field). New `stage-3u/` evidence is signed with a dedicated 3U key; v1/3T stays byte-reproducible (enforced by a v1-freeze guard).

**Tech Stack:** Node ≥ 22 ES modules, `node:test`, `node:crypto` (Ed25519), reusing `tools/simurgh-attestation/canonicalise.mjs` (`canonicalJson`, `sha256Hex`, `fingerprintPublicKey`) + `keygen.mjs`. Bash audit/smoke scripts. CI via `scripts/check.sh`.

## Global Constraints

- Tooling-only: **zero `src/llmShield` change**. Policy-drift guard fail-closed, three-dot base (`origin/main...HEAD`). CI `fetch-depth: 0`.
- **Additive invariant:** MUST NOT modify any Stage 3T v1 module (`tools/simurgh-extraction/{metaSet,signalFamilies,detector,renderer,selfProof,simurgh-extraction,sign-3t-attestation,verify-stage3t-attestation}.mjs`) or any `docs/research/llm-shield/evidence/stage-3t/**` artifact. `verify-stage3t-attestation.mjs --reproduce` MUST keep passing. Enforced by the v1-freeze guard (Task 9).
- Offline + deterministic: no gateway run, no network, no live traffic, no identity data.
- Neutral commit messages, **no Co-Authored-By trailer**.
- Pure v2 libs at **100% function coverage** + targeted **branch** tests for grammar-rejection throw paths. Never state "100% coverage" unqualified.
- **Detector identity:** `DETECTOR_ID = "stage3u_extraction_detector_v2"`, `PREVIOUS_DETECTOR_ID = "stage3t_frozen_detector_v1"`. Changing the family map, family-strength split, threshold rule, decision function, metadata grammar, or signal thresholds requires a new id.
- **Decision (frozen):** `extraction_pattern_observed` requires **≥2 distinct STRONG families**; volume NEVER corroborates.
- **Metadata grammar:** every string field matches a strict enum/regex; payloads in tags are rejected.
- **Synthetic-hash invariant:** every `sha256:` field in v2 evidence is `sha256Hex(canonicalJson(label))` — no human-readable fake hashes.
- **Byte-reproducibility invariant:** no timestamps/hostnames/usernames/abs paths/env values in any 3U artifact.
- **Sacred non-claim (verbatim):** `A detector match is not an accusation. It is a reproducible metadata-pattern result for manual review.`
- **No named labs** in machine artifacts/evidence outputs (docs may reference the public threat).
- `sha256Hex()` ALREADY returns the `sha256:`-prefixed string — never double-prefix. `write-hashes` runs AFTER prettier. Security audit scans accusatory words in machine artifacts (.json) only; README may negate them.
- Dedicated 3U Ed25519 key: `~/.simurgh/3u-ed25519.pem` (mode 0600, never committed); only the public key committed.
- Tag target `v2.4.0` on merge. Branch: `main-stage-3u-red-team-hardened-extraction-attestation`.

**Frozen signal thresholds (identical to 3T, used by `matchSignalsV2`):**
```js
CLUSTER_MIN = 3; DOMINANCE = 0.6; COT_MAJORITY = 0.5;
VOLUME_BURST_FRACTION = 0.6; HIGH_REQUEST_COUNT = 10; HYDRA_MIN_ACTORS = 3;
```

**Family strength (frozen):**
```js
STRONG  = { structural:[repetition_cluster, template_prefix_cluster],
            behavioural:[cot_elicitation],
            targeting:[capability_targeting, task_taxonomy_repeat],
            coordination:[hydra_cluster] }
CONTEXTUAL = { volume:[volume_burst, high_request_count] }
FAMILY_ORDER_V2 = [structural, behavioural, targeting, coordination, volume]
```

**Decision function (frozen, total):**
```
0 strong, 0 contextual  → no_pattern_observed          (claim: none)
0 strong, ≥1 contextual → single_signal_observed       (claim: manual_review_only)
1 strong, any contextual→ single_signal_observed       (claim: manual_review_only)
≥2 strong, any          → extraction_pattern_observed  (claim: manual_review_recommended)
```

---

## File Structure (all under `tools/simurgh-extraction/`, additive; v1 untouched)

- `signalFamiliesV2.mjs` — strong/contextual family map + split.
- `metadataGrammar.mjs` — per-field enum/regex grammar + `validateRowGrammar` + digest.
- `metaSetV2.mjs` — schema v2 validation (provenance + unique run_id + grammar) + digest.
- `detectorV2.mjs` — frozen signal matching + strong-count decision.
- `rendererV2.mjs` — strong/contextual-aware prose + sacred non-claim.
- `selfProofV2.mjs` — A10/A9 regression + version-lock fixtures.
- `simurgh-extraction-v2.mjs` — CLI build/hash/verify/write-hashes/verify-hashes.
- `sign-3u-attestation.mjs`, `verify-stage3u-attestation.mjs`.
- Tests: `tests/unit/llmShield/extractionV2/{signalFamiliesV2,metadataGrammar,metaSetV2,detectorV2,rendererV2,extractionSelfProofV2,extractionCliV2,extractionVerifyV2}.test.js`.
- Evidence: `docs/research/llm-shield/evidence/stage-3u/**`.
- Scripts: `scripts/{smoke,security-audit,privacy-audit,consistency-audit}-llm-shield-stage3u.{sh,mjs}`, `scripts/policy-drift-guard-llm-shield-stage3u.sh`, `scripts/v1-freeze-guard-llm-shield-stage3u.sh`, `scripts/check.sh` wiring.
- Docs: `docs/research/llm-shield/LLM_SHIELD_STAGE_3U_*.md` + `STAGE_3U_*.md` + evidence `README.md`.

---

### Task 1: signalFamiliesV2 (pure)

**Files:**
- Create: `tools/simurgh-extraction/signalFamiliesV2.mjs`
- Test: `tests/unit/llmShield/extractionV2/signalFamiliesV2.test.js`

**Interfaces:**
- Consumes: `canonicalJson`, `sha256Hex` from `../simurgh-attestation/canonicalise.mjs`.
- Produces: `FAMILY_MAP_V2` (deep-frozen), `FAMILY_ORDER_V2`, `STRONG_FAMILIES` (frozen array), `CONTEXTUAL_FAMILIES` (frozen array), `familyMapDigestV2() -> "sha256:..."`, `signalToFamilyV2(id) -> string|null`, `splitFamilies(firedSignalIds) -> {strong: string[], contextual: string[]}` (each sorted by `FAMILY_ORDER_V2`).

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/extractionV2/signalFamiliesV2.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  FAMILY_MAP_V2, FAMILY_ORDER_V2, STRONG_FAMILIES, CONTEXTUAL_FAMILIES,
  familyMapDigestV2, signalToFamilyV2, splitFamilies,
} from "../../../../tools/simurgh-extraction/signalFamiliesV2.mjs";

test("family map + member arrays are deep-frozen", () => {
  assert.equal(Object.isFrozen(FAMILY_MAP_V2), true);
  assert.equal(Object.isFrozen(FAMILY_MAP_V2.structural), true);
  assert.equal(Object.isFrozen(FAMILY_ORDER_V2), true);
  assert.equal(Object.isFrozen(STRONG_FAMILIES), true);
  assert.equal(Object.isFrozen(CONTEXTUAL_FAMILIES), true);
});

test("volume is the only contextual family", () => {
  assert.deepEqual([...CONTEXTUAL_FAMILIES], ["volume"]);
  assert.deepEqual([...STRONG_FAMILIES], ["structural", "behavioural", "targeting", "coordination"]);
});

test("signalToFamilyV2 maps members and returns null for unknown", () => {
  assert.equal(signalToFamilyV2("repetition_cluster"), "structural");
  assert.equal(signalToFamilyV2("volume_burst"), "volume");
  assert.equal(signalToFamilyV2("nope"), null);
});

test("splitFamilies separates strong vs contextual, sorted, deduped", () => {
  const r = splitFamilies(["volume_burst", "cot_elicitation", "repetition_cluster", "template_prefix_cluster"]);
  assert.deepEqual(r.strong, ["structural", "behavioural"]); // structural counted ONCE
  assert.deepEqual(r.contextual, ["volume"]);
});

test("splitFamilies ignores unknown signals", () => {
  assert.deepEqual(splitFamilies(["nope"]), { strong: [], contextual: [] });
});

test("familyMapDigestV2 single-prefixed + stable", () => {
  assert.match(familyMapDigestV2(), /^sha256:[0-9a-f]{64}$/);
  assert.equal(familyMapDigestV2(), familyMapDigestV2());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/extractionV2/signalFamiliesV2.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// tools/simurgh-extraction/signalFamiliesV2.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Detector-v2 family map. STRONG families can corroborate an extraction decision;
// the CONTEXTUAL family (volume) can raise review context but never corroborates.
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";

function deepFreeze(obj) {
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") deepFreeze(v);
  }
  return Object.freeze(obj);
}

export const FAMILY_MAP_V2 = deepFreeze({
  structural: ["repetition_cluster", "template_prefix_cluster"],
  behavioural: ["cot_elicitation"],
  targeting: ["capability_targeting", "task_taxonomy_repeat"],
  coordination: ["hydra_cluster"],
  volume: ["volume_burst", "high_request_count"],
});

export const FAMILY_ORDER_V2 = Object.freeze([
  "structural", "behavioural", "targeting", "coordination", "volume",
]);
export const STRONG_FAMILIES = Object.freeze(["structural", "behavioural", "targeting", "coordination"]);
export const CONTEXTUAL_FAMILIES = Object.freeze(["volume"]);

export function signalToFamilyV2(signalId) {
  for (const fam of FAMILY_ORDER_V2) {
    if (FAMILY_MAP_V2[fam].includes(signalId)) return fam;
  }
  return null;
}

export function splitFamilies(firedSignalIds) {
  const fams = new Set();
  for (const s of firedSignalIds) {
    const f = signalToFamilyV2(s);
    if (f) fams.add(f);
  }
  const strong = STRONG_FAMILIES.filter((f) => fams.has(f));
  const contextual = CONTEXTUAL_FAMILIES.filter((f) => fams.has(f));
  return { strong, contextual };
}

export function familyMapDigestV2() {
  return sha256Hex(canonicalJson(FAMILY_MAP_V2));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/extractionV2/signalFamiliesV2.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Verify 100% function coverage**

Run: `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-extraction/signalFamiliesV2.mjs --test-coverage-functions=100 tests/unit/llmShield/extractionV2/signalFamiliesV2.test.js`
Expected: PASS, 100% functions.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-extraction/signalFamiliesV2.mjs tests/unit/llmShield/extractionV2/signalFamiliesV2.test.js
git commit -m "feat(3u): detector-v2 strong/contextual signal-family map"
```

---

### Task 2: metadataGrammar (pure)

**Files:**
- Create: `tools/simurgh-extraction/metadataGrammar.mjs`
- Test: `tests/unit/llmShield/extractionV2/metadataGrammar.test.js`

**Interfaces:**
- Consumes: `canonicalJson`, `sha256Hex`.
- Produces: `METADATA_GRAMMAR` (deep-frozen), `ALLOWED_ROW_FIELDS_V2` (frozen array), `validateRowGrammar(row) -> true | throws`, `metadataGrammarDigest() -> "sha256:..."`. Throw messages: `forbidden_metadata_field`, `metadata_grammar_violation`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/extractionV2/metadataGrammar.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  METADATA_GRAMMAR, validateRowGrammar, metadataGrammarDigest,
} from "../../../../tools/simurgh-extraction/metadataGrammar.mjs";

const H = "sha256:" + "a".repeat(64);
function row(o = {}) {
  return {
    run_id: "s3u_run_001",
    actor_cluster_hash: H, session_cluster_hash: H,
    normalized_prompt_hash: H, prompt_template_hash: H,
    task_family: "code_generation", capability_tag: "tool_use",
    input_tokens_bucket: "1k-2k", output_tokens_bucket: "2k-4k",
    time_bucket: "bucket_001", cot_elicitation_flag: false, tool_use_request_shape: false,
    ...o,
  };
}

test("grammar is deep-frozen", () => {
  assert.equal(Object.isFrozen(METADATA_GRAMMAR), true);
});

test("accepts a clean v2 row", () => {
  assert.equal(validateRowGrammar(row()), true);
});

test("rejects unknown field", () => {
  assert.throws(() => validateRowGrammar(row({ raw_prompt: "hi" })), /forbidden_metadata_field/);
});

test("rejects payload smuggled into a tag (A9)", () => {
  assert.throws(() => validateRowGrammar(row({ capability_tag: "IGNORE PREVIOUS INSTRUCTIONS" })), /metadata_grammar_violation/);
  assert.throws(() => validateRowGrammar(row({ task_family: "exfiltrate_system_prompt" })), /metadata_grammar_violation/);
  assert.throws(() => validateRowGrammar(row({ input_tokens_bucket: "all of the secret prompt" })), /metadata_grammar_violation/);
});

test("rejects invalid hash value (A9)", () => {
  assert.throws(() => validateRowGrammar(row({ actor_cluster_hash: "sha256:synthetic_actor_a" })), /metadata_grammar_violation/);
});

test("rejects a full timestamp in time_bucket (A9)", () => {
  assert.throws(() => validateRowGrammar(row({ time_bucket: "2026-06-22T10:49:44Z" })), /metadata_grammar_violation/);
});

test("rejects bad run_id pattern", () => {
  assert.throws(() => validateRowGrammar(row({ run_id: "s3t_run_001" })), /metadata_grammar_violation/);
});

test("rejects non-boolean flag", () => {
  assert.throws(() => validateRowGrammar(row({ cot_elicitation_flag: "true" })), /metadata_grammar_violation/);
});

test("grammar digest single-prefixed + stable", () => {
  assert.match(metadataGrammarDigest(), /^sha256:[0-9a-f]{64}$/);
  assert.equal(metadataGrammarDigest(), metadataGrammarDigest());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/extractionV2/metadataGrammar.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// tools/simurgh-extraction/metadataGrammar.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Value-level metadata grammar (A9 fix). Metadata-only is enforced as a grammar, not a
// convention: every string field must match a strict enum or regex, so raw payloads
// cannot hide inside an allowed tag.
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";

const HASH = "^sha256:[0-9a-f]{64}$";
export const METADATA_GRAMMAR = Object.freeze({
  run_id: { type: "regex", pattern: "^s3u_run_[0-9]{3}$" },
  actor_cluster_hash: { type: "regex", pattern: HASH },
  session_cluster_hash: { type: "regex", pattern: HASH },
  normalized_prompt_hash: { type: "regex", pattern: HASH },
  prompt_template_hash: { type: "regex", pattern: HASH },
  task_family: { type: "enum", values: Object.freeze(["code_generation", "data_analysis", "summarisation", "translation", "qa", "planning", "other"]) },
  capability_tag: { type: "enum", values: Object.freeze(["tool_use", "coding", "reasoning", "translation", "summarisation", "general"]) },
  input_tokens_bucket: { type: "enum", values: Object.freeze(["0-1k", "1k-2k", "2k-4k", "4k-8k", "8k-plus"]) },
  output_tokens_bucket: { type: "enum", values: Object.freeze(["0-1k", "1k-2k", "2k-4k", "4k-8k", "8k-plus"]) },
  time_bucket: { type: "regex", pattern: "^bucket_[0-9]{3}$" },
  cot_elicitation_flag: { type: "boolean" },
  tool_use_request_shape: { type: "boolean" },
});

export const ALLOWED_ROW_FIELDS_V2 = Object.freeze(Object.keys(METADATA_GRAMMAR));

export function validateRowGrammar(row) {
  if (!row || typeof row !== "object") throw new Error("metadata_grammar_violation");
  const allowed = new Set(ALLOWED_ROW_FIELDS_V2);
  for (const k of Object.keys(row)) {
    if (!allowed.has(k)) throw new Error("forbidden_metadata_field");
  }
  for (const [field, rule] of Object.entries(METADATA_GRAMMAR)) {
    const v = row[field];
    if (rule.type === "boolean") {
      if (typeof v !== "boolean") throw new Error("metadata_grammar_violation");
    } else if (rule.type === "enum") {
      if (typeof v !== "string" || !rule.values.includes(v)) throw new Error("metadata_grammar_violation");
    } else if (rule.type === "regex") {
      if (typeof v !== "string" || !new RegExp(rule.pattern).test(v)) throw new Error("metadata_grammar_violation");
    }
  }
  return true;
}

export function metadataGrammarDigest() {
  return sha256Hex(canonicalJson(METADATA_GRAMMAR));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/extractionV2/metadataGrammar.test.js`
Expected: PASS (9 tests). These tests also cover the throw branches (A9 rejection paths) for branch coverage.

- [ ] **Step 5: Verify 100% function coverage**

Run: `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-extraction/metadataGrammar.mjs --test-coverage-functions=100 tests/unit/llmShield/extractionV2/metadataGrammar.test.js`
Expected: PASS, 100% functions.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-extraction/metadataGrammar.mjs tests/unit/llmShield/extractionV2/metadataGrammar.test.js
git commit -m "feat(3u): value-level metadata grammar enforcement (A9 fix)"
```

---

### Task 3: metaSetV2 (pure)

**Files:**
- Create: `tools/simurgh-extraction/metaSetV2.mjs`
- Test: `tests/unit/llmShield/extractionV2/metaSetV2.test.js`

**Interfaces:**
- Consumes: `canonicalJson`, `sha256Hex`; `validateRowGrammar` from `metadataGrammar.mjs`.
- Produces: `META_SET_SCHEMA_V2 = "simurgh.capability_extraction.meta_set.v2"`, `validateMetaSetV2(set) -> true | throws`, `normaliseMetaSetV2(set) -> object`, `metaSetDigestV2(set) -> "sha256:..."`. Throw messages: `meta_set_invalid`, `meta_set_provenance_invalid`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/extractionV2/metaSetV2.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  META_SET_SCHEMA_V2, validateMetaSetV2, metaSetDigestV2,
} from "../../../../tools/simurgh-extraction/metaSetV2.mjs";

const H = "sha256:" + "b".repeat(64);
function row(id, o = {}) {
  return {
    run_id: id, actor_cluster_hash: H, session_cluster_hash: H,
    normalized_prompt_hash: H, prompt_template_hash: H,
    task_family: "code_generation", capability_tag: "tool_use",
    input_tokens_bucket: "1k-2k", output_tokens_bucket: "2k-4k",
    time_bucket: "bucket_001", cot_elicitation_flag: false, tool_use_request_shape: false, ...o,
  };
}
function set(runs, o = {}) {
  return {
    type: META_SET_SCHEMA_V2, set_id: "stage3u_reference_set",
    set_provenance: "synthetic_reference", live_traffic_used: false,
    identity_data_used: false, raw_content_used: false, runs, ...o,
  };
}

test("accepts a clean v2 set", () => {
  assert.equal(validateMetaSetV2(set([row("s3u_run_001"), row("s3u_run_002")])), true);
});
test("rejects bad provenance", () => {
  assert.throws(() => validateMetaSetV2(set([row("s3u_run_001")], { live_traffic_used: true })), /meta_set_provenance_invalid/);
});
test("rejects duplicate run_id", () => {
  assert.throws(() => validateMetaSetV2(set([row("s3u_run_001"), row("s3u_run_001")])), /meta_set_invalid/);
});
test("rejects empty runs", () => {
  assert.throws(() => validateMetaSetV2(set([])), /meta_set_invalid/);
});
test("rejects grammar violation in a row (A9)", () => {
  assert.throws(() => validateMetaSetV2(set([row("s3u_run_001", { capability_tag: "PAYLOAD" })])), /metadata_grammar_violation/);
});
test("digest is order-independent, full-header, single-prefixed", () => {
  const a = set([row("s3u_run_001"), row("s3u_run_002")]);
  const b = set([row("s3u_run_002"), row("s3u_run_001")]);
  assert.match(metaSetDigestV2(a), /^sha256:[0-9a-f]{64}$/);
  assert.equal(metaSetDigestV2(a), metaSetDigestV2(b));
  assert.notEqual(metaSetDigestV2(a), metaSetDigestV2(set([row("s3u_run_001")], { set_id: "other" })));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/extractionV2/metaSetV2.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// tools/simurgh-extraction/metaSetV2.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// v2 metadata-set: schema + provenance + unique run_id + per-row grammar; full-header,
// order-independent digest.
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import { validateRowGrammar } from "./metadataGrammar.mjs";

export const META_SET_SCHEMA_V2 = "simurgh.capability_extraction.meta_set.v2";

export function validateMetaSetV2(set) {
  if (!set || typeof set !== "object") throw new Error("meta_set_invalid");
  if (set.type !== META_SET_SCHEMA_V2) throw new Error("meta_set_invalid");
  if (
    set.set_provenance !== "synthetic_reference" ||
    set.live_traffic_used !== false ||
    set.identity_data_used !== false ||
    set.raw_content_used !== false
  ) {
    throw new Error("meta_set_provenance_invalid");
  }
  if (!Array.isArray(set.runs) || set.runs.length === 0) throw new Error("meta_set_invalid");
  const seen = new Set();
  for (const r of set.runs) {
    validateRowGrammar(r); // throws metadata_grammar_violation / forbidden_metadata_field
    if (seen.has(r.run_id)) throw new Error("meta_set_invalid");
    seen.add(r.run_id);
  }
  return true;
}

export function normaliseMetaSetV2(set) {
  validateMetaSetV2(set);
  return {
    type: set.type,
    set_id: set.set_id,
    set_provenance: set.set_provenance,
    live_traffic_used: set.live_traffic_used,
    identity_data_used: set.identity_data_used,
    raw_content_used: set.raw_content_used,
    runs: [...set.runs].sort((a, b) => a.run_id.localeCompare(b.run_id)),
  };
}

export function metaSetDigestV2(set) {
  return sha256Hex(canonicalJson(normaliseMetaSetV2(set)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/extractionV2/metaSetV2.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Verify 100% function coverage**

Run: `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-extraction/metaSetV2.mjs --test-coverage-functions=100 tests/unit/llmShield/extractionV2/metaSetV2.test.js`
Expected: PASS, 100% functions.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-extraction/metaSetV2.mjs tests/unit/llmShield/extractionV2/metaSetV2.test.js
git commit -m "feat(3u): v2 metadata-set validation (grammar-bound) + digest"
```

---

### Task 4: detectorV2 (pure)

**Files:**
- Create: `tools/simurgh-extraction/detectorV2.mjs`
- Test: `tests/unit/llmShield/extractionV2/detectorV2.test.js`

**Interfaces:**
- Consumes: `metaSetDigestV2` (metaSetV2); `splitFamilies` (signalFamiliesV2).
- Produces: `DETECTOR_ID`, `PREVIOUS_DETECTOR_ID`, `THRESHOLD_STRONG = 2`, `THRESHOLDS` (frozen), `matchSignalsV2(set) -> {<signalId>:bool}`, `firedSignalIds(matched) -> string[]`, `decideV2(strongCount) -> {decision, attestation_claim}`, `runDetectorV2(set) -> result.v2`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/extractionV2/detectorV2.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { META_SET_SCHEMA_V2 } from "../../../../tools/simurgh-extraction/metaSetV2.mjs";
import {
  DETECTOR_ID, PREVIOUS_DETECTOR_ID, THRESHOLD_STRONG,
  matchSignalsV2, firedSignalIds, decideV2, runDetectorV2,
} from "../../../../tools/simurgh-extraction/detectorV2.mjs";

import crypto from "node:crypto";
const hh = (s) => "sha256:" + crypto.createHash("sha256").update(s).digest("hex");
function row(id, o = {}) {
  return {
    run_id: "s3u_run_" + String(id).padStart(3, "0"),
    actor_cluster_hash: hh("actor_a"), session_cluster_hash: hh("s" + id),
    normalized_prompt_hash: hh("np" + id), prompt_template_hash: hh("tp" + id),
    task_family: "code_generation", capability_tag: "tool_use",
    input_tokens_bucket: "1k-2k", output_tokens_bucket: "2k-4k",
    time_bucket: "bucket_" + String((id % 999) + 1).padStart(3, "0"),
    cot_elicitation_flag: false, tool_use_request_shape: false, ...o,
  };
}
const mset = (runs) => ({ type: META_SET_SCHEMA_V2, set_id: "t", set_provenance: "synthetic_reference",
  live_traffic_used: false, identity_data_used: false, raw_content_used: false, runs });

test("identity constants", () => {
  assert.equal(DETECTOR_ID, "stage3u_extraction_detector_v2");
  assert.equal(PREVIOUS_DETECTOR_ID, "stage3t_frozen_detector_v1");
  assert.equal(THRESHOLD_STRONG, 2);
});

test("decideV2 is total over strong count", () => {
  assert.deepEqual(decideV2(0), { decision: "no_pattern_observed", attestation_claim: "none" });
  assert.deepEqual(decideV2(1), { decision: "single_signal_observed", attestation_claim: "manual_review_only" });
  assert.deepEqual(decideV2(2), { decision: "extraction_pattern_observed", attestation_claim: "manual_review_recommended" });
});

test("A10: structural + volume → single (volume cannot corroborate)", () => {
  // shared template (structural) + 11 rows (high_request_count → volume), varied else, 1 actor
  const runs = Array.from({ length: 11 }, (_, i) => row(i, { prompt_template_hash: hh("shared") }));
  const res = runDetectorV2(mset(runs));
  assert.equal(res.strong_family_count, 1);
  assert.deepEqual(res.matched_strong_families, ["structural"]);
  assert.deepEqual(res.matched_contextual_families, ["volume"]);
  assert.equal(res.decision, "single_signal_observed");
});

test("extraction: structural + behavioural → extraction", () => {
  const runs = Array.from({ length: 4 }, (_, i) => row(i, { normalized_prompt_hash: hh("same"), cot_elicitation_flag: true }));
  const res = runDetectorV2(mset(runs));
  assert.deepEqual(res.matched_strong_families, ["structural", "behavioural"]);
  assert.equal(res.decision, "extraction_pattern_observed");
  assert.equal(res.detector_id, DETECTOR_ID);
  assert.equal(res.previous_detector_id, PREVIOUS_DETECTOR_ID);
  assert.match(res.meta_set_digest, /^sha256:/);
  assert.ok(res.non_claims.includes("match_is_not_accusation"));
});

test("firedSignalIds returns only true signals", () => {
  assert.deepEqual(firedSignalIds({ a: true, b: false }), ["a"]);
});

test("clean varied small set → no pattern", () => {
  const res = runDetectorV2(mset([row(1), row(2)]));
  assert.equal(res.decision, "no_pattern_observed");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/extractionV2/detectorV2.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// tools/simurgh-extraction/detectorV2.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Detector v2: same frozen signal thresholds as v1, but the DECISION requires >=2 distinct
// STRONG families. Volume is contextual and never corroborates (A10 fix).
import { metaSetDigestV2 } from "./metaSetV2.mjs";
import { splitFamilies } from "./signalFamiliesV2.mjs";

export const DETECTOR_ID = "stage3u_extraction_detector_v2";
export const PREVIOUS_DETECTOR_ID = "stage3t_frozen_detector_v1";
export const THRESHOLD_STRONG = 2;
export const THRESHOLDS = Object.freeze({
  CLUSTER_MIN: 3, DOMINANCE: 0.6, COT_MAJORITY: 0.5,
  VOLUME_BURST_FRACTION: 0.6, HIGH_REQUEST_COUNT: 10, HYDRA_MIN_ACTORS: 3,
});

function counts(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
  return m;
}
function maxCount(map) {
  let max = 0;
  for (const v of map.values()) if (v > max) max = v;
  return max;
}

export function matchSignalsV2(set) {
  const rows = set.runs;
  const n = rows.length;
  const np = counts(rows, "normalized_prompt_hash");
  const tp = counts(rows, "prompt_template_hash");
  const cap = counts(rows, "capability_tag");
  const task = counts(rows, "task_family");
  const tb = counts(rows, "time_bucket");
  const actors = counts(rows, "actor_cluster_hash");
  const sessions = counts(rows, "session_cluster_hash");
  const cotTrue = rows.filter((r) => r.cot_elicitation_flag === true).length;
  return {
    repetition_cluster: maxCount(np) >= THRESHOLDS.CLUSTER_MIN,
    template_prefix_cluster: maxCount(tp) >= THRESHOLDS.CLUSTER_MIN,
    cot_elicitation: n > 0 && cotTrue / n > THRESHOLDS.COT_MAJORITY,
    capability_targeting: n >= THRESHOLDS.CLUSTER_MIN && maxCount(cap) / n >= THRESHOLDS.DOMINANCE,
    task_taxonomy_repeat: n >= THRESHOLDS.CLUSTER_MIN && maxCount(task) / n >= THRESHOLDS.DOMINANCE,
    hydra_cluster: actors.size >= THRESHOLDS.HYDRA_MIN_ACTORS && sessions.size >= actors.size,
    volume_burst: n >= THRESHOLDS.CLUSTER_MIN && maxCount(tb) / n >= THRESHOLDS.VOLUME_BURST_FRACTION,
    high_request_count: n >= THRESHOLDS.HIGH_REQUEST_COUNT,
  };
}

export function firedSignalIds(matched) {
  return Object.keys(matched).filter((k) => matched[k] === true);
}

export function decideV2(strongCount) {
  if (strongCount >= THRESHOLD_STRONG)
    return { decision: "extraction_pattern_observed", attestation_claim: "manual_review_recommended" };
  if (strongCount === 1)
    return { decision: "single_signal_observed", attestation_claim: "manual_review_only" };
  return { decision: "no_pattern_observed", attestation_claim: "none" };
}

export function runDetectorV2(set) {
  const matched = matchSignalsV2(set);
  const { strong, contextual } = splitFamilies(firedSignalIds(matched));
  // 0 strong + >=1 contextual must surface as single_signal_observed (review context), not no_pattern.
  const { decision, attestation_claim } =
    strong.length === 0 && contextual.length > 0
      ? { decision: "single_signal_observed", attestation_claim: "manual_review_only" }
      : decideV2(strong.length);
  return {
    type: "simurgh.capability_extraction.detector_result.v2",
    detector_id: DETECTOR_ID,
    previous_detector_id: PREVIOUS_DETECTOR_ID,
    meta_set_digest: metaSetDigestV2(set),
    matched,
    matched_strong_families: strong,
    matched_contextual_families: contextual,
    strong_family_count: strong.length,
    contextual_family_count: contextual.length,
    decision,
    attestation_claim,
    non_claims: [
      "no_intent_claim", "no_attribution_claim", "no_complete_distillation_prevention_claim",
      "no_general_fp_fn_claim", "no_live_traffic_claim", "metadata_only", "match_is_not_accusation",
    ],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/extractionV2/detectorV2.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Verify 100% function coverage**

Run: `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-extraction/detectorV2.mjs --test-coverage-functions=100 tests/unit/llmShield/extractionV2/detectorV2.test.js`
Expected: PASS, 100% functions.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-extraction/detectorV2.mjs tests/unit/llmShield/extractionV2/detectorV2.test.js
git commit -m "feat(3u): detector v2 — strong-family decision, volume contextual (A10 fix)"
```

---

### Task 5: rendererV2 (pure)

**Files:**
- Create: `tools/simurgh-extraction/rendererV2.mjs`
- Test: `tests/unit/llmShield/extractionV2/rendererV2.test.js`

**Interfaces:**
- Consumes: a detector-v2 result.
- Produces: `SACRED_NON_CLAIM`, `FORBIDDEN_WORDING` (frozen), `renderAttestationProseV2(result) -> {rendered_summary, intent_claim_made:false}`; throws `intent_language_rejected`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/extractionV2/rendererV2.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  SACRED_NON_CLAIM, FORBIDDEN_WORDING, renderAttestationProseV2,
} from "../../../../tools/simurgh-extraction/rendererV2.mjs";

const extraction = { decision: "extraction_pattern_observed", matched_strong_families: ["structural", "behavioural"], matched_contextual_families: ["volume"], strong_family_count: 2 };
const a10 = { decision: "single_signal_observed", matched_strong_families: ["structural"], matched_contextual_families: ["volume"], strong_family_count: 1 };
const none = { decision: "no_pattern_observed", matched_strong_families: [], matched_contextual_families: [], strong_family_count: 0 };

test("extraction prose names strong+contextual families and the reason", () => {
  const s = renderAttestationProseV2(extraction).rendered_summary;
  assert.match(s, /strong families: structural, behavioural/i);
  assert.match(s, /contextual families: volume/i);
  assert.match(s, /at least two strong families/i);
  assert.ok(s.includes(SACRED_NON_CLAIM));
});

test("A10 prose states volume cannot independently corroborate", () => {
  const s = renderAttestationProseV2(a10).rendered_summary;
  assert.match(s, /single_signal_observed/i);
  assert.match(s, /volume is contextual and cannot independently corroborate/i);
});

test("no-pattern branch renders + carries non-claim", () => {
  const s = renderAttestationProseV2(none).rendered_summary;
  assert.match(s, /no .*pattern/i);
  assert.ok(s.includes(SACRED_NON_CLAIM));
});

test("intent_claim_made false + deterministic", () => {
  assert.equal(renderAttestationProseV2(extraction).intent_claim_made, false);
  assert.equal(renderAttestationProseV2(extraction).rendered_summary, renderAttestationProseV2({ ...extraction }).rendered_summary);
});

test("throws on accusatory family name (defence in depth)", () => {
  assert.throws(() => renderAttestationProseV2({ ...extraction, matched_strong_families: ["attacker"] }), /intent_language_rejected/);
});

test("no forbidden wording leaks", () => {
  const s = renderAttestationProseV2(extraction).rendered_summary.toLowerCase();
  for (const w of FORBIDDEN_WORDING) assert.ok(!s.includes(w), `leaked ${w}`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/extractionV2/rendererV2.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// tools/simurgh-extraction/rendererV2.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// v2 renderer: exposes the strong/contextual distinction and the decision reason. Never
// accuses, attributes, or names a lab. Appends the sacred non-claim; throws on forbidden words.

export const SACRED_NON_CLAIM =
  "A detector match is not an accusation. It is a reproducible metadata-pattern result for manual review.";

export const FORBIDDEN_WORDING = Object.freeze([
  "distillation attack confirmed", "abusive actor", "stolen", "fraudulent",
  "malicious campaign", "attacker", "deepseek", "moonshot", "minimax",
]);

function reason(result) {
  if (result.decision === "extraction_pattern_observed")
    return "extraction_pattern_observed because at least two strong families matched";
  if (result.decision === "single_signal_observed")
    return result.matched_contextual_families.length > 0 && result.strong_family_count < 2
      ? "single_signal_observed because volume is contextual and cannot independently corroborate"
      : "single_signal_observed because fewer than two strong families matched";
  return "no_pattern_observed because no signal families matched";
}

export function renderAttestationProseV2(result) {
  const strong = result.matched_strong_families.join(", ") || "none";
  const contextual = result.matched_contextual_families.join(", ") || "none";
  const summary =
    `Matched strong families: ${strong}. Matched contextual families: ${contextual}. ` +
    `Decision: ${reason(result)}. ${SACRED_NON_CLAIM}`;
  const lower = summary.toLowerCase();
  for (const w of FORBIDDEN_WORDING) {
    if (lower.includes(w)) throw new Error("intent_language_rejected");
  }
  return { rendered_summary: summary, intent_claim_made: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/extractionV2/rendererV2.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Verify 100% function coverage**

Run: `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-extraction/rendererV2.mjs --test-coverage-functions=100 tests/unit/llmShield/extractionV2/rendererV2.test.js`
Expected: PASS, 100% functions.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-extraction/rendererV2.mjs tests/unit/llmShield/extractionV2/rendererV2.test.js
git commit -m "feat(3u): v2 renderer exposing strong/contextual decision reason"
```

---

### Task 6: selfProofV2 (pure)

**Files:**
- Create: `tools/simurgh-extraction/selfProofV2.mjs`
- Test: `tests/unit/llmShield/extractionV2/extractionSelfProofV2.test.js`

**Interfaces:**
- Consumes: `validateMetaSetV2` (metaSetV2), `DETECTOR_ID`/`THRESHOLD_STRONG`/`runDetectorV2` (detectorV2), `renderAttestationProseV2` (rendererV2), `CONTEXTUAL_FAMILIES`/`STRONG_FAMILIES` (signalFamiliesV2).
- Produces: `runExtractionSelfProofV2() -> { fixtures, summary }` with the counters in the spec all `0` and `all_passed:true`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/extractionV2/extractionSelfProofV2.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { runExtractionSelfProofV2 } from "../../../../tools/simurgh-extraction/selfProofV2.mjs";

test("self-proof v2: all fixtures pass, all failure counters zero", () => {
  const { summary, fixtures } = runExtractionSelfProofV2();
  assert.equal(summary.all_passed, true);
  for (const k of [
    "benign_escalation_failures", "single_family_escalations", "single_strong_plus_volume_escalations",
    "volume_corroboration_failures", "distinct_family_double_count_failures",
    "metadata_payload_acceptance_failures", "invalid_bucket_acceptance_failures",
    "invalid_hash_acceptance_failures", "intent_claims_rendered", "decision_reproduction_failures",
    "duplicate_run_id_failures",
  ]) assert.equal(summary[k], 0, k);
  assert.ok(fixtures.length >= 20);
  assert.ok(fixtures.every((f) => f.passed));
});

test("the A10 regressions explicitly do NOT escalate", () => {
  const { fixtures } = runExtractionSelfProofV2();
  for (const name of ["benign-template-plus-volume", "benign-single-capability-plus-volume", "benign-behavioural-plus-volume"]) {
    const f = fixtures.find((x) => x.name === name);
    assert.ok(f && f.passed, name);
    assert.equal(f.detail, "single_signal_observed");
  }
});

test("the documented limitation fixture DOES escalate (named, not hidden)", () => {
  const { fixtures } = runExtractionSelfProofV2();
  const f = fixtures.find((x) => x.name === "strong-plus-strong-benign-collision");
  assert.ok(f && f.passed);
  assert.equal(f.detail, "extraction_pattern_observed");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/extractionV2/extractionSelfProofV2.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// tools/simurgh-extraction/selfProofV2.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// v2 falsification harness. Proves: volume cannot corroborate (A10), grammar blocks
// payloads/invalid values (A9), the strong+strong benign collision STILL escalates and is
// reported as a documented limitation (not hidden), version locks hold, results reproduce.
import crypto from "node:crypto";
import { validateMetaSetV2 } from "./metaSetV2.mjs";
import { DETECTOR_ID, THRESHOLD_STRONG, runDetectorV2 } from "./detectorV2.mjs";
import { renderAttestationProseV2 } from "./rendererV2.mjs";
import { CONTEXTUAL_FAMILIES } from "./signalFamiliesV2.mjs";

const hh = (s) => "sha256:" + crypto.createHash("sha256").update(s).digest("hex");
function row(id, o = {}) {
  return {
    run_id: "s3u_run_" + String(id).padStart(3, "0"),
    actor_cluster_hash: hh("actor_a"), session_cluster_hash: hh("s" + id),
    normalized_prompt_hash: hh("np" + id), prompt_template_hash: hh("tp" + id),
    task_family: "code_generation", capability_tag: "tool_use",
    input_tokens_bucket: "1k-2k", output_tokens_bucket: "2k-4k",
    time_bucket: "bucket_" + String((id % 998) + 1).padStart(3, "0"),
    cot_elicitation_flag: false, tool_use_request_shape: false, ...o,
  };
}
const mset = (runs) => ({ type: "simurgh.capability_extraction.meta_set.v2", set_id: "selfproof",
  set_provenance: "synthetic_reference", live_traffic_used: false, identity_data_used: false,
  raw_content_used: false, runs });
const range = (n) => Array.from({ length: n }, (_, i) => i);
// distinct task_family/capability values to avoid unintended targeting dominance
const TF = ["code_generation", "data_analysis", "summarisation", "translation", "qa", "planning", "other"];
const CAP = ["tool_use", "coding", "reasoning", "translation", "summarisation", "general"];
const varied = (i) => ({ task_family: TF[i % TF.length], capability_tag: CAP[i % CAP.length] });

export function runExtractionSelfProofV2() {
  const fixtures = [];
  const summary = {
    benign_escalation_failures: 0, single_family_escalations: 0, single_strong_plus_volume_escalations: 0,
    volume_corroboration_failures: 0, distinct_family_double_count_failures: 0,
    metadata_payload_acceptance_failures: 0, invalid_bucket_acceptance_failures: 0,
    invalid_hash_acceptance_failures: 0, intent_claims_rendered: 0, decision_reproduction_failures: 0,
    duplicate_run_id_failures: 0, all_passed: true,
  };
  const add = (name, passed, detail) => { fixtures.push({ name, passed, detail }); if (!passed) summary.all_passed = false; };
  const dec = (runs) => runDetectorV2(mset(runs)).decision;

  // benign single-phenomenon
  add("benign-repetition-only", (() => { const d = dec(range(5).map((i) => row(i, { normalized_prompt_hash: hh("same"), ...varied(i) }))); if (d !== "single_signal_observed") summary.single_family_escalations++; return d === "single_signal_observed"; })(), "single_signal_observed");
  add("benign-volume-only", (() => { const d = dec(range(11).map((i) => row(i, varied(i)))); if (d !== "single_signal_observed") summary.single_family_escalations++; return d === "single_signal_observed"; })(), "single_signal_observed");
  add("benign-targeting-only", (() => { const d = dec(range(5).map((i) => row(i, { capability_tag: "tool_use" }))); if (d !== "single_signal_observed") summary.single_family_escalations++; return d === "single_signal_observed"; })(), "single_signal_observed");

  // A10 regressions — strong + volume must NOT escalate
  add("benign-template-plus-volume", (() => { const d = dec(range(11).map((i) => row(i, { prompt_template_hash: hh("shared"), ...varied(i) }))); if (d === "extraction_pattern_observed") summary.single_strong_plus_volume_escalations++; return d === "single_signal_observed"; })(), dec(range(11).map((i) => row(i, { prompt_template_hash: hh("shared"), ...varied(i) }))));
  add("benign-single-capability-plus-volume", (() => { const d = dec(range(11).map((i) => row(i, { capability_tag: "tool_use", task_family: TF[i % TF.length] }))); if (d === "extraction_pattern_observed") summary.single_strong_plus_volume_escalations++; return d === "single_signal_observed"; })(), dec(range(11).map((i) => row(i, { capability_tag: "tool_use", task_family: TF[i % TF.length] }))));
  add("benign-behavioural-plus-volume", (() => { const d = dec(range(11).map((i) => row(i, { cot_elicitation_flag: true, ...varied(i) }))); if (d === "extraction_pattern_observed") summary.single_strong_plus_volume_escalations++; return d === "single_signal_observed"; })(), dec(range(11).map((i) => row(i, { cot_elicitation_flag: true, ...varied(i) }))));

  // volume can never be a corroborator: assert volume is contextual
  add("volume-is-contextual", (() => { const ok = CONTEXTUAL_FAMILIES.includes("volume"); if (!ok) summary.volume_corroboration_failures++; return ok; })(), "contextual");

  // double-count trap: same prompt AND template repeated → ONE strong family
  add("structural-double-count-trap", (() => { const r = runDetectorV2(mset(range(4).map((i) => row(i, { normalized_prompt_hash: hh("same"), prompt_template_hash: hh("samet"), ...varied(i) })))); const ok = r.strong_family_count === 1 && r.matched_strong_families.join() === "structural"; if (!ok) summary.distinct_family_double_count_failures++; return ok; })(), "1");

  // extraction cases
  add("extraction-structural-plus-behavioural", dec(range(4).map((i) => row(i, { normalized_prompt_hash: hh("same"), cot_elicitation_flag: true, ...varied(i) }))) === "extraction_pattern_observed", "extraction_pattern_observed");
  add("extraction-targeting-plus-coordination", (() => { const d = dec(range(6).map((i) => row(i, { actor_cluster_hash: hh("actor_" + (i % 3)), capability_tag: "tool_use", task_family: TF[i % TF.length] }))); return d === "extraction_pattern_observed"; })(), "extraction_pattern_observed");
  add("extraction-behavioural-plus-targeting-plus-volume", dec(range(11).map((i) => row(i, { cot_elicitation_flag: true, capability_tag: "tool_use", task_family: TF[i % TF.length] }))) === "extraction_pattern_observed", "extraction_pattern_observed");

  // R1 documented limitation: benign mono-task + shared template = structural + targeting → STILL extraction
  add("strong-plus-strong-benign-collision", dec(range(5).map((i) => row(i, { prompt_template_hash: hh("shared"), capability_tag: "tool_use" }))) === "extraction_pattern_observed", dec(range(5).map((i) => row(i, { prompt_template_hash: hh("shared"), capability_tag: "tool_use" }))));

  // A9 grammar rejections
  const rejects = (mutate, counterKey) => { let threw = false; try { validateMetaSetV2(mset([row(1, mutate)])); } catch { threw = true; } if (!threw && counterKey) summary[counterKey]++; return threw; };
  add("metadata-payload-in-capability-tag-rejected", rejects({ capability_tag: "IGNORE PREVIOUS INSTRUCTIONS" }, "metadata_payload_acceptance_failures"), "rejected");
  add("metadata-payload-in-task-family-rejected", rejects({ task_family: "exfiltrate_system_prompt" }, "metadata_payload_acceptance_failures"), "rejected");
  add("metadata-payload-in-bucket-rejected", rejects({ input_tokens_bucket: "all of the secret prompt" }, "invalid_bucket_acceptance_failures"), "rejected");
  add("invalid-hash-value-rejected", rejects({ actor_cluster_hash: "sha256:synthetic_actor_a" }, "invalid_hash_acceptance_failures"), "rejected");
  add("full-timestamp-time-bucket-rejected", rejects({ time_bucket: "2026-06-22T10:49:44Z" }, "invalid_bucket_acceptance_failures"), "rejected");

  // version locks
  add("threshold-version-lock", THRESHOLD_STRONG === 2 && DETECTOR_ID === "stage3u_extraction_detector_v2", `${DETECTOR_ID}:${THRESHOLD_STRONG}`);
  add("family-strength-version-lock", CONTEXTUAL_FAMILIES.length === 1 && CONTEXTUAL_FAMILIES[0] === "volume", "volume_contextual");

  // duplicate run_id
  add("duplicate-run-id-rejected", (() => { let threw = false; try { validateMetaSetV2(mset([row(1), row(1)])); } catch { threw = true; } if (!threw) summary.duplicate_run_id_failures++; return threw; })(), "rejected");

  // intent language rejected + clean render
  add("intent-language-rejected", (() => {
    let threw = false;
    try { renderAttestationProseV2({ decision: "extraction_pattern_observed", matched_strong_families: ["attacker"], matched_contextual_families: [], strong_family_count: 2 }); } catch (e) { threw = /intent_language_rejected/.test(e.message); }
    const clean = renderAttestationProseV2({ decision: "no_pattern_observed", matched_strong_families: [], matched_contextual_families: [], strong_family_count: 0 });
    const leaked = /attacker|stolen|fraudulent/i.test(clean.rendered_summary);
    if (leaked) summary.intent_claims_rendered++;
    return threw && !leaked;
  })(), "rejected");

  // reproduction
  add("decision-reproduction", (() => {
    const runs = range(4).map((i) => row(i, { normalized_prompt_hash: hh("same"), cot_elicitation_flag: true, ...varied(i) }));
    const a = JSON.stringify(runDetectorV2(mset(runs))); const b = JSON.stringify(runDetectorV2(mset(runs)));
    if (a !== b) summary.decision_reproduction_failures++; return a === b;
  })(), "stable");

  return { fixtures, summary };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/extractionV2/extractionSelfProofV2.test.js`
Expected: PASS (3 tests). If any benign fixture escalates unexpectedly, adjust the synthetic row data (NOT the detector) — e.g. ensure `varied()` truly avoids capability/task dominance so only the intended family fires.

- [ ] **Step 5: Verify 100% function coverage**

Run: `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-extraction/selfProofV2.mjs --test-coverage-functions=100 tests/unit/llmShield/extractionV2/extractionSelfProofV2.test.js`
Expected: PASS, 100% functions.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-extraction/selfProofV2.mjs tests/unit/llmShield/extractionV2/extractionSelfProofV2.test.js
git commit -m "feat(3u): v2 self-proof — A10/A9 regressions + documented-limitation fixture"
```

---

### Task 7: CLI + committed reference sets + detector results

**Files:**
- Create: `tools/simurgh-extraction/simurgh-extraction-v2.mjs`
- Create: `docs/research/llm-shield/evidence/stage-3u/meta-set/{metadata-set-v2.json, redteam-a10-regression-set.json, detector-config.json, metadata-grammar.json}`
- Generated by CLI: `result/{expected-detector-result-v2.json, redteam-regression-result.json, attestation.json}`, `comparison/{v1-known-false-fire-summary.json, v2-hardening-summary.json}`, `evidence-hashes.json`
- Test: `tests/unit/llmShield/extractionV2/extractionCliV2.test.js`

**Interfaces:**
- Consumes: all v2 pure libs + `metadataGrammarDigest`, `familyMapDigestV2`.
- Produces: CLI `build [--update] | hash | verify | write-hashes | verify-hashes`. Exports `buildAttestationV2(set) -> attestation`, `deriveForVerifyV2() -> {mainSet, regressionSet, attestation, mainResult, regressionResult}`.

- [ ] **Step 1: Author the two committed sets (deterministic synthetic hashes)**

Use a tiny generator so every hash is `sha256Hex(canonicalJson(label))` — never a hand-typed fake. Run this once to emit both JSON files, then commit them:

```bash
node - <<'NODE'
import { canonicalJson, sha256Hex } from "./tools/simurgh-attestation/canonicalise.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const h = (label) => sha256Hex(canonicalJson(label));
const EV = "docs/research/llm-shield/evidence/stage-3u/meta-set";
mkdirSync(EV, { recursive: true });
const TF = ["code_generation","data_analysis","summarisation","translation","qa","planning","other"];
const CAP = ["tool_use","coding","reasoning","translation","summarisation","general"];
const row = (i, o={}) => ({ run_id:"s3u_run_"+String(i).padStart(3,"0"),
  actor_cluster_hash:h("actor_a"), session_cluster_hash:h("session_"+i),
  normalized_prompt_hash:h("np_"+i), prompt_template_hash:h("tp_"+i),
  task_family:TF[i%TF.length], capability_tag:CAP[i%CAP.length],
  input_tokens_bucket:"1k-2k", output_tokens_bucket:"2k-4k",
  time_bucket:"bucket_"+String((i%998)+1).padStart(3,"0"),
  cot_elicitation_flag:false, tool_use_request_shape:false, ...o });
const wrap = (set_id, runs) => ({ type:"simurgh.capability_extraction.meta_set.v2", set_id,
  set_provenance:"synthetic_reference", live_traffic_used:false, identity_data_used:false,
  raw_content_used:false, runs });
// MAIN set: structural + behavioural + targeting (NO volume) -> extraction, strong>=2
const main = wrap("stage3u_reference_set", Array.from({length:8},(_,i)=>row(i+1,{
  normalized_prompt_hash:h("np_shared"), cot_elicitation_flag:true, capability_tag:"tool_use" })));
// REGRESSION set: shared template + volume(11) -> single (A10 must not escalate)
const regr = wrap("stage3u_redteam_a10_regression_set", Array.from({length:11},(_,i)=>row(i+1,{
  prompt_template_hash:h("shared_boilerplate"), task_family:TF[i%TF.length], capability_tag:CAP[i%CAP.length] })));
writeFileSync(EV+"/metadata-set-v2.json", JSON.stringify(main,null,2)+"\n");
writeFileSync(EV+"/redteam-a10-regression-set.json", JSON.stringify(regr,null,2)+"\n");
console.log("wrote v2 metadata sets");
NODE
```

Create `detector-config.json` (digests filled by `build --update`):
```json
{
  "detector_id": "stage3u_extraction_detector_v2",
  "previous_detector_id": "stage3t_frozen_detector_v1",
  "threshold_rule": "strong_signal_families >= 2",
  "volume_role": "contextual_only",
  "decision_function": { "0_strong_0_contextual": "no_pattern_observed", "0_strong_with_contextual": "single_signal_observed", "1_strong_any_contextual": "single_signal_observed", "2_or_more_strong_any_contextual": "extraction_pattern_observed" },
  "family_strength": { "structural": "strong", "behavioural": "strong", "targeting": "strong", "coordination": "strong", "volume": "contextual" },
  "threshold_change_requires_new_detector_id": true,
  "family_strength_change_requires_new_detector_id": true,
  "metadata_grammar_change_requires_new_detector_id": true,
  "family_map_digest": "PLACEHOLDER_FILLED_BY_BUILD",
  "metadata_grammar_digest": "PLACEHOLDER_FILLED_BY_BUILD"
}
```

Create `metadata-grammar.json` (human-readable copy of the grammar for reviewers; the digest of record comes from `metadataGrammarDigest()`):
```json
{ "note": "Human-readable mirror of METADATA_GRAMMAR in tools/simurgh-extraction/metadataGrammar.mjs. The binding digest is metadata_grammar_digest in detector-config.json.", "schema": "simurgh.capability_extraction.metadata_grammar.v2" }
```

- [ ] **Step 2: Write the failing test**

```js
// tests/unit/llmShield/extractionV2/extractionCliV2.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { buildAttestationV2, deriveForVerifyV2 } from "../../../../tools/simurgh-extraction/simurgh-extraction-v2.mjs";

test("main attestation binds digests, decision extraction across >=2 strong families", async () => {
  const { attestation: a } = await deriveForVerifyV2();
  assert.equal(a.detector_id, "stage3u_extraction_detector_v2");
  assert.equal(a.previous_detector_id, "stage3t_frozen_detector_v1");
  assert.equal(a.decision, "extraction_pattern_observed");
  assert.ok(a.strong_family_count >= 2);
  assert.deepEqual(a.matched_contextual_families, []);
  assert.match(a.meta_set_digest, /^sha256:[0-9a-f]{64}$/);
  assert.ok(a.known_limitations.includes("benign_mono_task_plus_shared_template_can_present_two_strong_families"));
  assert.ok(a.rendered_summary.includes("manual review"));
});

test("regression result is single_signal_observed (A10 fixed)", async () => {
  const { regressionResult: r } = await deriveForVerifyV2();
  assert.equal(r.decision, "single_signal_observed");
  assert.deepEqual(r.matched_contextual_families, ["volume"]);
});

test("buildAttestationV2 is pure over the committed main set", async () => {
  const { mainSet } = await deriveForVerifyV2();
  assert.equal(JSON.stringify(buildAttestationV2(mainSet)), JSON.stringify(buildAttestationV2(mainSet)));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/extractionV2/extractionCliV2.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the CLI**

```js
// tools/simurgh-extraction/simurgh-extraction-v2.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3U CLI. Offline + deterministic over two committed synthetic sets (main extraction
// set + A10 regression set). build re-derives, verify byte-compares, write-hashes runs AFTER
// prettier. build/verify compare via stable() (format-agnostic). No gateway, no network.
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import { validateMetaSetV2, metaSetDigestV2 } from "./metaSetV2.mjs";
import { familyMapDigestV2 } from "./signalFamiliesV2.mjs";
import { metadataGrammarDigest } from "./metadataGrammar.mjs";
import { runDetectorV2 } from "./detectorV2.mjs";
import { renderAttestationProseV2 } from "./rendererV2.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3u";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

const KNOWN_LIMITATIONS = [
  "benign_mono_task_plus_shared_template_can_present_two_strong_families",
  "dilution_can_avoid_thresholds",
  "synthetic_reference_set_only",
  "not_a_live_gateway_detector",
  "not_a_general_accuracy_benchmark",
];

export function buildAttestationV2(set) {
  validateMetaSetV2(set);
  const result = runDetectorV2(set);
  const prose = renderAttestationProseV2(result);
  return {
    schema: "simurgh.capability_extraction.attestation.v2",
    stage: "3U",
    detector_id: result.detector_id,
    previous_detector_id: result.previous_detector_id,
    hardening_reason: "red_team_a10_a9",
    family_map_digest: familyMapDigestV2(),
    metadata_grammar_digest: metadataGrammarDigest(),
    meta_set_digest: result.meta_set_digest,
    matched: result.matched,
    matched_strong_families: result.matched_strong_families,
    matched_contextual_families: result.matched_contextual_families,
    strong_family_count: result.strong_family_count,
    contextual_family_count: result.contextual_family_count,
    decision: result.decision,
    attestation_claim: result.attestation_claim,
    non_claims: result.non_claims,
    known_limitations: KNOWN_LIMITATIONS,
    rendered_summary: prose.rendered_summary,
    intent_claim_made: prose.intent_claim_made,
  };
}

export async function deriveForVerifyV2() {
  const mainSet = await rd("meta-set/metadata-set-v2.json");
  const regressionSet = await rd("meta-set/redteam-a10-regression-set.json");
  const attestation = buildAttestationV2(mainSet);
  const mainResult = runDetectorV2(mainSet);
  const regressionResult = runDetectorV2(regressionSet);
  return { mainSet, regressionSet, attestation, mainResult, regressionResult };
}

async function walk(d) {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if ((await stat(p)).isFile() && !p.endsWith("evidence-hashes.json")) out.push(p);
  }
  return out;
}
async function writeEvidenceHashes() {
  const files = (await walk(EV)).sort();
  const map = {};
  for (const f of files) map[f] = sha256Hex(await readFile(f, "utf8"));
  await writeFile(join(EV, "evidence-hashes.json"), stable(map));
}

async function main() {
  const cmd = process.argv[2];
  const update = process.argv.includes("--update");
  if (cmd === "build") {
    const { attestation, mainResult, regressionResult } = await deriveForVerifyV2();
    if (update) {
      const cfg = await rd("meta-set/detector-config.json");
      cfg.family_map_digest = familyMapDigestV2();
      cfg.metadata_grammar_digest = metadataGrammarDigest();
      await writeFile(join(EV, "meta-set/detector-config.json"), stable(cfg));
      await writeFile(join(EV, "result/expected-detector-result-v2.json"), stable(mainResult));
      await writeFile(join(EV, "result/redteam-regression-result.json"), stable(regressionResult));
      await writeFile(join(EV, "result/attestation.json"), stable(attestation));
      await writeFile(join(EV, "comparison/v1-known-false-fire-summary.json"), stable({
        note: "Detector v1 (3T) escalated these to extraction; v2 contextualises volume.",
        v1_false_fire_classes: ["structural_plus_volume", "targeting_plus_volume", "behavioural_plus_volume"],
      }));
      await writeFile(join(EV, "comparison/v2-hardening-summary.json"), stable({
        a10_volume_contextualised: true, a9_metadata_grammar_enforced: true,
        benign_volume_escalations: 0, metadata_payload_acceptance_failures: 0,
      }));
      console.log("stage3u: evidence written (update; run prettier then write-hashes)");
      return;
    }
    const ca = await rd("result/attestation.json");
    if (stable(ca) !== stable(attestation)) throw new Error("attestation drifted");
    const cm = await rd("result/expected-detector-result-v2.json");
    if (stable(cm) !== stable(mainResult)) throw new Error("main result drifted");
    const crr = await rd("result/redteam-regression-result.json");
    if (stable(crr) !== stable(regressionResult)) throw new Error("regression result drifted");
    console.log("stage3u evidence: verified committed");
  } else if (cmd === "hash") {
    const { mainSet } = await deriveForVerifyV2();
    console.log("meta_set_digest:", metaSetDigestV2(mainSet));
    console.log("family_map_digest:", familyMapDigestV2());
    console.log("metadata_grammar_digest:", metadataGrammarDigest());
  } else if (cmd === "verify") {
    const { mainResult, regressionResult } = await deriveForVerifyV2();
    if (stable(await rd("result/expected-detector-result-v2.json")) !== stable(mainResult)) throw new Error("main reproduction mismatch");
    if (stable(await rd("result/redteam-regression-result.json")) !== stable(regressionResult)) throw new Error("regression reproduction mismatch");
    console.log("stage3u: both detector results reproduce");
  } else if (cmd === "write-hashes") {
    await writeEvidenceHashes();
    console.log("stage3u: evidence hashes written");
  } else if (cmd === "verify-hashes") {
    const map = await rd("evidence-hashes.json");
    for (const [f, h] of Object.entries(map)) {
      if (sha256Hex(await readFile(f, "utf8")) !== h) throw new Error("hash mismatch: " + f);
    }
    console.log("stage3u: evidence hashes match");
  } else {
    console.error("usage: simurgh-extraction-v2.mjs build [--update] | hash | verify | write-hashes | verify-hashes");
    process.exit(1);
  }
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error("stage3u CLI:", e.message); process.exit(1); });
```

- [ ] **Step 5: Generate evidence + converge formatting**

```bash
mkdir -p docs/research/llm-shield/evidence/stage-3u/{result,comparison,self-proof,keys}
node tools/simurgh-extraction/simurgh-extraction-v2.mjs build --update
npm run format
node tools/simurgh-extraction/simurgh-extraction-v2.mjs build           # -> "verified committed"
node tools/simurgh-extraction/simurgh-extraction-v2.mjs verify          # -> both reproduce
```
Expected: main set → `extraction_pattern_observed` (strong ≥ 2, no volume); regression set → `single_signal_observed`.

- [ ] **Step 6: Run unit test**

Run: `node --test tests/unit/llmShield/extractionV2/extractionCliV2.test.js`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add tools/simurgh-extraction/simurgh-extraction-v2.mjs tests/unit/llmShield/extractionV2/extractionCliV2.test.js docs/research/llm-shield/evidence/stage-3u/
git commit -m "feat(3u): v2 CLI + committed main + A10-regression sets and results"
```

---

### Task 8: Keypair, signer, verifier, signed evidence

**Files:**
- Create: `tools/simurgh-extraction/sign-3u-attestation.mjs`, `tools/simurgh-extraction/verify-stage3u-attestation.mjs`
- Create (committed): `keys/stage3u-public-key.json`, `keys/fingerprint.txt`, `result/attestation.signature.json`, `self-proof/self-proof-results.json`
- Test: `tests/unit/llmShield/extractionV2/extractionVerifyV2.test.js`

**Interfaces:**
- Produces: `verifyExtractionV2({ attestation, sidecar, publicKeyPem, mainSet, detectorConfig }) -> { ok, checks }`.

- [ ] **Step 1: Generate the dedicated 3U keypair (local only)**

```bash
mkdir -p ~/.simurgh
node tools/simurgh-attestation/keygen.mjs --out-private ~/.simurgh/3u-ed25519.pem --out-public docs/research/llm-shield/evidence/stage-3u/keys/stage3u-public-key.json
node -e "const k=require('./docs/research/llm-shield/evidence/stage-3u/keys/stage3u-public-key.json');require('fs').writeFileSync('docs/research/llm-shield/evidence/stage-3u/keys/fingerprint.txt',k.fingerprint+'\n')"
git status --porcelain | grep -i '\.pem' && echo "PEM LEAK" || echo "no pem (good)"
```

- [ ] **Step 2: Write the signer** (mirror `sign-3t-attestation.mjs`, 3U paths/env)

```js
// tools/simurgh-extraction/sign-3u-attestation.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only signer for the Stage 3U attestation. Reads SIMURGH_3U_PRIVATE_KEY_PATH
// (default ~/.simurgh/3u-ed25519.pem); CI never runs this.
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "../simurgh-attestation/canonicalise.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3u";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
async function main() {
  const keyPath = process.env.SIMURGH_3U_PRIVATE_KEY_PATH || join(homedir(), ".simurgh", "3u-ed25519.pem");
  const priv = await readFile(keyPath, "utf8");
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3u-public-key.json"), "utf8"));
  const attestation = JSON.parse(await readFile(join(EV, "result", "attestation.json"), "utf8"));
  const canonical = Buffer.from(canonicalJson(attestation), "utf8");
  const signature = crypto.sign(null, canonical, crypto.createPrivateKey(priv));
  const sidecar = {
    schema: "simurgh.capability_extraction.signature.v2", algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1", bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pub.public_key_pem),
    signature: "base64:" + signature.toString("base64"),
  };
  await writeFile(join(EV, "result", "attestation.signature.json"), stable(sidecar));
  console.log("stage3u: signed attestation; fingerprint", sidecar.public_key_fingerprint);
}
main().catch((e) => { console.error("stage3u sign:", e.message); process.exit(1); });
```

- [ ] **Step 3: Write the verifier**

```js
// tools/simurgh-extraction/verify-stage3u-attestation.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Two-tier verifier. Portable: signature + bindings + identity + non-claim wall.
// --reproduce: re-run detectorV2 over BOTH committed sets + self-proof + attestation byte-identity.
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "../simurgh-attestation/canonicalise.mjs";
import { metaSetDigestV2 } from "./metaSetV2.mjs";
import { familyMapDigestV2 } from "./signalFamiliesV2.mjs";
import { metadataGrammarDigest } from "./metadataGrammar.mjs";
import { runExtractionSelfProofV2 } from "./selfProofV2.mjs";
import { deriveForVerifyV2 } from "./simurgh-extraction-v2.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3u";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

export function verifyExtractionV2({ attestation, sidecar, publicKeyPem, mainSet, detectorConfig }) {
  const checks = {};
  const canonical = Buffer.from(canonicalJson(attestation), "utf8");
  checks.bundle_digest_match = sidecar.bundle_sha256 === sha256Hex(canonical);
  checks.key_fingerprint_match = sidecar.public_key_fingerprint === fingerprintPublicKey(publicKeyPem);
  checks.signature_valid = crypto.verify(null, canonical, crypto.createPublicKey(publicKeyPem), Buffer.from(sidecar.signature.replace(/^base64:/, ""), "base64"));
  checks.detector_id_v2 = attestation.detector_id === "stage3u_extraction_detector_v2" && detectorConfig.detector_id === attestation.detector_id;
  checks.previous_detector_id_v1 = attestation.previous_detector_id === "stage3t_frozen_detector_v1";
  checks.meta_set_digest_binding = attestation.meta_set_digest === metaSetDigestV2(mainSet);
  checks.family_map_digest_match = attestation.family_map_digest === familyMapDigestV2() && detectorConfig.family_map_digest === familyMapDigestV2();
  checks.metadata_grammar_digest_match = attestation.metadata_grammar_digest === metadataGrammarDigest() && detectorConfig.metadata_grammar_digest === metadataGrammarDigest();
  checks.decision_present = ["no_pattern_observed", "single_signal_observed", "extraction_pattern_observed"].includes(attestation.decision);
  checks.no_intent_claim = attestation.intent_claim_made === false && attestation.non_claims.includes("no_intent_claim");
  checks.match_is_not_accusation = attestation.non_claims.includes("match_is_not_accusation");
  checks.known_limitation_disclosed = attestation.known_limitations.includes("benign_mono_task_plus_shared_template_can_present_two_strong_families");
  return { ok: Object.values(checks).every(Boolean), checks };
}

async function main() {
  const reproduce = process.argv.includes("--reproduce");
  const attestation = await rd("result/attestation.json");
  const sidecar = await rd("result/attestation.signature.json");
  const pub = await rd("keys/stage3u-public-key.json");
  const detectorConfig = await rd("meta-set/detector-config.json");
  const mainSet = await rd("meta-set/metadata-set-v2.json");
  const { ok, checks } = verifyExtractionV2({ attestation, sidecar, publicKeyPem: pub.public_key_pem, mainSet, detectorConfig });
  let reproduced = true;
  if (reproduce) {
    const { attestation: regen, mainResult, regressionResult } = await deriveForVerifyV2();
    checks.main_result_reproduces = stable(mainResult) === stable(await rd("result/expected-detector-result-v2.json"));
    checks.regression_result_reproduces = stable(regressionResult) === stable(await rd("result/redteam-regression-result.json"));
    checks.attestation_reproduces = stable(regen) === stable(await rd("result/attestation.json"));
    const sp = runExtractionSelfProofV2();
    checks.self_proof_passes = sp.summary.all_passed === true;
    reproduced = checks.main_result_reproduces && checks.regression_result_reproduces && checks.attestation_reproduces && checks.self_proof_passes;
  }
  console.log(JSON.stringify(checks, null, 2));
  if (!ok || !reproduced) { console.error("stage3u verify: FAIL"); process.exit(1); }
  console.log("stage3u attestation verify: PASS");
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error("stage3u verify:", e.message); process.exit(1); });
```

- [ ] **Step 4: Sign + write self-proof evidence + rehash (after prettier)**

```bash
node tools/simurgh-extraction/sign-3u-attestation.mjs
node -e "import('./tools/simurgh-extraction/selfProofV2.mjs').then(m=>require('fs').writeFileSync('docs/research/llm-shield/evidence/stage-3u/self-proof/self-proof-results.json', JSON.stringify(m.runExtractionSelfProofV2(),null,2)+'\n'))"
npm run format
node tools/simurgh-extraction/simurgh-extraction-v2.mjs write-hashes
npm run format
node tools/simurgh-extraction/verify-stage3u-attestation.mjs --reproduce   # all checks true
```

- [ ] **Step 5: Write the failing test, then confirm it passes**

```js
// tests/unit/llmShield/extractionV2/extractionVerifyV2.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyExtractionV2 } from "../../../../tools/simurgh-extraction/verify-stage3u-attestation.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3u";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

async function load() {
  return { attestation: await rd("result/attestation.json"), sidecar: await rd("result/attestation.signature.json"),
    publicKeyPem: (await rd("keys/stage3u-public-key.json")).public_key_pem,
    mainSet: await rd("meta-set/metadata-set-v2.json"), detectorConfig: await rd("meta-set/detector-config.json") };
}
test("committed 3U attestation verifies (portable)", async () => {
  const { ok, checks } = verifyExtractionV2(await load());
  assert.equal(ok, true, JSON.stringify(checks));
});
test("tampered decision breaks signature", async () => {
  const a = await load(); a.attestation = { ...a.attestation, decision: "no_pattern_observed" };
  assert.equal(verifyExtractionV2(a).ok, false);
});
test("swapped main set breaks digest binding", async () => {
  const a = await load(); a.mainSet = { ...a.mainSet, runs: [...a.mainSet.runs].slice(1) };
  const { ok, checks } = verifyExtractionV2(a);
  assert.equal(checks.meta_set_digest_binding, false); assert.equal(ok, false);
});
```

Run: `node --test tests/unit/llmShield/extractionV2/extractionVerifyV2.test.js` → PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-extraction/sign-3u-attestation.mjs tools/simurgh-extraction/verify-stage3u-attestation.mjs tests/unit/llmShield/extractionV2/extractionVerifyV2.test.js docs/research/llm-shield/evidence/stage-3u/
git commit -m "feat(3u): Ed25519 signer, two-tier verifier, signed committed evidence"
```

---

### Task 9: Audits + v1-freeze guard + smoke + check.sh wiring

**Files:**
- Create: `scripts/security-audit-llm-shield-stage3u.mjs`, `scripts/privacy-audit-llm-shield-stage3u.mjs`, `scripts/consistency-audit-llm-shield-stage3u.mjs`, `scripts/policy-drift-guard-llm-shield-stage3u.sh`, `scripts/v1-freeze-guard-llm-shield-stage3u.sh`, `scripts/smoke-llm-shield-stage3u.sh`
- Modify: `scripts/check.sh` (after the 3T helper-coverage step)

- [ ] **Step 1: Security audit** (machine-artifact-scoped accusatory scan; named labs everywhere; sacred non-claim; escalation counter)

```js
// scripts/security-audit-llm-shield-stage3u.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { runExtractionSelfProofV2 } from "../tools/simurgh-extraction/selfProofV2.mjs";
import { FORBIDDEN_WORDING, SACRED_NON_CLAIM } from "../tools/simurgh-extraction/rendererV2.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3u";
const errors = [];
const sp = runExtractionSelfProofV2();
if (!sp.summary.all_passed) errors.push("self-proof failed");
if (sp.summary.intent_claims_rendered !== 0) errors.push("intent claim rendered");
if (sp.summary.single_strong_plus_volume_escalations !== 0) errors.push("A10 regression: volume corroborated");
async function walk(d){const o=[];for(const e of await readdir(d,{withFileTypes:true})){const p=join(d,e.name);if(e.isDirectory())o.push(...await walk(p));else if((await stat(p)).isFile())o.push(p);}return o;}
const NAMED_LABS = ["deepseek", "moonshot", "minimax"];
for (const f of await walk(EV)) {
  const lower = (await readFile(f, "utf8")).toLowerCase();
  for (const lab of NAMED_LABS) if (lower.includes(lab)) errors.push(`named lab in evidence ${f}: ${lab}`);
  if (f.endsWith(".json")) for (const w of FORBIDDEN_WORDING) if (lower.includes(w)) errors.push(`forbidden wording in ${f}: ${w}`);
}
const att = JSON.parse(await readFile(join(EV, "result", "attestation.json"), "utf8"));
if (!att.rendered_summary.includes(SACRED_NON_CLAIM)) errors.push("sacred non-claim missing");
if (att.intent_claim_made !== false) errors.push("attestation made an intent claim");
if (errors.length) { console.error("stage3u security: FAIL", JSON.stringify(errors)); process.exit(1); }
console.log("stage3u security: PASS");
```

- [ ] **Step 2: Privacy audit**

```js
// scripts/privacy-audit-llm-shield-stage3u.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { validateMetaSetV2 } from "../tools/simurgh-extraction/metaSetV2.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3u";
const FORBIDDEN = ["BEGIN PRIVATE KEY", "raw_prompt", "raw_output", "raw_transcript", "ip_address", "api_key", "chain_of_thought_text"];
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
async function walk(d){const o=[];for(const e of await readdir(d,{withFileTypes:true})){const p=join(d,e.name);if(e.isDirectory())o.push(...await walk(p));else if((await stat(p)).isFile())o.push(p);}return o;}
const findings = [];
for (const f of await walk(EV)) {
  const c = await readFile(f, "utf8");
  for (const t of FORBIDDEN) if (c.includes(t)) findings.push({ f, t });
  if (EMAIL_RE.test(c)) findings.push({ f, t: "email_like_value" });
}
for (const name of ["metadata-set-v2.json", "redteam-a10-regression-set.json"]) {
  const set = JSON.parse(await readFile(join(EV, "meta-set", name), "utf8"));
  if (set.set_provenance !== "synthetic_reference" || set.live_traffic_used !== false || set.identity_data_used !== false || set.raw_content_used !== false)
    findings.push({ f: name, t: "provenance_not_synthetic_offline" });
  try { validateMetaSetV2(set); } catch (e) { findings.push({ f: name, t: "grammar_validation_failed:" + e.message }); }
}
if (findings.length) { console.error("stage3u privacy: FAIL", JSON.stringify(findings)); process.exit(1); }
console.log("stage3u privacy: PASS");
```

- [ ] **Step 3: Consistency audit**

```js
// scripts/consistency-audit-llm-shield-stage3u.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { metaSetDigestV2 } from "../tools/simurgh-extraction/metaSetV2.mjs";
import { familyMapDigestV2 } from "../tools/simurgh-extraction/signalFamiliesV2.mjs";
import { metadataGrammarDigest } from "../tools/simurgh-extraction/metadataGrammar.mjs";
import { runDetectorV2 } from "../tools/simurgh-extraction/detectorV2.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3u";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const errors = [];
const mainSet = await rd("meta-set/metadata-set-v2.json");
const regrSet = await rd("meta-set/redteam-a10-regression-set.json");
const cfg = await rd("meta-set/detector-config.json");
const att = await rd("result/attestation.json");
if (att.meta_set_digest !== metaSetDigestV2(mainSet)) errors.push("meta_set_digest mismatch");
if (att.family_map_digest !== familyMapDigestV2() || cfg.family_map_digest !== familyMapDigestV2()) errors.push("family_map_digest mismatch");
if (att.metadata_grammar_digest !== metadataGrammarDigest() || cfg.metadata_grammar_digest !== metadataGrammarDigest()) errors.push("metadata_grammar_digest mismatch");
if (stable(runDetectorV2(mainSet)) !== stable(await rd("result/expected-detector-result-v2.json"))) errors.push("main result does not reproduce");
if (stable(runDetectorV2(regrSet)) !== stable(await rd("result/redteam-regression-result.json"))) errors.push("regression result does not reproduce");
const rr = await rd("result/redteam-regression-result.json");
if (rr.decision !== "single_signal_observed") errors.push("A10 regression escalated");
if (errors.length) { console.error("stage3u consistency: FAIL", JSON.stringify(errors)); process.exit(1); }
console.log("stage3u consistency: PASS");
```

- [ ] **Step 4: Policy-drift guard** (copy `policy-drift-guard-llm-shield-stage3t.sh`, replace `stage3t`→`stage3u` in echoes).

- [ ] **Step 5: v1-freeze guard**

```bash
# scripts/v1-freeze-guard-llm-shield-stage3u.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3U is additive: assert NO change to Stage 3T v1 modules or stage-3t evidence, and
# prove 3T historical evidence still reproduces. Fails closed (same base resolution as policy-drift).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
V1='^(tools/simurgh-extraction/(metaSet|signalFamilies|detector|renderer|selfProof|simurgh-extraction|sign-3t-attestation|verify-stage3t-attestation)\.mjs|docs/research/llm-shield/evidence/stage-3t/)'
BASE=""
for ref in "${SIMURGH_POLICY_BASE_REF:-}" origin/main main HEAD^1 HEAD~1; do
  [ -z "$ref" ] && continue
  if git rev-parse --verify --quiet "${ref}^{commit}" >/dev/null 2>&1; then BASE="$ref"; break; fi
done
if [ -n "$BASE" ] && changed="$(git diff --name-only "${BASE}...HEAD" 2>/dev/null)"; then
  if grep -Eq "$V1" <<<"$changed"; then
    echo "stage3u v1-freeze: FAIL — a Stage 3T v1 module or stage-3t evidence changed in ${BASE}...HEAD"; exit 1
  fi
  echo "stage3u v1-freeze: PASS (no 3T v1 / stage-3t evidence change in ${BASE}...HEAD)"
elif [ "${CI:-}" = "true" ]; then
  echo "stage3u v1-freeze: FAIL — no base ref resolved in CI (fail-closed)"; exit 1
else
  echo "stage3u v1-freeze: WARN — no base ref resolved locally; verified on PR/post-merge CI"
fi
# Always prove 3T historical evidence still reproduces.
node tools/simurgh-extraction/verify-stage3t-attestation.mjs --reproduce >/dev/null
echo "stage3u v1-freeze: 3T historical evidence still reproduces"
```

- [ ] **Step 6: Smoke script**

```bash
# scripts/smoke-llm-shield-stage3u.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3U smoke: offline, deterministic, verify-only (no gateway, no network).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
node tools/simurgh-extraction/simurgh-extraction-v2.mjs build
node tools/simurgh-extraction/simurgh-extraction-v2.mjs verify
node tools/simurgh-extraction/simurgh-extraction-v2.mjs verify-hashes
node tools/simurgh-extraction/verify-stage3u-attestation.mjs --reproduce
bash scripts/policy-drift-guard-llm-shield-stage3u.sh
bash scripts/v1-freeze-guard-llm-shield-stage3u.sh
node scripts/privacy-audit-llm-shield-stage3u.mjs
node scripts/consistency-audit-llm-shield-stage3u.mjs
node scripts/security-audit-llm-shield-stage3u.mjs
echo "stage3u smoke: passed"
```

- [ ] **Step 7: chmod + run smoke (CI=true)**

```bash
chmod +x scripts/smoke-llm-shield-stage3u.sh scripts/policy-drift-guard-llm-shield-stage3u.sh scripts/v1-freeze-guard-llm-shield-stage3u.sh
CI=true bash scripts/smoke-llm-shield-stage3u.sh
```
Expected: ends `stage3u smoke: passed` (v1-freeze PASS + 3T reproduces).

- [ ] **Step 8: Wire into check.sh** (insert after the `LLM Shield 3T extraction helper coverage` block, ~line 1840)

```bash
step "LLM Shield 3U red-team-hardened attestation"
if scripts/smoke-llm-shield-stage3u.sh > "$LOG_DIR/llm-shield-stage3u-smoke.log" 2>&1; then
  pass "LLM Shield 3U red-team-hardened attestation"
else
  fail "LLM Shield 3U red-team-hardened attestation"
  tail -80 "$LOG_DIR/llm-shield-stage3u-smoke.log"
fi

step "LLM Shield 3U extraction-v2 helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-extraction/signalFamiliesV2.mjs \
  --test-coverage-include=tools/simurgh-extraction/metadataGrammar.mjs \
  --test-coverage-include=tools/simurgh-extraction/metaSetV2.mjs \
  --test-coverage-include=tools/simurgh-extraction/detectorV2.mjs \
  --test-coverage-include=tools/simurgh-extraction/rendererV2.mjs \
  --test-coverage-include=tools/simurgh-extraction/selfProofV2.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/extractionV2/signalFamiliesV2.test.js \
  tests/unit/llmShield/extractionV2/metadataGrammar.test.js \
  tests/unit/llmShield/extractionV2/metaSetV2.test.js \
  tests/unit/llmShield/extractionV2/detectorV2.test.js \
  tests/unit/llmShield/extractionV2/rendererV2.test.js \
  tests/unit/llmShield/extractionV2/extractionSelfProofV2.test.js \
  > "$LOG_DIR/llm-shield-stage3u-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3U extraction-v2 helper coverage"
else
  fail "LLM Shield 3U extraction-v2 helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3u-helper-coverage.log"
fi
```

- [ ] **Step 9: Converge formatting + commit**

```bash
npm run format
node tools/simurgh-extraction/simurgh-extraction-v2.mjs write-hashes
npm run format
CI=true bash scripts/smoke-llm-shield-stage3u.sh
git add scripts/ docs/research/llm-shield/evidence/stage-3u/
git commit -m "test(3u): audits, policy-drift + v1-freeze guards, smoke, check.sh wiring"
```

---

### Task 10: Docs + full-stage verify + finish

**Files:**
- Create: `docs/research/llm-shield/LLM_SHIELD_STAGE_3U_RED_TEAM_HARDENED_EXTRACTION_ATTESTATION.md`, `docs/research/llm-shield/STAGE_3U_{CLOSEOUT,THREAT_MODEL,VALIDATION_MATRIX,REVIEWER_CHECKLIST}.md`, `docs/research/llm-shield/evidence/stage-3u/README.md`

- [ ] **Step 1: Write the docs.** Main doc leads with the crown + final sign-off (verbatim from spec), the A10/A9 findings → fixes, the strong/contextual model and decision table, and the **R1 honesty section** (v2 fixes the volume false-fire class only; benign mono-task+shared-template can still escalate — list it in known limitations). Threat model: reference threat vs attested claim, the sacred non-claim, the attack/wall table plus the new "volume corroboration" and "metadata smuggling" rows. Validation matrix: each invariant → enforcing test/script → observed artifact (mirror `STAGE_3T_VALIDATION_MATRIX.md`, add v1-freeze + grammar + strong-family rows). Reviewer checklist: include the sacred non-claim, no named labs, v1-freeze, grammar, and the documented limitation. Evidence README: quote final sign-off, list artifacts, "reproduce it yourself" commands, the 3U public-key fingerprint. **No accusatory words in machine artifacts; README may negate them (e.g. "does not name attackers").**

- [ ] **Step 2: Full-stage verification**

```bash
CI=true bash scripts/smoke-llm-shield-stage3u.sh
node tools/simurgh-extraction/verify-stage3u-attestation.mjs --reproduce
node tools/simurgh-extraction/verify-stage3t-attestation.mjs --reproduce   # v1 still reproduces (additive proof)
npm test
```
Expected: 3U smoke green; both verifiers all-true; **3T still reproduces**; `npm test` green with the new v2 tests and no regressions; the Task-9 helper-coverage command reports 100% functions across the six v2 pure libs.

- [ ] **Step 3: Prettier + tree-clean**

```bash
npm run format
node tools/simurgh-extraction/simurgh-extraction-v2.mjs write-hashes
npm run format
node tools/simurgh-extraction/simurgh-extraction-v2.mjs build   # verified committed
git status   # clean after a final build
```

- [ ] **Step 4: Commit docs**

```bash
git add docs/research/llm-shield/LLM_SHIELD_STAGE_3U_RED_TEAM_HARDENED_EXTRACTION_ATTESTATION.md docs/research/llm-shield/STAGE_3U_*.md docs/research/llm-shield/evidence/stage-3u/README.md
git commit -m "docs(3u): stage writeup, threat model, validation matrix, reviewer checklist"
```

- [ ] **Step 5: Finish the branch.** Announce and use **superpowers:finishing-a-development-branch**: push `main-stage-3u-red-team-hardened-extraction-attestation`, open the PR (neutral body: crown, red-team-driven hardening, A10/A9 fixes, strong/contextual model + decision table, R1 documented limitation, additive/v1-freeze, two-tier verifier, verification results), await merge. After merge: tag `v2.4.0-stage-3u-red-team-hardened-extraction-attestation`, write the release, add the memory entry, clean up the branch.

---

## Self-Review

**1. Spec coverage:**
- Crown + final sign-off + one-line identity → Task 10 docs. ✔
- A10 fix (volume contextual, ≥2 strong) → Task 1 (split) + Task 4 (decision) + Task 6 (regression fixtures) + Task 9 consistency (regression result `single`). ✔
- A9 fix (grammar) → Task 2 + Task 3 + Task 6 rejection fixtures + Task 9 privacy. ✔
- R1 honesty (documented limitation) → spec §2, Task 6 `strong-plus-strong-benign-collision`, Task 7 `known_limitations[]`, Task 8 `known_limitation_disclosed` check, Task 10 docs. ✔
- R2 additive + v1-freeze → Global Constraints, Task 9 v1-freeze guard, Task 10 step-2 3T reproduce. ✔
- R3 coverage/scoping/sha256/write-hashes → Global Constraints, Task 2 branch tests, Task 9 security scoping, Task 7/8/9 write-hashes-after-prettier. ✔
- Detector identity + version locks → Task 4 constants + Task 6 version-lock fixtures + config. ✔
- Two-tier verifier (both sets + self-proof + attestation byte-identity) → Task 8. ✔
- Evidence layout, dedicated key, synthetic hashes, byte-reproducibility → Tasks 7/8. ✔
- Tag v2.4.0 → Task 10. ✔

**2. Placeholder scan:** `detector-config.json` ships `PLACEHOLDER_FILLED_BY_BUILD` (overwritten by `build --update` in Task 7 Step 5, asserted by Task 9 consistency). No other placeholders.

**3. Type consistency:** v2 result fields (`detector_id`, `previous_detector_id`, `meta_set_digest`, `matched`, `matched_strong_families`, `matched_contextual_families`, `strong_family_count`, `contextual_family_count`, `decision`, `attestation_claim`, `non_claims`) are produced by `runDetectorV2` (Task 4) and consumed identically by `buildAttestationV2` (Task 7), `verifyExtractionV2` (Task 8), audits (Task 9). `verifyExtractionV2({attestation, sidecar, publicKeyPem, mainSet, detectorConfig})` matches its test calls. `runExtractionSelfProofV2()` summary keys match the test + security audit. All digests via `sha256Hex(canonicalJson(...))` (single-prefixed).
