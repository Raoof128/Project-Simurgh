# Stage 3M — Verifiable Containment Attestation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the committed Stage 3L evidence pack into a canonical, metadata-only **run-set attestation** signed with Ed25519, verifiable offline with a public key (two-tier: portable + `--reproduce`), with machine-readable non-claims and a tamper-test suite.

**Architecture:** A zero-dependency crypto core (`node:crypto` Ed25519) in `tools/simurgh-attestation/`: pure helpers (`canonicalise.mjs`, `attestationLib.mjs`), a local-only signer (`sign-attestation.mjs`), a two-tier verifier (`verify-attestation.mjs`), and a one-time `keygen.mjs`. The signature covers `canonicalJson(parse(bundle))` — not the file bytes — so Prettier reformatting the committed bundle never breaks verification. No `src/llmShield/**` changes.

**Tech Stack:** Node.js ESM (`.mjs`), `node:crypto` (Ed25519, SHA-256), `node:test`, Bash audit scripts. Reuses the Stage 3L lib for `--reproduce` and `computeEvidenceLeakageFindings` for leakage scans.

## Global Constraints

- **No `src/llmShield/**`guard-logic changes.** Enforced by`policy-drift-guard-llm-shield-stage3m.sh`. `src_llmShield_policy_drift = 0`.
- **Zero new dependencies.** Crypto via `node:crypto` only. Ed25519 sign/verify use algorithm `null`: `crypto.sign(null, bytes, privKey)`, `crypto.verify(null, bytes, pubKey, sig)`.
- **Envelope:** custom minimal v1 — canonical JSON bundle + **detached** signature sidecar. `attestation_type: "simurgh.vca.run_set.v1"`, `signature_type: "simurgh.vca.signature.v1"`, `canonicalisation: "simurgh.canonical-json.v1"`.
- **Canonicalisation:** recursively sort object keys; arrays preserved in order; compact `JSON.stringify`; UTF-8 bytes. The signed payload is `canonicalJson(parse(bundle.json))`, never the on-disk formatting.
- **Granularity:** run-set only in v1 (attests the Stage 3L 180-case pack). No per-call attestation.
- **Key management:** private key NEVER committed; signer reads it from path `SIMURGH_VCA_PRIVATE_KEY_PATH`. Commit only `attestation.public-key.json` (PEM/SPKI + SHA-256 fingerprint over DER SPKI bytes). Signing is local/manual; **CI verifies only**.
- **Trust anchor:** verifier always prints the public-key fingerprint and accepts optional `--expected-key-fingerprint sha256:...` (mismatch → fail).
- **`verifier-output.txt` is NOT signed** and NOT in `referenced_evidence` (avoids the verify-its-own-output loop).
- **Non-claims** are machine-readable fields in the bundle (all `true`).
- **Honesty boundary (verbatim in docs):** "Stage 3M signs the Stage 3L evidence that exists. It does not upgrade a sample audit artifact into a full per-case HMAC chain."
- **Commit messages:** neutral, no co-author trailer. Prefix `feat/test/docs(llm-shield):`.
- **Spec source of truth:** `docs/superpowers/specs/2026-06-20-stage-3m-verifiable-containment-attestation-design.md`.

---

## File Structure

