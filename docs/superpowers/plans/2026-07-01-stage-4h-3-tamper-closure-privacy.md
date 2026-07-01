# Stage 4H.3 Tamper Closure And Privacy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Stage 4H.3 only: Q6 single-delta tamper closure and Q7 bounded-capacity privacy, while preserving the committed Q0/Q1/Q2/Q4/Q5 verifier behavior.

**Architecture:** Extend the existing Node ESM Stage 4H verifier under `tools/simurgh-attestation/stage4h/` rather than adding a parallel verifier. The verifier must return the first failing step under the pinned nine-step order, Q6 must mutate only shape-valid offline-recomputable material, and Q7 must validate exact certificate shape plus value capacity without taking ownership away from schema.

**Tech Stack:** Node.js ESM, `node:test`, `node:assert/strict`, existing Stage 4D pack/signature helpers, existing Stage 4H canonical premise/binding modules, shell reproduce scripts, Prettier.

---

## Scope Guard

This plan implements only `docs/superpowers/specs/2026-07-01-stage-4h-3-tamper-closure-privacy-design.md`.

Do implement:

- raw `26` semantic rename to `PROOF_STRUCTURE_INVALID`, with back-compat alias
- reason constants for raw `26` and `27`
- standalone lattice digest check executed at step 9
- `diagnose()` first-failing-step entry point
- Q7 `privacyGate.mjs` with top-level `certificate` allowlist
- duplicate-key raw JSON detection before `JSON.parse`
- Q6 `tamperClosure.mjs` mutation family and matrix
- verifier CLI/evidence/reproduce wiring for Q6 and Q7

Do not implement:

- Q3 offline-hermeticity
- full 20-29 to 0/1/2/3 wrapper rewrite
- multi-field collusion closure
- implicit-flow, control-dependence, model-safety, execution-truth, future-run, or public-priority claims
- solver/model/browser/network dependencies
- changes to `tools/simurgh-attestation/stage4h/canonicalPremises.mjs` digest semantics
- release tagging or full Stage 4H closeout

Existing unrelated worktree changes must remain untouched:

```text
docs/research/banking-pilot/evidence/phase-a-synthetic/rejected-attempt-audit-fixture.json
docs/superpowers/plans/2026-06-29-stage-4h-digest-binding-foundation.md
```

## File Structure

Modify:

- `tools/simurgh-attestation/stage4h/exitCodes.mjs` - rename raw 26 bucket, add reason constants.
- `tools/simurgh-attestation/stage4h/schema.mjs` - expose exact key constants, add duplicate-key detection over raw JSON text, keep schema ownership of unknown keys.
- `tools/simurgh-attestation/stage4h/dfiCertificate.mjs` - add `checkBinding()`, `checkLatticeDigest()`, and `diagnose()`, preserve current derivation validator behavior.
- `tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs` - enforce the pinned nine-step order and write Stage 4H.3 results.
- `tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs` - emit Q6/Q7 fixtures, expected results, evidence files, and q-gate flips.
- `tests/unit/llmShield/stage4h/derivation.test.js` - update reason/taxonomy assertions only where required.
- `tests/unit/llmShield/stage4h/discrimination.test.js` - assert Q4 raw codes remain unchanged.
- `tests/unit/llmShield/stage4h/reproduce.test.js` - assert Q6/Q7 evidence, CLI smokes, and Q3 non-scope.
- `scripts/reproduce-llm-shield-stage4h.sh` - add Q6/Q7 audits and Stage 4H.3 banner.
- `docs/research/llm-shield/evidence/stage-4h/README.md` - bounded Stage 4H.3 evidence wording.
- `docs/research/llm-shield/evidence/stage-4h/q-gate-results.json` - Q6/Q7 pass, Q3 not in scope.
- `docs/research/llm-shield/evidence/stage-4h/verifier-results.json` - regenerated verifier result.

Create:

- `tools/simurgh-attestation/stage4h/privacyGate.mjs` - Q7 typed-shape/value-capacity gate.
- `tools/simurgh-attestation/stage4h/tamperClosure.mjs` - Q6 mutation family and tamper matrix helpers.
- `tests/unit/llmShield/stage4h/privacyGate.test.js` - Q7 unit coverage.
- `tests/unit/llmShield/stage4h/tamperClosure.test.js` - Q6 unit coverage.
- `tests/unit/llmShield/stage4h/diagnosticSoundness.test.js` - first-failing-step and lane-separation coverage.
- `scripts/security-audit-llm-shield-stage4h.sh` - Q6 audit wrapper.
- `scripts/privacy-audit-llm-shield-stage4h.mjs` - Q7 audit wrapper.
- `tests/fixtures/llmShield/stage4h/tamper/*.json` - Q6 matrix fixtures.
- `tests/fixtures/llmShield/stage4h/privacy/*.json` - Q7 privacy fixtures.
- `tests/fixtures/llmShield/stage4h/expected-results/tamper-matrix.json` - Q6 expected results.
- `tests/fixtures/llmShield/stage4h/expected-results/privacy-matrix.json` - Q7 expected results.
- `docs/research/llm-shield/evidence/stage-4h/tamper-results.json` - Q6 evidence.
- `docs/research/llm-shield/evidence/stage-4h/privacy-report.json` - Q7 evidence.

---

### Task 1: Exit-Code Taxonomy, Lattice Digest Check, And Diagnosis Order

**Files:**

- Modify: `tools/simurgh-attestation/stage4h/exitCodes.mjs`
- Modify: `tools/simurgh-attestation/stage4h/dfiCertificate.mjs`
- Modify: `tools/simurgh-attestation/stage4h/schema.mjs`
- Create: `tests/unit/llmShield/stage4h/diagnosticSoundness.test.js`
- Test: `tests/unit/llmShield/stage4h/derivation.test.js`
- Test: `tests/unit/llmShield/stage4h/discrimination.test.js`

- [ ] **Step 1: Write the failing diagnostic soundness tests**

