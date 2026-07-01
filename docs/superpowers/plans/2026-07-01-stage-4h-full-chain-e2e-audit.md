# Stage 4H Full-Chain E2E Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a released-artifact Stage 4H full-chain E2E audit over 4H.0 through 4H.5 before Stage 4J/PCTA work begins.

**Architecture:** Start from `v2.18.0-stage-4h-proof-carrying-containment` on `stage-4h-full-chain-e2e-audit`. Add audit-only tests, one full-chain script, bounded audit evidence, and a closeout note. Reuse existing Stage 4H builders, verifier CLI, Q3 harness, Q6/Q7 helpers, reproduce script, and E2E smoke instead of creating parallel verifier logic.

**Tech Stack:** Node.js ESM, `node:test`, Bash, existing Stage 4H verifier modules, Prettier, Git.

---

## File Structure

- Create `tests/unit/llmShield/stage4h/fullFunctionCoverage.test.js`
  - Function-path exercise for exported Stage 4H checker-surface helpers.
  - Positive and negative paths for pure helpers and harness-facing helpers where feasible.
- Modify `tests/e2e/llmShield/stage4hFullSmoke.test.js`
  - Add explicit 4H.0 digest/binding tamper assertions.
  - Add explicit typed-exit assertions for Q3/raw `28`, raw `29`, and unknown raw values.
- Create `scripts/e2e-llm-shield-stage4h-full-chain.sh`
  - Deterministic full-chain audit runner.
  - Calls real reproduce script, targeted unit tests, E2E smoke, format check, diff check.
  - Captures audit evidence under the new `full-e2e-audit/` directory.
  - Fails if existing released Stage 4H evidence outside `full-e2e-audit/` drifts.
- Create `docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/README.md`
  - Reviewer-facing evidence explanation and non-claim reminder.
- Create `docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/release-input.json`
  - Released tag, commit, scope, and `runtime_logic_changes: false`.
- Create `docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/full-e2e-summary.json`
  - Script-produced summary of pass status, commands, 4H levels, Q3/unshare note.
- Create `docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/function-coverage-summary.json`
  - Exported checker-surface helper coverage summary.
- Create `docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/command-output.txt`
  - Script-captured command transcript.
- Create `docs/research/llm-shield/STAGE_4H_FULL_E2E_AUDIT.md`
  - Short closeout note with scope, acceptance, evidence, non-claims.

Do not modify existing released Stage 4H evidence files outside `docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/` unless a real bug is found and explicitly documented.

---

### Task 1: Add Function-Path Coverage Test

**Files:**

- Create: `tests/unit/llmShield/stage4h/fullFunctionCoverage.test.js`
- Read only: `tools/simurgh-attestation/stage4h/*.mjs`
- Read only: `tests/fixtures/llmShield/stage4h/**`

- [ ] **Step 1: Create the failing coverage test**

Create `tests/unit/llmShield/stage4h/fullFunctionCoverage.test.js` with this content:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  basePackView,
  buildPremiseSet,
  digest,
  premiseDigest,
  premiseId,
} from "../../../../tools/simurgh-attestation/stage4h/canonicalPremises.mjs";
import {
  CHECKER_VERSION,
  CLAIM,
  INTEGRITY_LABELS,
  INTEGRITY_LATTICE_DIGEST,
  REQUIRED_SINK_INTEGRITY,
} from "../../../../tools/simurgh-attestation/stage4h/constants.mjs";
import {
  buildDerivation,
  buildDfiCertificate,
  certificateDigest,
  checkBinding,
  checkLatticeDigest,
  combineIntegrity,
  diagnose,
  integrityLte,
  normalizeIntegrityLabel,
  recomputeGraph,
  validateDerivation,
} from "../../../../tools/simurgh-attestation/stage4h/dfiCertificate.mjs";
import {
  HARNESS_CODES,
  RAW_VERIFIER_CODES,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import {
  OfflineViolationError,
  runOffline,
  scanForModelClients,
} from "../../../../tools/simurgh-attestation/stage4h/offlineHarness.mjs";
import { verifyPackBinding } from "../../../../tools/simurgh-attestation/stage4h/packBinding.mjs";
import {
  allowedKeysByPath,
  covertCapacityBits,
  privacyGate,
} from "../../../../tools/simurgh-attestation/stage4h/privacyGate.mjs";
import {
  isSha256Digest,
  validateDfiCertificate,
  validateJsonTextNoDuplicateKeys,
  validateSignedPackManifest,
} from "../../../../tools/simurgh-attestation/stage4h/schema.mjs";
import {
  applyMutation,
  buildCleanTamperContext,
  buildProofDeletionClosureFixture,
  buildTamperMatrix,
  bumpDigest,
  mutationFamily,
} from "../../../../tools/simurgh-attestation/stage4h/tamperClosure.mjs";
import { runVerifierCore } from "../../../../tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function cleanPack() {
  return readJson(`${fixtureRoot}/q1-clean-base-pack.json`);
}