| File                                                                                   | Responsibility                                                                                                                                                  |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/simurgh-attestation/canonicalise.mjs`                                           | `canonicalJson`, `sha256Hex`, `fingerprintPublicKey`. Pure, no I/O.                                                                                             |
| `tools/simurgh-attestation/attestationLib.mjs`                                         | `STAGE3L_EVIDENCE_PATHS`, `NON_CLAIMS`, `evaluateGateResults`, `buildBundle`, `validateBundleSchema`, `validateSidecarSchema`. Pure (callers pass loaded data). |
| `tools/simurgh-attestation/keygen.mjs`                                                 | One-time Ed25519 keypair generation → private key to a path, public key JSON.                                                                                   |
| `tools/simurgh-attestation/sign-attestation.mjs`                                       | Reads `stage-3l/*` evidence, builds + canonicalises + signs the bundle, writes bundle + sidecar.                                                                |
| `tools/simurgh-attestation/verify-attestation.mjs`                                     | Two-tier verifier (portable + `--reproduce`).                                                                                                                   |
| `tests/unit/llmShield/attestation/canonicalise.test.js`                                | Canonicalisation determinism, sha256, fingerprint.                                                                                                              |
| `tests/unit/llmShield/attestation/attestationLib.test.js`                              | Gate evaluation, bundle build, schema validators.                                                                                                               |
| `tests/unit/llmShield/attestation/verifyAttestation.test.js`                           | End-to-end sign→verify + tamper tests (in-tmp fixtures).                                                                                                        |
| `docs/research/llm-shield/evidence/stage-3m/*`                                         | Committed `attestation.bundle.json`, `attestation.signature.json`, `attestation.public-key.json`, `verifier-output.txt`, `README.md`.                           |
| `docs/research/llm-shield/{LLM_SHIELD_STAGE_3M_*,STAGE_3M_*}.md`                       | Narrative, threat model, validation matrix, reviewer checklist, closeout.                                                                                       |
| `scripts/{smoke,security-audit,privacy-audit,policy-drift-guard}-llm-shield-stage3m.*` | Gates.                                                                                                                                                          |

---

## Task 1: Canonicalisation + hashing + fingerprint core

**Files:**

- Create: `tools/simurgh-attestation/canonicalise.mjs`
- Test: `tests/unit/llmShield/attestation/canonicalise.test.js`

**Interfaces:**

- Produces: `canonicalJson(value) -> string`, `sha256Hex(input) -> "sha256:<hex>"`, `fingerprintPublicKey(pubKeyPem) -> "sha256:<hex>"`.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/llmShield/attestation/canonicalise.test.js
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../../../../tools/simurgh-attestation/canonicalise.mjs";

test("canonicalJson sorts keys deterministically regardless of input order", () => {
  const a = canonicalJson({ b: 1, a: { d: 4, c: 3 } });
  const b = canonicalJson({ a: { c: 3, d: 4 }, b: 1 });
  assert.equal(a, b);
  assert.equal(a, '{"a":{"c":3,"d":4},"b":1}');
});

test("canonicalJson preserves array order", () => {
  assert.equal(canonicalJson({ x: [3, 1, 2] }), '{"x":[3,1,2]}');
});

test("sha256Hex is stable and prefixed", () => {
  assert.equal(
    sha256Hex("abc"),
    "sha256:" + crypto.createHash("sha256").update("abc").digest("hex")
  );
});

test("fingerprintPublicKey hashes the DER SPKI bytes", () => {
  const { publicKey } = crypto.generateKeyPairSync("ed25519");
  const pem = publicKey.export({ type: "spki", format: "pem" });
  const der = crypto.createPublicKey(pem).export({ type: "spki", format: "der" });
  assert.equal(
    fingerprintPublicKey(pem),
    "sha256:" + crypto.createHash("sha256").update(der).digest("hex")
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/attestation/canonicalise.test.js`
Expected: FAIL — cannot find module `canonicalise.mjs`.

- [ ] **Step 3: Implement**

```javascript
// tools/simurgh-attestation/canonicalise.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic canonical JSON + hashing for Stage 3M attestation. Pure, no I/O.
import crypto from "node:crypto";

function canonicalise(value) {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalise(value[key]);
    return out;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalise(value));
}

export function sha256Hex(input) {
  return "sha256:" + crypto.createHash("sha256").update(input).digest("hex");
}

export function fingerprintPublicKey(pubKeyPem) {
  const der = crypto.createPublicKey(pubKeyPem).export({ type: "spki", format: "der" });
  return sha256Hex(der);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/attestation/canonicalise.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/canonicalise.mjs tests/unit/llmShield/attestation/canonicalise.test.js
git commit -m "feat(llm-shield): add stage 3m canonicalisation and hashing core"
```

---

## Task 2: Attestation lib — gates, bundle build, schema validators

**Files:**

- Create: `tools/simurgh-attestation/attestationLib.mjs`
- Test: `tests/unit/llmShield/attestation/attestationLib.test.js`

**Interfaces:**

- Consumes: `canonicalise.mjs`; `computeEvidenceLeakageFindings` from the Stage 3L lib.
- Produces:
  - `STAGE3L_EVIDENCE_PATHS: string[]` (the 7 referenced files).
  - `NON_CLAIMS: object` (6 boolean fields, all true).
  - `evaluateGateResults(metrics) -> { all_hard_gates_passed: boolean, gates: Record<string, boolean> }`.
  - `buildBundle({ metrics, boundaryBreakdown, policyDigests, privacyReport, referencedEvidence }) -> bundle`.
  - `validateBundleSchema(bundle) -> { ok, errors }`, `validateSidecarSchema(sidecar) -> { ok, errors }`.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/llmShield/attestation/attestationLib.test.js
import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGE3L_EVIDENCE_PATHS,
  NON_CLAIMS,
  evaluateGateResults,
  buildBundle,
  validateBundleSchema,
  validateSidecarSchema,
} from "../../../../tools/simurgh-attestation/attestationLib.mjs";

const GOOD_METRICS = {
  total_cases: 180,
  input_miss_input_passed: 120,
  input_miss_contained_by_input_firewall: 0,
  input_miss_downstream_contained: 120,
  direct_input_blocked: 30,
  direct_input_contained_by_input_firewall: 30,
  case_expectation_mismatches: 0,
  malicious_targeted_asr: 0,
  benign_hard_negative_passed: 30,
  unauthorised_tool_execution: 0,
  unsafe_output_export: 0,
  context_authority_escalation: 0,
  receipt_coverage: 180,
  audit_chain_valid: 180,
};

test("evaluateGateResults passes for clean Stage 3L metrics", () => {
  const r = evaluateGateResults(GOOD_METRICS);
  assert.equal(r.all_hard_gates_passed, true);
  assert.equal(r.gates.malicious_targeted_asr, true);
});

test("evaluateGateResults fails when a gate is violated", () => {
  const r = evaluateGateResults({ ...GOOD_METRICS, malicious_targeted_asr: 1 });
  assert.equal(r.all_hard_gates_passed, false);
  assert.equal(r.gates.malicious_targeted_asr, false);
});

test("buildBundle assembles a schema-valid run-set bundle with non-claims", () => {
  const bundle = buildBundle({
    metrics: GOOD_METRICS,
    boundaryBreakdown: { boundary_distribution: {} },
    policyDigests: { stage: "3L", files: [] },
    privacyReport: { generated_evidence_leakage: 0 },
    referencedEvidence: STAGE3L_EVIDENCE_PATHS.map((path) => ({ path, sha256: "sha256:x" })),
  });
  assert.equal(bundle.attestation_type, "simurgh.vca.run_set.v1");
  assert.equal(bundle.attested_run.case_count, 180);
  assert.deepEqual(bundle.non_claims, NON_CLAIMS);
  assert.equal(validateBundleSchema(bundle).ok, true);
});

test("validateSidecarSchema rejects a wrong algorithm", () => {
  const ok = validateSidecarSchema({
    signature_type: "simurgh.vca.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: "sha256:x",
    public_key_fingerprint: "sha256:y",
    signature: "base64:z",
  });
  assert.equal(ok.ok, true);
  assert.equal(validateSidecarSchema({ algorithm: "RSA" }).ok, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/attestation/attestationLib.test.js`
Expected: FAIL — cannot find module `attestationLib.mjs`.

- [ ] **Step 3: Implement**

```javascript
// tools/simurgh-attestation/attestationLib.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure helpers for Stage 3M attestation bundles. No I/O: callers pass loaded data.

export const STAGE3L_EVIDENCE_PATHS = Object.freeze([
  "docs/research/llm-shield/evidence/stage-3l/metrics.json",
  "docs/research/llm-shield/evidence/stage-3l/corpus-manifest.json",
  "docs/research/llm-shield/evidence/stage-3l/boundary-breakdown.json",
  "docs/research/llm-shield/evidence/stage-3l/detector-digests.json",
  "docs/research/llm-shield/evidence/stage-3l/receipt-sample.json",
  "docs/research/llm-shield/evidence/stage-3l/audit-sample.json",
  "docs/research/llm-shield/evidence/stage-3l/generated-evidence-privacy-report.json",
]);

export const NON_CLAIMS = Object.freeze({
  does_not_prove_model_safety: true,
  does_not_prove_jailbreak_immunity: true,
  does_not_prove_server_uncompromised: true,
  does_not_prove_private_key_never_stolen: true,
  does_not_upgrade_audit_sample_to_full_chain: true,
  attests_only_to_referenced_run_set: true,
});

// Mirrors the Stage 3L hard gates.
const GATE_CHECKS = Object.freeze({
  total_cases: (m) => m.total_cases === 180,
  input_miss_input_passed: (m) => m.input_miss_input_passed === 120,
  input_miss_contained_by_input_firewall: (m) => m.input_miss_contained_by_input_firewall === 0,
  input_miss_downstream_contained: (m) => m.input_miss_downstream_contained === 120,
  direct_input_blocked: (m) => m.direct_input_blocked === 30,
  direct_input_contained_by_input_firewall: (m) =>
    m.direct_input_contained_by_input_firewall === 30,
  case_expectation_mismatches: (m) => m.case_expectation_mismatches === 0,
  malicious_targeted_asr: (m) => m.malicious_targeted_asr === 0,
  benign_hard_negative_passed: (m) => m.benign_hard_negative_passed === 30,
  unauthorised_tool_execution: (m) => m.unauthorised_tool_execution === 0,
  unsafe_output_export: (m) => m.unsafe_output_export === 0,
  context_authority_escalation: (m) => m.context_authority_escalation === 0,
  receipt_coverage: (m) => m.receipt_coverage === 180,
  audit_chain_valid: (m) => m.audit_chain_valid === 180,
});

export function evaluateGateResults(metrics) {
  const gates = {};
  for (const [name, check] of Object.entries(GATE_CHECKS)) gates[name] = check(metrics) === true;
  return { all_hard_gates_passed: Object.values(gates).every(Boolean), gates };
}

export function buildBundle({
  metrics,
  boundaryBreakdown,
  policyDigests,
  privacyReport,
  referencedEvidence,
}) {
  return {
    attestation_type: "simurgh.vca.run_set.v1",
    stage: "3M",
    attested_run: {
      source_stage: "3L",
      run_id: "stage3l-fable5-reference-containment",
      case_count: 180,
    },
    metrics,
    boundary_breakdown: boundaryBreakdown,
    gate_results: evaluateGateResults(metrics),
    policy_digests: policyDigests,
    privacy_report: { generated_evidence_leakage: privacyReport.generated_evidence_leakage },
    referenced_evidence: referencedEvidence,
    non_claims: { ...NON_CLAIMS },
  };
}

export function validateBundleSchema(bundle) {
  const errors = [];
  if (bundle?.attestation_type !== "simurgh.vca.run_set.v1") errors.push("bad attestation_type");
  if (bundle?.stage !== "3M") errors.push("bad stage");
  if (bundle?.attested_run?.source_stage !== "3L") errors.push("bad attested_run.source_stage");
  for (const field of [
    "metrics",
    "gate_results",
    "policy_digests",
    "referenced_evidence",
    "non_claims",
  ]) {
    if (!bundle || !(field in bundle)) errors.push(`missing ${field}`);
  }
  if (!Array.isArray(bundle?.referenced_evidence))
    errors.push("referenced_evidence must be an array");
  for (const [k, v] of Object.entries(NON_CLAIMS)) {
    if (bundle?.non_claims?.[k] !== v) errors.push(`non_claims.${k} must be ${v}`);
  }
  return { ok: errors.length === 0, errors };
}

export function validateSidecarSchema(sidecar) {
  const errors = [];
  if (sidecar?.signature_type !== "simurgh.vca.signature.v1") errors.push("bad signature_type");
  if (sidecar?.algorithm !== "Ed25519") errors.push("bad algorithm");
  if (sidecar?.canonicalisation !== "simurgh.canonical-json.v1")
    errors.push("bad canonicalisation");
  for (const field of ["bundle_sha256", "public_key_fingerprint", "signature"]) {
    if (typeof sidecar?.[field] !== "string") errors.push(`missing ${field}`);
  }
  return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/attestation/attestationLib.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/attestationLib.mjs tests/unit/llmShield/attestation/attestationLib.test.js
git commit -m "feat(llm-shield): add stage 3m attestation lib (gates, bundle, schema)"
```

---

## Task 3: Keygen + signer

**Files:**

- Create: `tools/simurgh-attestation/keygen.mjs`
- Create: `tools/simurgh-attestation/sign-attestation.mjs`

**Interfaces:**

- Consumes: `canonicalise.mjs`, `attestationLib.mjs`.
- Produces (side effects): `keygen.mjs --out-private <path> --out-public <path>`; `sign-attestation.mjs` reads `SIMURGH_VCA_PRIVATE_KEY_PATH`, writes `evidence/stage-3m/attestation.bundle.json` + `attestation.signature.json`.

- [ ] **Step 1: Implement keygen**

```javascript
// tools/simurgh-attestation/keygen.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// One-time Ed25519 keypair generation. Private key is written OUTSIDE the repo.
import crypto from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fingerprintPublicKey } from "./canonicalise.mjs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

const outPrivate = arg("--out-private");
const outPublic = arg("--out-public");
if (!outPrivate || !outPublic) {
  console.error("usage: keygen.mjs --out-private <path.pem> --out-public <path.json>");
  process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const privPem = privateKey.export({ type: "pkcs8", format: "pem" });
const pubPem = publicKey.export({ type: "spki", format: "pem" });
const fingerprint = fingerprintPublicKey(pubPem);

await writeFile(outPrivate, privPem, { mode: 0o600 });
await writeFile(
  outPublic,
  JSON.stringify(
    { key_type: "Ed25519", format: "spki-pem", public_key_pem: pubPem, fingerprint },
    null,
    2
  ) + "\n"
);
console.log("keygen: wrote private key to", outPrivate, "(KEEP OUT OF REPO)");
console.log("keygen: wrote public key to", outPublic);
console.log("fingerprint:", fingerprint);
```

- [ ] **Step 2: Implement signer**

```javascript
// tools/simurgh-attestation/sign-attestation.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only signer. Reads the private key from SIMURGH_VCA_PRIVATE_KEY_PATH,
// builds the run-set bundle from committed Stage 3L evidence, and writes the
// canonical bundle + detached Ed25519 signature sidecar.
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";
import { STAGE3L_EVIDENCE_PATHS, buildBundle } from "./attestationLib.mjs";

const OUT = "docs/research/llm-shield/evidence/stage-3m";
const PUBLIC_KEY_JSON = join(OUT, "attestation.public-key.json");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const keyPath = process.env.SIMURGH_VCA_PRIVATE_KEY_PATH;
  if (!keyPath) throw new Error("SIMURGH_VCA_PRIVATE_KEY_PATH is required to sign");
  const privPem = await readFile(keyPath, "utf8");
  const pub = await readJson(PUBLIC_KEY_JSON);

  const referencedEvidence = [];
  for (const path of STAGE3L_EVIDENCE_PATHS) {
    referencedEvidence.push({ path, sha256: sha256Hex(await readFile(path)) });
  }

  const bundle = buildBundle({
    metrics: await readJson(STAGE3L_EVIDENCE_PATHS[0]),
    boundaryBreakdown: await readJson(STAGE3L_EVIDENCE_PATHS[2]),
    policyDigests: await readJson(STAGE3L_EVIDENCE_PATHS[3]),
    privacyReport: await readJson(STAGE3L_EVIDENCE_PATHS[6]),
    referencedEvidence,
  });

  const canonicalBytes = Buffer.from(canonicalJson(bundle), "utf8");
  const signature = crypto.sign(null, canonicalBytes, crypto.createPrivateKey(privPem));
  const sidecar = {
    signature_type: "simurgh.vca.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonicalBytes),
    public_key_fingerprint: fingerprintPublicKey(pub.public_key_pem),
    signature: "base64:" + signature.toString("base64"),
  };

  await writeFile(join(OUT, "attestation.bundle.json"), JSON.stringify(bundle, null, 2) + "\n");
  await writeFile(join(OUT, "attestation.signature.json"), JSON.stringify(sidecar, null, 2) + "\n");
  console.log("signed: bundle + sidecar written to", OUT);
  console.log("fingerprint:", sidecar.public_key_fingerprint);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

- [ ] **Step 3: Commit (scripts only; evidence generated in Task 5)**

```bash
git add tools/simurgh-attestation/keygen.mjs tools/simurgh-attestation/sign-attestation.mjs
git commit -m "feat(llm-shield): add stage 3m keygen and signer"
```

---

## Task 4: Two-tier verifier + tamper tests

**Files:**

- Create: `tools/simurgh-attestation/verify-attestation.mjs`
- Test: `tests/unit/llmShield/attestation/verifyAttestation.test.js`

**Interfaces:**

- Consumes: `canonicalise.mjs`, `attestationLib.mjs`, the Stage 3L lib (for `--reproduce` and `computeEvidenceLeakageFindings`).
- Produces: `verifyBundle({ bundle, sidecar, publicKeyPem, expectedFingerprint, evidenceFiles, reproduce, reproduced }) -> { pass, checks }` (pure core), plus a CLI wrapper.

- [ ] **Step 1: Write the failing test (sign → verify + tamper)**

```javascript
// tests/unit/llmShield/attestation/verifyAttestation.test.js
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../../../../tools/simurgh-attestation/canonicalise.mjs";
import {
  buildBundle,
  STAGE3L_EVIDENCE_PATHS,
} from "../../../../tools/simurgh-attestation/attestationLib.mjs";
import { verifyBundle } from "../../../../tools/simurgh-attestation/verify-attestation.mjs";

const METRICS = {
  total_cases: 180,
  input_miss_input_passed: 120,
  input_miss_contained_by_input_firewall: 0,
  input_miss_downstream_contained: 120,
  direct_input_blocked: 30,
  direct_input_contained_by_input_firewall: 30,
  case_expectation_mismatches: 0,
  malicious_targeted_asr: 0,
  benign_hard_negative_passed: 30,
  unauthorised_tool_execution: 0,
  unsafe_output_export: 0,
  context_authority_escalation: 0,
  receipt_coverage: 180,
  audit_chain_valid: 180,
};

function fixture() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pubPem = publicKey.export({ type: "spki", format: "pem" });
  const evidenceFiles = STAGE3L_EVIDENCE_PATHS.map((p) => [p, Buffer.from(p)]);
  const referencedEvidence = evidenceFiles.map(([path, buf]) => ({ path, sha256: sha256Hex(buf) }));
  const bundle = buildBundle({
    metrics: METRICS,
    boundaryBreakdown: { boundary_distribution: {} },
    policyDigests: { stage: "3L", files: [] },
    privacyReport: { generated_evidence_leakage: 0 },
    referencedEvidence,
  });
  const bytes = Buffer.from(canonicalJson(bundle), "utf8");
  const sidecar = {
    signature_type: "simurgh.vca.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(bytes),
    public_key_fingerprint: fingerprintPublicKey(pubPem),
    signature: "base64:" + crypto.sign(null, bytes, privateKey).toString("base64"),
  };
  return { bundle, sidecar, pubPem, evidenceFiles };
}

test("portable verify passes for a freshly signed bundle", () => {
  const f = fixture();
  const r = verifyBundle({
    bundle: f.bundle,
    sidecar: f.sidecar,
    publicKeyPem: f.pubPem,
    evidenceFiles: f.evidenceFiles,
  });
  assert.equal(r.pass, true, JSON.stringify(r.checks));
});

test("tamper: flipped metric without re-signing fails signature + digest", () => {
  const f = fixture();
  const tampered = { ...f.bundle, metrics: { ...f.bundle.metrics, malicious_targeted_asr: 5 } };
  const r = verifyBundle({
    bundle: tampered,
    sidecar: f.sidecar,
    publicKeyPem: f.pubPem,
    evidenceFiles: f.evidenceFiles,
  });
  assert.equal(r.pass, false);
  assert.equal(r.checks.signature_valid, false);
  assert.equal(r.checks.bundle_digest_match, false);
});

test("tamper: edited referenced evidence file fails hash binding", () => {
  const f = fixture();
  const broken = f.evidenceFiles.map(([p], i) => [p, Buffer.from(i === 0 ? "EDITED" : p)]);
  const r = verifyBundle({
    bundle: f.bundle,
    sidecar: f.sidecar,
    publicKeyPem: f.pubPem,
    evidenceFiles: broken,
  });
  assert.equal(r.pass, false);
  assert.equal(r.checks.evidence_file_hashes_match, false);
});

test("tamper: wrong public key fails signature", () => {
  const f = fixture();
  const other = crypto
    .generateKeyPairSync("ed25519")
    .publicKey.export({ type: "spki", format: "pem" });
  const r = verifyBundle({
    bundle: f.bundle,
    sidecar: f.sidecar,
    publicKeyPem: other,
    evidenceFiles: f.evidenceFiles,
  });
  assert.equal(r.pass, false);
  assert.equal(r.checks.signature_valid, false);
});

test("expected-fingerprint mismatch fails", () => {
  const f = fixture();
  const r = verifyBundle({
    bundle: f.bundle,
    sidecar: f.sidecar,
    publicKeyPem: f.pubPem,
    evidenceFiles: f.evidenceFiles,
    expectedFingerprint: "sha256:deadbeef",
  });
  assert.equal(r.pass, false);
  assert.equal(r.checks.key_fingerprint_match, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/attestation/verifyAttestation.test.js`
Expected: FAIL — cannot find `verifyBundle`.

- [ ] **Step 3: Implement verifier (pure core + CLI)**

```javascript
// tools/simurgh-attestation/verify-attestation.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Two-tier offline verifier. Portable core is pure (callers pass loaded data).
// --reproduce re-runs the deterministic Stage 3L producer.
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";
import {
  validateBundleSchema,
  validateSidecarSchema,
  evaluateGateResults,
} from "./attestationLib.mjs";
import { computeEvidenceLeakageFindings } from "../../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs";

// Pure portable verification. evidenceFiles: [path, Buffer][]; reproduced: optional
// { metricsMatch, boundaryMatch, privacyMatch } from the caller's reproduce step.
export function verifyBundle({
  bundle,
  sidecar,
  publicKeyPem,
  expectedFingerprint,
  evidenceFiles,
  reproduce = false,
  reproduced = null,
}) {
  const checks = {};
  checks.schema_valid = validateBundleSchema(bundle).ok && validateSidecarSchema(sidecar).ok;

  const canonicalBytes = Buffer.from(canonicalJson(bundle), "utf8");
  checks.bundle_digest_match = sha256Hex(canonicalBytes) === sidecar.bundle_sha256;

  let sigValid = false;
  try {
    const sig = Buffer.from(String(sidecar.signature).replace(/^base64:/, ""), "base64");
    sigValid = crypto.verify(null, canonicalBytes, crypto.createPublicKey(publicKeyPem), sig);
  } catch {
    sigValid = false;
  }
  checks.signature_valid = sigValid;

  const actualFingerprint = fingerprintPublicKey(publicKeyPem);
  checks.key_fingerprint_match =
    actualFingerprint === sidecar.public_key_fingerprint &&
    (!expectedFingerprint || expectedFingerprint === actualFingerprint);

  const fileMap = new Map(evidenceFiles.map(([p, b]) => [p, b]));
  checks.evidence_file_hashes_match = bundle.referenced_evidence.every(
    (ref) => fileMap.has(ref.path) && sha256Hex(fileMap.get(ref.path)) === ref.sha256
  );

  checks.declared_gates_pass = evaluateGateResults(bundle.metrics).all_hard_gates_passed === true;

  const leak = computeEvidenceLeakageFindings(
    evidenceFiles.map(([p, b]) => [p, b.toString("utf8")])
  );
  checks.evidence_leakage_zero = leak.length === 0;

  if (reproduce) {
    checks.reproduced_metrics_match = reproduced?.metricsMatch === true;
    checks.reproduced_boundary_breakdown_match = reproduced?.boundaryMatch === true;
    checks.reproduced_privacy_report_match = reproduced?.privacyMatch === true;
  }

  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    public_key_fingerprint: actualFingerprint,
  };
}

// ---- CLI ----
function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}
const isCli = import.meta.url === `file://${process.argv[1]}`;

async function reproduceStage3l(bundle) {
  const lib = await import("../../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs");
  const evals = lib
    .buildStage3lCorpus()
    .map((fixture) => ({ fixture, result: lib.evaluateStage3lCase(fixture) }));
  const metrics = lib.computeStage3lMetrics(evals);
  const breakdown = lib.buildBoundaryBreakdown(evals);
  return {
    metricsMatch: JSON.stringify(metrics) === JSON.stringify(bundle.metrics),
    boundaryMatch: JSON.stringify(breakdown) === JSON.stringify(bundle.boundary_breakdown),
    privacyMatch: (bundle.privacy_report?.generated_evidence_leakage ?? -1) === 0,
  };
}

async function mainCli() {
  const bundle = JSON.parse(await readFile(arg("--bundle"), "utf8"));
  const sidecar = JSON.parse(await readFile(arg("--signature"), "utf8"));
  const publicKeyPem = JSON.parse(await readFile(arg("--public-key"), "utf8")).public_key_pem;
  const reproduce = process.argv.includes("--reproduce");
  const evidenceFiles = [];
  for (const ref of bundle.referenced_evidence)
    evidenceFiles.push([ref.path, await readFile(ref.path)]);
  const reproduced = reproduce ? await reproduceStage3l(bundle) : null;
  const result = verifyBundle({
    bundle,
    sidecar,
    publicKeyPem,
    expectedFingerprint: arg("--expected-key-fingerprint"),
    evidenceFiles,
    reproduce,
    reproduced,
  });
  const lines = [
    `simurgh attestation verify: ${result.pass ? "PASS" : "FAIL"}`,
    `public_key_fingerprint: ${result.public_key_fingerprint}`,
    ...Object.entries(result.checks).map(([k, v]) => `${k}: ${v}`),
  ];
  const out = lines.join("\n") + "\n";
  console.log(out.trimEnd());
  const outPath = arg("--output");
  if (outPath) await writeFile(outPath, out);
  process.exit(result.pass ? 0 : 1);
}

if (isCli)
  mainCli().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/attestation/verifyAttestation.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/verify-attestation.mjs tests/unit/llmShield/attestation/verifyAttestation.test.js
git commit -m "feat(llm-shield): add stage 3m two-tier verifier with tamper tests"
```

---

## Task 5: Generate + commit the real attestation evidence

**Files:**

- Create (generated): `docs/research/llm-shield/evidence/stage-3m/{attestation.public-key.json,attestation.bundle.json,attestation.signature.json,verifier-output.txt}`

- [ ] **Step 1: Generate the keypair (private key OUTSIDE the repo)**

Run:

```bash
mkdir -p docs/research/llm-shield/evidence/stage-3m
node tools/simurgh-attestation/keygen.mjs \
  --out-private "$HOME/.simurgh/vca-private-key.pem" \
  --out-public docs/research/llm-shield/evidence/stage-3m/attestation.public-key.json
```

Expected: prints the fingerprint; private key written to `~/.simurgh/` (NOT the repo).

- [ ] **Step 2: Sign the Stage 3L run-set**

Run:

```bash
SIMURGH_VCA_PRIVATE_KEY_PATH="$HOME/.simurgh/vca-private-key.pem" \
  node tools/simurgh-attestation/sign-attestation.mjs
```

Expected: `signed: bundle + sidecar written to ...` plus the fingerprint.

- [ ] **Step 3: Verify portable + reproduce, write verifier-output.txt**

Run:

```bash
node tools/simurgh-attestation/verify-attestation.mjs \
  --bundle docs/research/llm-shield/evidence/stage-3m/attestation.bundle.json \
  --signature docs/research/llm-shield/evidence/stage-3m/attestation.signature.json \
  --public-key docs/research/llm-shield/evidence/stage-3m/attestation.public-key.json \
  --reproduce \
  --output docs/research/llm-shield/evidence/stage-3m/verifier-output.txt
```

Expected: `simurgh attestation verify: PASS` with every check `true`, exit 0.

- [ ] **Step 4: Confirm signature survives Prettier (canonical-not-bytes proof)**

Run:

```bash
npx prettier --write docs/research/llm-shield/evidence/stage-3m/*.json >/dev/null 2>&1
node tools/simurgh-attestation/verify-attestation.mjs \
  --bundle docs/research/llm-shield/evidence/stage-3m/attestation.bundle.json \
  --signature docs/research/llm-shield/evidence/stage-3m/attestation.signature.json \
  --public-key docs/research/llm-shield/evidence/stage-3m/attestation.public-key.json
```

Expected: still `PASS` (verification re-canonicalises, so formatting is irrelevant).

- [ ] **Step 5: Commit (public key + bundle + sidecar + output ONLY — never the private key)**

```bash
git add docs/research/llm-shield/evidence/stage-3m/
git status --porcelain docs/research/llm-shield/evidence/stage-3m/   # confirm NO private key present
git commit -m "feat(llm-shield): add stage 3m signed attestation evidence"
```

---

## Task 6: Policy-drift guard + privacy + security audits

**Files:**

- Create: `scripts/policy-drift-guard-llm-shield-stage3m.sh`
- Create: `scripts/privacy-audit-llm-shield-stage3m.mjs`
- Create: `scripts/security-audit-llm-shield-stage3m.sh`

- [ ] **Step 1: Policy-drift guard (copy 3L, retarget)**

```bash
sed -e 's/STAGE3L/STAGE3M/g; s/stage3l/stage3m/g; s/Stage 3L/Stage 3M/g; s/3L/3M/g' \
  scripts/policy-drift-guard-llm-shield-stage3l.sh > scripts/policy-drift-guard-llm-shield-stage3m.sh
chmod +x scripts/policy-drift-guard-llm-shield-stage3m.sh
bash scripts/policy-drift-guard-llm-shield-stage3m.sh
```

Expected: `stage3m policy-drift OK`.

- [ ] **Step 2: Privacy audit**

```javascript
// scripts/privacy-audit-llm-shield-stage3m.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { computeEvidenceLeakageFindings } from "../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs";

const ROOT = "docs/research/llm-shield/evidence/stage-3m";
const entries = (await readdir(ROOT)).filter((f) => f.endsWith(".json") || f.endsWith(".txt"));
const files = [];
for (const name of entries) files.push([name, await readFile(join(ROOT, name), "utf8")]);

const findings = computeEvidenceLeakageFindings(files);
const FORBIDDEN = ["PRIVATE KEY", "BEGIN OPENSSH", ".env", "Pliny", "REDACTED-SYNTHETIC"];
for (const [name, content] of files) {
  for (const token of FORBIDDEN) if (content.includes(token)) findings.push({ file: name, token });
}
if (findings.length > 0) {
  console.error("stage3m privacy audit FAIL:", JSON.stringify(findings, null, 2));
  process.exit(1);
}
console.log("stage3m privacy audit: passed");
```

Run: `node scripts/privacy-audit-llm-shield-stage3m.mjs` → `stage3m privacy audit: passed`.

- [ ] **Step 3: Security audit**

```bash
# scripts/security-audit-llm-shield-stage3m.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
EV="docs/research/llm-shield/evidence/stage-3m"
fail() { echo "stage3m security audit FAIL: $1"; exit 1; }

# 1. No private key material anywhere in the repo.
if git grep -lE "BEGIN (OPENSSH |EC |RSA )?PRIVATE KEY" -- . >/dev/null 2>&1; then
  fail "private key material committed"
fi
# 2. Bundle carries machine-readable non-claims, all true.
node -e '
const b=require("./'"$EV"'/attestation.bundle.json");
const nc=b.non_claims||{};
const req=["does_not_prove_model_safety","does_not_prove_jailbreak_immunity","does_not_prove_server_uncompromised","does_not_prove_private_key_never_stolen","does_not_upgrade_audit_sample_to_full_chain","attests_only_to_referenced_run_set"];
for(const k of req){ if(nc[k]!==true){ console.error("non_claim missing/false: "+k); process.exit(1);} }
' || fail "non_claims"
# 3. No overclaim wording in 3M docs (reviewer checklist excluded).
if ls docs/research/llm-shield/*STAGE_3M* docs/research/llm-shield/LLM_SHIELD_STAGE_3M* >/dev/null 2>&1; then
  if grep -RniE "jailbreak-proof|claude defeated|fable fixed|universal safety|immune to" \
    --include='*.md' --exclude='*REVIEWER_CHECKLIST*' \
    docs/research/llm-shield/*STAGE_3M* docs/research/llm-shield/LLM_SHIELD_STAGE_3M* 2>/dev/null; then
    fail "overclaim wording in 3M docs"
  fi
fi
# 4. No src/llmShield drift.
bash scripts/policy-drift-guard-llm-shield-stage3m.sh >/dev/null || fail "policy drift"
echo "stage3m security audit: passed"
```

Run:

```bash
chmod +x scripts/security-audit-llm-shield-stage3m.sh
scripts/security-audit-llm-shield-stage3m.sh
```

Expected: `stage3m security audit: passed` (docs may not exist yet; grep then finds nothing and passes).

- [ ] **Step 4: Commit**

```bash
git add scripts/policy-drift-guard-llm-shield-stage3m.sh scripts/privacy-audit-llm-shield-stage3m.mjs scripts/security-audit-llm-shield-stage3m.sh
git commit -m "test(llm-shield): add stage 3m policy-drift, privacy, and security audits"
```

---

## Task 7: Smoke wrapper

**Files:**

- Create: `scripts/smoke-llm-shield-stage3m.sh`

- [ ] **Step 1: Implement**

```bash
# scripts/smoke-llm-shield-stage3m.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
EV="docs/research/llm-shield/evidence/stage-3m"

# CI verifies only; it never signs and never needs the private key.
node tools/simurgh-attestation/verify-attestation.mjs \
  --bundle "$EV/attestation.bundle.json" \
  --signature "$EV/attestation.signature.json" \
  --public-key "$EV/attestation.public-key.json" \
  --reproduce

bash scripts/policy-drift-guard-llm-shield-stage3m.sh
node scripts/privacy-audit-llm-shield-stage3m.mjs
bash scripts/security-audit-llm-shield-stage3m.sh
echo "stage3m smoke: passed"
```

- [ ] **Step 2: Run**

```bash
chmod +x scripts/smoke-llm-shield-stage3m.sh
scripts/smoke-llm-shield-stage3m.sh
```

Expected: verifier `PASS` then `stage3m smoke: passed`.

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke-llm-shield-stage3m.sh
git commit -m "test(llm-shield): add stage 3m smoke wrapper"
```

---

## Task 8: Stage docs + evidence README

**Files:**

- Create: `docs/research/llm-shield/LLM_SHIELD_STAGE_3M_VERIFIABLE_CONTAINMENT_ATTESTATION.md`
- Create: `docs/research/llm-shield/STAGE_3M_THREAT_MODEL.md`
- Create: `docs/research/llm-shield/STAGE_3M_VALIDATION_MATRIX.md`
- Create: `docs/research/llm-shield/STAGE_3M_REVIEWER_CHECKLIST.md`
- Create: `docs/research/llm-shield/evidence/stage-3m/README.md`

- [ ] **Step 1: Main stage doc**

Author `LLM_SHIELD_STAGE_3M_VERIFIABLE_CONTAINMENT_ATTESTATION.md` from spec §1–§3, §10, §15: the north-star sentence verbatim, the trust model (HMAC internal / Ed25519 external), what Ed25519 proves and does not prove, the two-tier verifier, and the non-claims. Mirror `LLM_SHIELD_STAGE_3L_FABLE5_REFERENCE_CONTAINMENT.md` structure. Include the verbatim honesty boundary: "Stage 3M signs the Stage 3L evidence that exists. It does not upgrade a sample audit artifact into a full per-case HMAC chain." Include the `verify-attestation.mjs` command with `--expected-key-fingerprint`.

- [ ] **Step 2: Threat model + validation matrix + reviewer checklist**

- `STAGE_3M_THREAT_MODEL.md`: in-scope = bundle tampering, evidence-file tampering, key substitution, replay under wrong key; out-of-scope = server compromise, key theft, model safety, content-harm classification. Mirror `STAGE_3L_THREAT_MODEL.md`.
- `STAGE_3M_VALIDATION_MATRIX.md`: one row per verifier check (spec §10) + the hard gates (spec §12) with the metric/field that proves each. Mirror `STAGE_3L_VALIDATION_MATRIX.md`.
- `STAGE_3M_REVIEWER_CHECKLIST.md`: security-audit checks (spec §14) + the tamper-test list (spec §13) as ticked boxes.

- [ ] **Step 3: Evidence README (with fingerprint)**

Author `evidence/stage-3m/README.md`: list each file and its role; state the public-key **fingerprint** (copy from `attestation.public-key.json`); give the verify command; state that the private key is never committed and signing is local/manual. Mirror `evidence/stage-3l/README.md`.

- [ ] **Step 4: Re-run security audit (docs now exist) + commit**

Run: `scripts/security-audit-llm-shield-stage3m.sh` → `stage3m security audit: passed`.

```bash
git add docs/research/llm-shield/LLM_SHIELD_STAGE_3M_VERIFIABLE_CONTAINMENT_ATTESTATION.md docs/research/llm-shield/STAGE_3M_*.md docs/research/llm-shield/evidence/stage-3m/README.md
git commit -m "docs(llm-shield): add stage 3m narrative, threat model, matrix, checklist, evidence readme"
```

---

## Task 9: Wire into check.sh + README + AGENT.md + CHANGELOG

**Files:**

- Modify: `scripts/check.sh` (after the Stage 3L blocks)
- Modify: `README.md`, `AGENT.md`, `CHANGELOG.md`

- [ ] **Step 1: Find the 3L smoke block**

Run: `grep -n "stage3l\|3L Fable" scripts/check.sh`
Expected: locate the `LLM Shield 3L Fable-5 reference containment` smoke block and the 3L helper-coverage block.

- [ ] **Step 2: Add the 3M smoke block after the 3L helper-coverage block**

Insert (matching the surrounding `step`/`pass`/`fail`/`$LOG_DIR` idiom — confirm helper names from the neighbouring block):

```bash
step "LLM Shield 3M verifiable containment attestation"
if scripts/smoke-llm-shield-stage3m.sh > "$LOG_DIR/llm-shield-stage3m-smoke.log" 2>&1; then
  pass "LLM Shield 3M verifiable containment attestation"
else
  fail "LLM Shield 3M verifiable containment attestation"
  tail -80 "$LOG_DIR/llm-shield-stage3m-smoke.log"
fi

step "LLM Shield 3M attestation helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-attestation/canonicalise.mjs \
  --test-coverage-include=tools/simurgh-attestation/attestationLib.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/attestation/canonicalise.test.js \
  tests/unit/llmShield/attestation/attestationLib.test.js \
  > "$LOG_DIR/llm-shield-stage3m-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3M attestation helper coverage"
else
  fail "LLM Shield 3M attestation helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3m-helper-coverage.log"
fi
```

(If `--test-coverage-functions=100` flags an unexercised helper, add a focused unit test for it — do not lower the threshold.)

- [ ] **Step 3: README / AGENT.md / CHANGELOG**

- `README.md`: add a Stage 3M sentence after the Stage 3L sentence in the status line (offline-verifiable Ed25519 containment attestation over the 3L run-set; portable + `--reproduce`; no jailbreak-immunity claim).
- `AGENT.md`: add a `Raouf:` dated entry (Stage 3M VCA: Ed25519 run-set attestation + two-tier verifier; no `src/llmShield` change).
- `CHANGELOG.md`: prepend a `[stage-3m-verifiable-containment-attestation]` entry (Added/Changed/Verified) with the public-key fingerprint and `v1.6.0` target.

- [ ] **Step 4: Run the full gate**

Run: `bash scripts/check.sh`
Expected: all gates pass, including both new 3M steps. (Known pre-existing/environment failures on macOS — Windows .NET, Linux Rust, and the `.venv-stage3i` secret-scan false-positive — are unrelated to 3M; re-run the Stage 2.6 Windows scanner smoke if it flakes.)

- [ ] **Step 5: Run prettier + commit**

```bash
npx prettier --write . >/dev/null 2>&1
node tools/simurgh-attestation/verify-attestation.mjs \
  --bundle docs/research/llm-shield/evidence/stage-3m/attestation.bundle.json \
  --signature docs/research/llm-shield/evidence/stage-3m/attestation.signature.json \
  --public-key docs/research/llm-shield/evidence/stage-3m/attestation.public-key.json   # still PASS after format
git add -A
git commit -m "feat(llm-shield): wire stage 3m into check.sh, readme, agent, changelog"
```

---

## Task 10: Closeout + tag

**Files:**

- Create: `docs/research/llm-shield/STAGE_3M_CLOSEOUT.md`

- [ ] **Step 1: Confirm gates green**

Run: `scripts/smoke-llm-shield-stage3m.sh` and `node --test tests/unit/llmShield/attestation/*.test.js`
Expected: smoke `passed`; all attestation unit tests pass.

- [ ] **Step 2: Write closeout**

Write `STAGE_3M_CLOSEOUT.md` mirroring `STAGE_3L_CLOSEOUT.md`: verifier output (all checks true, portable + `--reproduce`), the public-key fingerprint, the proves/does-not-prove boundary, `src/llmShield` untouched, and the honesty-boundary sentence.

- [ ] **Step 3: Commit + tag**

```bash
git add docs/research/llm-shield/STAGE_3M_CLOSEOUT.md
git commit -m "test(llm-shield): freeze stage 3m attestation evidence and close out"
git tag v1.6.0-stage-3m-verifiable-containment-attestation
```

- [ ] **Step 4: Report**

Summarise: Ed25519 run-set attestation over the Stage 3L pack; portable verify + `--reproduce` both PASS; tamper tests cover bundle/metric/evidence/key/fingerprint; non-claims machine-readable; public key committed (fingerprint), private key never committed; no `src/llmShield` drift. Offer to push + open the PR (do not push without explicit ask).

---

## Self-Review (completed by plan author)

**Spec coverage:** §1 north-star → Task 8. §2 why → Task 8. §3 trust model → Tasks 3–4 + Task 8. §4 granularity (run_set) → Task 2 `buildBundle`. §5 envelope/canonicalisation → Task 1. §6 bundle + honesty boundary → Task 2 + Task 8. §7 sidecar → Task 3 signer + Task 2 validator. §8 key management + trust anchor → Task 3 (keygen, `SIMURGH_VCA_PRIVATE_KEY_PATH`) + Task 4 (`--expected-key-fingerprint`, fingerprint print). §9 components → Tasks 1–4. §10 two-tier verifier → Task 4. §11 files → all tasks. §12 hard gates → Task 4 checks + Task 6 audits. §13 tamper tests → Task 4. §14 security/privacy posture → Task 6. §15 non-claims → Task 2 `NON_CLAIMS` + Task 6 audit. §16 phases → task order.

**Placeholder scan:** Doc-authoring tasks (8, 10) reference exact spec sections + sibling files to mirror, not vague prose. No TBD/TODO. All code steps carry real, runnable code.

**Type consistency:** `verifyBundle({ bundle, sidecar, publicKeyPem, expectedFingerprint, evidenceFiles, reproduce, reproduced })` is identical across Task 4's test, implementation, and CLI. `buildBundle({ metrics, boundaryBreakdown, policyDigests, privacyReport, referencedEvidence })` matches between Task 2 and Task 3 signer. `evidenceFiles` is consistently `[path, Buffer][]`. Sidecar field names (`bundle_sha256`, `public_key_fingerprint`, `signature` with `base64:` prefix) match across signer, verifier, and validator. Gate keys in `evaluateGateResults` match the Stage 3L metric names exactly.
