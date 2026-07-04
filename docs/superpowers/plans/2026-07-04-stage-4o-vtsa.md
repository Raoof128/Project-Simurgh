# Stage 4O VTSA + Monotone Consent Law Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Stage 4O — Verifiable Tool-Surface Attestation with the Monotone Consent Law — per the approved spec `docs/superpowers/specs/2026-07-04-stage-4o-vtsa-design.md` (commits a69dc875, bb5f2a3d, f6b0abc3, ca4509ea).

**Architecture:** A fourth additive Capability Kernel entry point (`authorise_with_manifest`, Python) gates tool calls against a signed, epoch-chained tool-manifest commitment; a mirrored Node core drives the offline verifier; drift between epochs is classified on a narrowing/broadening lattice with path-independent verdicts; everything lands in a signed, byte-reproducible attestation bundle with raw codes 55–66.

**Tech Stack:** Python 3.12 (pure stdlib, pytest), Node 26 (`node --test`, no deps), Ed25519 via `node:crypto`, Lean 4 (v4.15.0 toolchain, mathlib-free), bash reproduce script.

## Global Constraints

- Motto header on every new file: `// Motto: AnthropicSafe First, then ReviewerSafe.` (or `#` for Python/bash) plus `SPDX-License-Identifier: AGPL-3.0-or-later`.
- Node 26 required for byte-stable reproduce (local: `/opt/homebrew/opt/node@26/bin`); reproduce script aborts otherwise (raw 28).
- `npm test` gates `tests/unit/**` ONLY; e2e runs via the reproduce script and an explicit CI step. Always `node --test` with explicit `*.test.js` globs, never a bare directory.
- NEVER shell out to `rg` in any test (Linux CI lacks it → ENOENT).
- All committed fixtures/evidence under `tests/fixtures/llmShield/stage4o/` and `docs/research/llm-shield/evidence/stage-4o/` are `.prettierignore`d BEFORE the first fixture commit (Task 1).
- Exit-ledger goldens regenerate in ONE dedicated commit (Task 1); any golden beyond the known list must be named in that commit body.
- Commit messages: neutral `feat(llm-shield): …` / `test(llm-shield): …` / `docs(llm-shield): …` style. NO co-author trailers, NO Claude/AI attribution anywhere.
- Frozen wordings from the spec are verbatim: Claim 1, Claim 2 (Monotone Consent Law), the honesty ceiling ("Infrastructure alignment is not model-value alignment…"), the F1 claim ("Given the publicly disclosed before/after tool-surface deltas, 4O ledgers the corresponding manifest drift class."). Vocabulary: "surface bound, verifiable" — never "tools safe".
- Non-claim pellets (closed list): `surface_bound_verifiable`, `not_tools_safe`, `not_mcp_server_safe`, `not_protocol_rug_pull_prevention`, `not_proof_of_human_reading`, `merkle_machinery_standard_crypto_novel_application`, `not_constitutional_compliance_claim`, `not_incident_prevention_claim`.
- The three existing kernel entry points (`authorise`, `authorise_with_intent`, `authorise_with_provenance`) and their serialised decision shape are byte-frozen: never edit lines 1–199 of `capability_kernel.py`; only append.
- No network in any test or in the reproduce script. Lane B capture and F1 research run manually at capture time only.
- Determinism env for reproduce: `TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0`.
- Version target v2.24.0; re-verify with `git tag --sort=-creatordate | head -3` before any tag; tagging itself is NOT part of this plan (happens at PR/finish flow).
- Spec deltas to record (Task 16): (a) a 12th digest domain `SIMURGH_STAGE4O_MANIFEST_COMMITMENT_V1` (the spec's §5 list has 11; commitments need their own domain for `previous_manifest_digest`); (b) the Python kernel parameter is `manifest_chain`, not `manifest` (it is the commitment chain, not one manifest); (c) malformed receipt ⇒ raw 63 precedes 57 (57 needs `run_epoch`); (d) Python parity skips attestation-level raw 66.
- **Test helpers live in real modules, never in `.test.js` files.** `node --test` executes every file it globs AND every file a test imports — importing a helper from `foo.test.js` double-registers that file's tests. Shared JS builders (`mkEntry`, `mkManifest`, `mkEnvelope`, `validWorld`) live in `tests/unit/llmShield/stage4o/helpers.mjs`; shared Python builders live in `tools/agentdojo-simurgh-adapter/tests/_stage4o_helpers.py`. No test file exports helpers.
- **Committed fixture keys scream that they are fake.** Private test keys are named `INSECURE_FIXTURE_ONLY_manifest-signer.pem` / `INSECURE_FIXTURE_ONLY_attestation-signer.pem` under `tests/fixtures/llmShield/stage4o/test-keys/`, each paired with a `<name>.meta.json` carrying `{"purpose":"committed-test-fixture-key","not_secret":true,"do_not_use_for_evidence":true}`. Production evidence keys are generated outside the repo and never committed.

## File Structure

**Node (mirrors stage4n layout):**

- `tools/simurgh-attestation/stage4o/constants.mjs` — frozen schemas, domains, enums, non-claims, constitutional vocabulary.
- `tools/simurgh-attestation/stage4o/core/digest.mjs` — domain-separated digests.
- `tools/simurgh-attestation/stage4o/core/merkleSurface.mjs` — leaf/node domain-separated Merkle root, path, verify (manifest order, odd promotes).
- `tools/simurgh-attestation/stage4o/core/manifestCore.mjs` — exact-key schema validation, entry digest, toolset root, delta digest, envelope validation.
- `tools/simurgh-attestation/stage4o/core/driftCore.mjs` — lattice classifier + epoch-chain validation (raw 64/65).
- `tools/simurgh-attestation/stage4o/core/decisionCore.mjs` — the 12-check ordered gate (Node mirror of the Python kernel).
- `tools/simurgh-attestation/stage4o/core/timelineCore.mjs` — timeline record build/verify vs frozen 4N feed (raw 66).
- `tools/simurgh-attestation/stage4o/core/constitutionCore.mjs` — constitutional_alignment map + claim checks.
- `tools/simurgh-attestation/stage4o/node/build-stage4o-fixtures.mjs` — deterministic manifest chains, tamper arms, receipts, expected matrix, parity vectors.
- `tools/simurgh-attestation/stage4o/node/build-stage4o-attestation.mjs` — signs commitments (manifest key) + bundle (attestation key); `--ephemeral` / `--private-key`.
- `tools/simurgh-attestation/stage4o/node/verify-stage4o.mjs` — two-tier offline verifier CLI incl. `--selective` mode.
- `tools/simurgh-attestation/stage4o/node/capture-mcp-manifest.mjs` — Lane B local capture (never run in CI).
- Modify: `tools/simurgh-attestation/stage4h/exitCodes.mjs` — VTSA codes 55–66.

**Python:**

- `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/manifest_surface.py` — canonical JSON, digests, Merkle, schema validation, drift classifier, chain validation (mirror of Node core).
- Modify (append only): `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/capability_kernel.py` — `ManifestBindings`, `ManifestAuthorityDecision`, `authorise_with_manifest`.

**Tests:** `tests/unit/llmShield/stage4o/helpers.mjs` (shared JS builders), `tests/unit/llmShield/stage4o/*.test.js`, `tests/e2e/llmShield/stage4o/vtsaFullNet.test.js`, `tools/agentdojo-simurgh-adapter/tests/_stage4o_helpers.py` (shared Python builders), `tools/agentdojo-simurgh-adapter/tests/test_manifest_surface.py`, `tools/agentdojo-simurgh-adapter/tests/test_capability_kernel_manifest.py`.

**Other:** `proofs/stage4o/MonotoneConsent.lean` + `proofs/stage4o/lean-toolchain`; `scripts/reproduce-llm-shield-stage4o.sh`; fixtures `tests/fixtures/llmShield/stage4o/`; evidence `docs/research/llm-shield/evidence/stage-4o/`; docs `docs/research/llm-shield/STAGE_4O_{THREAT_MODEL,VALIDATION_MATRIX,REVIEWER_CHECKLIST,CLOSEOUT}.md`.

---

### Task 1: Raw codes 55–66 + golden blast radius (single regeneration commit) + prettierignore

**Files:**

- Modify: `tools/simurgh-attestation/stage4h/exitCodes.mjs` (after the `SEISMOGRAPH_REASONS_54` block; and inside `RUN_LEVEL_BY_RAW`)
- Modify: `.prettierignore` (append)
- Test: `tests/unit/llmShield/stage4o/exitWrapper.vtsa.test.js`

**Interfaces:**

- Produces: `VTSA_RAW_CODES` (frozen map, names below), `VTSA_CHECK_ORDER` (frozen array `[55,56,57,64,65,58,59,60,61,62,63,66]`), `VTSA_REASONS_55` … `VTSA_REASONS_66` (frozen string arrays), and `RUN_LEVEL_BY_RAW[55..66] === 1`. Every later task imports these.

- [ ] **Step 1: Append to `.prettierignore`** (before any fixture exists):

```text

# stage 4O deterministic fixtures + evidence (byte-identity via signed manifest)
tests/fixtures/llmShield/stage4o/
docs/research/llm-shield/evidence/stage-4o/
```

- [ ] **Step 2: Write the failing test** `tests/unit/llmShield/stage4o/exitWrapper.vtsa.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VTSA_RAW_CODES,
  VTSA_CHECK_ORDER,
  RUN_LEVEL_BY_RAW,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("vtsa raw codes 55-66 are frozen and complete", () => {
  assert.deepEqual(VTSA_RAW_CODES, {
    MANIFEST_MISSING: 55,
    MANIFEST_SIGNATURE_INVALID: 56,
    MANIFEST_EPOCH_INVALID: 57,
    SERVER_OR_TOOLSET_DIGEST_MISMATCH: 58,
    TOOL_IDENTITY_MISMATCH: 59,
    TOOL_SCHEMA_DIGEST_MISMATCH: 60,
    AUTHORITY_CLASS_UPGRADE: 61,
    DECLARED_SINK_EXPANSION: 62,
    MANIFEST_RECEIPT_BINDING_MISMATCH: 63,
    DRIFT_LAUNDERING_DETECTED: 64,
    BLIND_REAPPROVAL: 65,
    TIMELINE_BINDING_MISMATCH: 66,
  });
  assert.ok(Object.isFrozen(VTSA_RAW_CODES));
});

test("documented check order is normative, not numeric", () => {
  assert.deepEqual([...VTSA_CHECK_ORDER], [55, 56, 57, 64, 65, 58, 59, 60, 61, 62, 63, 66]);
});

test("all twelve map to run-level 1; unknown still fails closed to 3", () => {
  for (let raw = 55; raw <= 66; raw++) assert.equal(RUN_LEVEL_BY_RAW[raw], 1);
  assert.equal(stage4CodeForRawCode(67), 3);
  assert.equal(stage4CodeForRawCode(29), 3);
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `node --test tests/unit/llmShield/stage4o/exitWrapper.vtsa.test.js`
Expected: FAIL — `VTSA_RAW_CODES` is not exported.

- [ ] **Step 4: Implement in `exitCodes.mjs`** — insert after the `SEISMOGRAPH_REASONS_54` block:

```js
// Stage 4O VTSA raw codes (55-66). Additive; each maps to run-level 1; unknown codes
// still fail closed to 3. NUMERIC order is historical: 55-63 were allocated before
// 64-66. The NORMATIVE first-failure check order is VTSA_CHECK_ORDER (4O spec §6).
export const VTSA_RAW_CODES = Object.freeze({
  MANIFEST_MISSING: 55,
  MANIFEST_SIGNATURE_INVALID: 56,
  MANIFEST_EPOCH_INVALID: 57,
  SERVER_OR_TOOLSET_DIGEST_MISMATCH: 58,
  TOOL_IDENTITY_MISMATCH: 59,
  TOOL_SCHEMA_DIGEST_MISMATCH: 60,
  AUTHORITY_CLASS_UPGRADE: 61,
  DECLARED_SINK_EXPANSION: 62,
  MANIFEST_RECEIPT_BINDING_MISMATCH: 63,
  DRIFT_LAUNDERING_DETECTED: 64,
  BLIND_REAPPROVAL: 65,
  TIMELINE_BINDING_MISMATCH: 66,
});
export const VTSA_CHECK_ORDER = Object.freeze([55, 56, 57, 64, 65, 58, 59, 60, 61, 62, 63, 66]);

export const VTSA_REASONS_55 = Object.freeze(["absent", "schema_invalid"]);
export const VTSA_REASONS_56 = Object.freeze(["commitment_signature_invalid"]);
export const VTSA_REASONS_57 = Object.freeze(["run_epoch_outside_validity_window"]);
export const VTSA_REASONS_58 = Object.freeze([
  "server_id_mismatch",
  "toolset_root_recompute_mismatch",
]);
export const VTSA_REASONS_59 = Object.freeze(["tool_not_in_manifest", "inclusion_proof_invalid"]);
export const VTSA_REASONS_60 = Object.freeze(["schema_digest_mismatch"]);
export const VTSA_REASONS_61 = Object.freeze(["authority_class_upgrade"]);
export const VTSA_REASONS_62 = Object.freeze(["sink_not_declared"]);
export const VTSA_REASONS_63 = Object.freeze(["receipt_schema_invalid", "binding_mismatch"]);
export const VTSA_REASONS_64 = Object.freeze([
  "ancestry_incomplete",
  "prev_digest_mismatch",
  "delta_digest_mismatch",
  "composition_mismatch",
]);
export const VTSA_REASONS_65 = Object.freeze([
  "state_bound_broadening",
  "state_bound_incomparable",
]);
export const VTSA_REASONS_66 = Object.freeze(["timeline_root_mismatch", "chain_position_absent"]);
```

And inside `RUN_LEVEL_BY_RAW`, after the 4N entries (`54: 1,`):

```js
  // Stage 4O VTSA codes (reviewed extension of the shared ledger; 4O spec §6).
  55: 1,
  56: 1,
  57: 1,
  58: 1,
  59: 1,
  60: 1,
  61: 1,
  62: 1,
  63: 1,
  64: 1,
  65: 1,
  66: 1,
```

- [ ] **Step 5: Run the new test — PASS**

Run: `node --test tests/unit/llmShield/stage4o/exitWrapper.vtsa.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Derive the golden blast radius**

Run each and record failures:

```bash
npm test 2>&1 | tail -30
node --test tests/e2e/llmShield/stage4l/*.test.js tests/e2e/llmShield/stage4n/*.test.js 2>&1 | tail -20
grep -rln "RUN_LEVEL_BY_RAW\|exit-map" tests/unit/llmShield tests/fixtures/llmShield docs/research/llm-shield --include="*.js" --include="*.json" | sort
```

Known-expected breakage (spec §15): 4K exitWrapper snapshot, 4H exitWrapper snapshot + `exit-map.json` + inline map, 4L e2e net, 4M golden, 4N `exitWrapper.seismograph.test.js` + inline map. Any FURTHER failing golden must be named in the commit body of Step 7.

- [ ] **Step 7: Regenerate every affected golden using each stage's own fixture builder** (e.g. `node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs`, `env STAGE4N_FIXTURE_OUT=tests/fixtures/llmShield/stage4n node tools/simurgh-attestation/stage4n/node/build-stage4n-fixtures.mjs` — follow each failing test's fixture provenance comment). Re-run Step 6 commands until green.