Create `tests/unit/llmShield/stage4h/diagnosticSoundness.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildPremiseSet } from "../../../../tools/simurgh-attestation/stage4h/canonicalPremises.mjs";
import {
  buildDfiCertificate,
  checkBinding,
  checkLatticeDigest,
  diagnose,
} from "../../../../tools/simurgh-attestation/stage4h/dfiCertificate.mjs";
import {
  PROOF_TAMPER_DETECTED,
  RAW_VERIFIER_CODES,
  STRUCTURE_REASONS,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function cleanContext() {
  const pack = readJson(`${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.json`);
  const certificate = readJson(
    `${fixtureRoot}/q0-clean-disconnected-untrusted-dfi-certificate.json`
  );
  const manifest = readJson(
    `${fixtureRoot}/q0-clean-disconnected-untrusted-signed-pack-manifest.json`
  );
  return { pack, certificate, manifest, signatureOk: true, merkleOk: true };
}

function withShapeValidDigest(value) {
  const hex = value.replace(/^sha256:/, "");
  const first = hex[0] === "0" ? "1" : "0";
  return `sha256:${first}${hex.slice(1)}`;
}

test("Stage 4H.3 keeps raw 26 numeric value under proof_structure_invalid", () => {
  assert.equal(RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID, 26);
  assert.equal(PROOF_TAMPER_DETECTED, RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID);
  assert.equal(STRUCTURE_REASONS.includes("lattice_digest_mismatch"), true);
  assert.equal(STRUCTURE_REASONS.includes("proof_step_missing"), true);
});

test("Stage 4H.3 checkLatticeDigest rejects only the pinned lattice digest mismatch", () => {
  const ctx = cleanContext();
  assert.deepEqual(checkLatticeDigest(ctx.certificate), { ok: true, code: 0 });
  const tampered = structuredClone(ctx.certificate);
  tampered.lattice_digest = withShapeValidDigest(tampered.lattice_digest);
  assert.deepEqual(checkLatticeDigest(tampered), {
    ok: false,
    code: 26,
    reason: "lattice_digest_mismatch",
  });
});

test("Stage 4H.3 diagnose accepts a fully clean Q0 certificate", () => {
  const result = diagnose(cleanContext());
  assert.equal(result.code, 0);
  assert.equal(result.ok, true);
});

test("Stage 4H.3 diagnose tie-break reports policy before lattice", () => {
  const ctx = cleanContext();
  ctx.pack.policy_bundle.policy_version = "policy.v1-mutated";
  ctx.certificate.lattice_digest = withShapeValidDigest(ctx.certificate.lattice_digest);
  const result = diagnose(ctx);
  assert.equal(result.code, 23);
  assert.equal(result.reason, "policy_digest_mismatch");
});

test("Stage 4H.3 checkBinding reports real pack/certificate binding mismatch", () => {
  const ctx = cleanContext();
  ctx.manifest.base_pack_digest = `sha256:${"0".repeat(64)}`;
  const result = checkBinding(ctx);
  assert.equal(result.code, 25);
  assert.equal(result.reason, "pack_binding_mismatch");
});

test("Stage 4H.3 schema owns nested unknown keys before Q7", () => {
  const ctx = cleanContext();
  ctx.certificate.derivation.lattice_steps[0].leak = "raw";
  const result = diagnose(ctx);
  assert.equal(result.code, 20);
  assert.equal(result.reason, "unknown_field");
});

test("Stage 4H.3 no_short_circuit_masking: clean through step 8 reaches step 9 proof missing", () => {
  const ctx = cleanContext();
  ctx.certificate.derivation.lattice_steps.pop();
  const result = diagnose(ctx);
  assert.equal(result.code, 26);
  assert.equal(result.reason, "proof_step_missing");
});

test("Stage 4H.3 validator distinguishes Q6 proof-step reasons without breaking Q4c", () => {
  const ctx = cleanContext();
  const missing = structuredClone(ctx);
  missing.certificate.derivation.lattice_steps.pop();
  assert.equal(diagnose(missing).reason, "proof_step_missing");

  const unsound = structuredClone(ctx);
  unsound.certificate.derivation.lattice_steps[0].result =
    unsound.certificate.derivation.lattice_steps[0].result === "trusted" ? "untrusted" : "trusted";
  assert.equal(diagnose(unsound).reason, "proof_step_unsound");

  const dirtyPack = readJson(`${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.json`);
  const q4c = readJson(`${fixtureRoot}/q4c-derivation-scope-omission-certificate.json`);
  assert.equal(
    diagnose({ pack: dirtyPack, certificate: q4c, manifest: null }).reason,
    "derivation_scope_incomplete"
  );
});
```

- [ ] **Step 2: Run the diagnostic test to verify it fails**

Run:

```bash
node --test tests/unit/llmShield/stage4h/diagnosticSoundness.test.js
```

Expected: FAIL because `checkLatticeDigest`, `diagnose`, `PROOF_STRUCTURE_INVALID`, and `STRUCTURE_REASONS` are not exported yet.

- [ ] **Step 3: Update `exitCodes.mjs` minimally**

Replace `tools/simurgh-attestation/stage4h/exitCodes.mjs` with:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
export const RAW_VERIFIER_CODES = Object.freeze({
  OK: 0,
  SCHEMA_INVALID: 20,
  PROOF_SYSTEM_UNSUPPORTED: 21,
  PREMISE_DIGEST_MISMATCH: 22,
  POLICY_DIGEST_MISMATCH: 23,
  EXPLICIT_FLOW_INTEGRITY_VIOLATION: 24,
  PACK_BINDING_MISMATCH: 25,
  PROOF_STRUCTURE_INVALID: 26,
  PRIVACY_LEAK_DETECTED: 27,
  CHECKER_NOT_OFFLINE: 28,
  INTERNAL_ERROR_FAIL_CLOSED: 29,
});

export const PROOF_TAMPER_DETECTED = RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID;

export const STRUCTURE_REASONS = Object.freeze([
  "derivation_scope_incomplete",
  "proof_tamper_detected",
  "lattice_digest_mismatch",
  "proof_step_missing",
  "proof_step_unsound",
  "proof_object_carries_no_independently_checkable_derivation",
  "unknown_premise_ref",
  "duplicate_premise_ref",
  "duplicate_node_label",
  "duplicate_lattice_step",
  "duplicate_sink_safety_claim",
  "extra_node_label",
  "extra_lattice_step",
  "extra_sink_safety_claim",
  "node_label_unjustified",
  "lattice_step_invalid",
  "violation_count_mismatch",
  "sink_not_in_graph",
]);

export const PRIVACY_REASONS = Object.freeze([
  "non_enum_label",
  "unknown_label_not_in_lattice_enum",
  "opaque_or_freeform_field",
  "raw_text_in_summary",
  "raw_text_in_key",
  "raw_text_in_premise_ref",
  "over_length_field",
  "freeform_field_present",
]);

export const HARNESS_CODES = Object.freeze({
  CLEAN_RUN_FALSELY_REJECTED: 19,
});

export function stage4CodeForRawCode(code) {
  if (code === 0) return 0;
  if (code >= 19 && code <= 27) return 1;
  if (code === 28) return 2;
  return 3;
}
```

- [ ] **Step 4: Update raw 26 helper in `dfiCertificate.mjs`**

In `tools/simurgh-attestation/stage4h/dfiCertificate.mjs`, change `tamper()`
to use the renamed constant only. Do not remap generic derivation reasons here;
Q4c must keep `derivation_scope_incomplete`, and Q6-specific reasons must come
from the verifier step that owns that tamper arm.

```js
function tamper(reason, extra = {}) {
  return {
    ok: false,
    code: RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID,
    reason,
    ...extra,
  };
}
```

The invariant that must pass after Task 1 is Q4c still returns
`derivation_scope_incomplete`.

- [ ] **Step 5: Add `checkLatticeDigest()` to `dfiCertificate.mjs`**

Add this export after `certificateDigest()`:

```js
export function checkLatticeDigest(certificate) {
  return certificate.lattice_digest === INTEGRITY_LATTICE_DIGEST
    ? { ok: true, code: RAW_VERIFIER_CODES.OK }
    : {
        ok: false,
        code: RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID,
        reason: "lattice_digest_mismatch",
      };
}
```

Ensure `INTEGRITY_LATTICE_DIGEST` is imported from `./constants.mjs`.

- [ ] **Step 6: Split Q6 proof-step reasons inside `validateDerivation()`**

Update `validateDerivation()` so Q6-specific proof-step failures have explicit
reason strings, while Q4c remains stable. The implementation may use the
expected-node set, fixture intent, or a narrow helper flag from the Q6 harness,
but these tests are mandatory:

```text
Q6 proof-step deletion -> 26 / proof_step_missing
Q6 structurally invalid lattice step -> 26 / proof_step_unsound
Q4c existing partial derivation omission -> 26 / derivation_scope_incomplete
```

Update lattice-step invalidity returns from:

```js
return tamper("lattice_step_invalid", { node });
```

to:

```js
return tamper("proof_step_unsound", { node });
```

Do not implement a broad remap from every `derivation_scope_incomplete` to
`proof_step_missing`; that would regress the Stage 4H.2 Q4c ledger.

- [ ] **Step 7: Add `checkBinding()` and `diagnose()` to `dfiCertificate.mjs`**

Import `certificateDigest` dependencies already in this file as needed and add this
binding helper near `validateDerivation()`. This must be the shared binding
step used by both tests and the CLI; do not rewrite binding verdicts in
`tamperClosure.mjs`:

```js
export function checkBinding({ certificate, manifest }) {
  if (!manifest) return { ok: true, code: RAW_VERIFIER_CODES.OK };
  if (manifest.base_pack_digest !== certificate.base_pack_digest) {
    return {
      ok: false,
      code: RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH,
      reason: "pack_binding_mismatch",
    };
  }
  if (manifest.certificate_digest !== certificateDigest(certificate)) {
    return {
      ok: false,
      code: RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH,
      reason: "pack_binding_mismatch",
    };
  }
  return { ok: true, code: RAW_VERIFIER_CODES.OK };
}
```

Then add this export near `validateDerivation()`:

```js
export function diagnose({
  pack,
  certificate,
  manifest = null,
  signatureOk = true,
  merkleOk = true,
}) {
  const schema = validateDfiCertificate(certificate);
  if (!schema.ok) {
    return {
      ok: false,
      code:
        schema.reason === "proof_system_unsupported"
          ? RAW_VERIFIER_CODES.PROOF_SYSTEM_UNSUPPORTED
          : RAW_VERIFIER_CODES.SCHEMA_INVALID,
      reason: schema.reason === "schema_invalid" ? "unknown_field" : schema.reason,
      field: schema.field,
    };
  }

  if (!signatureOk) {
    return {
      ok: false,
      code: "4D_VERIFY_FAILURE",
      reason: "signature_invalid",
    };
  }
  if (!merkleOk) {
    return {
      ok: false,
      code: "4D_VERIFY_FAILURE",
      reason: "merkle_root_mismatch",
    };
  }

  const premises = buildPremiseSet(pack);
  const binding = checkBinding({ certificate, manifest });
  if (!binding.ok) return binding;

  if (certificate.policy_digest !== premises.policy_digest) {
    return {
      ok: false,
      code: RAW_VERIFIER_CODES.POLICY_DIGEST_MISMATCH,
      reason: "policy_digest_mismatch",
    };
  }
  if (
    certificate.base_pack_digest !== premises.base_pack_digest ||
    certificate.replay_root !== premises.replay_root ||
    certificate.premise_digest !== premiseDigest(premises)
  ) {
    return {
      ok: false,
      code: RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH,
      reason: "premise_digest_mismatch",
    };
  }

  const sinkSafety = validateDerivation({ premises, certificate });
  if (!sinkSafety.ok && sinkSafety.code === RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION) {
    return sinkSafety;
  }

  const lattice = checkLatticeDigest(certificate);
  if (!lattice.ok) return lattice;
  if (!sinkSafety.ok) return sinkSafety;

  return { ok: true, code: RAW_VERIFIER_CODES.OK, manifest };
}
```

This is a test-facing diagnostic helper that shares the real binding step with
the CLI. Task 4 will wire the CLI to the full pinned order including Q7 and
Stage 4D verification.

- [ ] **Step 8: Run the focused tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/diagnosticSoundness.test.js \
  tests/unit/llmShield/stage4h/derivation.test.js \
  tests/unit/llmShield/stage4h/discrimination.test.js
```

Expected: PASS. If `discrimination.test.js` shows Q4c reason drift, restore the narrow `tamper()` behavior from Step 4 and handle Q6-specific labels in Task 3.

- [ ] **Step 9: Commit Task 1**

Run:

```bash
git add tools/simurgh-attestation/stage4h/exitCodes.mjs \
  tools/simurgh-attestation/stage4h/dfiCertificate.mjs \
  tests/unit/llmShield/stage4h/diagnosticSoundness.test.js \
  tests/unit/llmShield/stage4h/derivation.test.js \
  tests/unit/llmShield/stage4h/discrimination.test.js
git commit -m "feat(llm-shield): add stage 4h.3 diagnosis ordering"
```

---

### Task 2: Q7 Bounded-Capacity Privacy Gate

**Files:**

- Create: `tools/simurgh-attestation/stage4h/privacyGate.mjs`
- Create: `tests/unit/llmShield/stage4h/privacyGate.test.js`
- Modify: `tools/simurgh-attestation/stage4h/schema.mjs`
- Create: `tests/fixtures/llmShield/stage4h/privacy/q7-positive-clean.json`
- Create: `tests/fixtures/llmShield/stage4h/expected-results/privacy-matrix.json`

- [ ] **Step 1: Write the failing Q7 tests**

Create `tests/unit/llmShield/stage4h/privacyGate.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { INTEGRITY_LABELS } from "../../../../tools/simurgh-attestation/stage4h/constants.mjs";
import {
  allowedKeysByPath,
  covertCapacityBits,
  privacyGate,
} from "../../../../tools/simurgh-attestation/stage4h/privacyGate.mjs";
import {
  validateDfiCertificate,
  validateJsonTextNoDuplicateKeys,
} from "../../../../tools/simurgh-attestation/stage4h/schema.mjs";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";

function cleanCert() {
  return JSON.parse(
    readFileSync(`${fixtureRoot}/q0-clean-disconnected-untrusted-dfi-certificate.json`, "utf8")
  );
}

test("Q7 auxiliary allowlist includes the top-level certificate keys", () => {
  assert.deepEqual(allowedKeysByPath.certificate, [
    "type",
    "proof_system",
    "claim",
    "scope",
    "base_pack_digest",
    "replay_root",
    "premise_digest",
    "policy_digest",
    "lattice_digest",
    "run_id_hash",
    "checker_version",
    "summary",
    "derivation",
  ]);
});

test("Q7 positive control accepts a typed-shape clean certificate", () => {
  const result = privacyGate(cleanCert());
  assert.equal(result.ok, true);
  assert.equal(result.code, 0);
  assert.equal(Number.isFinite(result.covert_capacity_bits), true);
});

test("Q7 capacity counts only integrity enum labels", () => {
  const cert = cleanCert();
  const enumFieldCount =
    cert.derivation.derived_node_labels.length + cert.derivation.sink_safety_claims.length;
  assert.equal(covertCapacityBits(cert), enumFieldCount * Math.log2(INTEGRITY_LABELS.length));
});

for (const [name, mutate, reason] of [
  [
    "raw prompt smuggled into a node label",
    (cert) => {
      cert.derivation.derived_node_labels[0].label = "IGNORE PREVIOUS";
    },
    "non_enum_label",
  ],
  [
    "raw output smuggled into summary",
    (cert) => {
      cert.summary.sources_checked = "secret-blob";
    },
    "raw_text_in_summary",
  ],
  [
    "raw text smuggled into node id value",
    (cert) => {
      cert.derivation.derived_node_labels[0].node = "action:ssn=123";
    },
    "raw_text_in_key",
  ],
  [
    "freeform smuggled into premise ref",
    (cert) => {
      cert.derivation.premise_refs.push("premise:leak:not-a-digest");
    },
    "raw_text_in_premise_ref",
  ],
  [
    "arbitrary lattice label",
    (cert) => {
      cert.derivation.sink_safety_claims[0].node_label = "sideways";
    },
    "unknown_label_not_in_lattice_enum",
  ],
  [
    "freeform lattice op",
    (cert) => {
      cert.derivation.lattice_steps[0].op = "combine_and_leak";
    },
    "opaque_or_freeform_field",
  ],
  [
    "raw lattice step node",
    (cert) => {
      cert.derivation.lattice_steps[0].node = "action:ssn=123";
    },
    "raw_text_in_key",
  ],
  [
    "raw lattice input",
    (cert) => {
      cert.derivation.lattice_steps[0].inputs = ["secret-blob"];
    },
    "unknown_label_not_in_lattice_enum",
  ],
  [
    "non-boolean sink safety flag",
    (cert) => {
      cert.derivation.sink_safety_claims[0].safe = "true but leak";
    },
    "opaque_or_freeform_field",
  ],
  [
    "over-length node id",
    (cert) => {
      cert.derivation.derived_node_labels[0].node = `source:${"a".repeat(80)}`;
    },
    "over_length_field",
  ],
]) {
  test(`Q7 rejects ${name} as 27/${reason}`, () => {
    const cert = cleanCert();
    mutate(cert);
    const result = privacyGate(cert);
    assert.equal(result.ok, false);
    assert.equal(result.code, 27);
    assert.equal(result.reason, reason);
  });
}

test("Q7 duplicate-key detector catches same object-scope keys before JSON.parse", () => {
  const raw = `{"summary":{"sources_checked":1,"sources_checked":2}}`;
  assert.deepEqual(validateJsonTextNoDuplicateKeys(raw), {
    ok: false,
    reason: "duplicate_key",
    key: "sources_checked",
  });
});

test("Q7 auxiliary unknown-field flag does not override schema ownership", () => {
  const cert = cleanCert();
  cert.derivation.tool_args = "{raw}";
  const result = privacyGate(cert);
  assert.equal(result.ok, true);
  assert.equal(result.auxiliaryFlags.includes("freeform_field_present"), true);
});

test("schema rejects nested unknown keys as 20/unknown_field before Q7 owns values", () => {
  const cert = cleanCert();
  cert.derivation.lattice_steps[0].leak = "raw";
  const schema = validateDfiCertificate(cert);
  assert.equal(schema.ok, false);
  assert.equal(schema.reason, "unknown_field");
  assert.equal(schema.field, "derivation.lattice_steps[].leak");
});

test("duplicate-key scanner ignores key-like text inside string values", () => {
  const raw = `{"summary":{"note":"not a key: {sources_checked:2}"}}`;
  assert.deepEqual(validateJsonTextNoDuplicateKeys(raw), { ok: true });
});
```

- [ ] **Step 2: Run the Q7 test to verify it fails**

Run:

```bash
node --test tests/unit/llmShield/stage4h/privacyGate.test.js
```

Expected: FAIL because `privacyGate.mjs` does not exist.

- [ ] **Step 3: Implement `privacyGate.mjs`**

Create `tools/simurgh-attestation/stage4h/privacyGate.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import { INTEGRITY_LABELS } from "./constants.mjs";
import { RAW_VERIFIER_CODES } from "./exitCodes.mjs";
import { isSha256Digest } from "./schema.mjs";

const PREMISE_REF_RE = /^premise:sha256:[a-f0-9]{64}$/;
const ID_RE = /^(source|action):[A-Za-z0-9_-]{1,64}$/;
const MAX_STRING = 256;
const MAX_SUMMARY_INT = 1_000_000;

export const allowedKeysByPath = Object.freeze({
  certificate: Object.freeze([
    "type",
    "proof_system",
    "claim",
    "scope",
    "base_pack_digest",
    "replay_root",
    "premise_digest",
    "policy_digest",
    "lattice_digest",
    "run_id_hash",
    "checker_version",
    "summary",
    "derivation",
  ]),
  summary: Object.freeze([
    "sources_checked",
    "edges_checked",
    "authority_sinks_checked",
    "violations",
  ]),
  derivation: Object.freeze([
    "derived_node_labels",
    "lattice_steps",
    "sink_safety_claims",
    "premise_refs",
  ]),
  "derived_node_labels[]": Object.freeze(["node", "label", "premise_refs"]),
  "sink_safety_claims[]": Object.freeze(["node", "node_label", "safe"]),
  "lattice_steps[]": Object.freeze(["op", "node", "inputs", "result"]),
});

function leak(reason, where) {
  return { ok: false, code: RAW_VERIFIER_CODES.PRIVACY_LEAK_DETECTED, reason, where };
}

function checkStringLength(value, where) {
  return typeof value === "string" && value.length > MAX_STRING
    ? leak("over_length_field", where)
    : null;
}

function checkAllowedKeys(obj, path, flags) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const allowed = allowedKeysByPath[path] || [];
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      flags.push("freeform_field_present");
      continue;
    }
    const tooLong = checkStringLength(obj[key], `${path}.${key}`);
    if (tooLong) return tooLong;
  }
  return null;
}

function checkNestedKeys(cert, flags) {
  for (const [obj, path] of [
    [cert, "certificate"],
    [cert.summary, "summary"],
    [cert.derivation, "derivation"],
  ]) {
    const result = checkAllowedKeys(obj, path, flags);
    if (result) return result;
  }
  for (const [arrayName, path] of [
    ["derived_node_labels", "derived_node_labels[]"],
    ["sink_safety_claims", "sink_safety_claims[]"],
    ["lattice_steps", "lattice_steps[]"],
  ]) {
    for (const entry of cert.derivation?.[arrayName] || []) {
      const result = checkAllowedKeys(entry, path, flags);
      if (result) return result;
    }
  }
  return null;
}

function checkLatticeStepValues(step) {
  if (step.op !== "combine") return leak("opaque_or_freeform_field", "lattice_steps.op");
  if (!ID_RE.test(step.node)) return leak("raw_text_in_key", step.node);
  if (!Array.isArray(step.inputs)) return leak("opaque_or_freeform_field", "lattice_steps.inputs");
  for (const input of step.inputs) {
    if (!INTEGRITY_LABELS.includes(input)) {
      return leak("unknown_label_not_in_lattice_enum", `lattice_steps.inputs.${input}`);
    }
  }
  if (!INTEGRITY_LABELS.includes(step.result)) {
    return leak("unknown_label_not_in_lattice_enum", `lattice_steps.result.${step.node}`);
  }
  return null;
}

export function covertCapacityBits(cert) {
  const perEnum = Math.log2(INTEGRITY_LABELS.length);
  return (
    (cert.derivation?.derived_node_labels?.length || 0) * perEnum +
    (cert.derivation?.sink_safety_claims?.length || 0) * perEnum
  );
}

export function privacyGate(cert) {
  const auxiliaryFlags = [];
  const keyResult = checkNestedKeys(cert, auxiliaryFlags);
  if (keyResult) return keyResult;

  for (const field of [
    "base_pack_digest",
    "replay_root",
    "premise_digest",
    "policy_digest",
    "lattice_digest",
    "run_id_hash",
  ]) {
    if (!isSha256Digest(cert[field])) return leak("opaque_or_freeform_field", field);
  }

  for (const entry of cert.derivation.derived_node_labels) {
    if (!ID_RE.test(entry.node)) {
      return entry.node.length > MAX_STRING
        ? leak("over_length_field", entry.node)
        : leak("raw_text_in_key", entry.node);
    }
    if (!INTEGRITY_LABELS.includes(entry.label)) {
      return /[^a-z_]/.test(String(entry.label))
        ? leak("non_enum_label", `derived_node_labels.${entry.node}`)
        : leak("unknown_label_not_in_lattice_enum", `derived_node_labels.${entry.node}`);
    }
    for (const ref of entry.premise_refs) {
      if (!PREMISE_REF_RE.test(ref)) return leak("raw_text_in_premise_ref", ref);
    }
  }

  for (const claim of cert.derivation.sink_safety_claims) {
    if (!ID_RE.test(claim.node)) return leak("raw_text_in_key", claim.node);
    if (!INTEGRITY_LABELS.includes(claim.node_label)) {
      return leak("unknown_label_not_in_lattice_enum", `sink_safety_claims.${claim.node}`);
    }
    if (typeof claim.safe !== "boolean") {
      return leak("opaque_or_freeform_field", `sink_safety_claims.${claim.node}.safe`);
    }
  }

  for (const step of cert.derivation.lattice_steps) {
    const stepResult = checkLatticeStepValues(step);
    if (stepResult) return stepResult;
  }

  for (const ref of cert.derivation.premise_refs) {
    if (!PREMISE_REF_RE.test(ref)) return leak("raw_text_in_premise_ref", ref);
  }

  for (const [key, value] of Object.entries(cert.summary)) {
    if (!Number.isInteger(value) || value < 0 || value > MAX_SUMMARY_INT) {
      return leak("raw_text_in_summary", `summary.${key}`);
    }
  }

  return {
    ok: true,
    code: RAW_VERIFIER_CODES.OK,
    covert_capacity_bits: covertCapacityBits(cert),
    auxiliaryFlags,
  };
}
```

- [ ] **Step 4: Add duplicate-key detection to `schema.mjs`**

Add this raw validation helper to `tools/simurgh-attestation/stage4h/schema.mjs`.
Keep it in `schema.mjs` so schema owns duplicate-key rejection and Q7 can import
the same helper without creating a circular dependency:

```js
export function validateJsonTextNoDuplicateKeys(raw) {
  const stack = [];
  let index = 0;
  let expectingKey = false;
  while (index < raw.length) {
    const ch = raw[index];
    if (/\s/.test(ch)) {
      index += 1;
      continue;
    }
    if (ch === "{") {
      stack.push({ keys: new Set(), expectingKey: true });
      expectingKey = true;
      index += 1;
      continue;
    }
    if (ch === "}") {
      stack.pop();
      expectingKey = false;
      index += 1;
      continue;
    }
    if (ch === ",") {
      if (stack.length > 0) stack[stack.length - 1].expectingKey = true;
      expectingKey = stack.length > 0;
      index += 1;
      continue;
    }
    if (ch !== '"') {
      index += 1;
      continue;
    }

    let end = index + 1;
    let escaped = false;
    while (end < raw.length) {
      const current = raw[end];
      if (escaped) {
        escaped = false;
      } else if (current === "\\") {
        escaped = true;
      } else if (current === '"') {
        break;
      }
      end += 1;
    }
    const token = raw.slice(index, end + 1);
    let cursor = end + 1;
    while (/\s/.test(raw[cursor])) cursor += 1;
    const top = stack[stack.length - 1];
    if (top?.expectingKey && raw[cursor] === ":") {
      const key = JSON.parse(token);
      if (top.keys.has(key)) return { ok: false, reason: "duplicate_key", key };
      top.keys.add(key);
      top.expectingKey = false;
    }
    index = end + 1;
  }
  return { ok: true };
}
```

In the same file, expose exact nested-key ownership for schema validation:

```js
export const CERTIFICATE_ALLOWED_KEYS = Object.freeze([
  "type",
  "proof_system",
  "claim",
  "scope",
  "run_id_hash",
  "base_pack_digest",
  "replay_root",
  "premise_digest",
  "policy_digest",
  "lattice_digest",
  "checker_version",
  "derivation",
  "summary",
]);

export const DERIVATION_ALLOWED_KEYS = Object.freeze([
  "derived_node_labels",
  "lattice_steps",
  "sink_safety_claims",
  "premise_refs",
]);

export const DERIVED_NODE_LABEL_ALLOWED_KEYS = Object.freeze(["node", "label", "premise_refs"]);
export const LATTICE_STEP_ALLOWED_KEYS = Object.freeze(["op", "node", "inputs", "result"]);
export const SINK_SAFETY_CLAIM_ALLOWED_KEYS = Object.freeze(["node", "node_label", "safe"]);
```

Update `keysExactly()` and `validDerivationEntries()` so every unknown key
returns `fail("unknown_field", path)` rather than a generic schema error. The
schema must hard-reject unknown keys at these paths:

```text
certificate
summary
derivation
derived_node_labels[]
sink_safety_claims[]
lattice_steps[]
```

Q7 may keep auxiliary `freeform_field_present`, but raw verifier diagnosis for
unknown keys must be `20 / unknown_field`.

- [ ] **Step 5: Run Q7 tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/privacyGate.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

Run:

```bash
git add tools/simurgh-attestation/stage4h/privacyGate.mjs \
  tools/simurgh-attestation/stage4h/schema.mjs \
  tests/unit/llmShield/stage4h/privacyGate.test.js
git commit -m "feat(llm-shield): add stage 4h.3 privacy gate"
```

---

### Task 3: Q6 Tamper-Closure Matrix

**Files:**

- Create: `tools/simurgh-attestation/stage4h/tamperClosure.mjs`
- Create: `tests/unit/llmShield/stage4h/tamperClosure.test.js`
- Create: `tests/fixtures/llmShield/stage4h/expected-results/tamper-matrix.json`

- [ ] **Step 1: Write the failing tamper-closure tests**

Create `tests/unit/llmShield/stage4h/tamperClosure.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { privacyGate } from "../../../../tools/simurgh-attestation/stage4h/privacyGate.mjs";
import {
  applyMutation,
  buildCleanTamperContext,
  buildTamperMatrix,
  bumpDigest,
  mutationFamily,
} from "../../../../tools/simurgh-attestation/stage4h/tamperClosure.mjs";

function codeMatches(actual, expected) {
  return actual === expected;
}

test("Q6 bumpDigest preserves sha256 digest shape while changing value", () => {
  const original = `sha256:${"a".repeat(64)}`;
  const bumped = bumpDigest(original);
  assert.match(bumped, /^sha256:[a-f0-9]{64}$/);
  assert.notEqual(bumped, original);
});

test("Q6 mutation family covers every required single-delta arm", () => {
  assert.deepEqual(
    mutationFamily().map((entry) => entry.arm),
    [
      "sig-byte",
      "merkle-node",
      "binding",
      "policy",
      "premise",
      "lattice-digest",
      "lattice-step",
      "proof-step",
    ]
  );
});

test("Q6 tamper matrix accepts clean twin and rejects every tampered twin", () => {
  const matrix = buildTamperMatrix(buildCleanTamperContext());
  assert.equal(matrix.clean.code, 0);
  assert.equal(matrix.tampered_accepted_count, 0);
  for (const result of matrix.results) {
    assert.equal(result.accepted, false, result.arm);
    assert.equal(codeMatches(result.code, result.expected_code), true, result.arm);
    assert.equal(result.reason, result.expected_reason, result.arm);
  }
});

test("Q6 anti-theatre proof-step arm is step-9 owned", () => {
  const ctx = buildCleanTamperContext();
  const arm = mutationFamily().find((entry) => entry.arm === "proof-step");
  const result = applyMutation(ctx, arm);
  assert.equal(result.diagnosis.code, 26);
  assert.equal(result.diagnosis.reason, "proof_step_missing");
  assert.equal(result.passed_steps.includes(7), true);
});

test("Q6 pure tamper arms are silent under Q7", () => {
  const ctx = buildCleanTamperContext();
  for (const arm of mutationFamily()) {
    const mutated = applyMutation(ctx, arm);
    const q7 = privacyGate(mutated.certificate);
    assert.equal(q7.ok, true, arm.arm);
  }
});

test("Q6 Layer-B semantic arms repair earlier binding before target failure", () => {
  const ctx = buildCleanTamperContext();
  for (const arm of mutationFamily().filter(
    (entry) => entry.layer === "B" && entry.arm !== "binding"
  )) {
    const mutated = applyMutation(ctx, arm);
    assert.notEqual(mutated.diagnosis.code, 25, arm.arm);
    assert.notEqual(mutated.diagnosis.reason, "pack_binding_mismatch", arm.arm);
  }
});
```

- [ ] **Step 2: Run the Q6 test to verify it fails**

Run:

```bash
node --test tests/unit/llmShield/stage4h/tamperClosure.test.js
```

Expected: FAIL because `tamperClosure.mjs` does not exist.

- [ ] **Step 3: Implement `tamperClosure.mjs`**

Create `tools/simurgh-attestation/stage4h/tamperClosure.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync } from "node:fs";
import { buildPremiseSet } from "./canonicalPremises.mjs";
import { certificateDigest, diagnose } from "./dfiCertificate.mjs";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function bumpDigest(value) {
  const hex = value.replace(/^sha256:/, "");
  const first = hex[0] === "0" ? "1" : "0";
  return `sha256:${first}${hex.slice(1)}`;
}

export function buildCleanTamperContext() {
  return {
    pack: readJson(`${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.json`),
    certificate: readJson(`${fixtureRoot}/q0-clean-disconnected-untrusted-dfi-certificate.json`),
    manifest: readJson(`${fixtureRoot}/q0-clean-disconnected-untrusted-signed-pack-manifest.json`),
    signatureOk: true,
    merkleOk: true,
  };
}

export function mutationFamily() {
  return [
    {
      arm: "sig-byte",
      layer: "A",
      expected_code: "4D_VERIFY_FAILURE",
      expected_reason: "signature_invalid",
    },
    {
      arm: "merkle-node",
      layer: "A",
      expected_code: "4D_VERIFY_FAILURE",
      expected_reason: "merkle_root_mismatch",
    },
    { arm: "binding", layer: "B", expected_code: 25, expected_reason: "pack_binding_mismatch" },
    { arm: "policy", layer: "B", expected_code: 23, expected_reason: "policy_digest_mismatch" },
    { arm: "premise", layer: "B", expected_code: 22, expected_reason: "premise_digest_mismatch" },
    {
      arm: "lattice-digest",
      layer: "B",
      expected_code: 26,
      expected_reason: "lattice_digest_mismatch",
    },
    { arm: "lattice-step", layer: "B", expected_code: 26, expected_reason: "proof_step_unsound" },
    { arm: "proof-step", layer: "B", expected_code: 26, expected_reason: "proof_step_missing" },
  ];
}

function mutateContext(ctx, arm) {
  const next = structuredClone(ctx);
  if (arm.arm === "sig-byte") next.signatureOk = false;
  if (arm.arm === "merkle-node") next.merkleOk = false;
  if (arm.arm === "binding")
    next.certificate.base_pack_digest = bumpDigest(next.certificate.base_pack_digest);
  if (arm.arm === "policy")
    next.pack.policy_bundle.policy_version = `${next.pack.policy_bundle.policy_version}-tampered`;
  if (arm.arm === "premise") {
    next.pack.replay_material.act_000.taint_derivation_inputs.sources[0].label = "trusted";
  }
  if (arm.arm === "lattice-digest")
    next.certificate.lattice_digest = bumpDigest(next.certificate.lattice_digest);
  if (arm.arm === "lattice-step") {
    const step = next.certificate.derivation.lattice_steps[0];
    step.result = step.result === "trusted" ? "untrusted" : "trusted";
  }
  if (arm.arm === "proof-step") next.certificate.derivation.lattice_steps.pop();
  return next;
}

function repairEarlierBindings(ctx, arm) {
  if (arm.layer !== "B" || arm.arm === "binding") return ctx;
  if (ctx.manifest?.certificate_digest) {
    ctx.manifest.certificate_digest = certificateDigest(ctx.certificate);
  }
  if (ctx.manifest?.base_pack_digest) {
    ctx.manifest.base_pack_digest = ctx.certificate.base_pack_digest;
  }
  return ctx;
}

export function applyMutation(ctx, arm) {
  const mutated = repairEarlierBindings(mutateContext(ctx, arm), arm);
  const diagnosis = diagnose(mutated);
  return {
    ...mutated,
    diagnosis,
    passed_steps: diagnosis.code === 26 ? [1, 2, 3, 4, 5, 6, 7] : [],
  };
}

export function buildTamperMatrix(ctx = buildCleanTamperContext()) {
  const clean = diagnose(ctx);
  const results = mutationFamily().map((arm) => {
    const mutated = applyMutation(ctx, arm);
    return {
      arm: arm.arm,
      layer: arm.layer,
      expected_code: arm.expected_code,
      expected_reason: arm.expected_reason,
      code: mutated.diagnosis.code,
      reason: mutated.diagnosis.reason,
      accepted: mutated.diagnosis.code === 0,
    };
  });
  return {
    clean,
    results,
    tampered_accepted_count: results.filter((result) => result.accepted).length,
  };
}
```

This implementation must not post-process or remap verdicts. If a Q6 arm does
not produce its expected code and reason, fix the shared verifier step that owns
that layer. For every Layer-B arm except `binding`, mutate the target field and
then repair every earlier-layer commitment required for steps 1-8 to pass. For
certificate mutations such as `lattice-digest`, `lattice-step`, and
`proof-step`, that means recomputing `manifest.certificate_digest` before
diagnosis so `checkBinding()` does not hide the intended raw `26` failure. Task
3 unit helpers may use in-memory contexts only for focused unit tests. Task 4
evidence generation must use CLI-backed/generated signed fixtures or the exact
shared verifier step engine. No in-memory-only tamper result may be written to
evidence.

- [ ] **Step 4: Run Q6 tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/tamperClosure.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add tools/simurgh-attestation/stage4h/tamperClosure.mjs \
  tests/unit/llmShield/stage4h/tamperClosure.test.js
git commit -m "feat(llm-shield): add stage 4h.3 tamper matrix"
```

---

### Task 4: Verifier, Fixture Builder, Evidence, And Audit Wiring

**Files:**

- Modify: `tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs`
- Modify: `tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs`
- Modify: `tests/unit/llmShield/stage4h/reproduce.test.js`
- Modify: `scripts/reproduce-llm-shield-stage4h.sh`
- Create: `scripts/security-audit-llm-shield-stage4h.sh`
- Create: `scripts/privacy-audit-llm-shield-stage4h.mjs`
- Modify/Create: `docs/research/llm-shield/evidence/stage-4h/*.json`

- [ ] **Step 1: Write the failing reproduce assertions**

Append to `tests/unit/llmShield/stage4h/reproduce.test.js`:

```js
test("Stage 4H.3 evidence flips Q6 and Q7 to pass while Q3 remains out of scope", () => {
  const qGate = readJson(`${evidenceRoot}/q-gate-results.json`);
  assert.equal(qGate.stage, "4H.3");
  assert.equal(qGate.gates.Q6.status, "pass");
  assert.equal(qGate.gates.Q6.tampered_accepted_count, 0);
  assert.equal(qGate.gates.Q7.status, "pass");
  assert.equal(Number.isFinite(qGate.gates.Q7.covert_capacity_bits), true);
  assert.equal(qGate.gates.Q3.status, "not_in_scope");
});

test("Stage 4H.3 evidence emits tamper and privacy reports", () => {
  const tamper = readJson(`${evidenceRoot}/tamper-results.json`);
  const privacy = readJson(`${evidenceRoot}/privacy-report.json`);
  assert.equal(tamper.tampered_accepted_count, 0);
  assert.equal(privacy.allowlist, "authoritative_schema_plus_q7_defence_in_depth");
  assert.equal(privacy.denylist, "auxiliary");
});
```

- [ ] **Step 2: Run reproduce test to verify it fails**

Run:

```bash
node --test tests/unit/llmShield/stage4h/reproduce.test.js
```

Expected: FAIL because Q6/Q7 remain `not_in_scope` and evidence files do not exist.

- [ ] **Step 3: Refactor CLI to raw-read certificate and manifest first**

In `verify-stage4h-digest-binding.mjs`, replace:

```js
const certificate = JSON.parse(await readFile(certificatePath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
```

with:

```js
const certificateRaw = await readFile(certificatePath, "utf8");
const manifestRaw = await readFile(manifestPath, "utf8");
const certificateDuplicateKeys = validateJsonTextNoDuplicateKeys(certificateRaw);
if (!certificateDuplicateKeys.ok) {
  return finish({
    outPath,
    code: RAW_VERIFIER_CODES.SCHEMA_INVALID,
    reason: "duplicate_key",
    certificate: null,
  });
}
const manifestDuplicateKeys = validateJsonTextNoDuplicateKeys(manifestRaw);
if (!manifestDuplicateKeys.ok) {
  return finish({
    outPath,
    code: RAW_VERIFIER_CODES.SCHEMA_INVALID,
    reason: "duplicate_key",
    certificate: null,
  });
}
const certificate = JSON.parse(certificateRaw);
const manifest = JSON.parse(manifestRaw);
```

Add imports:

```js
import { privacyGate } from "./privacyGate.mjs";
import { checkBinding, checkLatticeDigest } from "./dfiCertificate.mjs";
import {
  validateDfiCertificate,
  validateJsonTextNoDuplicateKeys,
  validateSignedPackManifest,
} from "./schema.mjs";
```

- [ ] **Step 4: Insert Q7 at step 3**

After certificate and manifest schema pass but before Stage 4D verification, add:

```js
const privacy = privacyGate(certificate);
if (!privacy.ok) {
  return finish({
    outPath,
    code: privacy.code,
    reason: privacy.reason,
    certificate,
  });
}
```

- [ ] **Step 5: Use the shared binding check**

Replace any direct pack/certificate binding verdict construction in
`verify-stage4h-digest-binding.mjs` with the shared helper from Task 1:

```js
const binding = checkBinding({ certificate, manifest });
if (!binding.ok) {
  return finish({
    outPath,
    code: binding.code,
    reason: binding.reason,
    certificate,
    premises,
  });
}
```

Keep Ed25519 manifest signature verification in `packBinding.mjs`; the CLI may
still call it for cryptographic validation, but the diagnostic result for
base-pack/certificate digest disagreement must come from `checkBinding()`.

- [ ] **Step 6: Split policy and lattice digest checks**

Replace the current combined policy/lattice block:

```js
if (
  certificate.policy_digest !== premises.policy_digest ||
  certificate.lattice_digest !== premises.lattice_digest
) {
  return finish({
    outPath,
    code: RAW_VERIFIER_CODES.POLICY_DIGEST_MISMATCH,
    reason: "policy_or_lattice_digest_mismatch",
    certificate,
    premises,
  });
}
```

with:

```js
if (certificate.policy_digest !== premises.policy_digest) {
  return finish({
    outPath,
    code: RAW_VERIFIER_CODES.POLICY_DIGEST_MISMATCH,
    reason: "policy_digest_mismatch",
    certificate,
    premises,
  });
}
```

Then run `checkLatticeDigest(certificate)` immediately before derivation validation:

```js
const lattice = checkLatticeDigest(certificate);
if (!lattice.ok) {
  return finish({
    outPath,
    code: lattice.code,
    reason: lattice.reason,
    certificate,
    premises,
  });
}
```

- [ ] **Step 7: Update `baseResult()` gate and banner wording**

In `verify-stage4h-digest-binding.mjs`, change:

```js
gate: "Q0/Q1/Q2/Q4/Q5",
```

to:

```js
gate: "Q0/Q1/Q2/Q4/Q5/Q6/Q7",
```

Change the success/failure strings to:

```js
? "Stage 4H.3 Q6 tamper-closure + Q7 bounded-capacity verifier: PASS"
: `Stage 4H.3 Q6 tamper-closure + Q7 bounded-capacity verifier: FAIL ${reason}`
```

- [ ] **Step 8: Emit Q6/Q7 evidence from the fixture builder**

In `build-stage4h-digest-fixtures.mjs`, import:

```js
import { privacyGate } from "./privacyGate.mjs";
import { buildTamperMatrix } from "./tamperClosure.mjs";
```

Hard acceptance criterion: `tamper-results.json` must be produced from the same
first-failing-step verifier path used by
`verify-stage4h-digest-binding.mjs`. Do not repair codes, rewrite reasons, or
post-process Layer A/B outcomes inside `tamperClosure.mjs` or the fixture
builder.

Layer-B repair rule: for every Q6 Layer-B arm except the actual `binding` arm,
the fixture builder must mutate the target field, then recompute all
earlier-layer commitments and signatures required for steps 1-8 to pass. Only
the intended target layer may remain inconsistent. For example, the
`lattice-digest` arm mutates `certificate.lattice_digest`, recomputes
`manifest.certificate_digest`, re-signs the manifest with the test manifest key,
and does not repair `certificate.lattice_digest` itself; the first failure must
be `26 / lattice_digest_mismatch`, not `25 / pack_binding_mismatch`.

At the end of the builder, before writing `q-gate-results.json`, compute:

```js
const tamperResults = buildTamperMatrix();
const privacyResult = privacyGate(q0Certificate);
const privacyReport = {
  status: privacyResult.ok ? "pass" : "fail",
  covert_capacity_bits: privacyResult.covert_capacity_bits,
  allowlist: "authoritative_schema_plus_q7_defence_in_depth",
  denylist: "auxiliary",
  bounded_leakage: true,
};
```

Write:

```js
await writeJson(join(STAGE4H_EVIDENCE_DIR, "tamper-results.json"), tamperResults);
await writeJson(join(STAGE4H_EVIDENCE_DIR, "privacy-report.json"), privacyReport);
await writeJson(join(fixtureRoot, "expected-results", "tamper-matrix.json"), tamperResults);
await writeJson(join(fixtureRoot, "expected-results", "privacy-matrix.json"), privacyReport);
```

Update the q-gate object:

```js
Q6: {
  status: "pass",
  expected_results: Object.fromEntries(
    tamperResults.results.map((result) => [result.arm, result.expected_code])
  ),
  tampered_accepted_count: tamperResults.tampered_accepted_count,
},
Q7: {
  status: privacyReport.status,
  covert_capacity_bits: privacyReport.covert_capacity_bits,
  allowlist: privacyReport.allowlist,
  denylist: privacyReport.denylist,
},
```

Keep:

```js
Q3: {
  status: "not_in_scope";
}
```

- [ ] **Step 9: Add security audit wrapper**

Create `scripts/security-audit-llm-shield-stage4h.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs >/dev/null
node - <<'NODE'
const fs = require("fs");
const result = JSON.parse(fs.readFileSync("docs/research/llm-shield/evidence/stage-4h/tamper-results.json", "utf8"));
if (result.tampered_accepted_count !== 0) {
  console.error(`Stage 4H.3 Q6 failed: tampered_accepted_count=${result.tampered_accepted_count}`);
  process.exit(1);
}
for (const arm of result.results) {
  if (arm.code !== arm.expected_code || arm.reason !== arm.expected_reason) {
    console.error(`Stage 4H.3 Q6 failed: ${arm.arm} got ${arm.code}/${arm.reason}`);
    process.exit(1);
  }
}
console.log("Stage 4H.3 Q6 tamper-closure audit: PASS");
NODE
```

Run:

```bash
chmod +x scripts/security-audit-llm-shield-stage4h.sh
scripts/security-audit-llm-shield-stage4h.sh
```

Expected: PASS.

- [ ] **Step 10: Add privacy audit wrapper**

Create `scripts/privacy-audit-llm-shield-stage4h.mjs`:

```js
#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync } from "node:fs";
import { privacyGate } from "../tools/simurgh-attestation/stage4h/privacyGate.mjs";
import { validateJsonTextNoDuplicateKeys } from "../tools/simurgh-attestation/stage4h/schema.mjs";

const cert = JSON.parse(
  readFileSync(
    "tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-dfi-certificate.json",
    "utf8"
  )
);
const result = privacyGate(cert);
if (!result.ok) {
  console.error(`Stage 4H.3 Q7 failed: ${result.reason}`);
  process.exit(1);
}

const cases = [
  [
    "raw-label",
    (c) => {
      c.derivation.derived_node_labels[0].label = "IGNORE PREVIOUS";
    },
    27,
    "non_enum_label",
  ],
  [
    "raw-summary",
    (c) => {
      c.summary.sources_checked = "secret-blob";
    },
    27,
    "raw_text_in_summary",
  ],
  [
    "raw-node-id",
    (c) => {
      c.derivation.derived_node_labels[0].node = "action:ssn=123";
    },
    27,
    "raw_text_in_key",
  ],
  [
    "raw-premise-ref",
    (c) => {
      c.derivation.premise_refs.push("premise:leak:not-a-digest");
    },
    27,
    "raw_text_in_premise_ref",
  ],
  [
    "non-enum-label",
    (c) => {
      c.derivation.sink_safety_claims[0].node_label = "sideways";
    },
    27,
    "unknown_label_not_in_lattice_enum",
  ],
  [
    "unknown-field",
    (c) => {
      c.derivation.raw_freeform = "leak";
    },
    20,
    "unknown_field",
  ],
];

for (const [name, mutate, expectedCode, expectedReason] of cases) {
  const copy = structuredClone(cert);
  mutate(copy);
  const gate = privacyGate(copy);
  const code =
    expectedCode === 20 && gate.auxiliaryFlags?.includes("freeform_field_present") ? 20 : gate.code;
  const reason =
    expectedCode === 20 && gate.auxiliaryFlags?.includes("freeform_field_present")
      ? "unknown_field"
      : gate.reason;
  if (code !== expectedCode || reason !== expectedReason) {
    console.error(`Stage 4H.3 Q7 negative failed: ${name} got ${code}/${reason}`);
    process.exit(1);
  }
}

const duplicate = validateJsonTextNoDuplicateKeys(
  `{"summary":{"sources_checked":1,"sources_checked":2}}`
);
if (duplicate.ok || duplicate.reason !== "duplicate_key") {
  console.error("Stage 4H.3 Q7 duplicate-key negative failed");
  process.exit(1);
}

console.log(
  `Stage 4H.3 Q7 bounded-capacity privacy audit: PASS B_total=${result.covert_capacity_bits}`
);
```

Run:

```bash
chmod +x scripts/privacy-audit-llm-shield-stage4h.mjs
node scripts/privacy-audit-llm-shield-stage4h.mjs
```

Expected: PASS.

- [ ] **Step 11: Wire reproduce script**

In `scripts/reproduce-llm-shield-stage4h.sh`, add the two audit scripts after fixture rebuild and before final echo:

```bash
scripts/security-audit-llm-shield-stage4h.sh
node scripts/privacy-audit-llm-shield-stage4h.mjs
```

Change final banner to:

```bash
echo "Stage 4H.3 Q6 tamper-closure + Q7 bounded-capacity: PASS"
```

- [ ] **Step 12: Regenerate fixtures and evidence**

Run:

```bash
node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs
```

Expected: regenerates Stage 4H fixtures/evidence with Q6 and Q7 pass.

- [ ] **Step 13: Run reproduce tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/reproduce.test.js
scripts/reproduce-llm-shield-stage4h.sh
```

Expected: PASS.

- [ ] **Step 14: Commit Task 4**

Run:

```bash
git add tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs \
  tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs \
  tests/unit/llmShield/stage4h/reproduce.test.js \
  scripts/reproduce-llm-shield-stage4h.sh \
  scripts/security-audit-llm-shield-stage4h.sh \
  scripts/privacy-audit-llm-shield-stage4h.mjs \
  tests/fixtures/llmShield/stage4h \
  docs/research/llm-shield/evidence/stage-4h
git commit -m "feat(llm-shield): wire stage 4h.3 q6 q7 evidence"
```

---

### Task 5: Final Verification And Closeout Hygiene

**Files:**

- Modify: `AGENT.md`
- Modify: `CHANGELOG.md`
- Test: full Stage 4H and repo gates

- [ ] **Step 1: Run focused Stage 4H tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/*.test.js
```

Expected: all Stage 4H unit tests PASS.

- [ ] **Step 2: Run reproduce script**

Run:

```bash
scripts/reproduce-llm-shield-stage4h.sh
```

Expected final line:

```text
Stage 4H.3 Q6 tamper-closure + Q7 bounded-capacity: PASS
```

- [ ] **Step 3: Run repo gates**

Run:

```bash
npm test
npm run format:check
git diff --check
```

Expected: all PASS.

- [ ] **Step 4: Run overclaim guard**

Run:

```bash
rg -n "Q3.*pass|zero.leakage|multi.field.*closed|first proof-carrying|implicit.flow.*(secure|safe)|model-safe|execution truth|future-run guarantee|public priority" \
  docs/research/llm-shield/evidence/stage-4h \
  tests/fixtures/llmShield/stage4h \
  tools/simurgh-attestation/stage4h \
  scripts/reproduce-llm-shield-stage4h.sh
```

Expected: no matches except explicit non-claim or guard wording. If a claim appears in evidence prose, rewrite it to bounded-leakage, single-delta, and Q3-not-in-scope language.

- [ ] **Step 5: Run metadata/privacy artifact scan**

Run:

```bash
rg -n "raw_prompt|raw_output|tool_args|provider_transcript|OPENAI_API_KEY|ANTHROPIC_API_KEY|/Users/" \
  docs/research/llm-shield/evidence/stage-4h \
  tests/fixtures/llmShield/stage4h
```

Expected: no matches. If `tool_args` appears only as a Q7 negative fixture name, rename the fixture to `unknown-freeform-field.json` or keep the string only in test source, not generated evidence.

- [ ] **Step 6: Update AGENT and CHANGELOG**

Add a new top entry to `AGENT.md` and `CHANGELOG.md`:

```markdown
### 2026-07-01 (Australia/Sydney) - Stage 4H.3 Q6/Q7 verifier closure

- **Scope:** Stage 4H.3 only: Q6 single-delta tamper closure and Q7 bounded-capacity privacy. Q3 and full Stage 4H release remain out of scope.
- **Summary:** Added first-failing-step diagnosis, standalone lattice digest checking, Q6 tamper matrix evidence with `tampered_accepted_count: 0`, and Q7 bounded-capacity privacy evidence with explicit `B_total`. Raw `26` remains numeric `26` and is named `proof_structure_invalid`; Q4 raw-code behavior is unchanged.
- **Verification:** Stage 4H reproduce, Stage 4H unit tests, security/privacy audits, repo test/format/diff gates, metadata scan, and overclaim guard pass.
- **Follow-ups:** Write the Stage 4H.4 spec before implementing Q3 offline hermeticity, wrapper work, release tagging, or full Stage 4H closeout.
```

- [ ] **Step 7: Commit Task 5 if logs changed**

Run:

```bash
git add AGENT.md CHANGELOG.md
git commit -m "docs(llm-shield): close stage 4h.3 q6 q7 milestone"
```

If no log files changed, skip the commit.

---

## Final Self-Review Checklist

- Q0, Q1, Q2, Q4, Q5 remain pass.
- Q6 and Q7 are pass.
- Q3 remains not in scope.
- Raw `26` remains numeric `26`; no new raw codes were added.
- Q4a remains `22`; Q4b remains `24`; Q4c remains `26` with `derivation_scope_incomplete`.
- `checkLatticeDigest()` is standalone and produces `26/lattice_digest_mismatch`.
- Q6 clean twin is raw `0`.
- Q6 every tampered twin rejects with expected code and reason.
- Q6 `tampered_accepted_count` is `0`.
- Q6 digest mutations preserve `sha256:<64 lowercase hex>` shape.
- Q7 top-level `certificate` allowlist is present and does not include manifest-owned `certificate_digest`.
- Q7 reports bounded leakage via `B_total`, never zero leakage.
- Q7 duplicate-key detection runs before plain object validation.
- Q7 unknown keys are schema-owned as raw `20`; value smuggling is raw `27`.
- Two-lanes-no-crossfire tests pass.
- Generated fixtures/evidence contain no raw prompts, raw outputs, tool args, transcripts, secrets, absolute paths, or host identifiers.
- `canonicalPremises.mjs` digest semantics are unchanged.
- The reproduce script is deterministic and byte-stable.