function cleanCertificate() {
  return readJson(`${fixtureRoot}/q1-clean-dfi-certificate.json`);
}

function cleanManifest() {
  return readJson(`${fixtureRoot}/q1-clean-signed-pack-manifest.json`);
}

test("Stage 4H full function coverage exercises canonical premise helpers", () => {
  const pack = cleanPack();
  const view = basePackView(pack);
  const premises = buildPremiseSet(pack);

  assert.equal(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));
  assert.equal(premises.length > 0, true);
  assert.match(premiseDigest(premises), /^sha256:[a-f0-9]{64}$/);
  assert.match(premiseId(premises[0]), /^[a-z_]+:sha256:[a-f0-9]{64}$/);

  const noisyPack = { ...pack, ignored_metadata: "not part of view" };
  assert.deepEqual(basePackView(noisyPack), view);
  assert.notEqual(premiseDigest(premises), "sha256:0000");
});

test("Stage 4H full function coverage exercises DFI derivation helpers", () => {
  const pack = cleanPack();
  const premises = buildPremiseSet(pack);
  const certificate = buildDfiCertificate({ pack });
  const derivation = buildDerivation(premises);
  const graph = recomputeGraph(premises);

  assert.equal(CHECKER_VERSION, "4h-v0");
  assert.equal(CLAIM, "explicit_data_flow_integrity");
  assert.deepEqual(INTEGRITY_LABELS, ["trusted", "untrusted"]);
  assert.equal(REQUIRED_SINK_INTEGRITY, "trusted");
  assert.match(INTEGRITY_LATTICE_DIGEST, /^sha256:[a-f0-9]{64}$/);

  assert.equal(normalizeIntegrityLabel("trusted"), "trusted");
  assert.equal(normalizeIntegrityLabel("untrusted_web"), "untrusted");
  assert.equal(combineIntegrity(["trusted", "untrusted"]), "untrusted");
  assert.equal(integrityLte("untrusted", "trusted"), true);
  assert.equal(integrityLte("trusted", "untrusted"), false);
  assert.equal(Object.keys(graph.nodeLabels).length > 0, true);
  assert.equal(derivation.derived_node_labels.length > 0, true);
  assert.match(certificateDigest(certificate), /^sha256:[a-f0-9]{64}$/);

  assert.deepEqual(checkLatticeDigest(certificate, INTEGRITY_LATTICE_DIGEST), {
    ok: true,
  });
  assert.equal(
    checkLatticeDigest(certificate, bumpDigest(INTEGRITY_LATTICE_DIGEST)).reason,
    "lattice_digest_mismatch"
  );

  assert.deepEqual(validateDerivation({ premises, certificate }), { ok: true });
  const partial = structuredClone(certificate);
  partial.derivation.derived_node_labels = [];
  assert.equal(validateDerivation({ premises, certificate: partial }).code, 26);
});

test("Stage 4H full function coverage exercises schema and binding helpers", () => {
  const certificate = cleanCertificate();
  const manifest = cleanManifest();

  assert.equal(validateJsonTextNoDuplicateKeys('{"a":1,"b":{"a":2}}').ok, true);
  assert.equal(validateJsonTextNoDuplicateKeys('{"a":1,"a":2}').reason, "duplicate_key");
  assert.equal(isSha256Digest(certificateDigest(certificate)), true);
  assert.deepEqual(validateDfiCertificate(certificate), { ok: true });
  assert.deepEqual(validateSignedPackManifest(manifest), { ok: true });
  assert.deepEqual(checkBinding({ certificate, manifest }), { ok: true });
  assert.equal(verifyPackBinding({ certificate, manifest, publicKey: null }).ok, false);

  const tampered = structuredClone(certificate);
  tampered.summary.sources_checked += 1;
  assert.equal(checkBinding({ certificate: tampered, manifest }).reason, "pack_binding_mismatch");
});

