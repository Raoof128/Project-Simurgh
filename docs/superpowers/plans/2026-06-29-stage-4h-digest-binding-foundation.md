# Stage 4H Digest And Binding Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Stage 4H.0 only: strict certificate schema, base-pack premise projection, acyclic digest binding, Q2/Q5 fixtures, and reproduce wiring without claiming DFI soundness.

**Architecture:** Stage 4H.0 is a Node-authoritative attestation layer under `tools/simurgh-attestation/stage4h/` that reads existing Stage 4D signed pack artifacts, recomputes metadata-only premises, builds strict digest fixtures, and verifies Q2/Q5 binding. It intentionally reports Q1/Q3/Q4/Q6/Q7 as pending/not-in-scope and does not implement derivation validation.

**Tech Stack:** Node.js ESM, `node:test`, `node:assert/strict`, existing Stage 4D canonical JSON/hash/signature helpers, shell reproduce script, Prettier.

---

## Scope Guard

This plan implements only `4H.0 - Digest and binding foundation` from `docs/superpowers/specs/2026-06-29-stage-4h-proof-carrying-dfi-design.md`.

Do not implement:

- derivation validation
- Q1 DFI soundness
- Q3 offline monkey-patch harness
- Q4 laundering fixtures beyond the forged-premise-digest placeholder fixture
- Q6 tamper matrix
- Q7 full privacy scanner
- solver, SMT, Lean, Coq, provider, model, browser, or network dependencies

Later gates must be reported as `pending` or `not_in_scope`, never green.

## File Structure

Create:

- `tools/simurgh-attestation/stage4h/constants.mjs` - Stage 4H domains, version strings, evidence paths, code constants, allowed claims/scopes.
- `tools/simurgh-attestation/stage4h/exitCodes.mjs` - raw verifier codes, harness code `19`, and Stage 4 wrapper mapping.
- `tools/simurgh-attestation/stage4h/schema.mjs` - strict certificate and signed-manifest validation with unknown-field rejection at schema-owned levels.
- `tools/simurgh-attestation/stage4h/canonicalPremises.mjs` - narrow Stage 4D pack adapter, base-pack view digest, stable premise records, premise IDs, and `premise_digest`.
- `tools/simurgh-attestation/stage4h/packBinding.mjs` - acyclic `base_pack_digest -> certificate_digest -> signed_pack_manifest_digest` checks and Ed25519 manifest signature verification.
- `tools/simurgh-attestation/stage4h/dfiCertificate.mjs` - strict non-claiming certificate builder for 4H.0 digest fixtures only.
- `tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs` - deterministic fixture/evidence builder from committed Stage 4D pack artifacts.
- `tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs` - CLI verifier for Q2/Q5 and pending gate report. It must load `--base-pack`, `--base-pack-sig`, and `--base-pack-pubkey`, validate certificate/manifest schemas, verify the Stage 4D base pack, recompute premises, verify Q2 digest equality, then verify Q5 manifest binding.

Create tests:

- `tests/unit/llmShield/stage4h/schema.test.js`
- `tests/unit/llmShield/stage4h/premiseBinding.test.js`
- `tests/unit/llmShield/stage4h/packBinding.test.js`
- `tests/unit/llmShield/stage4h/reproduce.test.js`

Create fixtures:

- `tests/fixtures/llmShield/stage4h/clean-base-pack.json`
- `tests/fixtures/llmShield/stage4h/clean-base-pack.sig`
- `tests/fixtures/llmShield/stage4h/clean-signer.pub`
- `tests/fixtures/llmShield/stage4h/clean-dfi-certificate.json`
- `tests/fixtures/llmShield/stage4h/clean-signed-pack-manifest.json`
- `tests/fixtures/llmShield/stage4h/manifest-verifier.pub`
- `tests/fixtures/llmShield/stage4h/forged-premise-digest-certificate.json`
- `tests/fixtures/llmShield/stage4h/expected-results/q2-q5-results.json`

Create evidence:

- `docs/research/llm-shield/evidence/stage-4h/README.md`
- `docs/research/llm-shield/evidence/stage-4h/certificate.json`
- `docs/research/llm-shield/evidence/stage-4h/signed-pack-manifest.json`
- `docs/research/llm-shield/evidence/stage-4h/verifier-results.json`
- `docs/research/llm-shield/evidence/stage-4h/q-gate-results.json`

Create script:

- `scripts/reproduce-llm-shield-stage4h.sh`

Modify:

- `package.json` only if a test glob misses `tests/unit/llmShield/stage4h/*.test.js`. Prefer no change because current `npm test` already includes nested unit tests.

## Task 1: Constants And Exit-Code Contract

**Files:**

- Create: `tools/simurgh-attestation/stage4h/constants.mjs`
- Create: `tools/simurgh-attestation/stage4h/exitCodes.mjs`
- Test: `tests/unit/llmShield/stage4h/schema.test.js`

- [ ] **Step 1: Write the failing constants and exit-code tests**

