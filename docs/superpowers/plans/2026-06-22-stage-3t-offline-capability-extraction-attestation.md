# Stage 3T — Offline Capability-Extraction Pattern Attestation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a tooling-only, offline stage that produces an Ed25519-signed, metadata-only, byte-reproducible attestation that a frozen detector matched (or did not match) capability-extraction patterns over a committed synthetic reference set — without claiming intent, attribution, or distillation.

**Architecture:** Five pure ES-module libraries (`metaSet`, `signalFamilies`, `detector`, `selfProof`, `renderer`) under `tools/simurgh-extraction/`, gated at 100% function coverage. A CLI builds/verifies committed evidence; a local-only signer signs the attestation; a two-tier verifier checks signature + bindings (portable) and re-runs the detector byte-for-byte (`--reproduce`). No gateway, no network, no live traffic, no identity. Mirrors the 3S tooling pattern.

**Tech Stack:** Node ≥ 22 ES modules, `node:test`, `node:crypto` (Ed25519), reusing `tools/simurgh-attestation/canonicalise.mjs` (`canonicalJson`, `sha256Hex`, `fingerprintPublicKey`) and `keygen.mjs`. Bash audit/smoke scripts. CI via `scripts/check.sh`.

## Global Constraints

- Tooling-only: **zero `src/llmShield` change**. Policy-drift guard fail-closed, three-dot base (`origin/main...HEAD`). CI checks out with `fetch-depth: 0` (already in `.github/workflows/stage-1-checks.yml`).
- Offline + deterministic: no gateway run, no network, no live traffic, no identity data.
- Neutral commit messages, **no Co-Authored-By trailer**.
- Pure libs at **100% function coverage** (`node --test --experimental-test-coverage --test-coverage-functions=100`).
- Metadata-only wall: row header carries `set_provenance:"synthetic_reference"`, `live_traffic_used:false`, `identity_data_used:false`, `raw_content_used:false`. Forbidden raw tokens never appear (raw prompts/outputs, IPs, emails, account IDs, full timestamps, API keys, provider secrets, CoT text).
- Non-claim wall: no intent/attribution, no "distillation confirmed". Sacred sentence verbatim: `A detector match is not an accusation. It is a reproducible metadata-pattern result for manual review.`
- No named third-party labs in any evidence artifact.
- Unique `run_id` per row.
- `extraction_pattern_observed` requires **≥2 distinct signal families** (not booleans). `FAMILY_MAP` deep-frozen; `matched_families` emitted in frozen `FAMILY_ORDER`.
- Dedicated 3T Ed25519 key; only the public key committed. Private key default `~/.simurgh/3t-ed25519.pem`, mode `0o600`, never committed.
- Tag target `v2.3.0` on merge. Branch already exists: `main-stage-3t-offline-capability-extraction-attestation`.

**Frozen detector constants (used identically across tasks):**
```js
DETECTOR_ID = "stage3t_frozen_detector_v1"
THRESHOLD = 2                 // distinct_signal_families >= 2 → extraction_pattern_observed
CLUSTER_MIN = 3               // ≥3 rows sharing a hash = a cluster
DOMINANCE = 0.6               // single capability/task share ≥ 0.6 = targeting
COT_MAJORITY = 0.5            // fraction of rows with cot_elicitation_flag true > 0.5
VOLUME_BURST_FRACTION = 0.6   // single time_bucket share ≥ 0.6 = burst
HIGH_REQUEST_COUNT = 10       // total rows ≥ 10
HYDRA_MIN_ACTORS = 3          // ≥3 distinct actor clusters with sessions ≥ actors
```

**Signal families (frozen):**
```js
FAMILY_MAP = {
  structural:   ["repetition_cluster", "template_prefix_cluster"],
  behavioural:  ["cot_elicitation"],
  targeting:    ["capability_targeting", "task_taxonomy_repeat"],
  coordination: ["hydra_cluster"],
  volume:       ["volume_burst", "high_request_count"],
}
FAMILY_ORDER = ["structural", "behavioural", "targeting", "coordination", "volume"]
```

---

## File Structure

- `tools/simurgh-extraction/metaSet.mjs` — schema, validation (provenance + unique run_id + allowed fields), order-independent digest.
- `tools/simurgh-extraction/signalFamilies.mjs` — deep-frozen `FAMILY_MAP`, `FAMILY_ORDER`, `familyMapDigest`, `signalToFamily`, `distinctFamilies`.
- `tools/simurgh-extraction/detector.mjs` — frozen signal matching, total decision function, `runDetector`.
- `tools/simurgh-extraction/selfProof.mjs` — 11 falsification fixtures + summary counters.
- `tools/simurgh-extraction/renderer.mjs` — decision→prose, sacred non-claim, throws on accusatory/named-lab wording.
- `tools/simurgh-extraction/simurgh-extraction.mjs` — CLI: `build [--update]`, `hash`, `verify`, `verify-hashes`.
- `tools/simurgh-extraction/sign-3t-attestation.mjs` — local-only signer.
- `tools/simurgh-extraction/verify-stage3t-attestation.mjs` — two-tier verifier.
- `tests/unit/llmShield/extraction/{metaSet,signalFamilies,detector,extractionSelfProof,renderer,extractionCli,extractionVerify}.test.js`.
- `docs/research/llm-shield/evidence/stage-3t/**` — committed evidence.
- `scripts/{smoke,security-audit,privacy-audit,consistency-audit}-llm-shield-stage3t.{sh,mjs}`, `scripts/policy-drift-guard-llm-shield-stage3t.sh`, plus `scripts/check.sh` wiring.
- `docs/research/llm-shield/LLM_SHIELD_STAGE_3T_*.md` + evidence `README.md`.

---

### Task 1: Metadata-set library (pure)

**Files:**
- Create: `tools/simurgh-extraction/metaSet.mjs`
- Test: `tests/unit/llmShield/extraction/metaSet.test.js`

**Interfaces:**
- Consumes: `canonicalJson`, `sha256Hex` from `../../simurgh-attestation/canonicalise.mjs` (note: from `tools/simurgh-extraction/` the path is `../simurgh-attestation/canonicalise.mjs`).
- Produces: `META_SET_SCHEMA` (string), `ALLOWED_ROW_FIELDS` (frozen array), `validateMetaSet(set) -> true | throws`, `normaliseMetaSet(set) -> object`, `metaSetDigest(set) -> "sha256:..."`.

> **Digest convention (applies to ALL 3T files):** `sha256Hex()` from `canonicalise.mjs`
> ALREADY returns the `sha256:`-prefixed string (verified: `return "sha256:" + crypto…`).
> NEVER manually prepend `"sha256:"`. Mirrors 3S exactly. A digest is
> `sha256Hex(canonicalJson(x))` — nothing more.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/extraction/metaSet.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  META_SET_SCHEMA,
  validateMetaSet,
  metaSetDigest,
} from "../../../../tools/simurgh-extraction/metaSet.mjs";

function row(id, over = {}) {
  return {
    run_id: id,
    actor_cluster_hash: "sha256:synthetic_actor_a",
    session_cluster_hash: "sha256:synthetic_session_a",
    normalized_prompt_hash: "sha256:np_" + id,
    prompt_template_hash: "sha256:tp_" + id,
    task_family: "code_generation",
    capability_tag: "tool_use",
    input_tokens_bucket: "1k-2k",
    output_tokens_bucket: "2k-4k",
    time_bucket: "bucket_001",
    cot_elicitation_flag: false,
    tool_use_request_shape: false,
    ...over,
  };
}
function set(rows, over = {}) {
  return {
    type: META_SET_SCHEMA,
    set_id: "stage3t_reference_set",
    set_provenance: "synthetic_reference",
    live_traffic_used: false,
    identity_data_used: false,
    raw_content_used: false,
    runs: rows,
    ...over,
  };
}

test("validateMetaSet accepts a clean synthetic set", () => {
  assert.equal(validateMetaSet(set([row("s3t_run_001"), row("s3t_run_002")])), true);
});

test("validateMetaSet rejects wrong provenance", () => {
  assert.throws(() => validateMetaSet(set([row("a")], { set_provenance: "live" })), /meta_set_provenance_invalid/);
});

test("validateMetaSet rejects live/identity/raw flags", () => {
  assert.throws(() => validateMetaSet(set([row("a")], { live_traffic_used: true })), /meta_set_provenance_invalid/);
  assert.throws(() => validateMetaSet(set([row("a")], { identity_data_used: true })), /meta_set_provenance_invalid/);
  assert.throws(() => validateMetaSet(set([row("a")], { raw_content_used: true })), /meta_set_provenance_invalid/);
});

test("validateMetaSet rejects duplicate run_id", () => {
  assert.throws(() => validateMetaSet(set([row("dup"), row("dup")])), /meta_set_invalid/);
});

test("validateMetaSet rejects an unknown row field", () => {
  assert.throws(() => validateMetaSet(set([row("a", { raw_prompt: "hello" })])), /forbidden_metadata_field/);
});

test("validateMetaSet rejects an empty run set", () => {
  assert.throws(() => validateMetaSet(set([])), /meta_set_invalid/);
});