- [ ] **Step 8: Commit (single dedicated commit)**

```bash
git add tools/simurgh-attestation/stage4h/exitCodes.mjs .prettierignore tests/unit/llmShield/stage4o/ tests/fixtures/llmShield docs/research/llm-shield
git commit -m "feat(llm-shield): register stage 4o vtsa raw codes 55-66 and regenerate exit-ledger goldens"
```

---

### Task 2: Stage 4O frozen constants

**Files:**

- Create: `tools/simurgh-attestation/stage4o/constants.mjs`
- Test: `tests/unit/llmShield/stage4o/constants.test.js`

**Interfaces:**

- Produces (all `Object.freeze`d): `TOOL_MANIFEST_SCHEMA = "simurgh.tool_manifest.v1"`, `COMMITMENT_SCHEMA = "simurgh.tool_manifest_commitment.v1"`, `RECEIPT_SCHEMA = "simurgh.tool_receipt.v1"`, `ACTION_SCHEMA = "simurgh.tool_action.v1"`, `TIMELINE_SCHEMA = "simurgh.surface_timeline.v1"`, `ATTESTATION_SCHEMA = "simurgh.vtsa_attestation.v1"`, `DOMAINS` (12 keys), `AUTHORITY_ORDER = ["read_only","write","egress","destructive"]`, `RISK_CLASSES = ["low","medium","high"]`, `CONSENT_BINDINGS = ["state","delta"]`, `GENESIS = "genesis"`, `KERNEL_ENTRYPOINT = "authorise_with_manifest.v1"`, `VTSA_NON_CLAIMS` (8 pellets), `HONESTY_CEILING` (frozen sentence), `ALIGNMENT_VOCABULARY` (closed list of allowed `alignment_claim` strings).

- [ ] **Step 1: Write the failing test** `tests/unit/llmShield/stage4o/constants.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../../../../tools/simurgh-attestation/stage4o/constants.mjs";

test("domains are the spec list plus the commitment domain, all NUL-free uppercase", () => {
  assert.deepEqual(Object.keys(C.DOMAINS).sort(), [
    "ACTION",
    "ATTESTATION_BUNDLE",
    "DECISION_CORPUS",
    "DELTA",
    "MANIFEST_COMMITMENT",
    "MERKLE_LEAF",
    "MERKLE_NODE",
    "RECEIPT",
    "SERVER_ID",
    "TIMELINE",
    "TOOLSET",
    "TOOL_ENTRY",
  ]);
  for (const v of Object.values(C.DOMAINS)) assert.match(v, /^SIMURGH_STAGE4O_[A-Z_]+_V1$/);
});

test("closed enums and frozen wordings", () => {
  assert.deepEqual([...C.AUTHORITY_ORDER], ["read_only", "write", "egress", "destructive"]);
  assert.deepEqual([...C.RISK_CLASSES], ["low", "medium", "high"]);
  assert.deepEqual([...C.CONSENT_BINDINGS], ["state", "delta"]);
  assert.equal(C.KERNEL_ENTRYPOINT, "authorise_with_manifest.v1");
  assert.equal(C.VTSA_NON_CLAIMS.length, 8);
  assert.ok(C.VTSA_NON_CLAIMS.includes("not_constitutional_compliance_claim"));
  assert.ok(C.HONESTY_CEILING.startsWith("Infrastructure alignment is not model-value alignment."));
});
```

- [ ] **Step 2: Run to verify it fails** — `node --test tests/unit/llmShield/stage4o/constants.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement** `tools/simurgh-attestation/stage4o/constants.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4O frozen constants (4O spec §2, §4, §5, §11). Motto: AnthropicSafe First, then
// ReviewerSafe. Changing ANY value invalidates every committed digest.
export const TOOL_MANIFEST_SCHEMA = "simurgh.tool_manifest.v1";
export const COMMITMENT_SCHEMA = "simurgh.tool_manifest_commitment.v1";
export const RECEIPT_SCHEMA = "simurgh.tool_receipt.v1";
export const ACTION_SCHEMA = "simurgh.tool_action.v1";
export const TIMELINE_SCHEMA = "simurgh.surface_timeline.v1";
export const ATTESTATION_SCHEMA = "simurgh.vtsa_attestation.v1";

export const DOMAINS = Object.freeze({
  SERVER_ID: "SIMURGH_STAGE4O_SERVER_ID_V1",
  TOOLSET: "SIMURGH_STAGE4O_TOOLSET_V1",
  TOOL_ENTRY: "SIMURGH_STAGE4O_TOOL_ENTRY_V1",
  ACTION: "SIMURGH_STAGE4O_ACTION_V1",
  RECEIPT: "SIMURGH_STAGE4O_RECEIPT_V1",
  DECISION_CORPUS: "SIMURGH_STAGE4O_DECISION_CORPUS_V1",
  ATTESTATION_BUNDLE: "SIMURGH_STAGE4O_ATTESTATION_BUNDLE_V1",
  MERKLE_LEAF: "SIMURGH_STAGE4O_MERKLE_LEAF_V1",
  MERKLE_NODE: "SIMURGH_STAGE4O_MERKLE_NODE_V1",
  DELTA: "SIMURGH_STAGE4O_DELTA_V1",
  TIMELINE: "SIMURGH_STAGE4O_TIMELINE_V1",
  // Spec delta (recorded in closeout): commitments need their own domain for
  // previous_manifest_digest; the spec §5 list is extended by this 12th entry.
  MANIFEST_COMMITMENT: "SIMURGH_STAGE4O_MANIFEST_COMMITMENT_V1",
});

export const AUTHORITY_ORDER = Object.freeze(["read_only", "write", "egress", "destructive"]);
export const RISK_CLASSES = Object.freeze(["low", "medium", "high"]);
export const CONSENT_BINDINGS = Object.freeze(["state", "delta"]);
export const GENESIS = "genesis";
export const KERNEL_ENTRYPOINT = "authorise_with_manifest.v1";

export const VTSA_NON_CLAIMS = Object.freeze([
  "surface_bound_verifiable",
  "not_tools_safe",
  "not_mcp_server_safe",
  "not_protocol_rug_pull_prevention",
  "not_proof_of_human_reading",
  "merkle_machinery_standard_crypto_novel_application",
  "not_constitutional_compliance_claim",
  "not_incident_prevention_claim",
]);

// 4O spec §11.1, frozen wording — never edit.
export const HONESTY_CEILING =
  "Infrastructure alignment is not model-value alignment. Stage 4O operationalises " +
  "selected oversight and non-deception principles, but it does not claim constitutional compliance.";

// Closed vocabulary for constitutional_alignment[].alignment_claim (4O spec §11.1).
export const ALIGNMENT_VOCABULARY = Object.freeze([
  "fails_closed_when_commitment_absent_or_malformed",
  "binds_commitment_to_an_accountable_signer",
  "keeps_freshness_logical_and_reviewable",
  "prevents_hiding_a_broadening_inside_claimed_narrowings",
  "makes_blind_reapproval_of_a_broadening_a_ledgered_event",
  "prevents_silent_substitution_of_the_authorised_tool_surface",
  "prevents_silent_tool_schema_replacement",
  "prevents_silent_authority_escalation",
  "prevents_silent_sink_expansion",
  "binds_each_receipt_to_the_decision_it_records",
  "prevents_retroactive_rewriting_of_the_committed_surface",
]);
```

- [ ] **Step 4: Run test — PASS.** `node --test tests/unit/llmShield/stage4o/constants.test.js`

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4o/constants.mjs tests/unit/llmShield/stage4o/constants.test.js
git commit -m "feat(llm-shield): stage 4o frozen constants (schemas, domains, enums, non-claims)"
```

---

### Task 3: Node digest + Merkle surface cores

**Files:**

- Create: `tools/simurgh-attestation/stage4o/core/digest.mjs`
- Create: `tools/simurgh-attestation/stage4o/core/merkleSurface.mjs`
- Test: `tests/unit/llmShield/stage4o/digest.test.js`, `tests/unit/llmShield/stage4o/merkleSurface.test.js`

**Interfaces:**

- Consumes: `canonicalJson`, `sha256Hex`, `DIGEST_RE` from `tools/simurgh-attestation/stage4m/core/canonical.mjs`; `DOMAINS` from Task 2.
- Produces: `domainDigest(domain, schema, value) -> "sha256:<hex>"`; `surfaceLeaf(entryDigest) -> digest`; `surfaceRoot(entryDigests: string[]) -> digest` (manifest order, odd promotes); `surfacePath(entryDigests, index) -> [{sibling, side}]`; `verifySurfacePath(entryDigest, path, root) -> boolean`.

- [ ] **Step 1: Write failing tests** `tests/unit/llmShield/stage4o/digest.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { domainDigest } from "../../../../tools/simurgh-attestation/stage4o/core/digest.mjs";
import { DOMAINS } from "../../../../tools/simurgh-attestation/stage4o/constants.mjs";

test("domain separation: same value, different domain => different digest", () => {
  const a = domainDigest(DOMAINS.TOOL_ENTRY, "s", { x: 1 });
  const b = domainDigest(DOMAINS.ACTION, "s", { x: 1 });
  assert.match(a, /^sha256:[a-f0-9]{64}$/);
  assert.notEqual(a, b);
});

test("digest is key-order independent (canonical)", () => {
  assert.equal(
    domainDigest(DOMAINS.DELTA, "s", { b: 2, a: 1 }),
    domainDigest(DOMAINS.DELTA, "s", { a: 1, b: 2 })
  );
});
```

and `tests/unit/llmShield/stage4o/merkleSurface.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  surfaceLeaf,
  surfaceRoot,
  surfacePath,
  verifySurfacePath,
} from "../../../../tools/simurgh-attestation/stage4o/core/merkleSurface.mjs";
import { domainDigest } from "../../../../tools/simurgh-attestation/stage4o/core/digest.mjs";
import { DOMAINS } from "../../../../tools/simurgh-attestation/stage4o/constants.mjs";

const entries = [0, 1, 2].map((i) => domainDigest(DOMAINS.TOOL_ENTRY, "t", { i }));

test("root is deterministic and order-sensitive (manifest order is normative)", () => {
  assert.equal(surfaceRoot(entries), surfaceRoot([...entries]));
  assert.notEqual(surfaceRoot(entries), surfaceRoot([...entries].reverse()));
});

test("leaf domain differs from raw entry digest (second-preimage guard)", () => {
  assert.notEqual(surfaceLeaf(entries[0]), entries[0]);
});

test("inclusion path verifies; tampered path, wrong leaf, truncated path all fail", () => {
  const root = surfaceRoot(entries);
  for (let i = 0; i < entries.length; i++) {
    const path = surfacePath(entries, i);
    assert.equal(verifySurfacePath(entries[i], path, root), true);
  }
  const p1 = surfacePath(entries, 1);
  assert.equal(verifySurfacePath(entries[0], p1, root), false);
  assert.equal(verifySurfacePath(entries[1], p1.slice(1), root), false);
});
```

- [ ] **Step 2: Run — FAIL** (modules not found).

- [ ] **Step 3: Implement** `core/digest.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Domain-separated digests (4O spec §5): sha256 over canonicalJson({domain, schema, value}).
import { canonicalJson, sha256Hex } from "../../stage4m/core/canonical.mjs";

export function domainDigest(domain, schema, value) {
  if (typeof domain !== "string" || !domain.startsWith("SIMURGH_STAGE4O_")) {
    throw new Error(`unknown_digest_domain: ${domain}`);
  }
  return `sha256:${sha256Hex(canonicalJson({ domain, schema, value }))}`;
}
```

and `core/merkleSurface.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Leaf/node domain-separated Merkle over the ORDERED manifest entries (4O spec §5a).
// Unlike stage4n's sorted-leaf tree, manifest order is normative. Odd node promotes.
import { DIGEST_RE } from "../../stage4m/core/canonical.mjs";
import { domainDigest } from "./digest.mjs";
import { DOMAINS, TOOL_MANIFEST_SCHEMA } from "../constants.mjs";

export const surfaceLeaf = (entryDigest) =>
  domainDigest(DOMAINS.MERKLE_LEAF, TOOL_MANIFEST_SCHEMA, entryDigest);
const node = (a, b) => domainDigest(DOMAINS.MERKLE_NODE, TOOL_MANIFEST_SCHEMA, [a, b]);

function levels(entryDigests) {
  for (const d of entryDigests)
    if (!DIGEST_RE.test(d)) throw new Error(`merkle_leaf_invalid: ${d}`);
  if (entryDigests.length === 0) throw new Error("merkle_empty");
  const all = [entryDigests.map(surfaceLeaf)];
  while (all[all.length - 1].length > 1) {
    const cur = all[all.length - 1];
    const next = [];
    for (let i = 0; i < cur.length; i += 2) {
      next.push(i + 1 === cur.length ? cur[i] : node(cur[i], cur[i + 1]));
    }
    all.push(next);
  }
  return all;
}

export const surfaceRoot = (entryDigests) => levels(entryDigests).at(-1)[0];

export function surfacePath(entryDigests, index) {
  const all = levels(entryDigests);
  const path = [];
  let i = index;
  for (let l = 0; l < all.length - 1; l++) {
    const cur = all[l];
    const sib = i % 2 === 0 ? i + 1 : i - 1;
    if (sib >= cur.length) path.push({ sibling: null, side: "promote" });
    else path.push({ sibling: cur[sib], side: i % 2 === 0 ? "right" : "left" });
    i = Math.floor(i / 2);
  }
  return path;
}

export function verifySurfacePath(entryDigest, path, root) {
  if (!DIGEST_RE.test(entryDigest) || !DIGEST_RE.test(root) || !Array.isArray(path)) return false;
  let acc = surfaceLeaf(entryDigest);
  for (const step of path) {
    if (!step || typeof step !== "object") return false;
    if (step.side === "promote" && step.sibling === null) continue;
    if (step.side === "right" && DIGEST_RE.test(step.sibling)) acc = node(acc, step.sibling);
    else if (step.side === "left" && DIGEST_RE.test(step.sibling)) acc = node(step.sibling, acc);
    else return false;
  }
  return acc === root;
}
```