Create `tests/unit/llmShield/stage4h/schema.test.js` with:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CERTIFICATE_TYPE,
  CHECKER_VERSION,
  MANIFEST_DOMAIN,
  STAGE4H_EVIDENCE_DIR,
} from "../../../../tools/simurgh-attestation/stage4h/constants.mjs";
import {
  HARNESS_CODES,
  RAW_VERIFIER_CODES,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("Stage 4H constants pin certificate type, checker version, domain, and evidence root", () => {
  assert.equal(CERTIFICATE_TYPE, "simurgh.vca.dfi_certificate.v1");
  assert.equal(CHECKER_VERSION, "4h-v0");
  assert.equal(MANIFEST_DOMAIN, "SIMURGH_STAGE4H_MANIFEST_V1\0");
  assert.equal(STAGE4H_EVIDENCE_DIR, "docs/research/llm-shield/evidence/stage-4h");
});

test("Stage 4H raw verifier codes exclude harness-only code 19", () => {
  assert.equal(RAW_VERIFIER_CODES.OK, 0);
  assert.equal(RAW_VERIFIER_CODES.SCHEMA_INVALID, 20);
  assert.equal(RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH, 22);
  assert.equal(RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH, 25);
  assert.equal(RAW_VERIFIER_CODES.CHECKER_NOT_OFFLINE, 28);
  assert.equal(RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED, 29);
  assert.equal(HARNESS_CODES.CLEAN_RUN_FALSELY_REJECTED, 19);
  assert.equal(Object.values(RAW_VERIFIER_CODES).includes(19), false);
});

test("Stage 4H wrapper maps raw and harness codes to Stage 4 run-level codes", () => {
  assert.equal(stage4CodeForRawCode(0), 0);
  assert.equal(stage4CodeForRawCode(19), 1);
  assert.equal(stage4CodeForRawCode(20), 1);
  assert.equal(stage4CodeForRawCode(27), 1);
  assert.equal(stage4CodeForRawCode(28), 2);
  assert.equal(stage4CodeForRawCode(29), 3);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node --test tests/unit/llmShield/stage4h/schema.test.js
```

Expected: FAIL with `Cannot find module .../stage4h/constants.mjs`.

- [ ] **Step 3: Implement constants**

Create `tools/simurgh-attestation/stage4h/constants.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
export const CERTIFICATE_TYPE = "simurgh.vca.dfi_certificate.v1";
export const PROOF_SYSTEM = "simurgh-ifc-lattice-v0";
export const CHECKER_VERSION = "4h-v0";
export const CLAIM = "explicit_data_flow_integrity";
export const MANIFEST_VERSION = "simurgh.vca.signed_pack_manifest.v1";
export const MANIFEST_DOMAIN = "SIMURGH_STAGE4H_MANIFEST_V1\0";
export const STAGE4H_EVIDENCE_DIR = "docs/research/llm-shield/evidence/stage-4h";
export const STAGE4D_EVIDENCE_DIR =
  "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack";

export const DEFAULT_SCOPE = Object.freeze({
  explicit_data_edges: true,
  control_dependence_edges: false,
  implicit_flow_security: false,
});
```

- [ ] **Step 4: Implement exit-code mapping**

Create `tools/simurgh-attestation/stage4h/exitCodes.mjs`:

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
  PROOF_TAMPER_DETECTED: 26,
  PRIVACY_LEAK_DETECTED: 27,
  CHECKER_NOT_OFFLINE: 28,
  INTERNAL_ERROR_FAIL_CLOSED: 29,
});

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

- [ ] **Step 5: Run the constants test**

Run:

```bash
node --test tests/unit/llmShield/stage4h/schema.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add tools/simurgh-attestation/stage4h/constants.mjs \
  tools/simurgh-attestation/stage4h/exitCodes.mjs \
  tests/unit/llmShield/stage4h/schema.test.js
git commit -m "feat(llm-shield): add stage 4h exit-code contract"
```

## Task 2: Strict Certificate And Manifest Schema

**Files:**

- Modify: `tools/simurgh-attestation/stage4h/schema.mjs`
- Modify: `tests/unit/llmShield/stage4h/schema.test.js`

- [ ] **Step 1: Add failing schema validation tests**

Append to `tests/unit/llmShield/stage4h/schema.test.js`:

```js
import {
  validateDfiCertificate,
  validateSignedPackManifest,
} from "../../../../tools/simurgh-attestation/stage4h/schema.mjs";

const digest = (char) => `sha256:${char.repeat(64)}`;

function validCertificate() {
  return {
    type: CERTIFICATE_TYPE,
    proof_system: "simurgh-ifc-lattice-v0",
    claim: "explicit_data_flow_integrity",
    scope: {
      explicit_data_edges: true,
      control_dependence_edges: false,
      implicit_flow_security: false,
    },
    run_id_hash: digest("1"),
    base_pack_digest: digest("2"),
    replay_root: digest("3"),
    premise_digest: digest("4"),
    policy_digest: digest("5"),
    lattice_digest: digest("6"),
    checker_version: CHECKER_VERSION,
    derivation: {
      derived_node_labels: [],
      lattice_steps: [],
      sink_safety_claims: [],
      premise_refs: [],
    },
    summary: {
      sources_checked: 0,
      edges_checked: 0,
      authority_sinks_checked: 0,
      violations: 0,
    },
  };
}

test("Stage 4H schema accepts the minimal strict 4H.0 certificate", () => {
  assert.deepEqual(validateDfiCertificate(validCertificate()), { ok: true });
});

test("Stage 4H schema rejects unknown fields at every schema-owned level", () => {
  assert.equal(validateDfiCertificate({ ...validCertificate(), extra: true }).ok, false);
  assert.equal(
    validateDfiCertificate({
      ...validCertificate(),
      derivation: { ...validCertificate().derivation, hidden_premise: [] },
    }).ok,
    false
  );
  assert.equal(
    validateDfiCertificate({
      ...validCertificate(),
      summary: { ...validCertificate().summary, raw_prompt: "secret" },
    }).ok,
    false
  );
});

test("Stage 4H schema rejects self-binding or malformed digest fields", () => {
  assert.equal(
    validateDfiCertificate({ ...validCertificate(), certificate_digest: digest("7") }).ok,
    false
  );
  assert.equal(validateDfiCertificate({ ...validCertificate(), premise_digest: "abc" }).ok, false);
});

test("Stage 4H schema validates a signed manifest with certificate digest outside certificate", () => {
  const manifest = {
    manifest_version: "simurgh.vca.signed_pack_manifest.v1",
    base_pack_digest: digest("2"),
    certificate_digest: digest("7"),
    signed_pack_manifest_digest: digest("8"),
    merkle_root: digest("9"),
    signature: "base64:ZmFrZQ==",
  };
  assert.deepEqual(validateSignedPackManifest(manifest), { ok: true });
  assert.equal(validateSignedPackManifest({ ...manifest, unexpected: true }).ok, false);
});
```

- [ ] **Step 2: Run the failing schema tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/schema.test.js
```

Expected: FAIL with `Cannot find module .../schema.mjs`.

- [ ] **Step 3: Implement schema validation**

Create `tools/simurgh-attestation/stage4h/schema.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  CERTIFICATE_TYPE,
  CHECKER_VERSION,
  CLAIM,
  DEFAULT_SCOPE,
  MANIFEST_VERSION,
  PROOF_SYSTEM,
} from "./constants.mjs";

const DIGEST_RE = /^sha256:[a-f0-9]{64}$/;
const BASE64_RE = /^base64:[A-Za-z0-9+/]+={0,2}$/;

function keysExactly(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function ok() {
  return { ok: true };
}

function fail(reason, field) {
  return { ok: false, reason, field };
}

export function isSha256Digest(value) {
  return typeof value === "string" && DIGEST_RE.test(value);
}

export function validateDfiCertificate(cert) {
  const topKeys = [
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
  ];
  if (!keysExactly(cert, topKeys)) return fail("schema_invalid", "certificate");
  if (cert.type !== CERTIFICATE_TYPE) return fail("schema_invalid", "type");
  if (cert.proof_system !== PROOF_SYSTEM) return fail("proof_system_unsupported", "proof_system");
  if (cert.claim !== CLAIM) return fail("schema_invalid", "claim");
  if (!keysExactly(cert.scope, Object.keys(DEFAULT_SCOPE))) return fail("schema_invalid", "scope");
  for (const [key, value] of Object.entries(DEFAULT_SCOPE)) {
    if (cert.scope[key] !== value) return fail("schema_invalid", `scope.${key}`);
  }
  for (const field of [
    "run_id_hash",
    "base_pack_digest",
    "replay_root",
    "premise_digest",
    "policy_digest",
    "lattice_digest",
  ]) {
    if (!isSha256Digest(cert[field])) return fail("schema_invalid", field);
  }
  if (cert.checker_version !== CHECKER_VERSION) {
    return fail("schema_invalid", "checker_version");
  }
  if (
    !keysExactly(cert.derivation, [
      "derived_node_labels",
      "lattice_steps",
      "sink_safety_claims",
      "premise_refs",
    ])
  ) {
    return fail("schema_invalid", "derivation");
  }
  for (const field of Object.keys(cert.derivation)) {
    if (!Array.isArray(cert.derivation[field]))
      return fail("schema_invalid", `derivation.${field}`);
  }
  if (
    !keysExactly(cert.summary, [
      "sources_checked",
      "edges_checked",
      "authority_sinks_checked",
      "violations",
    ])
  ) {
    return fail("schema_invalid", "summary");
  }
  for (const field of Object.keys(cert.summary)) {
    if (!nonNegativeInteger(cert.summary[field])) return fail("schema_invalid", `summary.${field}`);
  }
  return ok();
}

export function validateSignedPackManifest(manifest) {
  if (
    !keysExactly(manifest, [
      "manifest_version",
      "base_pack_digest",
      "certificate_digest",
      "signed_pack_manifest_digest",
      "merkle_root",
      "signature",
    ])
  ) {
    return fail("schema_invalid", "manifest");
  }
  if (manifest.manifest_version !== MANIFEST_VERSION) {
    return fail("schema_invalid", "manifest_version");
  }
  for (const field of [
    "base_pack_digest",
    "certificate_digest",
    "signed_pack_manifest_digest",
    "merkle_root",
  ]) {
    if (!isSha256Digest(manifest[field])) return fail("schema_invalid", field);
  }
  if (typeof manifest.signature !== "string" || !BASE64_RE.test(manifest.signature)) {
    return fail("schema_invalid", "signature");
  }
  return ok();
}
```

- [ ] **Step 4: Run schema tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/schema.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add tools/simurgh-attestation/stage4h/schema.mjs \
  tests/unit/llmShield/stage4h/schema.test.js
git commit -m "feat(llm-shield): add stage 4h certificate schema"
```

## Task 3: Canonical Premise Projection And Q2 Digest

**Files:**

- Create: `tools/simurgh-attestation/stage4h/canonicalPremises.mjs`
- Create: `tests/unit/llmShield/stage4h/premiseBinding.test.js`

- [ ] **Step 1: Inspect the actual Stage 4D pack shape**

Run:

```bash
node - <<'NODE'
const fs = require("node:fs");
const pack = JSON.parse(
  fs.readFileSync(
    "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/evidence-pack.json",
    "utf8"
  )
);
const actionId = Object.keys(pack.replay_material || {})[0];
console.log("pack keys:", Object.keys(pack).sort());
console.log("first action:", actionId);
console.log("material keys:", Object.keys(pack.replay_material[actionId] || {}).sort());
console.log(
  "taint keys:",
  Object.keys(pack.replay_material[actionId]?.taint_derivation_inputs || {}).sort()
);
console.log(JSON.stringify(pack.replay_material[actionId]?.taint_derivation_inputs, null, 2));
NODE
```

Expected:

- Pack keys include `run_manifest`, `action_observation_log`, `replay_material`, `receipts`, `policy_bundle`, `consequence_lattice`, and `sink_registry`.
- Taint keys include `authority_sink` and `sources`.
- Source records use `source_id` and `label`.
- There is no required `explicit_data_edges` array in the current 4D pack.

If the observed shape differs, update the adapter code in this task to match the observed committed Stage 4D pack before writing tests.

- [ ] **Step 2: Write failing premise projection tests**

Create `tests/unit/llmShield/stage4h/premiseBinding.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  basePackView,
  buildPremiseSet,
  premiseDigest,
  premiseId,
} from "../../../../tools/simurgh-attestation/stage4h/canonicalPremises.mjs";

const STAGE4D_PACK_PATH =
  "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/evidence-pack.json";

function loadPack() {
  return JSON.parse(readFileSync(STAGE4D_PACK_PATH, "utf8"));
}

test("Stage 4H premise projection is metadata-only and byte-stable", () => {
  const pack = loadPack();
  const premises = buildPremiseSet(pack);
  assert.equal(premises.type, "simurgh.vca.dfi_premises.v1");
  assert.match(premises.base_pack_digest, /^sha256:[a-f0-9]{64}$/);
  assert.match(premises.replay_root, /^sha256:[a-f0-9]{64}$/);
  assert.match(premiseDigest(premises), /^sha256:[a-f0-9]{64}$/);
  assert.equal(premiseDigest(premises), premiseDigest(buildPremiseSet(pack)));
  assert.equal(JSON.stringify(premises).includes("raw_prompt"), false);
  assert.equal(JSON.stringify(premises).includes("provider_transcript"), false);
});

test("Stage 4H premise IDs are stable and include kind", () => {
  const id = premiseId({ kind: "authority_sink", stable_fields: { sink_id: "wire_transfer" } });
  assert.match(id, /^premise:sha256:[a-f0-9]{64}$/);
  assert.equal(
    id,
    premiseId({ stable_fields: { sink_id: "wire_transfer" }, kind: "authority_sink" })
  );
});

test("Stage 4H premise projection changes when replay data changes", () => {
  const pack = loadPack();
  const original = premiseDigest(buildPremiseSet(pack));
  const mutated = structuredClone(pack);
  const actionId = Object.keys(mutated.replay_material)[0];
  mutated.replay_material[actionId].taint_derivation_inputs.sources.push({
    source_id: "untrusted_extra",
    label: "untrusted",
  });
  assert.notEqual(premiseDigest(buildPremiseSet(mutated)), original);
});

test("Stage 4H base-pack view ignores non-view top-level metadata", () => {
  const pack = loadPack();
  const withExtra = { ...pack, stage4h_certificate: { should_not_bind: true } };
  assert.deepEqual(basePackView(withExtra), basePackView(pack));
  assert.equal(buildPremiseSet(withExtra).base_pack_digest, buildPremiseSet(pack).base_pack_digest);
});
```

- [ ] **Step 3: Run the failing premise tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/premiseBinding.test.js
```

Expected: FAIL with `Cannot find module .../canonicalPremises.mjs`.

- [ ] **Step 4: Implement premise projection**

Create `tools/simurgh-attestation/stage4h/canonicalPremises.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import { sha256Canonical } from "../stage4d/stage4dCrypto.mjs";

export function digest(value) {
  return `sha256:${sha256Canonical(value)}`;
}

export function premiseId({ kind, stable_fields }) {
  return `premise:${digest({ kind, stable_fields })}`;
}

export function basePackView(pack) {
  return {
    run_manifest: pack.run_manifest,
    action_observation_log: pack.action_observation_log,
    replay_material: pack.replay_material,
    receipts: pack.receipts,
    policy_bundle: pack.policy_bundle,
    consequence_lattice: pack.consequence_lattice,
    sink_registry: pack.sink_registry,
  };
}

function sortedById(items) {
  return [...items].sort((a, b) => a.premise_id.localeCompare(b.premise_id));
}

function actionEntries(pack) {
  return Object.entries(pack.replay_material || {}).sort(([a], [b]) => a.localeCompare(b));
}

function sourcePremises(pack) {
  const out = [];
  for (const [action_id, material] of actionEntries(pack)) {
    for (const source of material.taint_derivation_inputs?.sources || []) {
      const stable_fields = {
        action_id,
        source_id: source.source_id,
        label: source.label,
      };
      out.push({
        kind: "source_label",
        premise_id: premiseId({ kind: "source_label", stable_fields }),
        stable_fields,
      });
    }
  }
  return sortedById(out);
}

function replayNodePremises(pack) {
  return sortedById(
    (pack.receipts || []).map((receipt) => {
      const payload = receipt.receipt_payload;
      const stable_fields = {
        action_id: payload.action_id,
        step_index: payload.step_index,
        decision: payload.decision,
        decision_reason_code: payload.decision_reason_code,
      };
      return {
        kind: "replay_node",
        premise_id: premiseId({ kind: "replay_node", stable_fields }),
        stable_fields,
      };
    })
  );
}

function edgePremises(pack) {
  const out = [];
  for (const [action_id, material] of actionEntries(pack)) {
    const taint = material.taint_derivation_inputs || {};
    for (const source of taint.sources || []) {
      const stable_fields = {
        action_id,
        from: `source:${source.source_id}`,
        to: `action:${action_id}`,
        label: source.label,
      };
      out.push({
        kind: "explicit_edge",
        premise_id: premiseId({ kind: "explicit_edge", stable_fields }),
        stable_fields,
      });
    }
  }
  return sortedById(out);
}

function sinkPremises(pack) {
  const registry = Array.isArray(pack.sink_registry?.sinks)
    ? pack.sink_registry.sinks
    : Object.values(pack.sink_registry?.sinks || {});
  const registrySinks = registry.map((sink) => {
    const stable_fields = {
      sink_id: sink.sink_id,
      authority: sink.authority,
      consequence_class: sink.consequence_class,
    };
    return {
      kind: "authority_sink",
      premise_id: premiseId({ kind: "authority_sink", stable_fields }),
      stable_fields,
    };
  });
  const actionSinks = [];
  for (const [action_id, material] of actionEntries(pack)) {
    if (material.taint_derivation_inputs?.authority_sink === true) {
      const stable_fields = { action_id, authority_sink: true };
      actionSinks.push({
        kind: "authority_sink",
        premise_id: premiseId({ kind: "authority_sink", stable_fields }),
        stable_fields,
      });
    }
  }
  return sortedById([...registrySinks, ...actionSinks]);
}

export function buildPremiseSet(pack) {
  const view = basePackView(pack);
  return {
    type: "simurgh.vca.dfi_premises.v1",
    base_pack_digest: digest(view),
    replay_root: digest({
      action_observation_log: pack.action_observation_log,
      replay_material: pack.replay_material,
      receipts: pack.receipts,
    }),
    policy_digest: digest(pack.policy_bundle),
    lattice_digest: digest(pack.consequence_lattice),
    sources: sourcePremises(pack),
    replay_nodes: replayNodePremises(pack),
    explicit_edges: edgePremises(pack),
    authority_sinks: sinkPremises(pack),
  };
}

export function premiseDigest(premises) {
  return digest(premises);
}
```

- [ ] **Step 5: Run premise tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/premiseBinding.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

Run:

```bash
git add tools/simurgh-attestation/stage4h/canonicalPremises.mjs \
  tests/unit/llmShield/stage4h/premiseBinding.test.js
git commit -m "feat(llm-shield): add stage 4h premise projection"
```

## Task 4: Certificate Builder And Pack Binding

**Files:**

- Create: `tools/simurgh-attestation/stage4h/dfiCertificate.mjs`
- Create: `tools/simurgh-attestation/stage4h/packBinding.mjs`
- Create: `tests/unit/llmShield/stage4h/packBinding.test.js`

- [ ] **Step 1: Write failing pack-binding tests**

Create `tests/unit/llmShield/stage4h/packBinding.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildDfiCertificate,
  certificateDigest,
} from "../../../../tools/simurgh-attestation/stage4h/dfiCertificate.mjs";
import {
  buildSignedPackManifest,
  verifyPackBinding,
} from "../../../../tools/simurgh-attestation/stage4h/packBinding.mjs";

const STAGE4D_PACK_PATH =
  "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/evidence-pack.json";

function loadPack() {
  return JSON.parse(readFileSync(STAGE4D_PACK_PATH, "utf8"));
}

test("Stage 4H certificate digest is external and manifest-bound", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const pack = loadPack();
  const certificate = buildDfiCertificate({ pack });
  assert.equal(Object.hasOwn(certificate, "certificate_digest"), false);
  const manifest = buildSignedPackManifest({ certificate, privateKey });
  assert.equal(manifest.certificate_digest, certificateDigest(certificate));
  assert.equal(verifyPackBinding({ certificate, manifest, publicKey }).ok, true);
});

test("Stage 4H pack binding rejects certificate, digest, and signature tampering", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const certificate = buildDfiCertificate({ pack: loadPack() });
  const manifest = buildSignedPackManifest({ certificate, privateKey });
  assert.equal(
    verifyPackBinding({
      certificate: { ...certificate, premise_digest: `sha256:${"0".repeat(64)}` },
      manifest,
      publicKey,
    }).reason,
    "certificate_digest_mismatch"
  );
  assert.equal(
    verifyPackBinding({
      certificate,
      manifest: { ...manifest, base_pack_digest: `sha256:${"0".repeat(64)}` },
      publicKey,
    }).reason,
    "base_pack_digest_mismatch"
  );
  assert.equal(
    verifyPackBinding({
      certificate,
      manifest: { ...manifest, signature: "base64:ZmFrZQ==" },
      publicKey,
    }).reason,
    "manifest_signature_invalid"
  );
});
```

- [ ] **Step 2: Run the failing pack-binding tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/packBinding.test.js
```

Expected: FAIL with missing `dfiCertificate.mjs` or `packBinding.mjs`.

- [ ] **Step 3: Implement the certificate builder**

Create `tools/simurgh-attestation/stage4h/dfiCertificate.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  CHECKER_VERSION,
  CERTIFICATE_TYPE,
  CLAIM,
  DEFAULT_SCOPE,
  PROOF_SYSTEM,
} from "./constants.mjs";
import { buildPremiseSet, digest, premiseDigest } from "./canonicalPremises.mjs";
import { validateDfiCertificate } from "./schema.mjs";

export function certificateDigest(certificate) {
  return digest(certificate);
}

export function buildDfiCertificate({ pack }) {
  const premises = buildPremiseSet(pack);
  const certificate = {
    type: CERTIFICATE_TYPE,
    proof_system: PROOF_SYSTEM,
    claim: CLAIM,
    scope: { ...DEFAULT_SCOPE },
    run_id_hash: digest(pack.run_manifest?.run_id || "unknown-run"),
    base_pack_digest: premises.base_pack_digest,
    replay_root: premises.replay_root,
    premise_digest: premiseDigest(premises),
    policy_digest: premises.policy_digest,
    lattice_digest: premises.lattice_digest,
    checker_version: CHECKER_VERSION,
    derivation: {
      derived_node_labels: [],
      lattice_steps: [],
      sink_safety_claims: [],
      premise_refs: [],
    },
    summary: {
      sources_checked: premises.sources.length,
      edges_checked: premises.explicit_edges.length,
      authority_sinks_checked: premises.authority_sinks.length,
      violations: 0,
    },
  };
  const valid = validateDfiCertificate(certificate);
  if (!valid.ok) throw new Error(`invalid stage4h certificate: ${valid.reason}:${valid.field}`);
  return certificate;
}
```

- [ ] **Step 4: Implement pack binding**

Create `tools/simurgh-attestation/stage4h/packBinding.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import { sign, verify } from "node:crypto";
import { merkleRoot } from "../stage4d/merkle.mjs";
import { domainBytes } from "../stage4d/stage4dCrypto.mjs";
import { MANIFEST_DOMAIN, MANIFEST_VERSION } from "./constants.mjs";
import { certificateDigest } from "./dfiCertificate.mjs";
import { digest } from "./canonicalPremises.mjs";
import { validateDfiCertificate, validateSignedPackManifest } from "./schema.mjs";

function manifestPayload(manifest) {
  const { signature, signed_pack_manifest_digest, ...payload } = manifest;
  return payload;
}

function manifestDigest(payload) {
  return digest(payload);
}

export function buildSignedPackManifest({ certificate, privateKey }) {
  const certCheck = validateDfiCertificate(certificate);
  if (!certCheck.ok) throw new Error(`invalid certificate: ${certCheck.reason}:${certCheck.field}`);
  const payload = {
    manifest_version: MANIFEST_VERSION,
    base_pack_digest: certificate.base_pack_digest,
    certificate_digest: certificateDigest(certificate),
    merkle_root: `sha256:${merkleRoot([
      certificate.base_pack_digest.replace(/^sha256:/, ""),
      certificateDigest(certificate).replace(/^sha256:/, ""),
    ])}`,
  };
  const signed_pack_manifest_digest = manifestDigest(payload);
  const signature = `base64:${sign(null, domainBytes(MANIFEST_DOMAIN, payload), privateKey).toString("base64")}`;
  return { ...payload, signed_pack_manifest_digest, signature };
}

export function verifyPackBinding({ certificate, manifest, publicKey }) {
  const certCheck = validateDfiCertificate(certificate);
  if (!certCheck.ok) return { ok: false, reason: certCheck.reason, field: certCheck.field };
  const manifestCheck = validateSignedPackManifest(manifest);
  if (!manifestCheck.ok)
    return { ok: false, reason: manifestCheck.reason, field: manifestCheck.field };
  if (manifest.base_pack_digest !== certificate.base_pack_digest) {
    return { ok: false, reason: "base_pack_digest_mismatch" };
  }
  if (manifest.certificate_digest !== certificateDigest(certificate)) {
    return { ok: false, reason: "certificate_digest_mismatch" };
  }
  const payload = manifestPayload(manifest);
  if (manifest.signed_pack_manifest_digest !== manifestDigest(payload)) {
    return { ok: false, reason: "signed_pack_manifest_digest_mismatch" };
  }
  const expectedRoot = `sha256:${merkleRoot([
    manifest.base_pack_digest.replace(/^sha256:/, ""),
    manifest.certificate_digest.replace(/^sha256:/, ""),
  ])}`;
  if (manifest.merkle_root !== expectedRoot) return { ok: false, reason: "merkle_root_mismatch" };
  try {
    const ok = verify(
      null,
      domainBytes(MANIFEST_DOMAIN, payload),
      publicKey,
      Buffer.from(manifest.signature.replace(/^base64:/, ""), "base64")
    );
    return ok ? { ok: true } : { ok: false, reason: "manifest_signature_invalid" };
  } catch {
    return { ok: false, reason: "manifest_signature_invalid" };
  }
}
```

- [ ] **Step 5: Run pack-binding tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/packBinding.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

Run:

```bash
git add tools/simurgh-attestation/stage4h/dfiCertificate.mjs \
  tools/simurgh-attestation/stage4h/packBinding.mjs \
  tests/unit/llmShield/stage4h/packBinding.test.js
git commit -m "feat(llm-shield): bind stage 4h certificate digests"
```

## Task 5: Digest-Fixture Builder And Committed Q2/Q5 Fixtures

**Files:**

- Create: `tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs`
- Create fixture files under `tests/fixtures/llmShield/stage4h/`
- Create evidence files under `docs/research/llm-shield/evidence/stage-4h/`

- [ ] **Step 1: Write failing reproduce fixture test**

Create `tests/unit/llmShield/stage4h/reproduce.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";
const evidenceRoot = "docs/research/llm-shield/evidence/stage-4h";

test("Stage 4H.0 committed fixtures and evidence are present and non-claiming", () => {
  for (const path of [
    `${fixtureRoot}/clean-base-pack.json`,
    `${fixtureRoot}/tampered-base-pack.json`,
    `${fixtureRoot}/clean-base-pack.sig`,
    `${fixtureRoot}/wrong-base-pack.sig`,
    `${fixtureRoot}/clean-signer.pub`,
    `${fixtureRoot}/wrong-base-pack.pub`,
    `${fixtureRoot}/clean-dfi-certificate.json`,
    `${fixtureRoot}/malformed-certificate.json`,
    `${fixtureRoot}/clean-signed-pack-manifest.json`,
    `${fixtureRoot}/manifest-verifier.pub`,
    `${fixtureRoot}/forged-premise-digest-certificate.json`,
    `${fixtureRoot}/expected-results/q2-q5-results.json`,
    `${evidenceRoot}/certificate.json`,
    `${evidenceRoot}/signed-pack-manifest.json`,
    `${evidenceRoot}/verifier-results.json`,
    `${evidenceRoot}/q-gate-results.json`,
    `${evidenceRoot}/README.md`,
  ]) {
    assert.equal(existsSync(path), true, `${path} exists`);
  }
  const qGate = JSON.parse(readFileSync(`${evidenceRoot}/q-gate-results.json`, "utf8"));
  assert.equal(qGate.gates.Q2.status, "pass");
  assert.equal(qGate.gates.Q5.status, "pass");
  assert.equal(qGate.gates.Q1.status, "not_in_scope");
  assert.equal(qGate.gates.Q3.status, "not_in_scope");
  assert.equal(qGate.gates.Q4.status, "not_in_scope");
  assert.equal(qGate.gates.Q6.status, "not_in_scope");
  assert.equal(qGate.gates.Q7.status, "not_in_scope");
});

test("Stage 4H.0 committed fixtures and evidence are metadata-only", () => {
  const haystack = [
    readFileSync(`${fixtureRoot}/clean-base-pack.json`, "utf8"),
    readFileSync(`${fixtureRoot}/clean-dfi-certificate.json`, "utf8"),
    readFileSync(`${fixtureRoot}/forged-premise-digest-certificate.json`, "utf8"),
    readFileSync(`${evidenceRoot}/verifier-results.json`, "utf8"),
    readFileSync(`${evidenceRoot}/q-gate-results.json`, "utf8"),
  ].join("\n");
  for (const forbidden of [
    "raw_prompt",
    "raw_output",
    "tool_args",
    "provider_transcript",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "/Users/",
  ]) {
    assert.equal(haystack.includes(forbidden), false, `${forbidden} absent`);
  }
});
```

- [ ] **Step 2: Run the failing fixture test**

Run:

```bash
node --test tests/unit/llmShield/stage4h/reproduce.test.js
```

Expected: FAIL because fixture and evidence files do not exist.

- [ ] **Step 3: Implement the fixture builder**

Create `tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs`:

```js
#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createPrivateKey, createPublicKey } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { STAGE4D_EVIDENCE_DIR, STAGE4H_EVIDENCE_DIR } from "./constants.mjs";
import { buildDfiCertificate } from "./dfiCertificate.mjs";
import { certificateDigest } from "./dfiCertificate.mjs";
import { buildSignedPackManifest, verifyPackBinding } from "./packBinding.mjs";
import { RAW_VERIFIER_CODES, stage4CodeForRawCode } from "./exitCodes.mjs";

const stable = (value) => JSON.stringify(value, null, 2) + "\n";

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stable(value));
}

