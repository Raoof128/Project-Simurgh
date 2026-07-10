// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluatePanel,
  evaluatePanelSafe,
} from "../../../../tools/simurgh-attestation/stage5f/core/vmpCore.mjs";
import { validBundle, fixture, resign } from "./_validBundle.mjs";

const opts = (over = {}) => ({
  pinnedFingerprint: fixture.pinnedFingerprint,
  replayResults: fixture.replayResults,
  runnerResults: {},
  ...over,
});

test("public tier, strict: valid complete panel -> raw 0, valid, policy accepted", () => {
  const r = evaluatePanel(validBundle(), opts());
  assert.equal(r.raw, 0);
  assert.equal(r.attestation_valid, true);
  assert.equal(r.policy_accepted, true);
  assert.equal(r.audit_census_verified, false); // public tier
});
test("audit tier verifies census + full completeness", () => {
  const r = evaluatePanel(
    validBundle(),
    opts({ tier: "audit", auditPrivate: fixture.auditPrivate })
  );
  assert.equal(r.raw, 0);
  assert.equal(r.audit_census_verified, true);
  assert.equal(r.full_panel_completeness_verified, true);
});
test("strict rejects a truthful incomplete panel with 281, attestation still valid", () => {
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
  const rb = resign(b);
  const strict = evaluatePanel(rb, opts());
  assert.equal(strict.raw, 281);
  assert.equal(strict.attestation_valid, true);
  assert.equal(strict.policy_accepted, false);
  const lenient = evaluatePanel(rb, opts({ strict: false }));
  assert.equal(lenient.raw, 0);
  assert.equal(lenient.attestation_valid, true);
});
test("first-failure order: bad schema short-circuits to 268", () => {
  const b = validBundle();
  b.schema = "x";
  assert.equal(evaluatePanel(b, opts()).raw, 268);
});
test("evaluatePanelSafe maps a throw to 282", () => {
  const evil = new Proxy(
    {},
    {
      get() {
        throw new Error("boom");
      },
    }
  );
  const r = evaluatePanelSafe(validBundle(), opts({ replayResults: evil }));
  assert.equal(r.raw, 282);
  assert.equal(r.attestation_valid, false);
});