test("Stage 4H full function coverage exercises privacy, tamper, and exit helpers", () => {
  const certificate = cleanCertificate();
  const matrix = buildTamperMatrix();
  const arms = mutationFamily().map((arm) => arm.arm);
  const ctx = buildCleanTamperContext();
  const mutated = applyMutation(
    ctx,
    mutationFamily().find((arm) => arm.arm === "premise")
  );

  assert.equal(stage4CodeForRawCode(RAW_VERIFIER_CODES.OK), 0);
  assert.equal(stage4CodeForRawCode(HARNESS_CODES.CHECKER_NOT_OFFLINE), 2);
  assert.equal(stage4CodeForRawCode(9999), 3);
  assert.equal(allowedKeysByPath.certificate.includes("derivation"), true);
  assert.equal(covertCapacityBits(certificate) >= 0, true);
  assert.deepEqual(privacyGate(certificate), { ok: true, capacity_bits: 0, flags: [] });
  assert.deepEqual(arms, [
    "sig-byte",
    "merkle-node",
    "binding",
    "policy",
    "premise",
    "lattice-digest",
    "lattice-step",
    "proof-step",
  ]);
  assert.equal(
    matrix.every((result) => result.ok === false),
    true
  );
  assert.notEqual(mutated.certificate.premise_digest, ctx.certificate.premise_digest);
});