export async function main({ root = process.cwd() } = {}) {
  const pack = JSON.parse(
    await readFile(join(root, STAGE4D_EVIDENCE_DIR, "evidence-pack.json"), "utf8")
  );
  const signature = await readFile(join(root, STAGE4D_EVIDENCE_DIR, "evidence-pack.sig"), "utf8");
  const signerPub = await readFile(join(root, STAGE4D_EVIDENCE_DIR, "signer.pub"), "utf8");
  const manifestPrivateKeyPem = await readFile(
    join(root, "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem"),
    "utf8"
  );
  const manifestPublicKeyPem = await readFile(
    join(root, "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-public.pem"),
    "utf8"
  );
  const wrongBasePackPublicKeyPem = await readFile(
    join(
      root,
      "docs/research/llm-shield/evidence/stage-4g-adaptive-red-team-campaign/public-key.pem"
    ),
    "utf8"
  );
  const manifestPrivateKey = createPrivateKey(manifestPrivateKeyPem);
  const manifestPublicKey = createPublicKey(manifestPublicKeyPem);
  const certificate = buildDfiCertificate({ pack });
  const forgedPremiseDigestCertificate = {
    ...certificate,
    premise_digest: `sha256:${"0".repeat(64)}`,
  };
  const malformedCertificate = { ...certificate, unexpected: true };
  const tamperedBasePack = {
    ...pack,
    run_manifest: { ...pack.run_manifest, stage4h_tamper: true },
  };
  const manifest = buildSignedPackManifest({ certificate, privateKey: manifestPrivateKey });
  const binding = verifyPackBinding({ certificate, manifest, publicKey: manifestPublicKey });
  const verifierResults = {
    ok: binding.ok,
    code: binding.ok ? RAW_VERIFIER_CODES.OK : RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH,
    stage4_code: stage4CodeForRawCode(binding.ok ? 0 : RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH),
    gate: "Q2/Q5",
    certificate_digest: certificateDigest(certificate),
    premise_digest: certificate.premise_digest,
    base_pack_digest: certificate.base_pack_digest,
  };
  const qGateResults = {
    stage: "4H.0",
    status: "digest_binding_foundation_only",
    gates: {
      Q0: { status: "not_in_scope" },
      Q1: { status: "not_in_scope" },
      Q2: { status: "pass", raw_verifier_code: 0 },
      Q3: { status: "not_in_scope" },
      Q4: { status: "not_in_scope" },
      Q5: { status: "pass", raw_verifier_code: 0 },
      Q6: { status: "not_in_scope" },
      Q7: { status: "not_in_scope" },
    },
    non_claims: ["dfi_soundness", "derivation_validity", "implicit_flow_security"],
  };
  const fixtureRoot = join(root, "tests/fixtures/llmShield/stage4h");
  await writeJson(join(fixtureRoot, "clean-base-pack.json"), pack);
  await writeJson(join(fixtureRoot, "tampered-base-pack.json"), tamperedBasePack);
  await writeFile(join(fixtureRoot, "clean-base-pack.sig"), signature);
  await writeFile(join(fixtureRoot, "wrong-base-pack.sig"), "base64:ZmFrZQ==\n");
  await writeFile(join(fixtureRoot, "clean-signer.pub"), signerPub);
  await writeFile(join(fixtureRoot, "wrong-base-pack.pub"), wrongBasePackPublicKeyPem);
  await writeJson(join(fixtureRoot, "clean-dfi-certificate.json"), certificate);
  await writeJson(join(fixtureRoot, "malformed-certificate.json"), malformedCertificate);
  await writeJson(join(fixtureRoot, "clean-signed-pack-manifest.json"), manifest);
  await writeFile(join(fixtureRoot, "manifest-verifier.pub"), manifestPublicKeyPem);
  await writeJson(
    join(fixtureRoot, "forged-premise-digest-certificate.json"),
    forgedPremiseDigestCertificate
  );
  await writeJson(join(fixtureRoot, "expected-results/q2-q5-results.json"), verifierResults);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "certificate.json"), certificate);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "signed-pack-manifest.json"), manifest);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "verifier-results.json"), verifierResults);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "q-gate-results.json"), qGateResults);
  await writeFile(
    join(root, STAGE4H_EVIDENCE_DIR, "README.md"),
    "# Stage 4H Evidence\n\nStage 4H.0 evidence covers digest and binding foundation only. Q1, Q3, Q4, Q6, and Q7 remain not in scope until later milestones.\n"
  );
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`stage4h fixture build: ${error.message}`);
    process.exit(29);
  });
}
```

- [ ] **Step 4: Generate fixtures and evidence**

Run:

```bash
node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs
```

Expected: command exits `0` and writes fixture/evidence files.

- [ ] **Step 5: Run fixture test**

Run:

```bash
node --test tests/unit/llmShield/stage4h/reproduce.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit Task 5**

