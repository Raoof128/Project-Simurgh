// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — K7 all-functions net + THREE separate tamper suites (plan Task 22). 268-280 are
// integrity failures; 281 is an honest policy rejection; 282 is env/throw — never conflated.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validBundle,
  fixture,
  resign,
} from "../../../../tests/unit/llmShield/stage5f/_validBundle.mjs";
import {
  evaluatePanel,
  evaluatePanelSafe,
} from "../../../../tools/simurgh-attestation/stage5f/core/vmpCore.mjs";
import {
  validateScore,
  scoreGte,
} from "../../../../tools/simurgh-attestation/stage5f/constants.mjs";
import { checkSchema } from "../../../../tools/simurgh-attestation/stage5f/core/schema.mjs";
import {
  checkSignature,
  keyFingerprint,
} from "../../../../tools/simurgh-attestation/stage5f/core/signature.mjs";
import {
  checkChain,
  resultChainHeadDigest,
} from "../../../../tools/simurgh-attestation/stage5f/core/chain.mjs";
import { checkPlan } from "../../../../tools/simurgh-attestation/stage5f/core/plan.mjs";
import { checkCorpus } from "../../../../tools/simurgh-attestation/stage5f/core/corpus.mjs";
import {
  checkMatrix,
  checkStatusUnion,
} from "../../../../tools/simurgh-attestation/stage5f/core/matrix.mjs";
import { checkApplicability } from "../../../../tools/simurgh-attestation/stage5f/core/applicability.mjs";
import { checkAdapter } from "../../../../tools/simurgh-attestation/stage5f/core/adapter.mjs";
import { checkVerdict } from "../../../../tools/simurgh-attestation/stage5f/core/verdict.mjs";
import { checkBootstrap } from "../../../../tools/simurgh-attestation/stage5f/core/bootstrap.mjs";
import {
  checkCompleteness,
  evaluatePolicy,
  recompute,
} from "../../../../tools/simurgh-attestation/stage5f/core/completeness.mjs";
import { checkCensus } from "../../../../tools/simurgh-attestation/stage5f/core/census.mjs";
import { portableVerify } from "../../../../tools/simurgh-attestation/stage5f/browser/verify-vmp-portable.js";

const base = () => ({
  pinnedFingerprint: fixture.pinnedFingerprint,
  replayResults: fixture.replayResults,
  runnerResults: {},
  auditPrivate: fixture.auditPrivate,
});

test("K7: every exported function is exercised at least once", () => {
  const b = validBundle();
  assert.equal(checkSchema(b), null);
  assert.equal(checkSignature(b, fixture.pinnedFingerprint), null);
  assert.equal(checkChain(b), null);
  assert.equal(checkPlan(b), null);
  assert.equal(checkCorpus(b), null);
  assert.equal(checkMatrix(b), null);
  assert.equal(checkStatusUnion(b), null);
  assert.equal(checkApplicability(b, fixture.replayResults), null);
  assert.equal(checkAdapter(b, fixture.replayResults), null);
  assert.equal(checkVerdict(b), null);
  assert.equal(checkBootstrap(b, {}), null);
  assert.equal(checkCompleteness(b), null);
  assert.equal(checkCensus(b, fixture.auditPrivate), null);
  assert.equal(evaluatePolicy(b), null);
  assert.equal(typeof recompute(b).evaluation_complete, "boolean");
  assert.equal(typeof resultChainHeadDigest([b.roster_precommit, b.closeout]), "string");
  assert.equal(keyFingerprint(b.attestation_pub_key_pem), fixture.pinnedFingerprint);
  assert.equal(validateScore("0.5000"), "0.5000");
  assert.equal(scoreGte("0.6000", "0.5000"), true);
  assert.equal(portableVerify(b).portable_valid, true);
  assert.equal(evaluatePanel(b, base()).raw, 0);
  assert.equal(evaluatePanelSafe(b, base()).raw, 0);
});