test("metaSetDigest is order-independent and sha256-prefixed (single prefix)", () => {
  const a = set([row("s3t_run_001"), row("s3t_run_002")]);
  const b = set([row("s3t_run_002"), row("s3t_run_001")]);
  assert.match(metaSetDigest(a), /^sha256:[0-9a-f]{64}$/); // exactly one prefix, not sha256:sha256:
  assert.equal(metaSetDigest(a), metaSetDigest(b));
});

test("metaSetDigest binds the full set header, not only rows", () => {
  const a = set([row("s3t_run_001")]);
  const b = set([row("s3t_run_001")], { set_id: "different_set" });
  assert.notEqual(metaSetDigest(a), metaSetDigest(b));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/extraction/metaSet.test.js`
Expected: FAIL — cannot find module `metaSet.mjs`.

- [ ] **Step 3: Write minimal implementation**

```js
// tools/simurgh-extraction/metaSet.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Synthetic, metadata-only reference-set schema + validation + order-independent digest.
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";

export const META_SET_SCHEMA = "simurgh.capability_extraction.meta_set.v1";

export const ALLOWED_ROW_FIELDS = Object.freeze([
  "run_id",
  "actor_cluster_hash",
  "session_cluster_hash",
  "normalized_prompt_hash",
  "prompt_template_hash",
  "task_family",
  "capability_tag",
  "input_tokens_bucket",
  "output_tokens_bucket",
  "time_bucket",
  "cot_elicitation_flag",
  "tool_use_request_shape",
]);

export function validateMetaSet(set) {
  if (!set || typeof set !== "object") throw new Error("meta_set_invalid");
  if (set.type !== META_SET_SCHEMA) throw new Error("meta_set_invalid");
  if (
    set.set_provenance !== "synthetic_reference" ||
    set.live_traffic_used !== false ||
    set.identity_data_used !== false ||
    set.raw_content_used !== false
  ) {
    throw new Error("meta_set_provenance_invalid");
  }
  if (!Array.isArray(set.runs) || set.runs.length === 0) throw new Error("meta_set_invalid");
  const allowed = new Set(ALLOWED_ROW_FIELDS);
  const seen = new Set();
  for (const r of set.runs) {
    if (!r || typeof r !== "object") throw new Error("meta_set_invalid");
    for (const k of Object.keys(r)) {
      if (!allowed.has(k)) throw new Error("forbidden_metadata_field");
    }
    if (typeof r.run_id !== "string" || r.run_id.length === 0) throw new Error("meta_set_invalid");
    for (const h of ["actor_cluster_hash", "session_cluster_hash", "normalized_prompt_hash", "prompt_template_hash"]) {
      if (typeof r[h] !== "string" || !r[h].startsWith("sha256:")) throw new Error("meta_set_invalid");
    }
    if (typeof r.cot_elicitation_flag !== "boolean" || typeof r.tool_use_request_shape !== "boolean")
      throw new Error("meta_set_invalid");
    if (seen.has(r.run_id)) throw new Error("meta_set_invalid");
    seen.add(r.run_id);
  }
  return true;
}

// Bind the FULL synthetic/offline provenance header + sorted rows, not only the rows.
export function normaliseMetaSet(set) {
  validateMetaSet(set);
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

export function metaSetDigest(set) {
  return sha256Hex(canonicalJson(normaliseMetaSet(set)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/extraction/metaSet.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Verify 100% function coverage**

Run: `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-extraction/metaSet.mjs --test-coverage-functions=100 tests/unit/llmShield/extraction/metaSet.test.js`
Expected: PASS, metaSet.mjs functions 100%.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-extraction/metaSet.mjs tests/unit/llmShield/extraction/metaSet.test.js
git commit -m "feat(3t): synthetic metadata-set schema, validation, order-independent digest"
```

---

### Task 2: Signal-families library (pure)

**Files:**
- Create: `tools/simurgh-extraction/signalFamilies.mjs`
- Test: `tests/unit/llmShield/extraction/signalFamilies.test.js`

**Interfaces:**
- Consumes: `canonicalJson`, `sha256Hex`.
- Produces: `FAMILY_MAP` (deep-frozen), `FAMILY_ORDER` (frozen array), `familyMapDigest() -> "sha256:..."`, `signalToFamily(signalId) -> string|null`, `distinctFamilies(firedSignalIds: string[]) -> string[]` (sorted by `FAMILY_ORDER`).

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/extraction/signalFamilies.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  FAMILY_MAP,
  FAMILY_ORDER,
  familyMapDigest,
  signalToFamily,
  distinctFamilies,
} from "../../../../tools/simurgh-extraction/signalFamilies.mjs";

test("FAMILY_MAP and its member arrays are deep-frozen", () => {
  assert.equal(Object.isFrozen(FAMILY_MAP), true);
  assert.equal(Object.isFrozen(FAMILY_MAP.structural), true);
  assert.equal(Object.isFrozen(FAMILY_ORDER), true);
});

test("signalToFamily maps members and returns null for unknown", () => {
  assert.equal(signalToFamily("repetition_cluster"), "structural");
  assert.equal(signalToFamily("cot_elicitation"), "behavioural");
  assert.equal(signalToFamily("hydra_cluster"), "coordination");
  assert.equal(signalToFamily("nope"), null);
});

test("distinctFamilies counts FAMILIES not booleans and sorts by FAMILY_ORDER", () => {
  // both fired signals are structural → ONE family
  assert.deepEqual(distinctFamilies(["template_prefix_cluster", "repetition_cluster"]), ["structural"]);
  // two families, returned in FAMILY_ORDER regardless of input order
  assert.deepEqual(distinctFamilies(["cot_elicitation", "repetition_cluster"]), ["structural", "behavioural"]);
});

test("distinctFamilies ignores unknown signals", () => {
  assert.deepEqual(distinctFamilies(["nope"]), []);
});

test("familyMapDigest is sha256-prefixed and stable", () => {
  assert.match(familyMapDigest(), /^sha256:[0-9a-f]{64}$/);
  assert.equal(familyMapDigest(), familyMapDigest());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/extraction/signalFamilies.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// tools/simurgh-extraction/signalFamilies.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Frozen signal-family map. Distinct-FAMILY counting prevents one phenomenon from
// masquerading as corroboration. FAMILY_ORDER fixes emission order for byte-identity.
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";

function deepFreeze(obj) {
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") deepFreeze(v);
  }
  return Object.freeze(obj);
}

export const FAMILY_MAP = deepFreeze({
  structural: ["repetition_cluster", "template_prefix_cluster"],
  behavioural: ["cot_elicitation"],
  targeting: ["capability_targeting", "task_taxonomy_repeat"],
  coordination: ["hydra_cluster"],
  volume: ["volume_burst", "high_request_count"],
});

export const FAMILY_ORDER = Object.freeze([
  "structural",
  "behavioural",
  "targeting",
  "coordination",
  "volume",
]);

export function signalToFamily(signalId) {
  for (const fam of FAMILY_ORDER) {
    if (FAMILY_MAP[fam].includes(signalId)) return fam;
  }
  return null;
}

export function distinctFamilies(firedSignalIds) {
  const fams = new Set();
  for (const s of firedSignalIds) {
    const f = signalToFamily(s);
    if (f) fams.add(f);
  }
  return FAMILY_ORDER.filter((f) => fams.has(f));
}

export function familyMapDigest() {
  return sha256Hex(canonicalJson(FAMILY_MAP)); // sha256Hex already prefixes; never double-prefix
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/extraction/signalFamilies.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Verify 100% function coverage**

Run: `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-extraction/signalFamilies.mjs --test-coverage-functions=100 tests/unit/llmShield/extraction/signalFamilies.test.js`
Expected: PASS, 100%.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-extraction/signalFamilies.mjs tests/unit/llmShield/extraction/signalFamilies.test.js
git commit -m "feat(3t): deep-frozen signal-family map with distinct-family counting"
```

---

### Task 3: Detector library (pure)

**Files:**
- Create: `tools/simurgh-extraction/detector.mjs`
- Test: `tests/unit/llmShield/extraction/detector.test.js`

**Interfaces:**
- Consumes: `metaSetDigest` (metaSet), `distinctFamilies` (signalFamilies).
- Produces: `DETECTOR_ID`, `THRESHOLD`, `THRESHOLDS` (frozen constants object), `matchSignals(set) -> {<signalId>: bool}`, `firedSignalIds(matched) -> string[]`, `decide(distinctFamilyCount) -> {decision, attestation_claim}`, `runDetector(set) -> resultObject`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/extraction/detector.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { META_SET_SCHEMA } from "../../../../tools/simurgh-extraction/metaSet.mjs";
import {
  DETECTOR_ID,
  THRESHOLD,
  matchSignals,
  firedSignalIds,
  decide,
  runDetector,
} from "../../../../tools/simurgh-extraction/detector.mjs";

function row(id, over = {}) {
  return {
    run_id: id,
    actor_cluster_hash: "sha256:actor_a",
    session_cluster_hash: "sha256:session_" + id,
    normalized_prompt_hash: "sha256:np_" + id,
    prompt_template_hash: "sha256:tp_" + id,
    task_family: "tf_" + id,
    capability_tag: "cap_" + id,
    input_tokens_bucket: "1k-2k",
    output_tokens_bucket: "2k-4k",
    time_bucket: "tb_" + id,
    cot_elicitation_flag: false,
    tool_use_request_shape: false,
    ...over,
  };
}
function set(rows) {
  return {
    type: META_SET_SCHEMA,
    set_id: "t",
    set_provenance: "synthetic_reference",
    live_traffic_used: false,
    identity_data_used: false,
    raw_content_used: false,
    runs: rows,
  };
}

test("identity constants are frozen at v1 / threshold 2", () => {
  assert.equal(DETECTOR_ID, "stage3t_frozen_detector_v1");
  assert.equal(THRESHOLD, 2);
});

test("decide is a total function over distinct family count", () => {
  assert.deepEqual(decide(0), { decision: "no_pattern_observed", attestation_claim: "none" });
  assert.deepEqual(decide(1), { decision: "single_signal_observed", attestation_claim: "manual_review_only" });
  assert.deepEqual(decide(2), { decision: "extraction_pattern_observed", attestation_claim: "manual_review_recommended" });
  assert.deepEqual(decide(5), { decision: "extraction_pattern_observed", attestation_claim: "manual_review_recommended" });
});

test("repetition cluster fires structural only (double-count trap)", () => {
  // 4 rows, identical normalized AND template hash → both structural members fire → 1 family
  const rows = [0, 1, 2, 3].map((i) =>
    row("r" + i, { normalized_prompt_hash: "sha256:same", prompt_template_hash: "sha256:same_t" })
  );
  const m = matchSignals(set(rows));
  assert.equal(m.repetition_cluster, true);
  assert.equal(m.template_prefix_cluster, true);
  const res = runDetector(set(rows));
  assert.equal(res.distinct_family_count, 1);
  assert.deepEqual(res.matched_families, ["structural"]);
  assert.equal(res.decision, "single_signal_observed");
});

test("structural + behavioural = extraction", () => {
  const rows = [0, 1, 2, 3].map((i) =>
    row("r" + i, { normalized_prompt_hash: "sha256:same", cot_elicitation_flag: true })
  );
  const res = runDetector(set(rows));
  assert.deepEqual(res.matched_families, ["structural", "behavioural"]);
  assert.equal(res.decision, "extraction_pattern_observed");
  assert.equal(res.detector_id, DETECTOR_ID);
  assert.match(res.meta_set_digest, /^sha256:/);
  assert.ok(res.non_claims.includes("match_is_not_accusation"));
});

test("firedSignalIds returns only true signals", () => {
  assert.deepEqual(firedSignalIds({ a: true, b: false, c: true }).sort(), ["a", "c"]);
});

test("clean varied set → no pattern", () => {
  const rows = [0, 1].map((i) => row("r" + i));
  const res = runDetector(set(rows));
  assert.equal(res.decision, "no_pattern_observed");
  assert.equal(res.distinct_family_count, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/extraction/detector.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// tools/simurgh-extraction/detector.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Frozen, deterministic, order-independent detector. Decision uses DISTINCT signal
// families (>=2 → extraction). Thresholds are frozen into the detector identity; any
// change requires a new DETECTOR_ID.
import { metaSetDigest } from "./metaSet.mjs";
import { distinctFamilies } from "./signalFamilies.mjs";

export const DETECTOR_ID = "stage3t_frozen_detector_v1";
export const THRESHOLD = 2;
export const THRESHOLDS = Object.freeze({
  CLUSTER_MIN: 3,
  DOMINANCE: 0.6,
  COT_MAJORITY: 0.5,
  VOLUME_BURST_FRACTION: 0.6,
  HIGH_REQUEST_COUNT: 10,
  HYDRA_MIN_ACTORS: 3,
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

export function matchSignals(set) {
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

export function decide(distinctFamilyCount) {
  if (distinctFamilyCount >= THRESHOLD)
    return { decision: "extraction_pattern_observed", attestation_claim: "manual_review_recommended" };
  if (distinctFamilyCount === 1)
    return { decision: "single_signal_observed", attestation_claim: "manual_review_only" };
  return { decision: "no_pattern_observed", attestation_claim: "none" };
}

export function runDetector(set) {
  const matched = matchSignals(set);
  const families = distinctFamilies(firedSignalIds(matched));
  const { decision, attestation_claim } = decide(families.length);
  return {
    type: "simurgh.capability_extraction.detector_result.v1",
    detector_id: DETECTOR_ID,
    meta_set_digest: metaSetDigest(set),
    matched,
    matched_families: families,
    distinct_family_count: families.length,
    decision,
    attestation_claim,
    non_claims: [
      "no_intent_claim",
      "no_attribution_claim",
      "no_complete_distillation_prevention_claim",
      "metadata_only",
      "match_is_not_accusation",
    ],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/extraction/detector.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Verify 100% function coverage**

Run: `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-extraction/detector.mjs --test-coverage-functions=100 tests/unit/llmShield/extraction/detector.test.js`
Expected: PASS, 100%.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-extraction/detector.mjs tests/unit/llmShield/extraction/detector.test.js
git commit -m "feat(3t): frozen deterministic extraction-pattern detector + total decision"
```

---

### Task 4: Renderer (pure)

**Files:**
- Create: `tools/simurgh-extraction/renderer.mjs`
- Test: `tests/unit/llmShield/extraction/renderer.test.js`

**Interfaces:**
- Consumes: a detector result object (from `runDetector`).
- Produces: `SACRED_NON_CLAIM` (string), `FORBIDDEN_WORDING` (frozen array), `renderAttestationProse(result) -> {rendered_summary, intent_claim_made:false}`. Throws `intent_language_rejected` if forbidden wording would appear.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/extraction/renderer.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  SACRED_NON_CLAIM,
  FORBIDDEN_WORDING,
  renderAttestationProse,
} from "../../../../tools/simurgh-extraction/renderer.mjs";

const base = {
  decision: "extraction_pattern_observed",
  attestation_claim: "manual_review_recommended",
  matched_families: ["structural", "behavioural"],
  distinct_family_count: 2,
};

test("render is deterministic, carries the sacred non-claim, makes no intent claim", () => {
  const r1 = renderAttestationProse(base);
  const r2 = renderAttestationProse({ ...base });
  assert.equal(r1.rendered_summary, r2.rendered_summary);
  assert.equal(r1.intent_claim_made, false);
  assert.ok(r1.rendered_summary.includes(SACRED_NON_CLAIM));
  assert.match(r1.rendered_summary, /manual review/i);
});

test("render contains no forbidden/accusatory wording", () => {
  const lower = renderAttestationProse(base).rendered_summary.toLowerCase();
  for (const w of FORBIDDEN_WORDING) assert.ok(!lower.includes(w), `leaked: ${w}`);
});

test("render handles each decision branch", () => {
  assert.match(renderAttestationProse({ ...base, decision: "no_pattern_observed", matched_families: [], distinct_family_count: 0 }).rendered_summary, /no .*pattern/i);
  assert.match(renderAttestationProse({ ...base, decision: "single_signal_observed", matched_families: ["volume"], distinct_family_count: 1 }).rendered_summary, /single/i);
});

test("render throws if a family name is itself accusatory (defence in depth)", () => {
  assert.throws(
    () => renderAttestationProse({ ...base, matched_families: ["malicious campaign"] }),
    /intent_language_rejected/
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/extraction/renderer.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// tools/simurgh-extraction/renderer.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic decision→prose. Describes what matched; never accuses, attributes,
// or names a lab. Appends the sacred non-claim. Throws on any forbidden wording.

export const SACRED_NON_CLAIM =
  "A detector match is not an accusation. It is a reproducible metadata-pattern result for manual review.";

export const FORBIDDEN_WORDING = Object.freeze([
  "distillation attack confirmed",
  "abusive actor",
  "stolen",
  "fraudulent",
  "malicious campaign",
  "attacker",
  "deepseek",
  "moonshot",
  "minimax",
]);

const DECISION_PROSE = {
  no_pattern_observed: "No capability-extraction pattern was observed in the bounded metadata set.",
  single_signal_observed:
    "A single signal family was observed in the bounded metadata set; manual review only.",
  extraction_pattern_observed:
    "An extraction-shaped pattern across multiple distinct signal families was observed in the bounded metadata set; manual review recommended.",
};

export function renderAttestationProse(result) {
  const head = DECISION_PROSE[result.decision] ?? "Decision not recognised.";
  const families = [...result.matched_families].join(", ");
  const summary = `${head} Distinct signal families: ${result.distinct_family_count}` +
    (families ? ` (${families}).` : ".") +
    ` ${SACRED_NON_CLAIM}`;
  const lower = summary.toLowerCase();
  for (const w of FORBIDDEN_WORDING) {
    if (lower.includes(w)) throw new Error("intent_language_rejected");
  }
  return { rendered_summary: summary, intent_claim_made: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/extraction/renderer.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Verify 100% function coverage**

Run: `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-extraction/renderer.mjs --test-coverage-functions=100 tests/unit/llmShield/extraction/renderer.test.js`
Expected: PASS, 100%.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-extraction/renderer.mjs tests/unit/llmShield/extraction/renderer.test.js
git commit -m "feat(3t): non-accusatory attestation renderer with sacred non-claim"
```

---

### Task 5: Self-proof (pure)

**Files:**
- Create: `tools/simurgh-extraction/selfProof.mjs`
- Test: `tests/unit/llmShield/extraction/extractionSelfProof.test.js`

**Interfaces:**
- Consumes: `validateMetaSet` (metaSet), `runDetector`/`DETECTOR_ID`/`THRESHOLD` (detector), `renderAttestationProse` (renderer).
- Produces: `runExtractionSelfProof() -> { fixtures: [...], summary: {...} }` with summary counters all `0` and `all_passed:true`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/extraction/extractionSelfProof.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { runExtractionSelfProof } from "../../../../tools/simurgh-extraction/selfProof.mjs";

test("self-proof: all falsification fixtures pass with zero failures", () => {
  const { summary, fixtures } = runExtractionSelfProof();
  assert.equal(summary.all_passed, true);
  assert.equal(summary.benign_escalation_failures, 0);
  assert.equal(summary.single_family_escalations, 0);
  assert.equal(summary.distinct_family_double_count_failures, 0);
  assert.equal(summary.intent_claims_rendered, 0);
  assert.equal(summary.decision_reproduction_failures, 0);
  assert.equal(summary.duplicate_run_id_failures, 0);
  assert.equal(fixtures.length, 11);
  assert.ok(fixtures.every((f) => f.passed));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/extraction/extractionSelfProof.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// tools/simurgh-extraction/selfProof.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Falsification harness (NOT an FP/FN benchmark). Proves the decision machinery has
// brakes: benign-heavy and single-phenomenon sets do not escalate; double-counted
// structural signals stay one family; intent wording never renders; results reproduce.
import { validateMetaSet } from "./metaSet.mjs";
import { DETECTOR_ID, THRESHOLD, runDetector } from "./detector.mjs";
import { renderAttestationProse } from "./renderer.mjs";

function row(id, over = {}) {
  return {
    run_id: id,
    actor_cluster_hash: "sha256:actor_a",
    session_cluster_hash: "sha256:session_" + id,
    normalized_prompt_hash: "sha256:np_" + id,
    prompt_template_hash: "sha256:tp_" + id,
    task_family: "tf_" + id,
    capability_tag: "cap_" + id,
    input_tokens_bucket: "1k-2k",
    output_tokens_bucket: "2k-4k",
    time_bucket: "tb_" + id,
    cot_elicitation_flag: false,
    tool_use_request_shape: false,
    ...over,
  };
}
function mset(rows) {
  return {
    type: "simurgh.capability_extraction.meta_set.v1",
    set_id: "selfproof",
    set_provenance: "synthetic_reference",
    live_traffic_used: false,
    identity_data_used: false,
    raw_content_used: false,
    runs: rows,
  };
}
const range = (n) => Array.from({ length: n }, (_, i) => i);

export function runExtractionSelfProof() {
  const fixtures = [];
  const summary = {
    benign_escalation_failures: 0,
    single_family_escalations: 0,
    distinct_family_double_count_failures: 0,
    intent_claims_rendered: 0,
    decision_reproduction_failures: 0,
    duplicate_run_id_failures: 0,
    all_passed: true,
  };
  const add = (name, passed, detail) => {
    fixtures.push({ name, passed, detail });
    if (!passed) summary.all_passed = false;
  };

  // 1. benign-heavy-power-user: 12 varied rows, 1 actor → at most volume (single family)
  {
    const res = runDetector(mset(range(12).map((i) => row("h" + i))));
    const ok = res.decision === "no_pattern_observed" || res.decision === "single_signal_observed";
    if (!ok) summary.benign_escalation_failures++;
    add("benign-heavy-power-user", ok, res.decision);
  }
  // 2. benign-repetition-only: structural only (5 identical prompt hashes, varied else, <10)
  {
    const rows = range(5).map((i) => row("rep" + i, { normalized_prompt_hash: "sha256:same" }));
    const res = runDetector(mset(rows));
    const ok = res.decision === "single_signal_observed" && res.distinct_family_count === 1;
    if (!ok) summary.single_family_escalations++;
    add("benign-repetition-only", ok, res.decision);
  }
  // 3. benign-volume-only: 11 varied rows → high_request_count only
  {
    const res = runDetector(mset(range(11).map((i) => row("v" + i))));
    const ok = res.decision === "single_signal_observed" && res.matched_families.join() === "volume";
    if (!ok) summary.single_family_escalations++;
    add("benign-volume-only", ok, res.decision);
  }
  // 4. benign-targeting-only: 5 rows same capability, varied else, <10, spread buckets
  {
    const rows = range(5).map((i) => row("t" + i, { capability_tag: "tool_use" }));
    const res = runDetector(mset(rows));
    const ok = res.decision === "single_signal_observed" && res.matched_families.join() === "targeting";
    if (!ok) summary.single_family_escalations++;
    add("benign-targeting-only", ok, res.decision);
  }
  // 5. structural-double-count-trap: same prompt AND template repeated → 1 family
  {
    const rows = range(4).map((i) =>
      row("d" + i, { normalized_prompt_hash: "sha256:same", prompt_template_hash: "sha256:same_t" })
    );
    const res = runDetector(mset(rows));
    const ok = res.distinct_family_count === 1 && res.matched_families.join() === "structural";
    if (!ok) summary.distinct_family_double_count_failures++;
    add("structural-double-count-trap", ok, String(res.distinct_family_count));
  }
  // 6. extraction-structural-plus-behavioural
  {
    const rows = range(4).map((i) =>
      row("sb" + i, { normalized_prompt_hash: "sha256:same", cot_elicitation_flag: true })
    );
    const res = runDetector(mset(rows));
    add("extraction-structural-plus-behavioural", res.decision === "extraction_pattern_observed", res.decision);
  }
  // 7. extraction-targeting-plus-coordination: 6 rows, 3 actors, same capability
  {
    const rows = range(6).map((i) =>
      row("tc" + i, { actor_cluster_hash: "sha256:actor_" + (i % 3), capability_tag: "tool_use" })
    );
    const res = runDetector(mset(rows));
    const ok = res.decision === "extraction_pattern_observed" &&
      res.matched_families.includes("targeting") && res.matched_families.includes("coordination");
    add("extraction-targeting-plus-coordination", ok, res.matched_families.join());
  }
  // 8. threshold-version-lock: threshold frozen at 2, id at v1
  {
    const ok = THRESHOLD === 2 && DETECTOR_ID === "stage3t_frozen_detector_v1";
    add("threshold-version-lock", ok, `${DETECTOR_ID}:${THRESHOLD}`);
  }
  // 9. intent-language-rejected: forbidden family name must throw; clean render must not leak
  {
    let threw = false;
    try {
      renderAttestationProse({ decision: "extraction_pattern_observed", attestation_claim: "x", matched_families: ["attacker"], distinct_family_count: 2 });
    } catch (e) {
      threw = /intent_language_rejected/.test(e.message);
    }
    const clean = renderAttestationProse({ decision: "no_pattern_observed", attestation_claim: "none", matched_families: [], distinct_family_count: 0 });
    const leaked = /attacker|stolen|fraudulent/i.test(clean.rendered_summary);
    if (leaked) summary.intent_claims_rendered++;
    add("intent-language-rejected", threw && !leaked, String(threw));
  }
  // 10. duplicate-run-id-rejected
  {
    let threw = false;
    try {
      validateMetaSet(mset([row("dup"), row("dup")]));
    } catch (e) {
      threw = /meta_set_invalid/.test(e.message);
    }
    if (!threw) summary.duplicate_run_id_failures++;
    add("duplicate-run-id-rejected", threw, String(threw));
  }
  // 11. decision reproduction: same set → identical result twice
  {
    const rows = range(4).map((i) => row("rep2_" + i, { normalized_prompt_hash: "sha256:same", cot_elicitation_flag: true }));
    const a = JSON.stringify(runDetector(mset(rows)));
    const b = JSON.stringify(runDetector(mset(rows)));
    if (a !== b) summary.decision_reproduction_failures++;
    add("decision-reproduction", a === b, "stable");
  }

  return { fixtures, summary };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/extraction/extractionSelfProof.test.js`
Expected: PASS. If any fixture fails, the printed `detail`/decision tells you which threshold to recheck against the fixture construction; adjust the fixture data (not the detector) so the decision walls hold.

- [ ] **Step 5: Verify 100% function coverage**

Run: `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-extraction/selfProof.mjs --test-coverage-functions=100 tests/unit/llmShield/extraction/extractionSelfProof.test.js`
Expected: PASS, 100%.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-extraction/selfProof.mjs tests/unit/llmShield/extraction/extractionSelfProof.test.js
git commit -m "feat(3t): benign-silence self-proof falsification harness"
```

---

### Task 6: CLI + committed reference set + detector result

**Files:**
- Create: `tools/simurgh-extraction/simurgh-extraction.mjs`
- Create: `docs/research/llm-shield/evidence/stage-3t/meta-set/metadata-set.json`
- Create: `docs/research/llm-shield/evidence/stage-3t/meta-set/metadata-set-manifest.json`
- Create: `docs/research/llm-shield/evidence/stage-3t/meta-set/detector-config.json`
- Generated by CLI: `result/expected-detector-result.json`, `result/attestation.json`, `evidence-hashes.json`
- Test: `tests/unit/llmShield/extraction/extractionCli.test.js`

**Interfaces:**
- Consumes: all pure libs + `familyMapDigest`.
- Produces: CLI subcommands `build [--update]`, `hash`, `verify`, `verify-hashes`. Exports `buildAttestation(set) -> attestationObject`, `assembleForBuild()`, `deriveForVerify()` for unit testing.

- [ ] **Step 1: Author the committed reference set (headline = extraction across 3 families)**

Create `docs/research/llm-shield/evidence/stage-3t/meta-set/metadata-set.json` — 8 rows: identical `normalized_prompt_hash` (structural), `cot_elicitation_flag:true` on a majority (behavioural), identical `capability_tag:"tool_use"` (targeting); spread `time_bucket` (no burst), single actor (no hydra), <10 rows (no high count). Unique `run_id`s `s3t_run_001..008`.

```json
{
  "type": "simurgh.capability_extraction.meta_set.v1",
  "set_id": "stage3t_reference_set",
  "set_provenance": "synthetic_reference",
  "live_traffic_used": false,
  "identity_data_used": false,
  "raw_content_used": false,
  "runs": [
    { "run_id": "s3t_run_001", "actor_cluster_hash": "sha256:synthetic_actor_a", "session_cluster_hash": "sha256:synthetic_session_1", "normalized_prompt_hash": "sha256:synthetic_np_shared", "prompt_template_hash": "sha256:synthetic_tp_001", "task_family": "code_generation", "capability_tag": "tool_use", "input_tokens_bucket": "1k-2k", "output_tokens_bucket": "2k-4k", "time_bucket": "bucket_001", "cot_elicitation_flag": true, "tool_use_request_shape": false },
    { "run_id": "s3t_run_002", "actor_cluster_hash": "sha256:synthetic_actor_a", "session_cluster_hash": "sha256:synthetic_session_2", "normalized_prompt_hash": "sha256:synthetic_np_shared", "prompt_template_hash": "sha256:synthetic_tp_002", "task_family": "data_analysis", "capability_tag": "tool_use", "input_tokens_bucket": "1k-2k", "output_tokens_bucket": "2k-4k", "time_bucket": "bucket_002", "cot_elicitation_flag": true, "tool_use_request_shape": false },
    { "run_id": "s3t_run_003", "actor_cluster_hash": "sha256:synthetic_actor_a", "session_cluster_hash": "sha256:synthetic_session_3", "normalized_prompt_hash": "sha256:synthetic_np_shared", "prompt_template_hash": "sha256:synthetic_tp_003", "task_family": "summarisation", "capability_tag": "tool_use", "input_tokens_bucket": "2k-4k", "output_tokens_bucket": "2k-4k", "time_bucket": "bucket_003", "cot_elicitation_flag": true, "tool_use_request_shape": false },
    { "run_id": "s3t_run_004", "actor_cluster_hash": "sha256:synthetic_actor_a", "session_cluster_hash": "sha256:synthetic_session_4", "normalized_prompt_hash": "sha256:synthetic_np_shared", "prompt_template_hash": "sha256:synthetic_tp_004", "task_family": "code_generation", "capability_tag": "tool_use", "input_tokens_bucket": "1k-2k", "output_tokens_bucket": "4k-8k", "time_bucket": "bucket_004", "cot_elicitation_flag": true, "tool_use_request_shape": false },
    { "run_id": "s3t_run_005", "actor_cluster_hash": "sha256:synthetic_actor_a", "session_cluster_hash": "sha256:synthetic_session_5", "normalized_prompt_hash": "sha256:synthetic_np_shared", "prompt_template_hash": "sha256:synthetic_tp_005", "task_family": "data_analysis", "capability_tag": "tool_use", "input_tokens_bucket": "1k-2k", "output_tokens_bucket": "2k-4k", "time_bucket": "bucket_005", "cot_elicitation_flag": true, "tool_use_request_shape": false },
    { "run_id": "s3t_run_006", "actor_cluster_hash": "sha256:synthetic_actor_a", "session_cluster_hash": "sha256:synthetic_session_6", "normalized_prompt_hash": "sha256:synthetic_np_shared", "prompt_template_hash": "sha256:synthetic_tp_006", "task_family": "summarisation", "capability_tag": "tool_use", "input_tokens_bucket": "2k-4k", "output_tokens_bucket": "2k-4k", "time_bucket": "bucket_006", "cot_elicitation_flag": false, "tool_use_request_shape": false },
    { "run_id": "s3t_run_007", "actor_cluster_hash": "sha256:synthetic_actor_a", "session_cluster_hash": "sha256:synthetic_session_7", "normalized_prompt_hash": "sha256:synthetic_np_shared", "prompt_template_hash": "sha256:synthetic_tp_007", "task_family": "code_generation", "capability_tag": "tool_use", "input_tokens_bucket": "1k-2k", "output_tokens_bucket": "2k-4k", "time_bucket": "bucket_007", "cot_elicitation_flag": true, "tool_use_request_shape": false },
    { "run_id": "s3t_run_008", "actor_cluster_hash": "sha256:synthetic_actor_a", "session_cluster_hash": "sha256:synthetic_session_8", "normalized_prompt_hash": "sha256:synthetic_np_shared", "prompt_template_hash": "sha256:synthetic_tp_008", "task_family": "data_analysis", "capability_tag": "tool_use", "input_tokens_bucket": "2k-4k", "output_tokens_bucket": "4k-8k", "time_bucket": "bucket_008", "cot_elicitation_flag": true, "tool_use_request_shape": false }
  ]
}
```

Create `metadata-set-manifest.json`:
```json
{ "set_id": "stage3t_reference_set", "set_file": "metadata-set.json", "expected_decision": "extraction_pattern_observed", "expected_distinct_family_count": 3 }
```

Create `detector-config.json`:
```json
{
  "detector_id": "stage3t_frozen_detector_v1",
  "threshold_rule": "distinct_signal_families >= 2",
  "decision_function": { "0": "no_pattern_observed", "1": "single_signal_observed", "2_or_more": "extraction_pattern_observed" },
  "thresholds": { "CLUSTER_MIN": 3, "DOMINANCE": 0.6, "COT_MAJORITY": 0.5, "VOLUME_BURST_FRACTION": 0.6, "HIGH_REQUEST_COUNT": 10, "HYDRA_MIN_ACTORS": 3 },
  "family_map_digest": "PLACEHOLDER_FILLED_BY_BUILD",
  "threshold_change_requires_new_detector_id": true
}
```

- [ ] **Step 2: Write the failing test**

```js
// tests/unit/llmShield/extraction/extractionCli.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { buildAttestation, deriveForVerify } from "../../../../tools/simurgh-extraction/simurgh-extraction.mjs";

test("buildAttestation binds digest, decision, rendered prose, sacred non-claim", async () => {
  const { attestation: att } = await deriveForVerify();
  assert.equal(att.detector_id, "stage3t_frozen_detector_v1");
  assert.equal(att.decision, "extraction_pattern_observed");
  assert.equal(att.distinct_family_count, 3);
  assert.match(att.meta_set_digest, /^sha256:[0-9a-f]{64}$/);
  assert.ok(att.rendered_summary.includes("manual review"));
  assert.ok(att.non_claims.includes("match_is_not_accusation"));
});

test("buildAttestation is a pure function of the committed set", async () => {
  const { set } = await deriveForVerify();
  assert.equal(JSON.stringify(buildAttestation(set)), JSON.stringify(buildAttestation(set)));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/extraction/extractionCli.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the CLI**

```js
// tools/simurgh-extraction/simurgh-extraction.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3T CLI. Offline + deterministic: build re-derives the attestation from the
// committed synthetic set; verify re-runs the detector and byte-compares. No gateway,
// no network. Subcommands: build [--update] | hash | verify | verify-hashes.
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import { validateMetaSet, metaSetDigest } from "./metaSet.mjs";
import { familyMapDigest } from "./signalFamilies.mjs";
import { runDetector } from "./detector.mjs";
import { renderAttestationProse } from "./renderer.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3t";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

export function buildAttestation(set) {
  validateMetaSet(set);
  const result = runDetector(set);
  const prose = renderAttestationProse(result);
  return {
    schema: "simurgh.capability_extraction.attestation.v1",
    detector_id: result.detector_id,
    family_map_digest: familyMapDigest(),
    meta_set_digest: result.meta_set_digest,
    matched: result.matched,
    matched_families: result.matched_families,
    distinct_family_count: result.distinct_family_count,
    decision: result.decision,
    attestation_claim: result.attestation_claim,
    non_claims: result.non_claims,
    rendered_summary: prose.rendered_summary,
    intent_claim_made: prose.intent_claim_made,
  };
}

export async function deriveForVerify() {
  const set = await rd("meta-set/metadata-set.json");
  const attestation = buildAttestation(set);
  const result = {
    type: "simurgh.capability_extraction.detector_result.v1",
    detector_id: attestation.detector_id,
    meta_set_digest: attestation.meta_set_digest,
    matched: attestation.matched,
    matched_families: attestation.matched_families,
    distinct_family_count: attestation.distinct_family_count,
    decision: attestation.decision,
    attestation_claim: attestation.attestation_claim,
    non_claims: attestation.non_claims,
  };
  return { set, attestation, result };
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
    const { attestation, result } = await deriveForVerify();
    // keep detector-config family_map_digest in sync
    const cfg = await rd("meta-set/detector-config.json");
    cfg.family_map_digest = familyMapDigest();
    if (update) {
      await writeFile(join(EV, "meta-set/detector-config.json"), stable(cfg));
      await writeFile(join(EV, "result/expected-detector-result.json"), stable(result));
      await writeFile(join(EV, "result/attestation.json"), stable(attestation));
      await writeEvidenceHashes();
      console.log("stage3t: evidence written (update)");
      return;
    }
    const committed = await rd("result/attestation.json");
    if (stable(committed) !== stable(attestation)) throw new Error("attestation drifted from committed set");
    const cr = await rd("result/expected-detector-result.json");
    if (stable(cr) !== stable(result)) throw new Error("detector result drifted from committed set");
    console.log("stage3t evidence: verified committed");
  } else if (cmd === "hash") {
    const { set, attestation } = await deriveForVerify();
    console.log("meta_set_digest:", metaSetDigest(set));
    console.log("family_map_digest:", attestation.family_map_digest);
  } else if (cmd === "verify") {
    const { result } = await deriveForVerify();
    const cr = await rd("result/expected-detector-result.json");
    if (stable(cr) !== stable(result)) throw new Error("detector result reproduction mismatch");
    console.log("stage3t: detector reproduces committed result");
  } else if (cmd === "verify-hashes") {
    const map = await rd("evidence-hashes.json");
    for (const [f, h] of Object.entries(map)) {
      if (sha256Hex(await readFile(f, "utf8")) !== h) throw new Error("hash mismatch: " + f);
    }
    console.log("stage3t: evidence hashes match");
  } else {
    console.error("usage: simurgh-extraction.mjs build [--update] | hash | verify | verify-hashes");
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error("stage3t CLI:", e.message);
    process.exit(1);
  });
}
```

- [ ] **Step 5: Generate committed evidence (first build)**

Run: `node tools/simurgh-extraction/simurgh-extraction.mjs build --update`
Expected: writes `detector-config.json` (digest filled), `result/expected-detector-result.json`, `result/attestation.json`, `evidence-hashes.json`. Then confirm:
Run: `node tools/simurgh-extraction/simurgh-extraction.mjs build` → `stage3t evidence: verified committed`.
Run: `node tools/simurgh-extraction/simurgh-extraction.mjs verify-hashes` → `stage3t: evidence hashes match`.

- [ ] **Step 6: Run unit test + format**

Run: `node --test tests/unit/llmShield/extraction/extractionCli.test.js` → PASS (2 tests).
Run: `npm run format` (prettier) then re-run `node tools/simurgh-extraction/simurgh-extraction.mjs build` to confirm prettier did not drift the committed JSON (if it did, re-run `build --update`, then `npm run format` again until both are stable — same discipline as 3S).

- [ ] **Step 7: Commit**

```bash
git add tools/simurgh-extraction/simurgh-extraction.mjs tests/unit/llmShield/extraction/extractionCli.test.js docs/research/llm-shield/evidence/stage-3t/
git commit -m "feat(3t): CLI + committed synthetic reference set and detector result"
```

---

### Task 7: Keypair, signer, verifier, signed evidence

**Files:**
- Create: `tools/simurgh-extraction/sign-3t-attestation.mjs`
- Create: `tools/simurgh-extraction/verify-stage3t-attestation.mjs`
- Create (committed): `docs/research/llm-shield/evidence/stage-3t/keys/stage3t-public-key.json`, `keys/fingerprint.txt`, `result/attestation.signature.json`, `self-proof/self-proof-results.json`
- Test: `tests/unit/llmShield/extraction/extractionVerify.test.js`

**Interfaces:**
- Consumes: `canonicalJson`, `sha256Hex`, `fingerprintPublicKey`; `deriveForVerify`; `runExtractionSelfProof`.
- Produces: `verifyExtraction({ attestation, sidecar, publicKeyPem, set, detectorConfig }) -> { ok, checks }`.

- [ ] **Step 1: Generate the dedicated 3T keypair (local only)**

```bash
mkdir -p ~/.simurgh
node tools/simurgh-attestation/keygen.mjs \
  --out-private ~/.simurgh/3t-ed25519.pem \
  --out-public docs/research/llm-shield/evidence/stage-3t/keys/stage3t-public-key.json
```
Then write the fingerprint sidecar:
```bash
node -e "const k=require('./docs/research/llm-shield/evidence/stage-3t/keys/stage3t-public-key.json');require('fs').writeFileSync('docs/research/llm-shield/evidence/stage-3t/keys/fingerprint.txt',k.fingerprint+'\n')"
```
Expected: only the public key + fingerprint land in the repo; the private key stays in `~/.simurgh` (mode 0600). Confirm `git status` shows NO `.pem`.

- [ ] **Step 2: Write the signer**

```js
// tools/simurgh-extraction/sign-3t-attestation.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only signer for the Stage 3T attestation. Reads SIMURGH_3T_PRIVATE_KEY_PATH
// (default ~/.simurgh/3t-ed25519.pem); CI never runs this.
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "../simurgh-attestation/canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3t";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

async function main() {
  const keyPath = process.env.SIMURGH_3T_PRIVATE_KEY_PATH || join(homedir(), ".simurgh", "3t-ed25519.pem");
  const priv = await readFile(keyPath, "utf8");
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3t-public-key.json"), "utf8"));
  const attestation = JSON.parse(await readFile(join(EV, "result", "attestation.json"), "utf8"));
  const canonical = Buffer.from(canonicalJson(attestation), "utf8");
  const signature = crypto.sign(null, canonical, crypto.createPrivateKey(priv));
  const sidecar = {
    schema: "simurgh.capability_extraction.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pub.public_key_pem),
    signature: "base64:" + signature.toString("base64"),
  };
  await writeFile(join(EV, "result", "attestation.signature.json"), stable(sidecar));
  console.log("stage3t: signed attestation; fingerprint", sidecar.public_key_fingerprint);
}
main().catch((e) => { console.error("stage3t sign:", e.message); process.exit(1); });
```

- [ ] **Step 3: Write the verifier**

```js
// tools/simurgh-extraction/verify-stage3t-attestation.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Two-tier verifier. Portable: signature + bindings + non-claim wall. --reproduce:
// additionally re-runs the detector and byte-compares the committed result.
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "../simurgh-attestation/canonicalise.mjs";
import { metaSetDigest } from "./metaSet.mjs";
import { familyMapDigest } from "./signalFamilies.mjs";
import { runExtractionSelfProof } from "./selfProof.mjs";
import { deriveForVerify } from "./simurgh-extraction.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3t";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

export function verifyExtraction({ attestation, sidecar, publicKeyPem, set, detectorConfig }) {
  const checks = {};
  const canonical = Buffer.from(canonicalJson(attestation), "utf8");
  checks.bundle_digest_match = sidecar.bundle_sha256 === sha256Hex(canonical);
  checks.key_fingerprint_match = sidecar.public_key_fingerprint === fingerprintPublicKey(publicKeyPem);
  checks.signature_valid = crypto.verify(
    null,
    canonical,
    crypto.createPublicKey(publicKeyPem),
    Buffer.from(sidecar.signature.replace(/^base64:/, ""), "base64")
  );
  // Real binding: the attestation's digest must equal the committed set's digest.
  checks.meta_set_digest_binding = attestation.meta_set_digest === metaSetDigest(set);
  checks.family_map_digest_match =
    attestation.family_map_digest === familyMapDigest() &&
    detectorConfig.family_map_digest === familyMapDigest();
  checks.detector_id_binding = detectorConfig.detector_id === attestation.detector_id;
  checks.threshold_lock_present = detectorConfig.threshold_change_requires_new_detector_id === true;
  checks.decision_present = ["no_pattern_observed", "single_signal_observed", "extraction_pattern_observed"].includes(attestation.decision);
  checks.no_intent_claim = attestation.intent_claim_made === false && attestation.non_claims.includes("no_intent_claim");
  checks.match_is_not_accusation = attestation.non_claims.includes("match_is_not_accusation");
  return { ok: Object.values(checks).every(Boolean), checks };
}

async function main() {
  const reproduce = process.argv.includes("--reproduce");
  const attestation = await rd("result/attestation.json");
  const sidecar = await rd("result/attestation.signature.json");
  const pub = await rd("keys/stage3t-public-key.json");
  const detectorConfig = await rd("meta-set/detector-config.json");
  const set = await rd("meta-set/metadata-set.json");
  const { ok, checks } = verifyExtraction({ attestation, sidecar, publicKeyPem: pub.public_key_pem, set, detectorConfig });
  let reproduced = true;
  if (reproduce) {
    const { attestation: regenerated, result } = await deriveForVerify();
    const committedResult = await rd("result/expected-detector-result.json");
    const committedAttestation = await rd("result/attestation.json");
    checks.detector_result_reproduces = stable(result) === stable(committedResult);
    checks.attestation_reproduces = stable(regenerated) === stable(committedAttestation);
    const sp = runExtractionSelfProof();
    checks.self_proof_passes = sp.summary.all_passed === true;
    reproduced = checks.detector_result_reproduces && checks.attestation_reproduces && checks.self_proof_passes;
  }
  console.log(JSON.stringify(checks, null, 2));
  if (process.argv.includes("--write")) {
    await writeFile(join(EV, "result", "verify-report.json"), stable(checks));
  }
  if (!ok || !reproduced) { console.error("stage3t verify: FAIL"); process.exit(1); }
  console.log("stage3t attestation verify: PASS");
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error("stage3t verify:", e.message); process.exit(1); });
```

- [ ] **Step 4: Sign + write self-proof evidence**

Run: `node tools/simurgh-extraction/sign-3t-attestation.mjs` → writes `result/attestation.signature.json`.
Run: `node -e "import('./tools/simurgh-extraction/selfProof.mjs').then(m=>require('fs').writeFileSync('docs/research/llm-shield/evidence/stage-3t/self-proof/self-proof-results.json', JSON.stringify(m.runExtractionSelfProof(),null,2)+'\n'))"` → writes `self-proof/self-proof-results.json`.
Run: `node tools/simurgh-extraction/simurgh-extraction.mjs build --update` (refresh `evidence-hashes.json` to include the new signature + self-proof + keys).

- [ ] **Step 5: Write the failing test, then confirm it passes**

```js
// tests/unit/llmShield/extraction/extractionVerify.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyExtraction } from "../../../../tools/simurgh-extraction/verify-stage3t-attestation.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3t";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

test("committed 3T attestation verifies (portable checks all true)", async () => {
  const attestation = await rd("result/attestation.json");
  const sidecar = await rd("result/attestation.signature.json");
  const pub = await rd("keys/stage3t-public-key.json");
  const detectorConfig = await rd("meta-set/detector-config.json");
  const set = await rd("meta-set/metadata-set.json");
  const { ok, checks } = verifyExtraction({ attestation, sidecar, publicKeyPem: pub.public_key_pem, set, detectorConfig });
  assert.equal(ok, true, JSON.stringify(checks));
  assert.equal(checks.meta_set_digest_binding, true);
  assert.equal(checks.detector_id_binding, true);
});

test("a tampered decision breaks the signature", async () => {
  const attestation = { ...(await rd("result/attestation.json")), decision: "no_pattern_observed" };
  const sidecar = await rd("result/attestation.signature.json");
  const pub = await rd("keys/stage3t-public-key.json");
  const detectorConfig = await rd("meta-set/detector-config.json");
  const set = await rd("meta-set/metadata-set.json");
  const { ok } = verifyExtraction({ attestation, sidecar, publicKeyPem: pub.public_key_pem, set, detectorConfig });
  assert.equal(ok, false);
});

test("a meta-set with a swapped run breaks the digest binding", async () => {
  const attestation = await rd("result/attestation.json");
  const sidecar = await rd("result/attestation.signature.json");
  const pub = await rd("keys/stage3t-public-key.json");
  const detectorConfig = await rd("meta-set/detector-config.json");
  const set = await rd("meta-set/metadata-set.json");
  set.runs[0].capability_tag = "tampered_capability";
  const { ok, checks } = verifyExtraction({ attestation, sidecar, publicKeyPem: pub.public_key_pem, set, detectorConfig });
  assert.equal(checks.meta_set_digest_binding, false);
  assert.equal(ok, false);
});
```

Run: `node --test tests/unit/llmShield/extraction/extractionVerify.test.js` → PASS (2 tests).
Run: `node tools/simurgh-extraction/verify-stage3t-attestation.mjs --reproduce` → prints all-true + `detector_reproduces:true`, `stage3t attestation verify: PASS`.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-extraction/sign-3t-attestation.mjs tools/simurgh-extraction/verify-stage3t-attestation.mjs tests/unit/llmShield/extraction/extractionVerify.test.js docs/research/llm-shield/evidence/stage-3t/
git commit -m "feat(3t): Ed25519 signer, two-tier verifier, signed committed evidence"
```

---

### Task 8: Audit scripts + smoke + check.sh wiring

**Files:**
- Create: `scripts/security-audit-llm-shield-stage3t.mjs`, `scripts/privacy-audit-llm-shield-stage3t.mjs`, `scripts/consistency-audit-llm-shield-stage3t.mjs`, `scripts/policy-drift-guard-llm-shield-stage3t.sh`, `scripts/smoke-llm-shield-stage3t.sh`
- Modify: `scripts/check.sh` (add 3T smoke + helper-coverage steps after the 3S steps, ~line 1812)

**Interfaces:** Consumes the committed evidence + pure libs. Each audit exits non-zero on failure.

- [ ] **Step 1: Security audit (no accusatory wording, no named labs, sacred non-claim, intent counter 0)**

```js
// scripts/security-audit-llm-shield-stage3t.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { runExtractionSelfProof } from "../tools/simurgh-extraction/selfProof.mjs";
import { FORBIDDEN_WORDING, SACRED_NON_CLAIM } from "../tools/simurgh-extraction/renderer.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3t";
const errors = [];
const sp = runExtractionSelfProof();
if (!sp.summary.all_passed) errors.push("self-proof failed");
if (sp.summary.intent_claims_rendered !== 0) errors.push("intent claim rendered");
async function walk(d) { const o=[]; for (const e of await readdir(d,{withFileTypes:true})){const p=join(d,e.name); if(e.isDirectory())o.push(...await walk(p)); else if((await stat(p)).isFile())o.push(p);} return o; }
for (const f of await walk(EV)) {
  const lower = (await readFile(f, "utf8")).toLowerCase();
  for (const w of FORBIDDEN_WORDING) if (lower.includes(w)) errors.push(`forbidden/named-lab wording in ${f}: ${w}`);
}
const att = JSON.parse(await readFile(join(EV, "result", "attestation.json"), "utf8"));
if (!att.rendered_summary.includes(SACRED_NON_CLAIM)) errors.push("sacred non-claim missing from attestation");
if (att.intent_claim_made !== false) errors.push("attestation made an intent claim");
if (errors.length) { console.error("stage3t security: FAIL", JSON.stringify(errors)); process.exit(1); }
console.log("stage3t security: PASS");
```

- [ ] **Step 2: Privacy audit (no raw tokens; provenance flags assert synthetic/offline)**

```js
// scripts/privacy-audit-llm-shield-stage3t.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
const EV = "docs/research/llm-shield/evidence/stage-3t";
const FORBIDDEN = ["BEGIN PRIVATE KEY", "raw_prompt", "raw_output", "raw_transcript", "ip_address", "api_key", "chain_of_thought_text"];
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
async function walk(d) { const o=[]; for (const e of await readdir(d,{withFileTypes:true})){const p=join(d,e.name); if(e.isDirectory())o.push(...await walk(p)); else if((await stat(p)).isFile())o.push(p);} return o; }
const findings = [];
for (const f of await walk(EV)) {
  const c = await readFile(f, "utf8");
  for (const t of FORBIDDEN) if (c.includes(t)) findings.push({ f, t });
  if (EMAIL_RE.test(c)) findings.push({ f, t: "email_like_value" });
}
const set = JSON.parse(await readFile(join(EV, "meta-set", "metadata-set.json"), "utf8"));
if (set.set_provenance !== "synthetic_reference" || set.live_traffic_used !== false || set.identity_data_used !== false || set.raw_content_used !== false)
  findings.push({ f: "metadata-set.json", t: "provenance_not_synthetic_offline" });
if (findings.length) { console.error("stage3t privacy: FAIL", JSON.stringify(findings)); process.exit(1); }
console.log("stage3t privacy: PASS");
```

Note: the `@` token guards against emails; confirm no evidence file legitimately contains `@` (the synthetic hashes and buckets do not). If a future file needs `@`, narrow the check to an email regex.

- [ ] **Step 3: Consistency audit (digest re-derives, result reproduces, signature verifies, family map matches)**

```js
// scripts/consistency-audit-llm-shield-stage3t.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { metaSetDigest } from "../tools/simurgh-extraction/metaSet.mjs";
import { familyMapDigest } from "../tools/simurgh-extraction/signalFamilies.mjs";
import { runDetector } from "../tools/simurgh-extraction/detector.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3t";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const errors = [];
const set = await rd("meta-set/metadata-set.json");
const cfg = await rd("meta-set/detector-config.json");
const att = await rd("result/attestation.json");
if (att.meta_set_digest !== metaSetDigest(set)) errors.push("meta_set_digest mismatch");
if (att.family_map_digest !== familyMapDigest()) errors.push("attestation family_map_digest mismatch");
if (cfg.family_map_digest !== familyMapDigest()) errors.push("config family_map_digest mismatch");
const result = runDetector(set);
const committed = await rd("result/expected-detector-result.json");
if (stable(result) !== stable(committed)) errors.push("detector result does not reproduce");
if (att.decision !== result.decision) errors.push("attestation/result decision mismatch");
if (errors.length) { console.error("stage3t consistency: FAIL", JSON.stringify(errors)); process.exit(1); }
console.log("stage3t consistency: PASS");
```

- [ ] **Step 4: Policy-drift guard (fail-closed, three-dot base)**

```bash
# scripts/policy-drift-guard-llm-shield-stage3t.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3T is tooling-only: assert NO src/llmShield change. Resolves a real base; if none
# resolves, FAIL CLOSED (CI uses fetch-depth:0 so a base is present).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
BASE=""
for ref in "${SIMURGH_POLICY_BASE_REF:-}" origin/main main HEAD^1 HEAD~1; do
  [ -z "$ref" ] && continue
  if git rev-parse --verify --quiet "${ref}^{commit}" >/dev/null 2>&1; then BASE="$ref"; break; fi
done
if [ -n "$BASE" ] && changed="$(git diff --name-only "${BASE}...HEAD" 2>/dev/null)"; then
  if grep -q '^src/llmShield/' <<<"$changed"; then
    echo "stage3t policy-drift: FAIL — src/llmShield changed in ${BASE}...HEAD"; exit 1
  fi
  echo "stage3t policy-drift: PASS (no src/llmShield change in ${BASE}...HEAD)"
else
  wt="$(git diff --name-only HEAD -- src/llmShield 2>/dev/null; git status --porcelain src/llmShield 2>/dev/null)"
  if grep -q 'src/llmShield' <<<"$wt"; then
    echo "stage3t policy-drift: FAIL — src/llmShield changed (working tree) and no base ref"; exit 1
  fi
  if [ "${CI:-}" = "true" ]; then
    echo "stage3t policy-drift: FAIL — no base ref resolved in CI (fail-closed)"; exit 1
  fi
  echo "stage3t policy-drift: WARN — no base ref resolved locally; verified on PR/post-merge CI"
fi
```

- [ ] **Step 5: Smoke script**

```bash
# scripts/smoke-llm-shield-stage3t.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3T smoke: offline, deterministic, verify-only (no gateway, no network).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
node tools/simurgh-extraction/simurgh-extraction.mjs build
node tools/simurgh-extraction/simurgh-extraction.mjs verify
node tools/simurgh-extraction/simurgh-extraction.mjs verify-hashes
node tools/simurgh-extraction/verify-stage3t-attestation.mjs --reproduce
bash scripts/policy-drift-guard-llm-shield-stage3t.sh
node scripts/privacy-audit-llm-shield-stage3t.mjs
node scripts/consistency-audit-llm-shield-stage3t.mjs
node scripts/security-audit-llm-shield-stage3t.mjs
echo "stage3t smoke: passed"
```

- [ ] **Step 6: Make scripts executable + run the smoke**

Run: `chmod +x scripts/smoke-llm-shield-stage3t.sh scripts/policy-drift-guard-llm-shield-stage3t.sh`
Run: `bash scripts/smoke-llm-shield-stage3t.sh` → ends `stage3t smoke: passed`.
Run with CI flag to mirror the gate: `CI=true bash scripts/smoke-llm-shield-stage3t.sh` → still passes (policy-drift resolves `origin/main`).

- [ ] **Step 7: Wire into check.sh (after the 3S helper-coverage step, before the 3E docker step)**

Insert after the `LLM Shield 3S narrative helper coverage` block (~line 1812):

```bash
step "LLM Shield 3T capability-extraction attestation"
if scripts/smoke-llm-shield-stage3t.sh > "$LOG_DIR/llm-shield-stage3t-smoke.log" 2>&1; then
  pass "LLM Shield 3T capability-extraction attestation"
else
  fail "LLM Shield 3T capability-extraction attestation"
  tail -80 "$LOG_DIR/llm-shield-stage3t-smoke.log"
fi

step "LLM Shield 3T extraction helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-extraction/metaSet.mjs \
  --test-coverage-include=tools/simurgh-extraction/signalFamilies.mjs \
  --test-coverage-include=tools/simurgh-extraction/detector.mjs \
  --test-coverage-include=tools/simurgh-extraction/renderer.mjs \
  --test-coverage-include=tools/simurgh-extraction/selfProof.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/extraction/metaSet.test.js \
  tests/unit/llmShield/extraction/signalFamilies.test.js \
  tests/unit/llmShield/extraction/detector.test.js \
  tests/unit/llmShield/extraction/renderer.test.js \
  tests/unit/llmShield/extraction/extractionSelfProof.test.js \
  > "$LOG_DIR/llm-shield-stage3t-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3T extraction helper coverage"
else
  fail "LLM Shield 3T extraction helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3t-helper-coverage.log"
fi
```

- [ ] **Step 8: Run the wired steps + commit**

Run (sanity, the two coverage commands and smoke as check.sh will): the helper-coverage command above → all five libs 100%.
Run: `npm run format` then re-run `node tools/simurgh-extraction/simurgh-extraction.mjs build` (confirm no drift; `build --update` + reformat if needed).

```bash
git add scripts/security-audit-llm-shield-stage3t.mjs scripts/privacy-audit-llm-shield-stage3t.mjs scripts/consistency-audit-llm-shield-stage3t.mjs scripts/policy-drift-guard-llm-shield-stage3t.sh scripts/smoke-llm-shield-stage3t.sh scripts/check.sh docs/research/llm-shield/evidence/stage-3t/
git commit -m "test(3t): audits, policy-drift guard, smoke, and check.sh wiring"
```

---

### Task 9: Docs + full-stage verify + finish

**Files:**
- Create: `docs/research/llm-shield/LLM_SHIELD_STAGE_3T_CAPABILITY_EXTRACTION_ATTESTATION.md`, `docs/research/llm-shield/STAGE_3T_CLOSEOUT.md`, `STAGE_3T_THREAT_MODEL.md`, `STAGE_3T_VALIDATION_MATRIX.md`, `STAGE_3T_REVIEWER_CHECKLIST.md`, `docs/research/llm-shield/evidence/stage-3t/README.md`

**Interfaces:** Documentation only.

- [ ] **Step 1: Write the stage docs**

Write the five docs + evidence README. The main doc leads with the crown sentence and the final sign-off sentence (both verbatim from the spec). The threat model states the reference threat vs attested claim split and the sacred non-claim. The validation matrix maps each invariant → enforcing test/script → observed artifact (mirror `STAGE_3S_VALIDATION_MATRIX.md` structure). The reviewer checklist includes the sacred non-claim line and "no named labs in evidence". The evidence README quotes the final sign-off sentence and lists the artifact files.

- [ ] **Step 2: Full-stage verification**

Run each and confirm green:
```bash
bash scripts/smoke-llm-shield-stage3t.sh
node tools/simurgh-extraction/verify-stage3t-attestation.mjs --reproduce
npm test
```
Expected: smoke passes; verify all-true + `detector_reproduces:true`; `npm test` shows the new extraction tests passing and the suite total increased (no regressions). Confirm the five pure libs report 100% function coverage via the Task 8 helper-coverage command.

- [ ] **Step 3: Prettier + tree-clean check**

Run: `npm run format` then `git status` — if prettier touched committed evidence JSON, re-run `node tools/simurgh-extraction/simurgh-extraction.mjs build --update`, `npm run format` again, re-sign only if `attestation.json` changed (it must not — signing changes nothing if canonical form is stable), and re-confirm `verify --reproduce`. Tree must be clean after a final build (committed evidence re-verifies).

- [ ] **Step 4: Commit docs**

```bash
git add docs/research/llm-shield/LLM_SHIELD_STAGE_3T_CAPABILITY_EXTRACTION_ATTESTATION.md docs/research/llm-shield/STAGE_3T_*.md docs/research/llm-shield/evidence/stage-3t/README.md
git commit -m "docs(3t): stage writeup, threat model, validation matrix, reviewer checklist"
```

- [ ] **Step 5: Finish the branch**

Announce and use **superpowers:finishing-a-development-branch** to push `main-stage-3t-offline-capability-extraction-attestation`, open the PR (neutral body covering crown sentence, tooling-only scope, falsifiability model, dual-family wall, benign-silence self-proof, evidence binding, two-tier verifier, and verification results), and await merge. After merge: tag `v2.3.0-stage-3t-offline-capability-extraction-attestation`, write the release, add the memory entry, clean up the branch.

---

## Self-Review

**1. Spec coverage:**
- Crown + final sign-off sentence → Task 9 docs. ✔
- Offline/tooling-only/policy-drift → Task 8 guard + Global Constraints. ✔
- Metadata-only wall + provenance flags → Task 1 validation + Task 8 privacy audit. ✔
- Non-claim wall + sacred sentence + no named labs → Task 4 renderer + Task 8 security audit + invariant 5a. ✔
- Frozen total decision function + threshold in identity → Task 3 + `detector-config.json` (Task 6) + `threshold-version-lock` fixture (Task 5). ✔
- Distinct-FAMILY counting + deep-frozen map + FAMILY_ORDER → Task 2. ✔
- Benign-silence self-proof + duplicate-run-id + counters → Task 5. ✔
- Order-independent digest determinism → Task 1 test + Task 3 reproduction fixture. ✔
- Dedicated Ed25519 key (public only committed) → Task 7. ✔
- Two-tier verifier (portable + --reproduce) → Task 7. ✔
- Evidence layout → Tasks 6/7. ✔
- Audits + smoke + check.sh + helper-coverage → Task 8. ✔
- Tag v2.3.0 → Task 9. ✔

**2. Placeholder scan:** `detector-config.json` ships `family_map_digest: "PLACEHOLDER_FILLED_BY_BUILD"`, which is intentionally overwritten by `build --update` in Task 6 Step 5 (and asserted by the consistency audit). No other placeholders.

**3. Type consistency:** `runDetector` result fields (`detector_id`, `meta_set_digest`, `matched`, `matched_families`, `distinct_family_count`, `decision`, `attestation_claim`, `non_claims`) are consumed identically by `buildAttestation` (Task 6), the verifier (Task 7), and audits (Task 8). `verifyExtraction({attestation, sidecar, publicKeyPem, detectorConfig})` signature matches its test call (Task 7 Step 5). `runExtractionSelfProof()` summary keys match the test (Task 5) and security audit (Task 8). `familyMapDigest()`/`metaSetDigest()` return the `sha256:`-prefixed form everywhere.