Run:

```bash
git add tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs \
  tests/unit/llmShield/stage4h/reproduce.test.js \
  tests/fixtures/llmShield/stage4h \
  docs/research/llm-shield/evidence/stage-4h
git commit -m "feat(llm-shield): add stage 4h digest fixtures"
```

## Task 6: Q2/Q5 Verifier CLI And Reproduce Script

**Files:**

- Create: `tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs`
- Create: `scripts/reproduce-llm-shield-stage4h.sh`
- Modify: `tests/unit/llmShield/stage4h/reproduce.test.js`

- [ ] **Step 1: Add failing CLI smoke test**

Append to `tests/unit/llmShield/stage4h/reproduce.test.js`:

```js
import { execFileSync } from "node:child_process";

test("Stage 4H.0 verifier CLI accepts committed Q2/Q5 fixtures", () => {
  const output = execFileSync(
    "node",
    [
      "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs",
      "--base-pack",
      `${fixtureRoot}/clean-base-pack.json`,
      "--base-pack-sig",
      `${fixtureRoot}/clean-base-pack.sig`,
      "--base-pack-pubkey",
      `${fixtureRoot}/clean-signer.pub`,
      "--certificate",
      `${fixtureRoot}/clean-dfi-certificate.json`,
      "--manifest",
      `${fixtureRoot}/clean-signed-pack-manifest.json`,
      "--manifest-pubkey",
      `${fixtureRoot}/manifest-verifier.pub`,
      "--out",
      `${fixtureRoot}/expected-results/cli-smoke-results.json`,
    ],
    { encoding: "utf8" }
  );
  assert.match(output, /Stage 4H.0 digest binding: PASS/);
});

test("Stage 4H.0 verifier CLI rejects forged premise digest with code 22", () => {
  assert.throws(
    () =>
      execFileSync(
        "node",
        [
          "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs",
          "--base-pack",
          `${fixtureRoot}/clean-base-pack.json`,
          "--base-pack-sig",
          `${fixtureRoot}/clean-base-pack.sig`,
          "--base-pack-pubkey",
          `${fixtureRoot}/clean-signer.pub`,
          "--certificate",
          `${fixtureRoot}/forged-premise-digest-certificate.json`,
          "--manifest",
          `${fixtureRoot}/clean-signed-pack-manifest.json`,
          "--manifest-pubkey",
          `${fixtureRoot}/manifest-verifier.pub`,
          "--out",
          `${fixtureRoot}/expected-results/forged-premise-cli-results.json`,
        ],
        { encoding: "utf8" }
      ),
    (error) => error.status === 22
  );
});

test("Stage 4H.0 verifier CLI rejects malformed certificate schema with code 20 before Q2", () => {
  assert.throws(
    () =>
      execFileSync(
        "node",
        [
          "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs",
          "--base-pack",
          `${fixtureRoot}/clean-base-pack.json`,
          "--base-pack-sig",
          `${fixtureRoot}/clean-base-pack.sig`,
          "--base-pack-pubkey",
          `${fixtureRoot}/clean-signer.pub`,
          "--certificate",
          `${fixtureRoot}/malformed-certificate.json`,
          "--manifest",
          `${fixtureRoot}/clean-signed-pack-manifest.json`,
          "--manifest-pubkey",
          `${fixtureRoot}/manifest-verifier.pub`,
          "--out",
          `${fixtureRoot}/expected-results/malformed-cli-results.json`,
        ],
        { encoding: "utf8" }
      ),
    (error) => error.status === 20
  );
});

test("Stage 4H.0 verifier CLI rejects invalid base-pack signature with code 25", () => {
  assert.throws(
    () =>
      execFileSync(
        "node",
        [
          "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs",
          "--base-pack",
          `${fixtureRoot}/clean-base-pack.json`,
          "--base-pack-sig",
          `${fixtureRoot}/wrong-base-pack.sig`,
          "--base-pack-pubkey",
          `${fixtureRoot}/clean-signer.pub`,
          "--certificate",
          `${fixtureRoot}/clean-dfi-certificate.json`,
          "--manifest",
          `${fixtureRoot}/clean-signed-pack-manifest.json`,
          "--manifest-pubkey",
          `${fixtureRoot}/manifest-verifier.pub`,
          "--out",
          `${fixtureRoot}/expected-results/wrong-base-pack-sig-results.json`,
        ],
        { encoding: "utf8" }
      ),
    (error) => error.status === 25
  );
});

test("Stage 4H.0 verifier CLI rejects wrong base-pack public key with code 25", () => {
  assert.throws(
    () =>
      execFileSync(
        "node",
        [
          "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs",
          "--base-pack",
          `${fixtureRoot}/clean-base-pack.json`,
          "--base-pack-sig",
          `${fixtureRoot}/clean-base-pack.sig`,
          "--base-pack-pubkey",
          `${fixtureRoot}/wrong-base-pack.pub`,
          "--certificate",
          `${fixtureRoot}/clean-dfi-certificate.json`,
          "--manifest",
          `${fixtureRoot}/clean-signed-pack-manifest.json`,
          "--manifest-pubkey",
          `${fixtureRoot}/manifest-verifier.pub`,
          "--out",
          `${fixtureRoot}/expected-results/wrong-base-pack-pubkey-results.json`,
        ],
        { encoding: "utf8" }
      ),
    (error) => error.status === 25
  );
});

test("Stage 4H.0 verifier CLI rejects tampered base pack with code 25", () => {
  assert.throws(
    () =>
      execFileSync(
        "node",
        [
          "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs",
          "--base-pack",
          `${fixtureRoot}/tampered-base-pack.json`,
          "--base-pack-sig",
          `${fixtureRoot}/clean-base-pack.sig`,
          "--base-pack-pubkey",
          `${fixtureRoot}/clean-signer.pub`,
          "--certificate",
          `${fixtureRoot}/clean-dfi-certificate.json`,
          "--manifest",
          `${fixtureRoot}/clean-signed-pack-manifest.json`,
          "--manifest-pubkey",
          `${fixtureRoot}/manifest-verifier.pub`,
          "--out",
          `${fixtureRoot}/expected-results/tampered-base-pack-results.json`,
        ],
        { encoding: "utf8" }
      ),
    (error) => error.status === 25
  );
});
```