test("Stage 4H full function coverage exercises offline and CLI-facing helpers", async () => {
  await runOffline(async () => "ok");
  await assert.rejects(
    () => runOffline(async () => fetch("https://example.invalid")),
    OfflineViolationError
  );

  const tmp = mkdtempSync(join(tmpdir(), "stage4h-full-function-"));
  try {
    const badImport = join(tmp, "bad.mjs");
    writeFileSync(badImport, 'import "node:http";\n');
    const scan = await scanForModelClients(badImport);
    assert.equal(scan.ok, false);
    assert.equal(scan.reason, "forbidden_egress_import");

    const deletion = buildProofDeletionClosureFixture({ outputDir: tmp });
    assert.equal(deletion.certificate.derivation.lattice_steps.length, 0);

    const out = join(tmp, "verifier.json");
    const clean = await runVerifierCore({
      argv: [
        "--base-pack",
        `${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.json`,
        "--base-pack-sig",
        `${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.sig`,
        "--base-pack-pubkey",
        `${fixtureRoot}/q0-clean-disconnected-untrusted-signer.pub`,
        "--certificate",
        `${fixtureRoot}/q0-clean-disconnected-untrusted-dfi-certificate.json`,
        "--manifest",
        `${fixtureRoot}/q0-clean-disconnected-untrusted-signed-pack-manifest.json`,
        "--manifest-pubkey",
        `${fixtureRoot}/manifest-verifier.pub`,
        "--out",
        out,
      ],
    });
    assert.equal(clean.code, 0);
    assert.equal(readJson(out).code, 0);

    const diagnosis = diagnose({
      pack: readJson(`${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.json`),
      certificate: readJson(
        `${fixtureRoot}/q4b-clean-derivation-over-dirty-replay-certificate.json`
      ),
      manifest: readJson(
        `${fixtureRoot}/q4b-clean-derivation-over-dirty-replay-signed-pack-manifest.json`
      ),
    });
    assert.equal(diagnosis.code, 24);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the new test and confirm the first failure**

Run:

```bash
node --test tests/unit/llmShield/stage4h/fullFunctionCoverage.test.js
```

Expected before any import/signature corrections: FAIL if any helper signature or fixture assumption is mismatched. Treat each failure as a plan execution issue unless it exposes a real Stage 4H bug.

- [ ] **Step 3: Correct imports or assertions only if the real module API differs**

If the previous step fails because `verifyPackBinding({ certificate, manifest, publicKey: null })` throws instead of returning `{ ok: false }`, replace that assertion with:

```js
assert.equal(
  verifyPackBinding({
    certificate,
    manifest: { ...manifest, certificate_digest: bumpDigest(manifest.certificate_digest) },
    publicKey: null,
  }).ok,
  false
);
```

If `diagnose()` requires additional keys after inspection, use the same pattern as existing tests in `tests/unit/llmShield/stage4h/diagnosticSoundness.test.js`; do not add a duplicate verifier.

- [ ] **Step 4: Run targeted Stage 4H unit tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/*.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add tests/unit/llmShield/stage4h/fullFunctionCoverage.test.js
git commit -m "test(llm-shield): add stage 4h function-path coverage"
```

---

### Task 2: Tighten Full E2E Smoke Assertions

**Files:**

- Modify: `tests/e2e/llmShield/stage4hFullSmoke.test.js`

- [ ] **Step 1: Add explicit 4H.0 tamper and typed-exit assertions**

In `tests/e2e/llmShield/stage4hFullSmoke.test.js`, add this test after `Stage 4H.0 compatibility E2E smoke preserves Q2/Q5 digest foundation`:

```js
test("Stage 4H full-chain E2E explicitly covers digest tamper and typed exits", () => {
  const tmp = mkdtempSync(join(tmpdir(), "stage4h-explicit-e2e-"));
  try {
    const cleanOut = join(tmp, "stage4h0-clean.json");
    const cleanResult = runVerifier({
      basePack: `${fixtureRoot}/clean-base-pack.json`,
      basePackSig: `${fixtureRoot}/clean-base-pack.sig`,
      basePackPubkey: `${fixtureRoot}/clean-signer.pub`,
      certificate: `${fixtureRoot}/clean-dfi-certificate.json`,
      manifest: `${fixtureRoot}/clean-signed-pack-manifest.json`,
      out: cleanOut,
    });
    assert.equal(cleanResult.status, 0, cleanResult.stderr || cleanResult.stdout);
    assert.equal(readJson(cleanOut).code, 0);

    const tamperedOut = join(tmp, "stage4h0-tampered.json");
    const tamperedResult = runVerifier({
      basePack: `${fixtureRoot}/tampered-base-pack.json`,
      basePackSig: `${fixtureRoot}/clean-base-pack.sig`,
      basePackPubkey: `${fixtureRoot}/clean-signer.pub`,
      certificate: `${fixtureRoot}/clean-dfi-certificate.json`,
      manifest: `${fixtureRoot}/clean-signed-pack-manifest.json`,
      out: tamperedOut,
    });
    assert.notEqual(tamperedResult.status, 0);
    assert.notEqual(readJson(tamperedOut).code, 0);

    assert.equal(stage4CodeForRawCode(28), 2);
    assert.equal(stage4CodeForRawCode(29), 3);
    assert.equal(stage4CodeForRawCode(9999), 3);

    const offline = readJson(`${evidenceRoot}/offline-report.json`);
    assert.equal(offline.egress_double_raw_code, 28);
    assert.equal(stage4CodeForRawCode(offline.egress_double_raw_code), 2);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the E2E smoke**

Run:

```bash
node --test tests/e2e/llmShield/stage4hFullSmoke.test.js
```

Expected: PASS with three Stage 4H E2E tests.

- [ ] **Step 3: Commit**

Run:

```bash
git add tests/e2e/llmShield/stage4hFullSmoke.test.js
git commit -m "test(llm-shield): tighten stage 4h full-chain e2e smoke"
```

---

### Task 3: Add Full-Chain Audit Script

**Files:**

- Create: `scripts/e2e-llm-shield-stage4h-full-chain.sh`

- [ ] **Step 1: Create the script**

Create `scripts/e2e-llm-shield-stage4h-full-chain.sh`:

```bash
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

AUDIT_DIR="docs/research/llm-shield/evidence/stage-4h/full-e2e-audit"
COMMAND_OUTPUT="${AUDIT_DIR}/command-output.txt"
SUMMARY="${AUDIT_DIR}/full-e2e-summary.json"
FUNCTION_SUMMARY="${AUDIT_DIR}/function-coverage-summary.json"

mkdir -p "$AUDIT_DIR"
: >"$COMMAND_OUTPUT"

export TZ=UTC
export LC_ALL=C
export LANG=C
export SOURCE_DATE_EPOCH=0
export PYTHONHASHSEED=0
export NO_NETWORK=1
unset OPENAI_API_KEY ANTHROPIC_API_KEY GOOGLE_API_KEY BROWSERBASE_API_KEY

run_step() {
  local name="$1"
  shift
  echo "==> ${name}" | tee -a "$COMMAND_OUTPUT"
  "$@" 2>&1 | tee -a "$COMMAND_OUTPUT"
}

assert_no_released_evidence_drift() {
  local drift
  drift="$(
    git diff --name-only -- docs/research/llm-shield/evidence/stage-4h \
      | grep -v '^docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/' || true
  )"
  if [[ -n "$drift" ]]; then
    echo "Released Stage 4H evidence drift outside full-e2e-audit:" | tee -a "$COMMAND_OUTPUT"
    echo "$drift" | tee -a "$COMMAND_OUTPUT"
    return 1
  fi
}

run_step "Stage 4H reproduce" scripts/reproduce-llm-shield-stage4h.sh
assert_no_released_evidence_drift

run_step "Stage 4H targeted unit tests" \
  node --test tests/unit/llmShield/stage4h/*.test.js

run_step "Stage 4H full smoke" \
  node --test tests/e2e/llmShield/stage4hFullSmoke.test.js

run_step "Format check" npm run format:check
run_step "Diff check" git diff --check
assert_no_released_evidence_drift

node --input-type=module <<'NODE'
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const auditDir = "docs/research/llm-shield/evidence/stage-4h/full-e2e-audit";
const offline = JSON.parse(
  readFileSync("docs/research/llm-shield/evidence/stage-4h/offline-report.json", "utf8")
);
const qGate = JSON.parse(
  readFileSync("docs/research/llm-shield/evidence/stage-4h/q-gate-results.json", "utf8")
);
const tamper = JSON.parse(
  readFileSync("docs/research/llm-shield/evidence/stage-4h/tamper-results.json", "utf8")
);
const privacy = JSON.parse(
  readFileSync("docs/research/llm-shield/evidence/stage-4h/privacy-report.json", "utf8")
);

const summary = {
  stage: "4H",
  audit: "full_chain_e2e",
  status: "pass",
  base_tag: "v2.18.0-stage-4h-proof-carrying-containment",
  base_commit: "7a2039136d44cf179cca5836a33596a7620c87e5",
  runtime_logic_changes: false,
  levels: {
    "4H.0": "signed_digest_binding_exercised",
    "4H.1": "dfi_certificate_derivation_exercised",
    "4H.2": "q0_q4_discrimination_exercised",
    "4H.3": "q6_q7_exercised",
    "4H.4": "q3_typed_exit_exercised",
    "4H.5": "reproduce_byte_stability_antitheatre_exercised"
  },
  q3: {
    clean_run_hits: offline.clean_run_hits,
    egress_double_caught: offline.egress_double_caught,
    egress_double_raw_code: offline.egress_double_raw_code,
    unshare_note:
      "unshare is optional; when unavailable, in-process Q3 harness remains authoritative"
  },
  q_gates: {
    q0: qGate.gates.Q0.status,
    q1: qGate.gates.Q1.status,
    q2: qGate.gates.Q2.status,
    q3: qGate.gates.Q3.status,
    q4: qGate.gates.Q4.status,
    q5: qGate.gates.Q5.status,
    q6: qGate.gates.Q6.status,
    q7: qGate.gates.Q7.status
  },
  tamper: {
    tampered_accepted_count: tamper.tampered_accepted_count
  },
  privacy: {
    accepted_negative_count: privacy.accepted_negative_count,
    bounded_leakage: privacy.bounded_leakage
  },
  commands: [
    "scripts/reproduce-llm-shield-stage4h.sh",
    "node --test tests/unit/llmShield/stage4h/*.test.js",
    "node --test tests/e2e/llmShield/stage4hFullSmoke.test.js",
    "npm run format:check",
    "git diff --check"
  ],
  non_claim: "released-artifact audit only; no new runtime claim"
};

const functionSummary = {
  stage: "4H",
  audit: "function_path_coverage",
  status: "pass",
  public_checker_surface: [
    "canonicalPremises",
    "dfiCertificate",
    "exitCodes",
    "offlineHarness",
    "packBinding",
    "privacyGate",
    "schema",
    "tamperClosure",
    "verify-stage4h-digest-binding"
  ],
  strongest_focus: "4H.1 DFI certificate and derivation proof",
  tested_file: "tests/unit/llmShield/stage4h/fullFunctionCoverage.test.js",
  coverage_claim:
    "Exercises exported Stage 4H verifier/helper paths public to the Stage 4H checker surface; does not claim private branch exhaustiveness"
};

mkdirSync(auditDir, { recursive: true });
writeFileSync(`${auditDir}/full-e2e-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(
  `${auditDir}/function-coverage-summary.json`,
  `${JSON.stringify(functionSummary, null, 2)}\n`
);
NODE

echo "Stage 4H full-chain E2E: PASS" | tee -a "$COMMAND_OUTPUT"
```

- [ ] **Step 2: Make the script executable**

Run:

```bash
chmod +x scripts/e2e-llm-shield-stage4h-full-chain.sh
```

- [ ] **Step 3: Run the script and inspect generated summaries**

Run:

```bash
scripts/e2e-llm-shield-stage4h-full-chain.sh
cat docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/full-e2e-summary.json
cat docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/function-coverage-summary.json
```

Expected:

```txt
Stage 4H full-chain E2E: PASS
"runtime_logic_changes": false
"status": "pass"
```

- [ ] **Step 4: Confirm no released evidence drift**

Run:

```bash
git diff --name-only -- docs/research/llm-shield/evidence/stage-4h \
  | grep -v '^docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/' || true
```

Expected: no output.

- [ ] **Step 5: Commit**

Run:

```bash
git add scripts/e2e-llm-shield-stage4h-full-chain.sh \
  docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/full-e2e-summary.json \
  docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/function-coverage-summary.json \
  docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/command-output.txt
git commit -m "test(llm-shield): add stage 4h full-chain audit runner"
```

---

### Task 4: Add Release Input And Audit Documentation

**Files:**

- Create: `docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/release-input.json`
- Create: `docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/README.md`
- Create: `docs/research/llm-shield/STAGE_4H_FULL_E2E_AUDIT.md`

- [ ] **Step 1: Add release input evidence**

Create `docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/release-input.json`:

```json
{
  "base_tag": "v2.18.0-stage-4h-proof-carrying-containment",
  "base_commit": "7a2039136d44cf179cca5836a33596a7620c87e5",
  "audit_scope": "stage_4h_full_chain_e2e",
  "runtime_logic_changes": false
}
```

- [ ] **Step 2: Add evidence README**

Create `docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/README.md`:

```md
# Stage 4H Full-Chain E2E Audit Evidence

This directory contains the released-artifact audit evidence for Stage 4H.

The audit starts from `v2.18.0-stage-4h-proof-carrying-containment` at commit `7a2039136d44cf179cca5836a33596a7620c87e5` and adds audit-only harnesses, tests, summaries, and this evidence directory. It does not refresh or rewrite the released Stage 4H evidence outside this directory.

## Files

- `release-input.json`: released tag, commit, scope, and runtime-logic-change flag.
- `full-e2e-summary.json`: summary of the full 4H.0 through 4H.5 audit run.
- `function-coverage-summary.json`: summary of public Stage 4H checker-surface helper coverage.
- `command-output.txt`: command transcript from `scripts/e2e-llm-shield-stage4h-full-chain.sh`.

## Non-Claim

This is a cold replay and function-path exercise over the released Stage 4H artifact. It does not add a new runtime claim or broaden Stage 4H beyond its released bounded evidence claim.
```

- [ ] **Step 3: Add closeout note**

Create `docs/research/llm-shield/STAGE_4H_FULL_E2E_AUDIT.md`:

```md
# Stage 4H Full-Chain E2E Audit

This audit was added before Stage 4J/PCTA to increase replay confidence over the released Stage 4H artifact.

## Base

- Tag: `v2.18.0-stage-4h-proof-carrying-containment`
- Commit: `7a2039136d44cf179cca5836a33596a7620c87e5`
- Audit branch: `stage-4h-full-chain-e2e-audit`

## Scope

The audit exercises Stage 4H.0 through 4H.5 through real builders, real verifier CLI paths, signed evidence, offline replay, tamper fixtures, typed exits, byte-stable reproduction, and anti-theatre deletion.

4H.1 receives the strongest focus because PCTA depends on the DFI certificate and derivation proof contract.

## Evidence

Evidence is under:

`docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/`

The required evidence files are:

- `README.md`
- `release-input.json`
- `full-e2e-summary.json`
- `function-coverage-summary.json`
- `command-output.txt`

## Acceptance

- `scripts/e2e-llm-shield-stage4h-full-chain.sh` PASS
- `scripts/reproduce-llm-shield-stage4h.sh` PASS
- `npm test` PASS
- `npm run format:check` PASS
- `git diff --check` PASS

`unshare` is optional. When unavailable, the in-process Q3 harness remains authoritative for this environment.

## Non-Claim

This audit does not implement PCTA, create a new release tag, change Stage 4H verifier semantics, broaden Stage 4H claims, or alter public release wording.
```

- [ ] **Step 4: Format docs and JSON**

Run:

```bash
npx prettier --write \
  docs/research/llm-shield/STAGE_4H_FULL_E2E_AUDIT.md \
  docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/README.md \
  docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/release-input.json \
  docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/full-e2e-summary.json \
  docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/function-coverage-summary.json
```

Expected: all listed files written by Prettier.

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/research/llm-shield/STAGE_4H_FULL_E2E_AUDIT.md \
  docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/README.md \
  docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/release-input.json \
  docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/full-e2e-summary.json \
  docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/function-coverage-summary.json
git commit -m "docs(llm-shield): document stage 4h full-chain audit"
```

---

### Task 5: Final Verification And Audit Guard

**Files:**

- Verify only: all changed files

- [ ] **Step 1: Run the full-chain audit**

Run:

```bash
scripts/e2e-llm-shield-stage4h-full-chain.sh
```

Expected:

```txt
Stage 4H full-chain E2E: PASS
```

- [ ] **Step 2: Run the original reproduce path**

Run:

```bash
scripts/reproduce-llm-shield-stage4h.sh
```

Expected:

```txt
Stage 4H.5 final reproduce: PASS
```

- [ ] **Step 3: Run the full test suite**

Run:

```bash
npm test
```

Expected:

```txt
fail 0
```

The passing count may increase from the release baseline because this branch adds audit tests.

- [ ] **Step 4: Run format and whitespace checks**

Run:

```bash
npm run format:check
git diff --check
```

Expected:

```txt
All matched files use Prettier code style!
```

`git diff --check` should produce no output and exit `0`.

- [ ] **Step 5: Confirm released evidence did not drift**

Run:

```bash
git diff --name-only HEAD -- docs/research/llm-shield/evidence/stage-4h \
  | grep -v '^docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/' || true
```

Expected: no output.

- [ ] **Step 6: Confirm worktree status**

Run:

```bash
git status --short
```

Expected: no output after generated audit evidence is committed.

- [ ] **Step 7: Commit any final generated evidence update if needed**

If Task 5 changed only `command-output.txt`, `full-e2e-summary.json`, or `function-coverage-summary.json`, commit those generated audit evidence changes:

```bash
git add docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/command-output.txt \
  docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/full-e2e-summary.json \
  docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/function-coverage-summary.json
git commit -m "test(llm-shield): refresh stage 4h full-chain audit evidence"
```

If there are no changes, do not create an empty commit.

---

## Final Acceptance Checklist

- [ ] Branch starts from `v2.18.0-stage-4h-proof-carrying-containment`.
- [ ] No dirty local `main` state is included.
- [ ] Runtime Stage 4H verifier semantics are unchanged unless a real bug is explicitly documented.
- [ ] No existing released Stage 4H evidence outside `full-e2e-audit/` is modified.
- [ ] Full-chain audit script passes.
- [ ] Original Stage 4H reproduce script passes.
- [ ] Full `npm test` passes.
- [ ] `npm run format:check` passes.
- [ ] `git diff --check` passes.
- [ ] Worktree is clean after committed audit files.
- [ ] No PCTA implementation is included.
- [ ] No new release tag is created.
- [ ] No Stage 4H claim is broadened.