// ---- Suite 1: tamper matrix (integrity, 268-280) ----
const integrity = {
  268: () => {
    const b = validBundle();
    b.schema = "x";
    return evaluatePanel(b, base()).raw;
  }, // no resign: schema is pre-sig
  "268-unknown-key": () => {
    const b = validBundle();
    b.mystery = 1;
    return evaluatePanel(b, base()).raw;
  },
  269: () => evaluatePanel(validBundle(), { ...base(), pinnedFingerprint: "sha256:wrong" }).raw,
  270: () => {
    const b = validBundle();
    b.roster_precommit.chain_position = 5;
    return evaluatePanel(resign(b), base()).raw;
  },
  271: () => {
    const b = validBundle();
    b.detector_universe.candidates = ["some_third_detector", "llama_guard_4_12b"];
    return evaluatePanel(resign(b), base()).raw;
  },
  272: () => {
    const b = validBundle();
    b.corpus.corpus_digest = "sha256:wrong";
    return evaluatePanel(resign(b), base()).raw;
  },
  273: () => {
    const b = validBundle();
    b.cells.push(JSON.parse(JSON.stringify(b.cells[0])));
    return evaluatePanel(resign(b), base()).raw;
  },
  274: () => {
    const b = validBundle();
    b.cells[0].status = "missing_capture";
    b.cells[0].missing_reason = "x";
    return evaluatePanel(resign(b), base()).raw;
  },
  275: () => {
    const b = validBundle();
    const c = b.cells[0];
    delete c.decision_evidence;
    c.status = "not_applicable";
    c.applicability_ref = "prompt_guard_2_86m|general";
    return evaluatePanel(resign(b), base()).raw;
  },
  276: () => {
    const b = validBundle();
    b.cells[0].adapter_digest = "sha256:wrong";
    return evaluatePanel(resign(b), base()).raw;
  },
  277: () => {
    const b = validBundle();
    b.cells[0].decision_evidence.label = "benign";
    return evaluatePanel(resign(b), base()).raw;
  },
  278: () => {
    const b = validBundle();
    b.bootstrap_provenance.push({ imported_from: "x" });
    return evaluatePanel(resign(b), base()).raw;
  },
  279: () => {
    const b = validBundle();
    b.coverage.omission_lower_bound = 0;
    return evaluatePanel(resign(b), base()).raw;
  },
  280: () => {
    const ap = JSON.parse(JSON.stringify(fixture.auditPrivate));
    ap.records.pop();
    return evaluatePanel(validBundle(), { ...base(), tier: "audit", auditPrivate: ap }).raw;
  },
};
for (const [name, fn] of Object.entries(integrity)) {
  test(`tamper-matrix: ${name}`, () => assert.equal(fn(), Number(String(name).split("-")[0])));
}

// ---- Suite 2: policy fixtures (281, honest incompleteness — NOT tampering) ----
test("policy-fixtures: a truthful incomplete panel is rejected by strict policy with 281 (attestation still valid)", () => {
  const b = validBundle();
  const c = b.cells[0];
  delete c.decision_evidence;
  c.status = "missing_capture";
  c.missing_reason = "no capture";
  b.completeness.evaluation_complete = false;
  b.completeness.cell_status_histogram = {
    evaluated: 3,
    not_applicable: 0,
    unsupported_input: 0,
    capture_failed: 0,
    missing_capture: 1,
  };
  b.coverage.heterogeneous_label_vector[0].labels = {
    llama_guard_4_12b: { semantics: "categorical_allow_block", label: "block" },
  };
  const r = evaluatePanel(resign(b), base());
  assert.equal(r.raw, 281);
  assert.equal(r.attestation_valid, true);
});

// ---- Suite 3: environment (282, env/throw — NOT tampering) ----
test("environment: a missing replay result surfaces as 282, never as tampering", () => {
  assert.equal(evaluatePanel(validBundle(), { ...base(), replayResults: {} }).raw, 282);
});
test("environment: a throw is caught and fails closed to 282", () => {
  const evil = new Proxy(
    {},
    {
      get() {
        throw new Error("boom");
      },
    }
  );
  assert.equal(evaluatePanelSafe(validBundle(), { ...base(), replayResults: evil }).raw, 282);
});