- [ ] **Step 2: Run the failing CLI test**

Run:

```bash
node --test tests/unit/llmShield/stage4h/reproduce.test.js
```

Expected: FAIL with missing `verify-stage4h-digest-binding.mjs`.

- [ ] **Step 3: Implement the verifier CLI**

Create `tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs`:

```js
#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createPublicKey } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyEvidencePack } from "../stage4d/verifyPack.mjs";
import { RAW_VERIFIER_CODES, stage4CodeForRawCode } from "./exitCodes.mjs";
import { buildPremiseSet, premiseDigest } from "./canonicalPremises.mjs";
import { certificateDigest } from "./dfiCertificate.mjs";
import { verifyPackBinding } from "./packBinding.mjs";
import { validateDfiCertificate, validateSignedPackManifest } from "./schema.mjs";

const stable = (value) => JSON.stringify(value, null, 2) + "\n";

function arg(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? null : argv[index + 1];
}

function codeForBindingReason(reason) {
  if (reason === "schema_invalid") {
    return RAW_VERIFIER_CODES.SCHEMA_INVALID;
  }
  if (reason === "proof_system_unsupported") {
    return RAW_VERIFIER_CODES.PROOF_SYSTEM_UNSUPPORTED;
  }
  if (reason === "premise_digest_mismatch") {
    return RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH;
  }
  if (reason === "policy_or_lattice_digest_mismatch") {
    return RAW_VERIFIER_CODES.POLICY_DIGEST_MISMATCH;
  }
  return RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH;
}

export async function main({ argv = process.argv.slice(2) } = {}) {
  const basePackPath = arg(argv, "--base-pack");
  const basePackSigPath = arg(argv, "--base-pack-sig");
  const basePackPubkeyPath = arg(argv, "--base-pack-pubkey");
  const certificatePath = arg(argv, "--certificate");
  const manifestPath = arg(argv, "--manifest");
  const publicKeyPath = arg(argv, "--manifest-pubkey");
  const outPath = arg(argv, "--out");
  if (
    !basePackPath ||
    !basePackSigPath ||
    !basePackPubkeyPath ||
    !certificatePath ||
    !manifestPath ||
    !publicKeyPath ||
    !outPath
  ) {
    throw new Error(
      "usage: verify-stage4h-digest-binding --base-pack <json> --base-pack-sig <sig> --base-pack-pubkey <pem> --certificate <json> --manifest <json> --manifest-pubkey <pem> --out <json>"
    );
  }
  const basePack = JSON.parse(await readFile(basePackPath, "utf8"));
  const basePackSignature = (await readFile(basePackSigPath, "utf8")).trim();
  const basePackPublicKeyPem = await readFile(basePackPubkeyPath, "utf8");
  const certificate = JSON.parse(await readFile(certificatePath, "utf8"));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const publicKey = createPublicKey(await readFile(publicKeyPath, "utf8"));
  let code = RAW_VERIFIER_CODES.OK;
  let reason = null;
  const certificateSchema = validateDfiCertificate(certificate);
  if (code === RAW_VERIFIER_CODES.OK && !certificateSchema.ok) {
    code = codeForBindingReason(certificateSchema.reason);
    reason = certificateSchema.reason;
  }
  const manifestSchema = validateSignedPackManifest(manifest);
  if (code === RAW_VERIFIER_CODES.OK && !manifestSchema.ok) {
    code = codeForBindingReason(manifestSchema.reason);
    reason = manifestSchema.reason;
  }
  const basePackVerification = verifyEvidencePack({
    pack: basePack,
    signature: basePackSignature,
    publicKeyPem: basePackPublicKeyPem,
  });
  if (code === RAW_VERIFIER_CODES.OK && !basePackVerification.ok) {
    code = RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH;
    reason = `base_pack_verify_failed:${basePackVerification.first_failure?.reason || "unknown"}`;
  }
  const premises = buildPremiseSet(basePack);
  if (
    code === RAW_VERIFIER_CODES.OK &&
    (certificate.base_pack_digest !== premises.base_pack_digest ||
      certificate.replay_root !== premises.replay_root ||
      certificate.premise_digest !== premiseDigest(premises))
  ) {
    code = RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH;
    reason = "premise_digest_mismatch";
  } else if (
    code === RAW_VERIFIER_CODES.OK &&
    (certificate.policy_digest !== premises.policy_digest ||
      certificate.lattice_digest !== premises.lattice_digest)
  ) {
    code = RAW_VERIFIER_CODES.POLICY_DIGEST_MISMATCH;
    reason = "policy_or_lattice_digest_mismatch";
  }
  const binding =
    code === RAW_VERIFIER_CODES.OK
      ? verifyPackBinding({ certificate, manifest, publicKey })
      : { ok: false, reason };
  if (code === RAW_VERIFIER_CODES.OK && !binding.ok) {
    reason = binding.reason;
    code = codeForBindingReason(reason);
  }
  const result = {
    ok: code === RAW_VERIFIER_CODES.OK,
    code,
    stage4_code: stage4CodeForRawCode(code),
    gate: "Q2/Q5",
    certificate_digest: certificateDigest(certificate),
    premise_digest: certificate.premise_digest,
    base_pack_digest: certificate.base_pack_digest,
    recomputed_premise_digest: premiseDigest(premises),
    note:
      code === RAW_VERIFIER_CODES.OK
        ? "premise digest, manifest digest binding, and Ed25519 signature accepted"
        : reason,
  };
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, stable(result));
  if (code !== RAW_VERIFIER_CODES.OK) process.exitCode = code;
  console.log(
    code === RAW_VERIFIER_CODES.OK
      ? "Stage 4H.0 digest binding: PASS"
      : `Stage 4H.0 digest binding: FAIL ${reason}`
  );
  return code;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`stage4h verify: ${error.message}`);
    process.exit(29);
  });
}
```