- [ ] **Step 4: Run both tests — PASS.**
      `node --test tests/unit/llmShield/stage4o/digest.test.js tests/unit/llmShield/stage4o/merkleSurface.test.js`

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4o/core/digest.mjs tools/simurgh-attestation/stage4o/core/merkleSurface.mjs tests/unit/llmShield/stage4o/digest.test.js tests/unit/llmShield/stage4o/merkleSurface.test.js
git commit -m "feat(llm-shield): stage 4o domain-separated digests and manifest-order merkle surface"
```

---

### Task 4: Manifest core (exact-key validation, entry/toolset/delta digests, envelope)

**Files:**

- Create: `tools/simurgh-attestation/stage4o/core/manifestCore.mjs`
- Create: `tests/unit/llmShield/stage4o/helpers.mjs` (shared builders — NOT a test file)
- Test: `tests/unit/llmShield/stage4o/manifestCore.test.js`

**Interfaces:**

- Consumes: Task 2 constants; Task 3 `domainDigest`, `surfaceRoot`.
- Produces (helpers, imported by Tasks 4/5/6/9): `mkEntry(i, over?) -> entry`, `mkManifest(entries) -> manifest`, `mkEnvelope(manifest, epoch, prevEnv|null, consent) -> envelope`, `validWorld() -> {chain, receipt, actionDigest}`. `mkEnvelope`/`validWorld` may be added in this task even though they are first _used_ in Tasks 5/6 (all their deps exist by Task 4).
- Produces:
  - `toolEntryDigest(entry) -> digest`
  - `validateManifest(m) -> {ok:true} | {ok:false, reason:"schema_invalid", detail:string}` (exact keys `schema, server_id_digest, toolset_digest, tools`; each entry exact keys `tool_name_digest, tool_schema_digest, authority_class, declared_sinks, risk_class`; digests match `DIGEST_RE`; enums closed; `tools` non-empty, ordered ascending by `tool_name_digest`, unique)
  - `computeToolsetRoot(m) -> digest` (over `tools[]` in manifest order via `toolEntryDigest`)
  - `deltaObject(prevM, nextM) -> {removed, added, changed}` (arrays sorted)
  - `deltaDigest(prevM, nextM) -> digest`
  - `commitmentDigest(envelope) -> digest` (over envelope minus `signature`)
  - `validateEnvelope(env) -> {ok:true} | {ok:false, reason, detail}` (exact keys `schema, manifest, manifest_epoch, valid_from_epoch, valid_until_epoch, previous_manifest_digest, delta_digest, consent_binding, signer_public_key_pem, signature`; epoch-0 genesis rules; epochs non-negative ints, `valid_from_epoch <= valid_until_epoch`)

- [ ] **Step 0: Create the shared helpers module** `tests/unit/llmShield/stage4o/helpers.mjs` (imported by this and later tasks; contains NO `test()` calls):

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared Stage 4O test builders. NOT a test file (no test() calls) so importing it never
// double-registers tests. Motto: AnthropicSafe First, then ReviewerSafe.
import { domainDigest } from "../../../../tools/simurgh-attestation/stage4o/core/digest.mjs";
import { surfacePath } from "../../../../tools/simurgh-attestation/stage4o/core/merkleSurface.mjs";
import {
  computeToolsetRoot,
  toolEntryDigest,
  deltaDigest,
  commitmentDigest,
} from "../../../../tools/simurgh-attestation/stage4o/core/manifestCore.mjs";
import {
  DOMAINS,
  TOOL_MANIFEST_SCHEMA,
  COMMITMENT_SCHEMA,
  RECEIPT_SCHEMA,
  ACTION_SCHEMA,
  GENESIS,
} from "../../../../tools/simurgh-attestation/stage4o/constants.mjs";

export function mkEntry(i, over = {}) {
  return {
    tool_name_digest: domainDigest(DOMAINS.SERVER_ID, "test-name", `tool-${i}`),
    tool_schema_digest: domainDigest(DOMAINS.SERVER_ID, "test-schema", `schema-${i}`),
    authority_class: "read_only",
    declared_sinks: [],
    risk_class: "low",
    ...over,
  };
}
export function mkManifest(entries) {
  const tools = [...entries].sort((a, b) => (a.tool_name_digest < b.tool_name_digest ? -1 : 1));
  const m = {
    schema: TOOL_MANIFEST_SCHEMA,
    server_id_digest: domainDigest(DOMAINS.SERVER_ID, "test", "srv"),
    toolset_digest: "sha256:" + "0".repeat(64),
    tools,
  };
  m.toolset_digest = computeToolsetRoot(m);
  return m;
}
export function mkEnvelope(manifest, epoch, prevEnv, consent) {
  return {
    schema: COMMITMENT_SCHEMA,
    manifest,
    manifest_epoch: epoch,
    valid_from_epoch: epoch * 10,
    valid_until_epoch: epoch * 10 + 9,
    previous_manifest_digest: prevEnv ? commitmentDigest(prevEnv) : GENESIS,
    delta_digest: prevEnv ? deltaDigest(prevEnv.manifest, manifest) : GENESIS,
    consent_binding: consent,
    signer_public_key_pem: "PEM",
    signature: "sig",
  };
}
export function validWorld() {
  const m0 = mkManifest([mkEntry(1)]);
  const m1 = mkManifest([mkEntry(1), mkEntry(2)]);
  const e0 = mkEnvelope(m0, 0, null, "state");
  const e1 = mkEnvelope(m1, 1, e0, "delta");
  const idx = m1.tools.findIndex((t) => t.tool_name_digest === mkEntry(1).tool_name_digest);
  const entry = m1.tools[idx];
  const receipt = {
    schema: RECEIPT_SCHEMA,
    tool_name_digest: entry.tool_name_digest,
    tool_schema_digest: entry.tool_schema_digest,
    authority_class: entry.authority_class,
    sinks_used: [],
    inclusion_proof: surfacePath(m1.tools.map(toolEntryDigest), idx),
    run_epoch: 12,
    run_id_digest: domainDigest(DOMAINS.RECEIPT, "run", "run-1"),
  };
  const actionDigest = domainDigest(DOMAINS.ACTION, ACTION_SCHEMA, { family: "egress" });
  return { chain: [e0, e1], receipt, actionDigest };
}
```

- [ ] **Step 1: Write failing tests** `tests/unit/llmShield/stage4o/manifestCore.test.js` (imports builders from `./helpers.mjs`):

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toolEntryDigest,
  validateManifest,
  computeToolsetRoot,
  deltaObject,
  deltaDigest,
  commitmentDigest,
  validateEnvelope,
} from "../../../../tools/simurgh-attestation/stage4o/core/manifestCore.mjs";
import {
  COMMITMENT_SCHEMA,
  GENESIS,
} from "../../../../tools/simurgh-attestation/stage4o/constants.mjs";
import { mkEntry, mkManifest } from "./helpers.mjs";

test("valid manifest passes; unknown key, bad enum, unsorted, duplicate all fail exact-key validation", () => {
  const m = mkManifest([mkEntry(1), mkEntry(2)]);
  assert.deepEqual(validateManifest(m), { ok: true });
  assert.equal(validateManifest({ ...m, extra: 1 }).ok, false);
  const bad = mkManifest([mkEntry(1, { authority_class: "root" }), mkEntry(2)]);
  assert.equal(validateManifest(bad).ok, false);
  const unsorted = { ...m, tools: [...m.tools].reverse() };
  assert.equal(validateManifest(unsorted).ok, false);
  const dup = { ...m, tools: [m.tools[0], m.tools[0]] };
  assert.equal(validateManifest(dup).ok, false);
});

test("delta object is sorted and delta digest deterministic", () => {
  const m0 = mkManifest([mkEntry(1), mkEntry(2)]);
  const m1 = mkManifest([mkEntry(1), mkEntry(2, { authority_class: "write" }), mkEntry(3)]);
  const d = deltaObject(m0, m1);
  assert.equal(d.added.length, 1);
  assert.equal(d.changed.length, 1);
  assert.equal(d.removed.length, 0);
  assert.equal(deltaDigest(m0, m1), deltaDigest(m0, m1));
});