- [ ] **Step 4: Run the CLI smoke test**

Run:

```bash
node --test tests/unit/llmShield/stage4h/reproduce.test.js
```

Expected: PASS.

- [ ] **Step 5: Create reproduce script**

Create `scripts/reproduce-llm-shield-stage4h.sh`:

```bash
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Stage 4H.0 Proof-Carrying DFI digest foundation: start"
echo "Stage 4H.0 scope: schema, canonical premises, Q2 premise digest, Q5 pack binding"

node --test \
  tests/unit/llmShield/stage4h/schema.test.js \
  tests/unit/llmShield/stage4h/premiseBinding.test.js \
  tests/unit/llmShield/stage4h/packBinding.test.js \
  tests/unit/llmShield/stage4h/reproduce.test.js

node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs

node tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs \
  --base-pack tests/fixtures/llmShield/stage4h/clean-base-pack.json \
  --base-pack-sig tests/fixtures/llmShield/stage4h/clean-base-pack.sig \
  --base-pack-pubkey tests/fixtures/llmShield/stage4h/clean-signer.pub \
  --certificate tests/fixtures/llmShield/stage4h/clean-dfi-certificate.json \
  --manifest tests/fixtures/llmShield/stage4h/clean-signed-pack-manifest.json \
  --manifest-pubkey tests/fixtures/llmShield/stage4h/manifest-verifier.pub \
  --out docs/research/llm-shield/evidence/stage-4h/verifier-results.json

echo "Stage 4H.0 Q2/Q5 digest foundation: PASS"
```