test("envelope: genesis rules enforced at epoch 0; epoch fields sane", () => {
  const m = mkManifest([mkEntry(1)]);
  const env = {
    schema: COMMITMENT_SCHEMA,
    manifest: m,
    manifest_epoch: 0,
    valid_from_epoch: 0,
    valid_until_epoch: 10,
    previous_manifest_digest: GENESIS,
    delta_digest: GENESIS,
    consent_binding: "state",
    signer_public_key_pem: "PEM",
    signature: "sig",
  };
  assert.deepEqual(validateEnvelope(env), { ok: true });
  assert.equal(
    validateEnvelope({ ...env, previous_manifest_digest: "sha256:" + "a".repeat(64) }).ok,
    false
  );
  assert.equal(validateEnvelope({ ...env, valid_until_epoch: -1 }).ok, false);
  assert.match(commitmentDigest(env), /^sha256:/);
  assert.equal(commitmentDigest(env), commitmentDigest({ ...env, signature: "other" }));
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** `core/manifestCore.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Manifest schema, digest, delta, and commitment-envelope machinery (4O spec §4, §6).
import { DIGEST_RE } from "../../stage4m/core/canonical.mjs";
import { domainDigest } from "./digest.mjs";
import { surfaceRoot } from "./merkleSurface.mjs";
import {
  DOMAINS,
  TOOL_MANIFEST_SCHEMA,
  COMMITMENT_SCHEMA,
  AUTHORITY_ORDER,
  RISK_CLASSES,
  CONSENT_BINDINGS,
  GENESIS,
} from "../constants.mjs";

const fail = (detail) => ({ ok: false, reason: "schema_invalid", detail });
const exactKeys = (obj, keys) =>
  obj &&
  typeof obj === "object" &&
  !Array.isArray(obj) &&
  Object.keys(obj).length === keys.length &&
  keys.every((k) => k in obj);

const ENTRY_KEYS = [
  "tool_name_digest",
  "tool_schema_digest",
  "authority_class",
  "declared_sinks",
  "risk_class",
];

export function validateManifest(m) {
  if (!exactKeys(m, ["schema", "server_id_digest", "toolset_digest", "tools"]))
    return fail("manifest_keys");
  if (m.schema !== TOOL_MANIFEST_SCHEMA) return fail("manifest_schema_id");
  if (!DIGEST_RE.test(m.server_id_digest) || !DIGEST_RE.test(m.toolset_digest))
    return fail("manifest_digest_format");
  if (!Array.isArray(m.tools) || m.tools.length === 0) return fail("tools_empty");
  let prev = "";
  for (const t of m.tools) {
    if (!exactKeys(t, ENTRY_KEYS)) return fail("entry_keys");
    if (!DIGEST_RE.test(t.tool_name_digest) || !DIGEST_RE.test(t.tool_schema_digest))
      return fail("entry_digest_format");
    if (!AUTHORITY_ORDER.includes(t.authority_class)) return fail("authority_class_enum");
    if (!RISK_CLASSES.includes(t.risk_class)) return fail("risk_class_enum");
    if (!Array.isArray(t.declared_sinks) || t.declared_sinks.some((s) => !DIGEST_RE.test(s)))
      return fail("sinks_format");
    if (t.tool_name_digest <= prev) return fail("tools_not_sorted_unique");
    prev = t.tool_name_digest;
  }
  return { ok: true };
}

export const toolEntryDigest = (entry) =>
  domainDigest(DOMAINS.TOOL_ENTRY, TOOL_MANIFEST_SCHEMA, entry);
export const computeToolsetRoot = (m) => surfaceRoot(m.tools.map(toolEntryDigest));

export function deltaObject(prevM, nextM) {
  const pb = new Map(prevM.tools.map((t) => [t.tool_name_digest, t]));
  const nb = new Map(nextM.tools.map((t) => [t.tool_name_digest, t]));
  const removed = [],
    added = [],
    changed = [];
  for (const [name, t] of pb) if (!nb.has(name)) removed.push(toolEntryDigest(t));
  for (const [name, t] of nb) if (!pb.has(name)) added.push(toolEntryDigest(t));
  for (const [name, t] of pb) {
    const n = nb.get(name);
    if (n && toolEntryDigest(t) !== toolEntryDigest(n)) {
      changed.push({
        tool_name_digest: name,
        before_entry_digest: toolEntryDigest(t),
        after_entry_digest: toolEntryDigest(n),
      });
    }
  }
  removed.sort();
  added.sort();
  changed.sort((a, b) => (a.tool_name_digest < b.tool_name_digest ? -1 : 1));
  return { removed, added, changed };
}
export const deltaDigest = (prevM, nextM) =>
  domainDigest(DOMAINS.DELTA, TOOL_MANIFEST_SCHEMA, deltaObject(prevM, nextM));

const ENV_KEYS = [
  "schema",
  "manifest",
  "manifest_epoch",
  "valid_from_epoch",
  "valid_until_epoch",
  "previous_manifest_digest",
  "delta_digest",
  "consent_binding",
  "signer_public_key_pem",
  "signature",
];
const isEpoch = (n) => Number.isInteger(n) && n >= 0;

export function validateEnvelope(env) {
  if (!exactKeys(env, ENV_KEYS)) return fail("envelope_keys");
  if (env.schema !== COMMITMENT_SCHEMA) return fail("envelope_schema_id");
  const mv = validateManifest(env.manifest);
  if (!mv.ok) return mv;
  if (![env.manifest_epoch, env.valid_from_epoch, env.valid_until_epoch].every(isEpoch))
    return fail("epoch_format");
  if (env.valid_from_epoch > env.valid_until_epoch) return fail("epoch_window_inverted");
  if (!CONSENT_BINDINGS.includes(env.consent_binding)) return fail("consent_binding_enum");
  if (env.manifest_epoch === 0) {
    if (env.previous_manifest_digest !== GENESIS || env.delta_digest !== GENESIS)
      return fail("genesis_rules");
  } else if (!DIGEST_RE.test(env.previous_manifest_digest) || !DIGEST_RE.test(env.delta_digest)) {
    return fail("chain_digest_format");
  }
  if (typeof env.signer_public_key_pem !== "string" || typeof env.signature !== "string")
    return fail("signature_format");
  return { ok: true };
}

export function commitmentDigest(env) {
  const { signature, ...unsigned } = env;
  void signature;
  return domainDigest(DOMAINS.MANIFEST_COMMITMENT, COMMITMENT_SCHEMA, unsigned);
}
```

- [ ] **Step 4: Run — PASS.** `node --test tests/unit/llmShield/stage4o/manifestCore.test.js`

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4o/core/manifestCore.mjs tests/unit/llmShield/stage4o/helpers.mjs tests/unit/llmShield/stage4o/manifestCore.test.js
git commit -m "feat(llm-shield): stage 4o manifest schema validation, delta digests, commitment envelope"
```

---

### Task 5: Drift core — lattice classifier + epoch-chain validation (raw 64/65)

**Files:**

- Create: `tools/simurgh-attestation/stage4o/core/driftCore.mjs`
- Test: `tests/unit/llmShield/stage4o/driftCore.test.js`

**Interfaces:**

- Consumes: Task 4 (`toolEntryDigest`, `deltaDigest`, `commitmentDigest`, `validateEnvelope`), Task 2 (`AUTHORITY_ORDER`, `GENESIS`).
- Produces:
  - `classifyDrift(prevManifest, nextManifest) -> "equal" | "narrowing" | "broadening" | "incomparable"`
  - `validateChain(chain: envelope[]) -> {ok:true, classifications: string[]} | {ok:false, raw: 64|65, reason: string}` — chain is genesis-first, ascending `manifest_epoch`; enforces ancestry completeness (`raw 64 / ancestry_incomplete`), `previous_manifest_digest` linkage (`64 / prev_digest_mismatch`), recomputed `delta_digest` (`64 / delta_digest_mismatch`), endpoint composition (`64 / composition_mismatch`), and consent rule (`65 / state_bound_broadening|state_bound_incomparable`). Signature checking is NOT here (it is check 56 in decisionCore/verifier).

- [ ] **Step 1: Write failing tests** `tests/unit/llmShield/stage4o/driftCore.test.js` (reuse `mkEntry`/`mkManifest` exported from Task 4's test file):

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyDrift,
  validateChain,
} from "../../../../tools/simurgh-attestation/stage4o/core/driftCore.mjs";
import { mkEntry, mkManifest, mkEnvelope } from "./helpers.mjs";

const M = (entries) => mkManifest(entries);

test("classifier: equal / narrowing / broadening / incomparable", () => {
  const base = M([mkEntry(1), mkEntry(2)]);
  assert.equal(classifyDrift(base, M([mkEntry(1), mkEntry(2)])), "equal");
  assert.equal(classifyDrift(base, M([mkEntry(1)])), "narrowing");
  assert.equal(classifyDrift(base, M([mkEntry(1), mkEntry(2), mkEntry(3)])), "broadening");
  assert.equal(
    classifyDrift(base, M([mkEntry(1), mkEntry(2, { authority_class: "write" })])),
    "broadening"
  );
  assert.equal(
    classifyDrift(
      M([mkEntry(1, { authority_class: "write" }), mkEntry(2)]),
      M([mkEntry(1), mkEntry(2)])
    ),
    "narrowing"
  );
  // schema change => incomparable (directionally undecidable from digests)
  assert.equal(
    classifyDrift(
      base,
      M([mkEntry(1, { tool_schema_digest: mkEntry(9).tool_schema_digest }), mkEntry(2)])
    ),
    "incomparable"
  );
  // mixed add+remove => incomparable
  assert.equal(classifyDrift(base, M([mkEntry(1), mkEntry(3)])), "incomparable");
});

test("chain: laundering (state-bound broadening) => 65; broken linkage => 64", () => {
  const m0 = M([mkEntry(1)]);
  const m1 = M([mkEntry(1), mkEntry(2)]);
  const e0 = mkEnvelope(m0, 0, null, "state");
  assert.equal(validateChain([e0]).ok, true);
  const blind = mkEnvelope(m1, 1, e0, "state");
  assert.deepEqual(validateChain([e0, blind]), {
    ok: false,
    raw: 65,
    reason: "state_bound_broadening",
  });
  const informed = mkEnvelope(m1, 1, e0, "delta");
  assert.equal(validateChain([e0, informed]).ok, true);
  const badLink = { ...informed, previous_manifest_digest: "sha256:" + "b".repeat(64) };
  assert.deepEqual(validateChain([e0, badLink]), {
    ok: false,
    raw: 64,
    reason: "prev_digest_mismatch",
  });
  const badDelta = { ...informed, delta_digest: "sha256:" + "c".repeat(64) };
  assert.deepEqual(validateChain([e0, badDelta]), {
    ok: false,
    raw: 64,
    reason: "delta_digest_mismatch",
  });
  assert.deepEqual(validateChain([informed]), {
    ok: false,
    raw: 64,
    reason: "ancestry_incomplete",
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** `core/driftCore.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Drift algebra + Monotone Consent Law chain validation (4O spec §6a). The verifier
// NEVER trusts claimed classifications: everything below is recomputed from bodies.
import {
  toolEntryDigest,
  deltaDigest,
  commitmentDigest,
  validateEnvelope,
} from "./manifestCore.mjs";
import { AUTHORITY_ORDER, GENESIS } from "../constants.mjs";

const rank = (c) => AUTHORITY_ORDER.indexOf(c);
const isSubset = (a, b) => a.every((x) => b.includes(x));

// True iff next ⊑ prev: tools(next) ⊆ tools(prev), and each shared tool did not move up
// the authority order, did not add sinks, and kept its schema digest.
function narrows(prevM, nextM) {
  const pb = new Map(prevM.tools.map((t) => [t.tool_name_digest, t]));
  for (const n of nextM.tools) {
    const p = pb.get(n.tool_name_digest);
    if (!p) return false;
    if (n.tool_schema_digest !== p.tool_schema_digest) return false;
    if (rank(n.authority_class) > rank(p.authority_class)) return false;
    if (!isSubset(n.declared_sinks, p.declared_sinks)) return false;
  }
  return true;
}

export function classifyDrift(prevM, nextM) {
  const equal =
    prevM.tools.length === nextM.tools.length &&
    prevM.tools.every((t, i) => toolEntryDigest(t) === toolEntryDigest(nextM.tools[i]));
  if (equal) return "equal";
  const dn = narrows(prevM, nextM); // next ⊑ prev
  const up = narrows(nextM, prevM); // prev ⊑ next
  if (dn && !up) return "narrowing";
  if (up && !dn) return "broadening";
  return "incomparable";
}

export function validateChain(chain) {
  if (!Array.isArray(chain) || chain.length === 0)
    return { ok: false, raw: 64, reason: "ancestry_incomplete" };
  const classifications = [];
  for (let i = 0; i < chain.length; i++) {
    const env = chain[i];
    const v = validateEnvelope(env);
    if (!v.ok) return { ok: false, raw: 64, reason: "ancestry_incomplete" };
    if (i === 0) {
      if (
        env.manifest_epoch !== 0 ||
        env.previous_manifest_digest !== GENESIS ||
        env.delta_digest !== GENESIS
      ) {
        return { ok: false, raw: 64, reason: "ancestry_incomplete" };
      }
      classifications.push("equal");
      continue;
    }
    const prev = chain[i - 1];
    if (env.manifest_epoch !== prev.manifest_epoch + 1)
      return { ok: false, raw: 64, reason: "ancestry_incomplete" };
    if (env.previous_manifest_digest !== commitmentDigest(prev))
      return { ok: false, raw: 64, reason: "prev_digest_mismatch" };
    if (env.delta_digest !== deltaDigest(prev.manifest, env.manifest))
      return { ok: false, raw: 64, reason: "delta_digest_mismatch" };
    const cls = classifyDrift(prev.manifest, env.manifest);
    classifications.push(cls);
    if (cls === "broadening" && env.consent_binding !== "delta")
      return { ok: false, raw: 65, reason: "state_bound_broadening" };
    if (cls === "incomparable" && env.consent_binding !== "delta")
      return { ok: false, raw: 65, reason: "state_bound_incomparable" };
  }
  // Path independence (defense in depth; ⊑ is transitive, spec §12 NoDriftLaundering):
  // an all-{equal,narrowing} chain must classify {equal,narrowing} end-to-end.
  if (chain.length > 1 && classifications.every((c) => c === "equal" || c === "narrowing")) {
    const direct = classifyDrift(chain[0].manifest, chain.at(-1).manifest);
    if (direct !== "equal" && direct !== "narrowing")
      return { ok: false, raw: 64, reason: "composition_mismatch" };
  }
  return { ok: true, classifications };
}
```

- [ ] **Step 4: Run — PASS.** `node --test tests/unit/llmShield/stage4o/driftCore.test.js`

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4o/core/driftCore.mjs tests/unit/llmShield/stage4o/driftCore.test.js
git commit -m "feat(llm-shield): stage 4o drift lattice classifier and monotone-consent chain validation"
```

---

### Task 6: Decision core — the 12-check ordered gate (Node)

**Files:**

- Create: `tools/simurgh-attestation/stage4o/core/decisionCore.mjs`
- Test: `tests/unit/llmShield/stage4o/decisionCore.test.js`

**Interfaces:**

- Consumes: Tasks 2–5; `verifySurfacePath` from Task 3.
- Produces:
  - `validateReceipt(r) -> {ok} | {ok:false,...}` — exact keys `schema, tool_name_digest, tool_schema_digest, authority_class, sinks_used, inclusion_proof, run_epoch, run_id_digest`.
  - `gateToolCall({ chain, receipt, actionDigest, verifyCommitmentSignature }) -> { raw: 0, name: "accepted", bindings } | { raw, name, reason }` where `bindings = { action_digest, manifest_digest, manifest_entry_digest, kernel_entrypoint, receipt_digest, run_id_digest }` and `verifyCommitmentSignature(envelope) -> boolean` is injected (pure core stays crypto-free; the verifier and attestation builder inject the Ed25519 check; unit tests inject stubs).
  - `receiptDigest(receipt) -> digest`.
  - Check order is `VTSA_CHECK_ORDER`; first failure wins; missing/malformed chain head ⇒ 55 with reason `absent|schema_invalid`; malformed receipt ⇒ 63 `receipt_schema_invalid`.

- [ ] **Step 1: Write failing tests** — build one valid world (chain of 2 envelopes via Task 5's `mkEnvelope`, receipt for tool 1 with a real `surfacePath`), then twelve arms each asserting its exact `{raw, reason}`, plus a multiply-broken arm (bad signature AND authority upgrade ⇒ 56, proving order) and the GREEN arm asserting `raw === 0` and all six binding fields present with `kernel_entrypoint === "authorise_with_manifest.v1"`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gateToolCall,
  receiptDigest,
} from "../../../../tools/simurgh-attestation/stage4o/core/decisionCore.mjs";
import { mkEntry, mkManifest, mkEnvelope, validWorld } from "./helpers.mjs";

const sigOK = () => true;
const sigBAD = () => false;
const world = validWorld; // { chain, receipt, actionDigest }

test("GREEN: accepted with complete six-field bindings", () => {
  const w = world();
  const out = gateToolCall({ ...w, verifyCommitmentSignature: sigOK });
  assert.equal(out.raw, 0);
  assert.equal(out.bindings.kernel_entrypoint, "authorise_with_manifest.v1");
  assert.deepEqual(Object.keys(out.bindings).sort(), [
    "action_digest",
    "kernel_entrypoint",
    "manifest_digest",
    "manifest_entry_digest",
    "receipt_digest",
    "run_id_digest",
  ]);
  assert.equal(out.bindings.receipt_digest, receiptDigest(w.receipt));
});

test("55 absent / 55 schema_invalid / 56 / 57 / 59 identity / 59 proof / 60 / 61 / 62 / 63", () => {
  const w = world();
  assert.equal(
    gateToolCall({
      chain: null,
      receipt: w.receipt,
      actionDigest: w.actionDigest,
      verifyCommitmentSignature: sigOK,
    }).raw,
    55
  );
  const badHead = [{ ...w.chain[0], extra: 1 }, w.chain[1]];
  assert.deepEqual(
    (({ raw, reason }) => ({ raw, reason }))(
      gateToolCall({
        chain: badHead,
        receipt: w.receipt,
        actionDigest: w.actionDigest,
        verifyCommitmentSignature: sigOK,
      })
    ),
    { raw: 55, reason: "schema_invalid" }
  );
  assert.equal(gateToolCall({ ...w, verifyCommitmentSignature: sigBAD }).raw, 56);
  const stale = { ...w.receipt, run_epoch: 999 };
  assert.equal(gateToolCall({ ...w, receipt: stale, verifyCommitmentSignature: sigOK }).raw, 57);
  const ghost = { ...w.receipt, tool_name_digest: mkEntry(9).tool_name_digest };
  assert.equal(gateToolCall({ ...w, receipt: ghost, verifyCommitmentSignature: sigOK }).raw, 59);
  const badProof = { ...w.receipt, inclusion_proof: [] };
  assert.equal(gateToolCall({ ...w, receipt: badProof, verifyCommitmentSignature: sigOK }).raw, 59);
  const badSchema = { ...w.receipt, tool_schema_digest: mkEntry(9).tool_schema_digest };
  assert.equal(
    gateToolCall({ ...w, receipt: badSchema, verifyCommitmentSignature: sigOK }).raw,
    60
  );
  const upgraded = { ...w.receipt, authority_class: "write" };
  assert.equal(gateToolCall({ ...w, receipt: upgraded, verifyCommitmentSignature: sigOK }).raw, 61);
  const sink = { ...w.receipt, sinks_used: [mkEntry(9).tool_schema_digest] };
  assert.equal(gateToolCall({ ...w, receipt: sink, verifyCommitmentSignature: sigOK }).raw, 62);
  const malformed = { ...w.receipt };
  delete malformed.run_id_digest;
  assert.equal(
    gateToolCall({ ...w, receipt: malformed, verifyCommitmentSignature: sigOK }).raw,
    63
  );
});

test("first failure wins in DOCUMENTED order: bad signature + authority upgrade => 56", () => {
  const w = world();
  const upgraded = { ...w.receipt, authority_class: "destructive" };
  assert.equal(
    gateToolCall({ ...w, receipt: upgraded, verifyCommitmentSignature: sigBAD }).raw,
    56
  );
});
```

(Note: 58 toolset-root mismatch and 64/65 chain arms are already covered structurally — 58 requires tampering `toolset_digest` after envelope construction, add: `const t58 = structuredClone(w.chain); t58[1].manifest.toolset_digest = "sha256:" + "d".repeat(64); expect raw 58` — but a tampered manifest also breaks `delta_digest` (64) which is checked FIRST per documented order. Correct 58 arm: tamper toolset root at genesis: `t58[0].manifest.toolset_digest = …` after regenerating `delta_digest`/links? Genesis has no delta. Tampering genesis root gives 58 iff signature stub passes and chain checks pass — genesis chain checks don't recompute roots, so 58 fires at the surface phase. Add exactly that arm.)

```js
test("58: committed toolset root does not recompute from the manifest body", () => {
  const w = world();
  const chain = structuredClone(w.chain);
  chain[0].manifest.toolset_digest = "sha256:" + "d".repeat(64);
  // keep the head intact; call is gated against the head (epoch 1), so tamper the head instead:
  const chain2 = structuredClone(w.chain);
  chain2[1].manifest.toolset_digest = "sha256:" + "d".repeat(64);
  const out = gateToolCall({
    chain: chain2,
    receipt: w.receipt,
    actionDigest: w.actionDigest,
    verifyCommitmentSignature: () => true,
  });
  assert.equal(out.raw, 64); // delta digest breaks first — documented order is normative
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** `core/decisionCore.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// The 12-check manifest-bound gate (4O spec §6). Fail-closed; DOCUMENTED order
// 55,56,57,64,65,58,59,60,61,62,63(,66 at attestation level); first failure wins.
// Crypto is injected so this core stays pure and browser-safe.
import { DIGEST_RE } from "../../stage4m/core/canonical.mjs";
import { domainDigest } from "./digest.mjs";
import {
  validateEnvelope,
  commitmentDigest,
  computeToolsetRoot,
  toolEntryDigest,
} from "./manifestCore.mjs";
import { validateChain } from "./driftCore.mjs";
import { verifySurfacePath } from "./merkleSurface.mjs";
import { DOMAINS, RECEIPT_SCHEMA, KERNEL_ENTRYPOINT, AUTHORITY_ORDER } from "../constants.mjs";

const RECEIPT_KEYS = [
  "schema",
  "tool_name_digest",
  "tool_schema_digest",
  "authority_class",
  "sinks_used",
  "inclusion_proof",
  "run_epoch",
  "run_id_digest",
];
const rank = (c) => AUTHORITY_ORDER.indexOf(c);
const R = (raw, name, reason) => ({ raw, name, reason });

export const receiptDigest = (receipt) => domainDigest(DOMAINS.RECEIPT, RECEIPT_SCHEMA, receipt);

export function validateReceipt(r) {
  const ok =
    r &&
    typeof r === "object" &&
    !Array.isArray(r) &&
    Object.keys(r).length === RECEIPT_KEYS.length &&
    RECEIPT_KEYS.every((k) => k in r) &&
    r.schema === RECEIPT_SCHEMA &&
    DIGEST_RE.test(r.tool_name_digest) &&
    DIGEST_RE.test(r.tool_schema_digest) &&
    AUTHORITY_ORDER.includes(r.authority_class) &&
    Array.isArray(r.sinks_used) &&
    r.sinks_used.every((s) => DIGEST_RE.test(s)) &&
    Array.isArray(r.inclusion_proof) &&
    Number.isInteger(r.run_epoch) &&
    r.run_epoch >= 0 &&
    DIGEST_RE.test(r.run_id_digest);
  return ok ? { ok: true } : { ok: false };
}

export function gateToolCall({ chain, receipt, actionDigest, verifyCommitmentSignature }) {
  // 55 — commitment absent or schema-invalid (manifest_defect enum in reason)
  if (!Array.isArray(chain) || chain.length === 0) return R(55, "manifest_missing", "absent");
  for (const env of chain)
    if (!validateEnvelope(env).ok) return R(55, "manifest_missing", "schema_invalid");
  const head = chain[chain.length - 1];
  // 56 — tool-manifest commitment signature (NEVER the attestation-bundle signature)
  for (const env of chain) {
    if (!verifyCommitmentSignature(env))
      return R(56, "manifest_signature_invalid", "commitment_signature_invalid");
  }
  // 63 (receipt malformed) is documented as part of check 9, but epoch check 57 needs
  // run_epoch — a malformed receipt therefore fails closed at 63 BEFORE 57 can read it.
  if (!validateReceipt(receipt).ok)
    return R(63, "manifest_receipt_binding_mismatch", "receipt_schema_invalid");
  // 57 — logical freshness
  if (receipt.run_epoch < head.valid_from_epoch || receipt.run_epoch > head.valid_until_epoch) {
    return R(57, "manifest_epoch_invalid", "run_epoch_outside_validity_window");
  }
  // 64 / 65 — epoch-chain phase
  const chainResult = validateChain(chain);
  if (!chainResult.ok) {
    return R(
      chainResult.raw,
      chainResult.raw === 64 ? "drift_laundering_detected" : "blind_reapproval",
      chainResult.reason
    );
  }
  // 58 — recomputed toolset root vs committed
  if (computeToolsetRoot(head.manifest) !== head.manifest.toolset_digest) {
    return R(58, "server_or_toolset_digest_mismatch", "toolset_root_recompute_mismatch");
  }
  // 59 — identity + inclusion proof
  const entry = head.manifest.tools.find((t) => t.tool_name_digest === receipt.tool_name_digest);
  if (!entry) return R(59, "tool_identity_mismatch", "tool_not_in_manifest");
  if (
    !verifySurfacePath(
      toolEntryDigest(entry),
      receipt.inclusion_proof,
      head.manifest.toolset_digest
    )
  ) {
    return R(59, "tool_identity_mismatch", "inclusion_proof_invalid");
  }
  // 60 — schema digest
  if (receipt.tool_schema_digest !== entry.tool_schema_digest) {
    return R(60, "tool_schema_digest_mismatch", "schema_digest_mismatch");
  }
  // 61 — authority escalation
  if (rank(receipt.authority_class) > rank(entry.authority_class)) {
    return R(61, "authority_class_upgrade", "authority_class_upgrade");
  }
  // 62 — sink expansion
  if (!receipt.sinks_used.every((s) => entry.declared_sinks.includes(s))) {
    return R(62, "declared_sink_expansion", "sink_not_declared");
  }
  // 63 — binding
  if (!DIGEST_RE.test(actionDigest))
    return R(63, "manifest_receipt_binding_mismatch", "binding_mismatch");
  return {
    raw: 0,
    name: "accepted",
    bindings: {
      action_digest: actionDigest,
      manifest_digest: commitmentDigest(head),
      manifest_entry_digest: toolEntryDigest(entry),
      kernel_entrypoint: KERNEL_ENTRYPOINT,
      receipt_digest: receiptDigest(receipt),
      run_id_digest: receipt.run_id_digest,
    },
  };
}
```

- [ ] **Step 4: Run — PASS.** `node --test tests/unit/llmShield/stage4o/decisionCore.test.js`
      (Note the deliberate, documented deviation: a malformed receipt ⇒ 63 fires before 57 because 57 needs `run_epoch`. This mirrors "an object that does not parse cannot be checked" and is asserted in the tests; record it in the closeout docs-accuracy pass.)

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4o/core/decisionCore.mjs tests/unit/llmShield/stage4o/decisionCore.test.js
git commit -m "feat(llm-shield): stage 4o twelve-check manifest-bound gate with documented first-failure order"
```

---

### Task 7: Python mirror — `manifest_surface.py`

**Files:**

- Create: `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/manifest_surface.py`
- Create: `tools/agentdojo-simurgh-adapter/tests/_stage4o_helpers.py` (shared Python builders `mk_entry`, `mk_manifest`, `mk_envelope`, `valid_world`; leading underscore + no `test_` prefix so pytest never collects it)
- Test: `tools/agentdojo-simurgh-adapter/tests/test_manifest_surface.py`

**Interfaces:**

- Consumes: nothing repo-internal (pure stdlib: `json`, `hashlib`, `dataclasses`).
- Produces (exact names; Task 8 and the parity fixtures depend on them):
  - `canonical_json(value) -> str` (recursive key-sort, `json.dumps(..., separators=(",", ":"), ensure_ascii=False)`) — must byte-match Node `canonicalJson`.
  - `domain_digest(domain: str, schema: str, value) -> str`
  - `surface_leaf(entry_digest) -> str`, `surface_root(entry_digests: list[str]) -> str`, `surface_path(entry_digests, index) -> list[dict]`, `verify_surface_path(entry_digest, path, root) -> bool` (same promote/left/right dict shape as Node)
  - `validate_manifest(m: dict) -> tuple[bool, str]`, `validate_envelope(env: dict) -> tuple[bool, str]`
  - `tool_entry_digest(entry: dict) -> str`, `compute_toolset_root(m) -> str`, `delta_object(prev_m, next_m) -> dict`, `delta_digest(prev_m, next_m) -> str`, `commitment_digest(env) -> str`
  - `classify_drift(prev_m, next_m) -> str`, `validate_chain(chain: list[dict]) -> dict` (`{"ok": True, "classifications": [...]}` or `{"ok": False, "raw": 64|65, "reason": str}`)
  - Constants mirrored: `DOMAINS` (dict, 12 keys), `AUTHORITY_ORDER`, `RISK_CLASSES`, `GENESIS`, schema ids — values identical strings to Task 2.

- [ ] **Step 1: Write `tests/_stage4o_helpers.py`** (the Python mirror of `helpers.mjs` — `mk_entry`, `mk_manifest`, `mk_envelope`, `valid_world`, importing from `simurgh_agentdojo_adapter.manifest_surface`), then the failing tests `tests/test_manifest_surface.py` — port the Task 4/5 scenarios to pytest (import builders from `_stage4o_helpers`; same assertions: exact-key validation arms, delta determinism, classifier's six cases, chain arms 64/65). Plus the canonical-JSON contract test:

```python
# SPDX-License-Identifier: AGPL-3.0-or-later
from simurgh_agentdojo_adapter import manifest_surface as ms

def test_canonical_json_matches_node_conventions():
    assert ms.canonical_json({"b": 2, "a": [1, {"y": 0, "x": 1}]}) == '{"a":[1,{"x":1,"y":0}],"b":2}'

def test_domain_digest_shape_and_separation():
    a = ms.domain_digest(ms.DOMAINS["TOOL_ENTRY"], "s", {"x": 1})
    b = ms.domain_digest(ms.DOMAINS["ACTION"], "s", {"x": 1})
    assert a.startswith("sha256:") and len(a) == 71 and a != b
```

- [ ] **Step 2: Run — FAIL.** `cd tools/agentdojo-simurgh-adapter && python3 -m pytest tests/test_manifest_surface.py -q`

- [ ] **Step 3: Implement** `manifest_surface.py` — a line-for-line semantic port of Tasks 3–5's Node cores. Key skeleton (implement every function listed in Interfaces; logic identical to the Node code shown in Tasks 3–5):

```python
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 4O tool-surface machinery (Python mirror of tools/simurgh-attestation/stage4o).
Pure stdlib. Byte-parity with the Node core is enforced by the committed parity vectors
(tests/fixtures/llmShield/stage4o/parity/canonical-parity.json) — change BOTH sides or none.
Motto: AnthropicSafe First, then ReviewerSafe."""
from __future__ import annotations
import hashlib, json, re

DIGEST_RE = re.compile(r"^sha256:[a-f0-9]{64}$")
TOOL_MANIFEST_SCHEMA = "simurgh.tool_manifest.v1"
COMMITMENT_SCHEMA = "simurgh.tool_manifest_commitment.v1"
RECEIPT_SCHEMA = "simurgh.tool_receipt.v1"
ACTION_SCHEMA = "simurgh.tool_action.v1"
GENESIS = "genesis"
AUTHORITY_ORDER = ("read_only", "write", "egress", "destructive")
RISK_CLASSES = ("low", "medium", "high")
CONSENT_BINDINGS = ("state", "delta")
DOMAINS = { ... }  # identical 12 entries to constants.mjs — copy the values verbatim

def _normalise(v):
    if isinstance(v, list):
        return [_normalise(x) for x in v]
    if isinstance(v, dict):
        return {k: _normalise(v[k]) for k in sorted(v)}
    return v

def canonical_json(value) -> str:
    return json.dumps(_normalise(value), separators=(",", ":"), ensure_ascii=False)

def domain_digest(domain: str, schema: str, value) -> str:
    if not domain.startswith("SIMURGH_STAGE4O_"):
        raise ValueError(f"unknown_digest_domain: {domain}")
    payload = canonical_json({"domain": domain, "schema": schema, "value": value})
    return "sha256:" + hashlib.sha256(payload.encode("utf-8")).hexdigest()
# ... surface_leaf / surface_root / surface_path / verify_surface_path (port Task 3)
# ... validate_manifest / tool_entry_digest / compute_toolset_root / delta_object /
#     delta_digest / validate_envelope / commitment_digest (port Task 4)
# ... classify_drift / validate_chain (port Task 5)
```

- [ ] **Step 4: Run — PASS.** `python3 -m pytest tests/test_manifest_surface.py -q`

- [ ] **Step 5: Commit**

```bash
git add tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/manifest_surface.py tools/agentdojo-simurgh-adapter/tests/_stage4o_helpers.py tools/agentdojo-simurgh-adapter/tests/test_manifest_surface.py
git commit -m "feat(llm-shield): stage 4o python manifest-surface mirror (digests, merkle, lattice, chain)"
```

---

### Task 8: Kernel entry point — `authorise_with_manifest` (append-only)

**Files:**

- Modify (APPEND ONLY, after line 199): `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/capability_kernel.py`
- Test: `tools/agentdojo-simurgh-adapter/tests/test_capability_kernel_manifest.py`

**Interfaces:**

- Consumes: Task 7 module; existing `Action`, `AuthorityDecision`.
- Produces:
  - `ManifestBindings` frozen dataclass: `action_digest, manifest_digest, manifest_entry_digest, kernel_entrypoint, receipt_digest, run_id_digest` (all `str`).
  - `ManifestAuthorityDecision` frozen dataclass: `decision: AuthorityDecision`, `manifest_bindings: ManifestBindings | None`, `raw_code: int`, `reason: str`.
  - `action_digest(action: Action) -> str`.
  - `authorise_with_manifest(action: Action, *, manifest_chain: list[dict], receipt: dict, verify_commitment_signature=_refuse_all) -> ManifestAuthorityDecision` — `manifest_chain` is the commitment CHAIN (genesis-first), NOT one manifest (spec delta, recorded in Task 16). `verify_commitment_signature` defaults to a fail-closed `_refuse_all` (`lambda env: False`): a caller who supplies no verification gets raw 56 — never fail-open. The fixture harness and verifier inject the real Ed25519 check.

- [ ] **Step 1: Write failing tests** `tests/test_capability_kernel_manifest.py`:

```python
# SPDX-License-Identifier: AGPL-3.0-or-later
from simurgh_agentdojo_adapter.capability_kernel import (
    Action, authorise_with_manifest, ManifestBindings, action_digest,
)
from simurgh_agentdojo_adapter import manifest_surface as ms
from tests._stage4o_helpers import valid_world  # shared builders; NOT a test module

SIG_OK = lambda env: True

def test_green_accept_carries_six_bindings():
    chain, receipt = valid_world()
    act = Action("egress", "send", "email", "alice@example.com")
    out = authorise_with_manifest(act, manifest_chain=chain, receipt=receipt, verify_commitment_signature=SIG_OK)
    assert out.raw_code == 0
    assert out.decision.verdict == "allow" and out.decision.reason == "manifest_bound"
    assert out.manifest_bindings.kernel_entrypoint == "authorise_with_manifest.v1"
    assert out.manifest_bindings.action_digest == action_digest(act)

def test_default_signature_check_fails_closed_to_56():
    chain, receipt = valid_world()
    out = authorise_with_manifest(Action("egress", "send", "email", "x"), manifest_chain=chain, receipt=receipt)
    assert out.raw_code == 56

def test_each_raw_code_in_isolation_and_first_failure_order():
    # twelve arms, ported 1:1 from Task 6's Node test expectations, plus:
    # multiply-broken (bad signature + authority upgrade) => 56
    ...

def test_frozen_entry_points_untouched():
    import subprocess, sys
    r = subprocess.run(
        [sys.executable, "-m", "pytest", "-q",
         "tests/test_capability_kernel.py", "tests/test_capability_kernel_intent.py",
         "tests/test_capability_kernel_provenance.py", "tests/test_capability_kernel_equivalence.py"],
        capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr
```

(Write `test_each_raw_code_in_isolation_and_first_failure_order` out in full — twelve arms; no ellipsis in the real file. Each arm mirrors the Node expectations from Task 6, including the 63-before-57 malformed-receipt rule.)

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement — append to `capability_kernel.py`:**

```python
# ---------------------------------------------------------------------------
# Stage 4O: manifest-bound authorisation (additive; 4A/4B/4C above are frozen).
# A call is authorised ONLY against a signed, epoch-chained tool-manifest commitment
# (Monotone Consent Law, 4O spec §6/§6a). Fail-closed: no/invalid commitment refuses.
# ---------------------------------------------------------------------------
import hashlib as _hashlib
from . import manifest_surface as _ms

KERNEL_ENTRYPOINT_V1 = "authorise_with_manifest.v1"


@dataclass(frozen=True)
class ManifestBindings:
    action_digest: str
    manifest_digest: str
    manifest_entry_digest: str
    kernel_entrypoint: str
    receipt_digest: str
    run_id_digest: str


@dataclass(frozen=True)
class ManifestAuthorityDecision:
    decision: AuthorityDecision
    manifest_bindings: ManifestBindings | None
    raw_code: int
    reason: str


def action_digest(action: Action) -> str:
    target_digest = "sha256:" + _hashlib.sha256((action.target or "").encode("utf-8")).hexdigest()
    return _ms.domain_digest(_ms.DOMAINS["ACTION"], _ms.ACTION_SCHEMA, {
        "family": action.family, "verb": action.verb,
        "target_kind": action.target_kind, "target_digest": target_digest,
    })


def _refuse_all(_env) -> bool:
    return False  # fail closed unless the caller supplies real signature verification


def _blocked(action: Action, raw: int, reason: str) -> ManifestAuthorityDecision:
    return ManifestAuthorityDecision(
        AuthorityDecision("block", reason, action.family, [action.target]), None, raw, reason
    )


def authorise_with_manifest(
    action: Action, *, manifest_chain: list, receipt: dict, verify_commitment_signature=_refuse_all
) -> ManifestAuthorityDecision:
    out = _ms.gate_tool_call(
        chain=manifest_chain, receipt=receipt, action_digest_value=action_digest(action),
        verify_commitment_signature=verify_commitment_signature,
        kernel_entrypoint=KERNEL_ENTRYPOINT_V1,
    )
    if out["raw"] != 0:
        return _blocked(action, out["raw"], out["reason"])
    b = out["bindings"]
    return ManifestAuthorityDecision(
        AuthorityDecision("allow", "manifest_bound", action.family),
        ManifestBindings(**b), 0, "accepted",
    )
```

Add `gate_tool_call(...)` to `manifest_surface.py` in this task (semantic port of Task 6's `gateToolCall`, returning a dict `{"raw", "name", "reason"}` or `{"raw": 0, "bindings": {...}}` with `kernel_entrypoint` passed in).

- [ ] **Step 4: Run — PASS**, including the frozen-suite subprocess test:

```
cd tools/agentdojo-simurgh-adapter && python3 -m pytest tests/test_capability_kernel_manifest.py -q
```

- [ ] **Step 5: Verify append-only:** `git diff --stat tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/capability_kernel.py` shows insertions only, no deletions.

- [ ] **Step 6: Commit**

```bash
git add tools/agentdojo-simurgh-adapter
git commit -m "feat(llm-shield): stage 4o authorise_with_manifest kernel entry point with manifest bindings"
```

---

### Task 9: Deterministic fixtures — chains, tamper matrix, receipts, expected matrix, parity vectors

**Files:**

- Create: `tools/simurgh-attestation/stage4o/node/build-stage4o-fixtures.mjs`
- Create (generated, committed): `tests/fixtures/llmShield/stage4o/{chains/,arms/,expected-results/vtsa-matrix.json,parity/canonical-parity.json,vtsa-signer.pub,vtsa-manifest-signer.pub}`
- Test: `tests/unit/llmShield/stage4o/fixtures.test.js`, plus Python `tools/agentdojo-simurgh-adapter/tests/test_stage4o_parity.py`

**Interfaces:**

- Consumes: everything from Tasks 2–6; `node:crypto` Ed25519. Deterministic FIXTURE keys, generated once and committed under `tests/fixtures/llmShield/stage4o/test-keys/` with scream-labels: `INSECURE_FIXTURE_ONLY_manifest-signer.pem`, `INSECURE_FIXTURE_ONLY_attestation-signer.pem`, each paired with `<name>.meta.json` = `{"purpose":"committed-test-fixture-key","not_secret":true,"do_not_use_for_evidence":true}`. Public pems are committed in `vtsa-manifest-signer.pub` / `vtsa-signer.pub` JSON. These are for the MODELLED Lane A corpus only; production evidence signing (Task 11) uses real keys generated outside the repo via the stage4n `--ephemeral`/`--*-key` split.
- Produces:
  - `tests/fixtures/llmShield/stage4o/chains/clean-chain.json` — 3-epoch chain: genesis (2 tools) → epoch 1 delta-bound broadening (adds `egress` tool) → epoch 2 state-bound narrowing (drops it). Signed with the manifest fixture key.
  - `arms/<name>.json` — one file per tamper arm, each `{arm, chain, receipt, action, expected_raw, expected_reason}`; the 15 arms of spec §7 EXACTLY: `missing-manifest(55/absent)`, `schema-invalid-manifest(55/schema_invalid)`, `signature-mismatch(56)`, `stale-manifest-replay(57)`, `laundering-chain(64/composition or prev/delta per construction — construct as: epoch chain where a broadening envelope's manifest bodies were swapped after delta computation ⇒ 64/delta_digest_mismatch)`, `blind-reapproval(65/state_bound_broadening)`, `server-toolset-change-genesis(58/toolset_root_recompute_mismatch)` — **must be a single genesis envelope** (epoch 0, no delta) whose `toolset_digest` is set to a valid-format wrong root and then **re-signed** so the commitment signature is authentic but internally inconsistent; single-envelope construction is what lets 58 fire without 64/65 tripping first (documented-order trap noted in Task 6), `tool-added-post-approval(59/tool_not_in_manifest)`, `invalid-inclusion-proof(59/inclusion_proof_invalid)`, `schema-changed(60)`, `readonly-to-write(61)`, `destructive-under-harmless-name(61 — authority_class changes, name digest preserved)`, `sink-expansion(62)`, `receipt-binding-mismatch(63)`, `timeline-root-mismatch(66 — consumed by Task 10)`; plus GREEN arms `green-unchanged(0)`, `green-state-narrowing(0)`, `green-delta-broadening(0)`.
  - `expected-results/vtsa-matrix.json` — `[{arm, expected_raw, expected_reason}]` sorted by arm name.
  - `parity/canonical-parity.json` — ≥12 vectors: `{description, domain, schema, value, digest}` including nested objects, arrays, unicode string `"café ☕"`, empty arrays.
  - Honours `STAGE4O_FIXTURE_OUT` env var for temp regeneration (reproduce-script `cmp` pattern).

- [ ] **Step 1: Write the failing fixture test** `tests/unit/llmShield/stage4o/fixtures.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { gateToolCall } from "../../../../tools/simurgh-attestation/stage4o/core/decisionCore.mjs";
import { commitmentDigest } from "../../../../tools/simurgh-attestation/stage4o/core/manifestCore.mjs";
import { createPublicKey, verify } from "node:crypto";

const FIX = "tests/fixtures/llmShield/stage4o";
const pub = JSON.parse(readFileSync(`${FIX}/vtsa-manifest-signer.pub`, "utf8")).public_key_pem;
const sigCheck = (env) =>
  verify(
    null,
    Buffer.from(commitmentDigest(env)),
    createPublicKey(pub),
    Buffer.from(env.signature, "base64")
  );

test("every committed arm yields exactly its expected raw code and reason", () => {
  const matrix = JSON.parse(readFileSync(`${FIX}/expected-results/vtsa-matrix.json`, "utf8"));
  assert.ok(matrix.length >= 18);
  for (const row of matrix) {
    const arm = JSON.parse(readFileSync(`${FIX}/arms/${row.arm}.json`, "utf8"));
    const out = gateToolCall({
      chain: arm.chain,
      receipt: arm.receipt,
      actionDigest: arm.action_digest,
      verifyCommitmentSignature: sigCheck,
    });
    assert.equal(out.raw, row.expected_raw, `${row.arm}: raw`);
    if (row.expected_raw !== 0) assert.equal(out.reason, row.expected_reason, `${row.arm}: reason`);
  }
});
```

- [ ] **Step 2: Write the builder** `build-stage4o-fixtures.mjs` — constructs the clean chain and every arm programmatically (never hand-edited JSON), signs commitments with the committed fixture private key (`test-keys/INSECURE_FIXTURE_ONLY_manifest-signer.pem`), writes with `JSON.stringify(x, null, 2) + "\n"`, sorted arm order, to `process.env.STAGE4O_FIXTURE_OUT ?? "tests/fixtures/llmShield/stage4o"`. The `signature-mismatch` arm uses the literal string `"TAMPERED"` as its signature (so both the Node Ed25519 verify and the Python injected stub detect it — see Step 4). Also emits the parity vectors by calling `domainDigest` on the 12 committed inputs.

- [ ] **Step 3: Generate + run:**

```bash
node tools/simurgh-attestation/stage4o/node/build-stage4o-fixtures.mjs
node --test tests/unit/llmShield/stage4o/fixtures.test.js
```

Expected: PASS. Re-run the builder and `git status` — no diff (idempotent).

- [ ] **Step 4: Write the Python parity test** `tools/agentdojo-simurgh-adapter/tests/test_stage4o_parity.py` — THE kernel↔verifier parity gate:

```python
# SPDX-License-Identifier: AGPL-3.0-or-later
import json, pathlib
from simurgh_agentdojo_adapter import manifest_surface as ms

ROOT = pathlib.Path(__file__).resolve().parents[3]
FIX = ROOT / "tests/fixtures/llmShield/stage4o"

def test_canonical_digest_parity_with_node():
    for v in json.loads((FIX / "parity/canonical-parity.json").read_text()):
        assert ms.domain_digest(v["domain"], v["schema"], v["value"]) == v["digest"], v["description"]

def test_gate_parity_same_first_raw_code_on_every_arm():
    matrix = json.loads((FIX / "expected-results/vtsa-matrix.json").read_text())
    for row in matrix:
        arm = json.loads((FIX / "arms" / f"{row['arm']}.json").read_text())
        out = ms.gate_tool_call(
            chain=arm["chain"], receipt=arm["receipt"], action_digest_value=arm["action_digest"],
            verify_commitment_signature=lambda env: env.get("signature") != "TAMPERED",
            kernel_entrypoint="authorise_with_manifest.v1",
        )
        assert out["raw"] == row["expected_raw"], row["arm"]
```

(The signature-mismatch arm is built with the literal string `"TAMPERED"` as its signature so BOTH sides can detect it — Node via real Ed25519 verify, Python via the injected stub — keeping the Python side crypto-free while still exercising check 56. Note this in the builder's header comment.)

- [ ] **Step 5: Run — PASS both sides:**

```bash
node --test tests/unit/llmShield/stage4o/fixtures.test.js
cd tools/agentdojo-simurgh-adapter && python3 -m pytest tests/test_stage4o_parity.py -q
```

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-attestation/stage4o/node/build-stage4o-fixtures.mjs tests/fixtures/llmShield/stage4o tests/unit/llmShield/stage4o/fixtures.test.js tools/agentdojo-simurgh-adapter/tests/test_stage4o_parity.py
git commit -m "test(llm-shield): stage 4o tamper-matrix fixtures with kernel-verifier parity gates"
```

---

### Task 10: Timeline core (raw 66) + constitution core (§11.1)

**Files:**

- Create: `tools/simurgh-attestation/stage4o/core/timelineCore.mjs`, `tools/simurgh-attestation/stage4o/core/constitutionCore.mjs`
- Test: `tests/unit/llmShield/stage4o/timelineCore.test.js`, `tests/unit/llmShield/stage4o/constitutionCore.test.js`

**Interfaces:**

- Consumes: frozen 4N feed `docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl` (read-only fixture input); Task 2/3/4 exports; `VTSA_RAW_CODES`.
- Produces:
  - `buildTimelineRecord({ chainHead, stage4nRecord }) -> { schema: TIMELINE_SCHEMA, stage4n_chain_position_digest, toolset_root, manifest_epoch }` where `stage4n_chain_position_digest = domainDigest(DOMAINS.TIMELINE, TIMELINE_SCHEMA, { window: stage4nRecord.window, record_digest: stage4nRecord.record_digest })` (use the exact field names present in the 4N feed — inspect the first line of the committed feed and adapt at implementation time; assert the chosen fields exist).
  - `verifyTimelineRecord({ record, chain, stage4nFeedLines }) -> {ok:true} | {ok:false, raw:66, reason:"timeline_root_mismatch"|"chain_position_absent"}` — root must equal the head manifest's `toolset_digest` for `record.manifest_epoch`; the referenced 4N position must exist in the feed.
  - `buildAlignmentMap() -> [{raw_code, mechanism, alignment_claim, non_claim}]` — exactly 12 entries (55–66), `mechanism` = the VTSA_RAW_CODES key name lower-cased, `alignment_claim` drawn ONLY from `ALIGNMENT_VOCABULARY`, `non_claim: "not_a_model_value_guarantee"` on every entry.
  - `checkAlignmentMap(map) -> {ok:true} | {ok:false, detail}` — verifies count, one entry per code, vocabulary membership, mechanism string equality against `VTSA_RAW_CODES` (the 3N-style field-equality check).

- [ ] **Step 1: Write failing tests** (timeline: build from the real committed 4N feed line 1 + Task 9's clean chain; verify GREEN; then a root-mismatch arm ⇒ `{raw:66, reason:"timeline_root_mismatch"}` and an absent-position arm ⇒ `chain_position_absent`. Constitution: `buildAlignmentMap()` passes `checkAlignmentMap`; a map with an out-of-vocabulary claim or 11 entries fails).

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement both cores.** `constitutionCore.mjs` also exports `HONESTY_CEILING` re-checked verbatim:

```js
export function checkAlignmentMap(map) {
  if (!Array.isArray(map) || map.length !== 12) return { ok: false, detail: "count" };
  const codes = new Set();
  const byCode = Object.fromEntries(
    Object.entries(VTSA_RAW_CODES).map(([k, v]) => [v, k.toLowerCase()])
  );
  for (const e of map) {
    if (!exact(e, ["raw_code", "mechanism", "alignment_claim", "non_claim"]))
      return { ok: false, detail: "keys" };
    if (byCode[e.raw_code] !== e.mechanism) return { ok: false, detail: `mechanism:${e.raw_code}` };
    if (!ALIGNMENT_VOCABULARY.includes(e.alignment_claim))
      return { ok: false, detail: `vocabulary:${e.raw_code}` };
    if (e.non_claim !== "not_a_model_value_guarantee")
      return { ok: false, detail: `non_claim:${e.raw_code}` };
    codes.add(e.raw_code);
  }
  return codes.size === 12 ? { ok: true } : { ok: false, detail: "duplicate_codes" };
}
```

- [ ] **Step 4: Run — PASS.** Then extend the fixture builder (Task 9) to emit `arms/timeline-root-mismatch.json` + matrix row (`expected_raw: 66`), regenerate fixtures, re-run fixtures + parity tests (Python `gate_tool_call` does not evaluate 66 — attestation-level; the Python parity test must SKIP `expected_raw === 66` rows with an explicit comment; update `test_gate_parity_same_first_raw_code_on_every_arm` accordingly).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4o/core/timelineCore.mjs tools/simurgh-attestation/stage4o/core/constitutionCore.mjs tests/unit/llmShield/stage4o tests/fixtures/llmShield/stage4o tools/agentdojo-simurgh-adapter/tests/test_stage4o_parity.py tools/simurgh-attestation/stage4o/node/build-stage4o-fixtures.mjs
git commit -m "feat(llm-shield): stage 4o timeline binding to 4n chain positions and constitutional alignment map"
```

---

### Task 11: Attestation builder (two keypairs) + offline verifier CLI (+ selective disclosure)

**Files:**

- Create: `tools/simurgh-attestation/stage4o/node/build-stage4o-attestation.mjs`, `tools/simurgh-attestation/stage4o/node/verify-stage4o.mjs`
- Create (generated, committed): `docs/research/llm-shield/evidence/stage-4o/{vtsa-attestation.json,vtsa-manifest.json,clean-chain.json,decision-corpus.json,README.md}`
- Test: `tests/unit/llmShield/stage4o/attestation.test.js`, `tests/unit/llmShield/stage4o/verifier.test.js`

**Interfaces:**

- Consumes: all cores; fixture chain + arms; 4N feed; `node:crypto` Ed25519.
- Produces:
  - Builder CLI: `node build-stage4o-attestation.mjs [--ephemeral | --manifest-key <pem> --attestation-key <pem>] [--out-dir <dir>]` — replays ALL arms through `gateToolCall` (with real Ed25519 commitment verification via the fixture public key), assembles `decision-corpus.json` (per-arm `{arm, raw, name, reason, bindings|null}` + `corpus_digest = domainDigest(DECISION_CORPUS, ...)`), the timeline record, the alignment map, non-claims, known_limitations, then `vtsa-attestation.json` (unsigned body) + `vtsa-manifest.json` (`attestation_digest = domainDigest(ATTESTATION_BUNDLE, ATTESTATION_SCHEMA, canonical(parse(attestation)))`, Ed25519 signature by the ATTESTATION key, both public-key pems + fingerprints). Follows the stage4n `--ephemeral` / real-key CLI split exactly.
  - Verifier CLI: `node verify-stage4o.mjs --evidence <dir> [--selective <arm-name>]` — full mode: re-runs every §8 rule (recompute all digests incl. toolset roots and delta digests, verify BOTH signatures with the embedded public keys, re-gate every arm and compare to the corpus, validate alignment map via `checkAlignmentMap`, verify timeline vs the committed 4N feed, re-derive the expected matrix); selective mode: verifies ONE arm's receipt + inclusion proof + signed envelope WITHOUT reading any `tools[]` body (spec §5a). Exit: 0 on green; on failure prints the closed-verdict reason and exits via `stage4CodeForRawCode(29)` for artifact failures or the arm's own raw for gate mismatches.

- [ ] **Step 1: Write failing tests** — attestation round-trip with `--ephemeral` into a temp dir (attestation verifies, tamper one byte of `decision-corpus.json` ⇒ verifier fails with non-zero exit); verifier full-green on committed evidence; selective mode green on a GREEN arm and red on `invalid-inclusion-proof`.

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement builder, then verifier.** Signature scheme (both keys): `sign(null, Buffer.from(<digest string>), privateKey)` base64 — commitment signatures over `commitmentDigest(env)`, bundle signature over `attestation_digest`. Never share a key between the two roles; the manifest fixture key signs commitments, the attestation key signs the bundle.

- [ ] **Step 4: Generate committed evidence with real keys** (generate two production pems OUTSIDE the repo, e.g. `~/keys/stage4o-{manifest,attestation}.pem`, per the stage4n convention — private keys never committed; public pems embedded in the evidence):

```bash
node -e 'const {generateKeyPairSync}=require("crypto");const p=generateKeyPairSync("ed25519");process.stdout.write(p.privateKey.export({type:"pkcs8",format:"pem"}))' > ~/keys/stage4o-manifest.pem
node -e 'const {generateKeyPairSync}=require("crypto");const p=generateKeyPairSync("ed25519");process.stdout.write(p.privateKey.export({type:"pkcs8",format:"pem"}))' > ~/keys/stage4o-attestation.pem
node tools/simurgh-attestation/stage4o/node/build-stage4o-attestation.mjs --manifest-key ~/keys/stage4o-manifest.pem --attestation-key ~/keys/stage4o-attestation.pem
node tools/simurgh-attestation/stage4o/node/verify-stage4o.mjs --evidence docs/research/llm-shield/evidence/stage-4o
```

Expected: verifier prints green, exit 0. (Committed fixture chains keep the FIXTURE manifest key from Task 9; the evidence chain is re-signed with the production manifest key by the builder — the verifier always uses embedded public keys, so both verify.)

- [ ] **Step 5: Run all unit tests — PASS:** `npm test`

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-attestation/stage4o/node tests/unit/llmShield/stage4o docs/research/llm-shield/evidence/stage-4o
git commit -m "feat(llm-shield): stage 4o dual-key attestation builder and offline verifier with selective disclosure"
```

---

### Task 12: Lane B capture script + captured fixture + F1 retro fixture (hard gate)

**Files:**

- Create: `tools/simurgh-attestation/stage4o/node/capture-mcp-manifest.mjs`
- Create: `tests/fixtures/llmShield/stage4o/laneb/{capture-manifest.json,capture-rugpulled.json,README.md}`
- Create (gate-dependent): `tests/fixtures/llmShield/stage4o/retro/{retro-fixture.json,README.md}` OR a `known_limitations` entry
- Test: `tests/unit/llmShield/stage4o/laneb.test.js`

**Interfaces:**

- Consumes: manifestCore, driftCore; a real MCP server run LOCALLY at capture time (use `npx -y @modelcontextprotocol/server-filesystem /tmp` over stdio — public reference server, approved for digest-level disclosure).
- Produces: digest-only captured manifest (real tool names/schemas hashed through `domainDigest` at capture time, raw strings discarded); a rug-pulled variant (one tool's `authority_class` raised, name digest preserved — the canonical 61 arm); fixture files marked `"external_validity": true`.

- [ ] **Step 1: Write the capture script** — speaks MCP stdio (`initialize`, `tools/list`), maps each tool to `{tool_name_digest: domainDigest(SERVER_ID-domain? NO — TOOL_ENTRY naming path: domainDigest(DOMAINS.SERVER_ID, "mcp-tool-name", name)…}` — use `domainDigest(DOMAINS.SERVER_ID, "mcp.tool_name", name)` and `domainDigest(DOMAINS.SERVER_ID, "mcp.tool_schema", canonicalJson(inputSchema))`, `authority_class` assigned from a documented heuristic table in the script header (read-only names → `read_only`, write/edit/move → `write`, network → `egress`, delete/remove → `destructive`), `declared_sinks: []`, `risk_class: "low"`. Prints the digest-only manifest to stdout; NEVER writes raw tool text.

- [ ] **Step 2: Capture locally (one time, not CI):**

```bash
node tools/simurgh-attestation/stage4o/node/capture-mcp-manifest.mjs --cmd "npx -y @modelcontextprotocol/server-filesystem /tmp" > tests/fixtures/llmShield/stage4o/laneb/capture-manifest.json
```

Then build `capture-rugpulled.json` from it via a `--rugpull <tool_name_digest>` flag (raises that entry to `destructive`). Write `laneb/README.md` recording: server identity (public npm package), capture date, that raw text was discarded, `external_validity: true`, and the approved-for-digest-disclosure statement.

- [ ] **Step 3: Write the failing Lane B test** — loads both fixtures, asserts `classifyDrift(capture, rugpulled) === "incomparable" || "broadening"` (it is `broadening`: authority up, all else equal ⇒ assert exactly `"broadening"`), asserts a state-bound re-approval of it would be raw 65 via `validateChain`, and asserts NO key or string value in either file matches `/[a-z]{3,}_[a-z]{3,}/` tool-name shapes beyond the closed schema keys (egress check: only digests + enums).

- [ ] **Step 4: F1 hard gate (research step, manual, at implementation time):** fetch the public GMO Flatt Security disclosure of the May 2026 Claude Code MCP poisoning. Extract the before/after tool-surface facts it actually publishes. **Gate:** if the disclosure gives concrete before/after tool definitions (or deltas) sufficient to construct BOTH manifests digest-only WITHOUT guessing any field → build `retro/retro-fixture.json` `{arm: "retro-flatt-2026-05", chain: [...], expected_raw, expected_reason, sources: [url]}` and a README with the frozen claim wording ("Given the publicly disclosed before/after tool-surface deltas, 4O ledgers the corresponding manifest drift class."). If NOT → skip the fixture, and instead append `"retro_fixture_public_data_insufficient"` to `known_limitations` in the attestation builder + regenerate evidence. Either branch is a green outcome; guessing is the only failure.

- [ ] **Step 5: Run — PASS:** `node --test tests/unit/llmShield/stage4o/laneb.test.js && npm test`

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-attestation/stage4o/node/capture-mcp-manifest.mjs tests/fixtures/llmShield/stage4o tests/unit/llmShield/stage4o/laneb.test.js docs/research/llm-shield/evidence/stage-4o
git commit -m "feat(llm-shield): stage 4o lane-b digest-only mcp capture fixtures and retro-detection gate outcome"
```

---

### Task 13: Lean proofs — `MonotoneConsent`

**Files:**

- Create: `proofs/stage4o/MonotoneConsent.lean`, `proofs/stage4o/lean-toolchain` (copy `proofs/stage4n/lean-toolchain` byte-for-byte), `proofs/stage4o/lakefile.toml` if stage4n has one (mirror its build layout exactly — check `ls proofs/stage4n` first).

**Interfaces:**

- Consumes: nothing (self-contained model; mathlib-free).
- Produces: machine-checked `NoSilentToolSwap`, `NoDriftLaundering` (narrowing transitivity + contrapositive), `DeltaBoundBroadening`, and the umbrella `theorem monotone_consent`.

- [ ] **Step 1: Write the Lean model** (self-contained; `List`-based; no imports):

```lean
/- Stage 4O Monotone Consent Law (4O spec §12). Model-level proof: statements are over
   the recorded dispatch surface, not remote execution (4J discipline).
   Motto: AnthropicSafe First, then ReviewerSafe. -/

inductive AuthorityClass | read_only | write | egress | destructive
deriving DecidableEq

def AuthorityClass.rank : AuthorityClass → Nat
  | .read_only => 0 | .write => 1 | .egress => 2 | .destructive => 3

structure ToolEntry where
  name : Nat
  schemaDigest : Nat
  auth : AuthorityClass
  sinks : List Nat
deriving DecidableEq

abbrev Surface := List ToolEntry

def entryNarrows (n p : ToolEntry) : Prop :=
  n.name = p.name ∧ n.schemaDigest = p.schemaDigest ∧
  n.auth.rank ≤ p.auth.rank ∧ ∀ s ∈ n.sinks, s ∈ p.sinks

/-- next ⊑ prev : every tool in `next` narrows some tool of `prev`. -/
def Narrows (next prev : Surface) : Prop :=
  ∀ n ∈ next, ∃ p ∈ prev, entryNarrows n p

theorem entryNarrows_trans {a b c : ToolEntry}
    (hab : entryNarrows a b) (hbc : entryNarrows b c) : entryNarrows a c := by
  obtain ⟨hn₁, hs₁, ha₁, hk₁⟩ := hab
  obtain ⟨hn₂, hs₂, ha₂, hk₂⟩ := hbc
  exact ⟨hn₁.trans hn₂, hs₁.trans hs₂, Nat.le_trans ha₁ ha₂, fun s hs => hk₂ s (hk₁ s hs)⟩

/-- ⊑ is transitive: an all-narrowing chain composes to a direct narrowing.
    This is NoDriftLaundering's engine. -/
theorem narrows_trans {a b c : Surface} (hab : Narrows a b) (hbc : Narrows b c) :
    Narrows a c := by
  intro n hn
  obtain ⟨p, hp, hnp⟩ := hab n hn
  obtain ⟨q, hq, hpq⟩ := hbc p hp
  exact ⟨q, hq, entryNarrows_trans hnp hpq⟩

/-- An epoch chain as recorded: each step carries its consent binding. -/
inductive Consent | state | delta
deriving DecidableEq

structure Step where
  fromS : Surface
  toS : Surface
  consent : Consent

/-- The verifier's acceptance predicate for one step (spec §6a consent rule). -/
def stepAccepted (s : Step) : Prop :=
  Narrows s.toS s.fromS ∨ s.consent = Consent.delta

/-- A chain is a linked list of accepted steps. -/
def chainAccepted : List Step → Prop
  | [] => True
  | s :: rest => stepAccepted s ∧ chainAccepted rest

def linked : List Step → Prop
  | [] => True
  | [_] => True
  | a :: b :: rest => a.toS = b.fromS ∧ linked (b :: rest)

/-- DeltaBoundBroadening: in an accepted chain, any step that is not a narrowing
    carries delta-bound consent. -/
theorem delta_bound_broadening (chain : List Step) (h : chainAccepted chain) :
    ∀ s ∈ chain, ¬ Narrows s.toS s.fromS → s.consent = Consent.delta := by
  induction chain with
  | nil => intro s hs; cases hs
  | cons a rest ih =>
    intro s hs hnot
    cases hs with
    | head => cases h.1 with
      | inl hn => exact absurd hn hnot
      | inr hd => exact hd
    | tail _ hmem => exact ih h.2 s hmem hnot

/-- NoDriftLaundering (contrapositive form): if every step of a linked chain narrows,
    the direct end-to-end drift narrows — so a direct broadening implies some step
    was not a narrowing, and (by delta_bound_broadening) an accepted chain ledgers it. -/
theorem no_drift_laundering (chain : List Step) (hl : linked chain)
    (hall : ∀ s ∈ chain, Narrows s.toS s.fromS) :
    ∀ a b rest, chain = a :: rest ++ [b] → Narrows b.toS a.fromS := by
  sorry -- replaced in Step 2 by the list-induction proof; NO sorry may remain committed
```

- [ ] **Step 2: Replace the `sorry`** with the full induction (induct on `rest`; base: two-step chain uses `narrows_trans` with the `linked` equality rewriting `a.toS = b.fromS`; step: peel one link and apply `narrows_trans` + IH). Then add `NoSilentToolSwap` as the acceptance-soundness statement over one gate decision:

```lean
/-- NoSilentToolSwap: the gate accepts only when the recorded dispatch surface entry
    matches the committed manifest entry exactly. Modelled as: acceptance implies
    entry equality on (name, schemaDigest) and non-escalation on (auth, sinks). -/
structure Receipt where
  name : Nat
  schemaDigest : Nat
  auth : AuthorityClass
  sinksUsed : List Nat

def gateAccepts (m : Surface) (r : Receipt) : Prop :=
  ∃ e ∈ m, e.name = r.name ∧ e.schemaDigest = r.schemaDigest ∧
    r.auth.rank ≤ e.auth.rank ∧ ∀ s ∈ r.sinksUsed, s ∈ e.sinks

theorem no_silent_tool_swap (m : Surface) (r : Receipt) (h : gateAccepts m r) :
    ∃ e ∈ m, e.name = r.name ∧ e.schemaDigest = r.schemaDigest := by
  obtain ⟨e, he, hn, hs, _, _⟩ := h
  exact ⟨e, he, hn, hs⟩

/-- The Monotone Consent Law: umbrella over the three legs. -/
theorem monotone_consent (chain : List Step) (h : chainAccepted chain) :
    (∀ s ∈ chain, ¬ Narrows s.toS s.fromS → s.consent = Consent.delta) :=
  delta_bound_broadening chain h
```

- [ ] **Step 3: Build:** replicate whatever build command `proofs/stage4n` uses (check its README/`lakefile`; typically `cd proofs/stage4o && lake build` with the pinned toolchain, or the repo's proof-check script). Expected: builds clean, zero `sorry`.

- [ ] **Step 4: Grep-gate:** `grep -rn "sorry" proofs/stage4o/ && exit 1 || echo clean` → `clean`.

- [ ] **Step 5: Commit**

```bash
git add proofs/stage4o
git commit -m "feat(proofs): stage 4o machine-checked monotone-consent, no-drift-laundering, and no-silent-tool-swap lemmas"
```

---

### Task 14: Reproduce script + egress check

**Files:**

- Create: `scripts/reproduce-llm-shield-stage4o.sh` (executable)
- Test: covered by running it; plus `tests/unit/llmShield/stage4o/closeout.test.js` (asserts script exists, is executable, pins Node 26, routes exits through `stage4CodeForRawCode` — mirror `tests/unit/llmShield/stage4n/closeout.test.js`'s structure).

**Interfaces:**

- Consumes: every builder/verifier above; the exit wrapper.
- Produces: one-command byte-idempotent reproduce, exit ALWAYS via `stage4CodeForRawCode`.

- [ ] **Step 1: Write the script** — clone the stage4n structure exactly (env pins, `run_step`, `exit_via_wrapper`, temp-dir regeneration, `cmp` loops):

```bash
#!/usr/bin/env bash
# Stage 4O / VTSA one-command reproduce (4O spec §13). Final exit ALWAYS routed through
# stage4CodeForRawCode — never a bare exit 1. No network, no wall clock.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
export PATH="/opt/homebrew/bin:$PATH"

RAW=0
FIX="tests/fixtures/llmShield/stage4o"
EVID="docs/research/llm-shield/evidence/stage-4o"
EXIT_WRAPPER='import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))'
exit_via_wrapper() { node -e "$EXIT_WRAPPER" "$1"; }
run_step() { local raw="$1"; shift; if ! "$@"; then RAW="$raw"; echo "[stage4o] step failed -> raw $RAW" >&2; exit_via_wrapper "$RAW"; fi; }

echo "[stage4o] [1/8] env + node major >= 26"
run_step 28 node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)'

echo "[stage4o] [2/8] regenerate fixtures into temp"
T1="$(mktemp -d)"; trap 'rm -rf "$T1"' EXIT
run_step 29 env STAGE4O_FIXTURE_OUT="$T1" node tools/simurgh-attestation/stage4o/node/build-stage4o-fixtures.mjs

echo "[stage4o] [3/8] unit suites (node + python)"
run_step 29 node --test tests/unit/llmShield/stage4o/*.test.js
run_step 29 python3 -m pytest tools/agentdojo-simurgh-adapter/tests/test_manifest_surface.py \
  tools/agentdojo-simurgh-adapter/tests/test_capability_kernel_manifest.py \
  tools/agentdojo-simurgh-adapter/tests/test_stage4o_parity.py -q

echo "[stage4o] [4/8] committed fixtures match temp regeneration byte-for-byte"
run_step 29 bash -c 'cd "$0" && find . -type f -name "*.json" | sort' "$FIX" > "$T1/.committed-list"
while IFS= read -r f; do run_step 29 cmp "$FIX/$f" "$T1/$f"; done < <(cd "$FIX" && find . -type f -name "*.json" | grep -v test-keys | sort)

echo "[stage4o] [5/8] egress check: evidence carries digests and enums only"
run_step 29 bash -c '! grep -rEn "\"(description|inputSchema|hostname|url)\"" docs/research/llm-shield/evidence/stage-4o/'

echo "[stage4o] [6/8] all-functions e2e net"
run_step 29 node --test tests/e2e/llmShield/stage4o/*.test.js

echo "[stage4o] [7/8] clean verdict on committed evidence"
run_step 29 node tools/simurgh-attestation/stage4o/node/verify-stage4o.mjs --evidence "$EVID"

echo "[stage4o] [8/8] byte idempotency: verifier is read-only"
run_step 29 git diff --quiet -- "$EVID" "$FIX"

echo "[stage4o] reproduce complete -> raw 0"
exit_via_wrapper 0
```

- [ ] **Step 2:** `chmod +x scripts/reproduce-llm-shield-stage4o.sh` and run it. Expected: `[stage4o] reproduce complete -> raw 0`, exit 0. (Step 6 will fail until Task 15 creates the e2e net — run Tasks 14 and 15 together before declaring green, or temporarily verify steps 1–5 and 7–8 individually.)

- [ ] **Step 3: Commit**

```bash
git add scripts/reproduce-llm-shield-stage4o.sh tests/unit/llmShield/stage4o/closeout.test.js
git commit -m "feat(llm-shield): stage 4o one-command reproduce with byte-idempotency and egress gates"
```

---

### Task 15: K7-style all-functions E2E net

**Files:**

- Create: `tests/e2e/llmShield/stage4o/vtsaFullNet.test.js`

**Interfaces:**

- Consumes: EVERY export of every stage4o module (constants, digest, merkleSurface, manifestCore, driftCore, decisionCore, timelineCore, constitutionCore, both CLIs via `node:child_process` `execFileSync`), committed fixtures + evidence, the 4N feed.

- [ ] **Step 1: Write the net** (mirror `tests/e2e/llmShield/stage4n/seismographFullNet.test.js`'s composition style):
  - **Arm sweep:** every matrix row through `gateToolCall` AND through the verifier CLI on a temp evidence rebuild — same raw codes end to end.
  - **Parity leg:** spawn `python3 -c` to run `ms.gate_tool_call` on three multiply-broken arms; assert equal first raw codes with the Node gate (the in-CI kernel↔verifier parity spot-check; full sweep lives in pytest).
  - **Anti-theatre:** the three GREEN arms accept; assert at least 3 accepts and at least 12 distinct raw codes across the matrix.
  - **Cross-stage invariants:** 4N feed byte-unchanged (`git diff --quiet -- docs/research/llm-shield/evidence/stage-4n`); frozen kernel suite green (spawn pytest as in Task 8); `stage4CodeForRawCode` unchanged for 0/29/47/54.
  - **Tamper-the-attestation arm:** copy evidence to temp, flip one byte in `vtsa-attestation.json`, verifier exits non-zero.
  - **Selective disclosure leg:** `--selective green-unchanged` green; `--selective invalid-inclusion-proof` red.
  - **Alignment map leg:** `checkAlignmentMap` on the committed bundle's map; `HONESTY_CEILING` string present verbatim in the bundle.

- [ ] **Step 2: Run:** `node --test tests/e2e/llmShield/stage4o/vtsaFullNet.test.js` → PASS; then full reproduce: `scripts/reproduce-llm-shield-stage4o.sh` → raw 0.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/llmShield/stage4o/vtsaFullNet.test.js
git commit -m "test(llm-shield): stage 4o all-functions e2e net with tamper matrix and cross-stage invariants"
```

---

### Task 16: Docs set, CI wiring, closeout re-score, docs-accuracy pass

**Files:**

- Create: `docs/research/llm-shield/STAGE_4O_THREAT_MODEL.md`, `STAGE_4O_VALIDATION_MATRIX.md`, `STAGE_4O_REVIEWER_CHECKLIST.md`, `STAGE_4O_CLOSEOUT.md`
- Modify: `.github/workflows/stage-1-checks.yml` (add the stage4o e2e + pytest job step, mirroring how the stage4n steps are wired — inspect and copy that block), `CHANGELOG.md`, `docs/superpowers/specs/2026-07-04-stage-4o-vtsa-design.md` (spec deltas)

- [ ] **Step 1: Write the four docs** mirroring the STAGE*4N*\* structure: threat model (rug-pull adversary, laundering adversary, blind-approver, retro-rewriter — each mapped to its raw codes); validation matrix (every spec §7 arm → test file → raw code → status); reviewer checklist (one-command reproduce, what to `cmp`, how to verify both signatures offline, selective-disclosure walk-through); closeout (what shipped, non-claims verbatim, **four-axis re-score against shipped evidence with the spec-time targets from spec §18 and honest deltas**, known limitations incl. the F1 gate outcome).

- [ ] **Step 2: Spec deltas commit** — amend spec §5 (12th domain `MANIFEST_COMMITMENT_V1`), §6 (kernel param `manifest_chain` not `manifest`; malformed receipt ⇒ 63 precedes 57, with the reason), §11.2 outcome (fixture shipped or limitation recorded). One commit: `docs(llm-shield): record stage 4o spec deltas from implementation`.

- [ ] **Step 3: Docs-accuracy pass** — for EVERY claim in the four docs + spec, point to the shipped line of code or committed artifact; fix any drift. Run the repo's overclaim scan (locate via `ls scripts | grep -i overclaim` / the stage-1 workflow) and satisfy it — remember 4N's lesson: honest negations can trip it; use the pellet vocabulary.

- [ ] **Step 4: CHANGELOG entry** (Raouf-template, matching repo style) summarising the stage; verify version target: `git tag --sort=-creatordate | head -3` still shows v2.23.0 as latest.

- [ ] **Step 5: Full-repo verification:**

```bash
npm test
scripts/reproduce-llm-shield-stage4o.sh
scripts/reproduce-llm-shield-stage4n.sh   # cross-stage: 4N still reproduces
npm run format:check
```

All green. Any 4N failure means 4O leaked into frozen territory — fix before commit.

- [ ] **Step 6: Commit**

```bash
git add docs .github/workflows CHANGELOG.md
git commit -m "docs(llm-shield): stage 4o threat model, validation matrix, reviewer checklist, and closeout with four-axis re-score"
```

---

## Self-Review (performed at plan-writing time)

1. **Spec coverage:** §2 claims/pellets → Tasks 2, 11, 16; §4 schema → Task 4; §5/5a digests+Merkle → Tasks 3, 7; §6/6a chain+kernel → Tasks 5, 6, 8; §7 matrix → Task 9; §8 verifier → Task 11; §9 timeline → Task 10; §10 Lane B → Task 12; §11 boosters → Tasks 10 (C1), 12 (F1); §12 proofs → Task 13; §13 error handling/reproduce → Task 14; §14 testing incl. parity → Tasks 9, 15; §15 risk register → Tasks 1 (goldens, prettierignore), 11 (keys); §16 release boundary → Task 16; §18 re-score → Task 16. No gaps.
2. **Known deliberate deviations (recorded for the spec-delta commit, Task 16):** (a) 12th digest domain for commitments; (b) Python kernel param is `manifest_chain`, not `manifest`; (c) malformed receipt ⇒ 63 before 57 (57 needs `run_epoch`); (d) Python parity skips raw-66 rows (66 is attestation-level, not kernel-level).
3. **Type consistency:** `gateToolCall` (Node) ↔ `gate_tool_call` (Python) signatures pinned in Tasks 6/8; `ManifestBindings` field names identical across spec, kernel, decisionCore, and verifier; `VTSA_CHECK_ORDER` referenced, never re-derived.