Run:

```bash
chmod +x scripts/reproduce-llm-shield-stage4h.sh
```

- [ ] **Step 6: Run reproduce script**

Run:

```bash
scripts/reproduce-llm-shield-stage4h.sh
```

Expected: PASS and prints `Stage 4H.0 Q2/Q5 digest foundation: PASS`.

- [ ] **Step 7: Commit Task 6**

Run:

```bash
git add tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs \
  tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs \
  tests/unit/llmShield/stage4h/reproduce.test.js \
  tests/fixtures/llmShield/stage4h \
  docs/research/llm-shield/evidence/stage-4h \
  scripts/reproduce-llm-shield-stage4h.sh
git commit -m "feat(llm-shield): add stage 4h digest reproduce gate"
```

## Task 7: Final Verification And 4H.0 Closeout Commit

**Files:**

- Modify only files changed by previous tasks if verification finds formatting or deterministic-output drift.

- [ ] **Step 1: Run Stage 4H reproduce**

Run:

```bash
scripts/reproduce-llm-shield-stage4h.sh
```

Expected: PASS.

- [ ] **Step 2: Run all Stage 4H unit tests directly**

Run:

```bash
node --test tests/unit/llmShield/stage4h/*.test.js
```

Expected: PASS.

- [ ] **Step 3: Run repository test and formatting gates**

Run:

```bash
npm test
npm run format:check
git diff --check
```

Expected:

- `npm test` passes.
- `npm run format:check` passes.
- `git diff --check` produces no output.

- [ ] **Step 4: Verify 4H.0 does not overclaim**

Run:

```bash
rg -n "DFI soundness|Q1.*pass|Q3.*pass|Q4.*pass|Q6.*pass|Q7.*pass|first proof|public priority" \
  docs/research/llm-shield/evidence/stage-4h \
  tests/fixtures/llmShield/stage4h \
  tools/simurgh-attestation/stage4h \
  scripts/reproduce-llm-shield-stage4h.sh
```

Expected: no matches except explicit `non_claims` values or `not_in_scope` records.

- [ ] **Step 5: Verify worktree and commit if needed**

Run:

```bash
git status --short
```

If formatting or generated evidence changed during verification, review the diff and commit:

```bash
git add tools/simurgh-attestation/stage4h \
  tests/unit/llmShield/stage4h \
  tests/fixtures/llmShield/stage4h \
  docs/research/llm-shield/evidence/stage-4h \
  scripts/reproduce-llm-shield-stage4h.sh
git commit -m "test(llm-shield): close stage 4h digest foundation"
```

If the worktree is clean, do not create an empty commit.

## Self-Review Checklist

After implementing the plan, confirm:

- 4H.0 only reports Q2/Q5 as passing.
- Q1/Q3/Q4/Q6/Q7 are `not_in_scope` or `pending`.
- No derivation validator exists beyond empty derivation schema fields.
- Certificate has no `certificate_digest` field.
- Manifest carries `certificate_digest`.
- `base_pack_digest` is derived from the base-pack view and remains acyclic.
- Fixtures and evidence contain no raw prompts, outputs, tool args, provider transcripts, secrets, absolute local paths, or host identifiers.
- The reproduce command is deterministic and byte-stable.
