// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — vsbCore orchestrator (plan Task 7; 225/226/238/239 + frozen order). Motto:
// AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { buildGrid } from "../../../../tools/simurgh-attestation/stage5c/core/gridCore.mjs";
import { projectSlips } from "../../../../tools/simurgh-attestation/stage5c/core/slipLedger.mjs";
import {
  slipRates,
  floorMonotonicity,
} from "../../../../tools/simurgh-attestation/stage5c/core/slipRateCore.mjs";
import {
  MR_IDS_5C,
  composedRulesetDigest,
} from "../../../../tools/simurgh-attestation/stage5c/core/mrRuleset.mjs";
import { GATE_REDUCTIONS } from "../../../../tools/simurgh-attestation/stage5c/core/gateReductions.mjs";
import {
  evaluateVsb,
  evaluateVsbSafe,
  signBundle,
  severityBindingDigest,
  contentOf,
} from "../../../../tools/simurgh-attestation/stage5c/core/vsbCore.mjs";
import {
  VSB_SCHEMAS,
  VSB_NON_CLAIMS,
  VSB_KNOWN_LIMITATIONS,
  CAMPAIGN_LABEL,
} from "../../../../tools/simurgh-attestation/stage5c/constants.mjs";

const BASES = [
  {
    base_id: "b_quant",
    mechanism: "leakage",
    gate_version: "v1",
    base_text: "40 percent of accounts were leaked",
  },
  {
    base_id: "b_digit",
    mechanism: "leakage",
    gate_version: "v1",
    base_text: "leaked 5 files today",
  },
];

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const pubPem = publicKey.export({ type: "spki", format: "pem" });
const privPem = privateKey.export({ type: "pkcs8", format: "pem" });

function buildBundle(mutate = (b) => b) {
  const { grid, baseCorpus, baseTextById } = buildGrid(BASES, MR_IDS_5C);
  const slip_table = projectSlips(grid, baseCorpus).map((e) => ({
    ...e,
    severity: "low",
    severity_basis: "blind_digest_only_review",
  }));
  const content = {
    schema: VSB_SCHEMAS.SLIP_LEDGER,
    mr_ruleset_id: "vsb.mr.v1",
    mr_ruleset_digest: composedRulesetDigest(),
    gate_reductions: GATE_REDUCTIONS,
    base_corpus: baseCorpus,
    grid,
    slip_table,
    slip_rates: slipRates(grid, baseCorpus),
    floor_monotonicity: floorMonotonicity(BASES, MR_IDS_5C),
    binding: {
      campaign_label: CAMPAIGN_LABEL,
      severity_binding: severityBindingDigest(slip_table),
      lane_c_binding: null,
      predecessor_gate_digests: {},
    },
    attestation_pub_key_pem: pubPem,
    non_claims: VSB_NON_CLAIMS,
    known_limitations: VSB_KNOWN_LIMITATIONS,
  };
  const mutated = mutate(content);
  const bundle = { ...mutated, signature: signBundle(mutated, privPem) };
  return { bundle, baseTextById };
}

test("green bundle → raw 0 at audit and public tiers", () => {
  const { bundle, baseTextById } = buildBundle();
  assert.deepEqual(evaluateVsb(bundle, { tier: "audit", baseTextById }), { raw: 0 });
  assert.deepEqual(evaluateVsb(bundle, { tier: "public", baseTextById }), { raw: 0 });
});

test("225: an unexpected outer key fails closed", () => {
  const { bundle, baseTextById } = buildBundle();
  bundle.smuggled = "x"; // added AFTER signing; allowlist catches it before signature
  assert.equal(evaluateVsb(bundle, { tier: "audit", baseTextById }).raw, 225);
});

test("226: a mutated content (signature no longer valid) fails closed", () => {
  const { bundle, baseTextById } = buildBundle();
  bundle.mr_ruleset_id = "tampered"; // content changed, signature stale
  assert.equal(evaluateVsb(bundle, { tier: "audit", baseTextById }).raw, 226);
});

test("227: a wrong ruleset digest fails closed (re-signed so 226 passes)", () => {
  const { bundle, baseTextById } = buildBundle((c) => ({ ...c, mr_ruleset_digest: "sha256:00" }));
  assert.equal(evaluateVsb(bundle, { tier: "audit", baseTextById }).raw, 227);
});

test("228: a dropped grid cell fails closed (re-signed)", () => {
  const { bundle, baseTextById } = buildBundle((c) => ({ ...c, grid: c.grid.slice(1) }));
  assert.equal(evaluateVsb(bundle, { tier: "audit", baseTextById }).raw, 228);
});

test("234: an invalid severity fails closed (re-signed)", () => {
  const { bundle, baseTextById } = buildBundle((c) => ({
    ...c,
    slip_table: c.slip_table.map((e, i) => (i === 0 ? { ...e, severity: "apocalyptic" } : e)),
  }));
  assert.equal(evaluateVsb(bundle, { tier: "audit", baseTextById }).raw, 234);
});

test("237: a breach-claiming analyst_note fails closed at PUBLIC tier (re-signed)", () => {
  const { bundle, baseTextById } = buildBundle((c) => ({
    ...c,
    slip_table: c.slip_table.map((e, i) =>
      i === 0 ? { ...e, analyst_note: "we bypassed the kernel" } : e
    ),
  }));
  assert.equal(evaluateVsb(bundle, { tier: "public", baseTextById }).raw, 237);
});

test("238: a wrong severity_binding fails closed (re-signed)", () => {
  const { bundle, baseTextById } = buildBundle((c) => ({
    ...c,
    binding: { ...c.binding, severity_binding: "sha256:00" },
  }));
  assert.equal(evaluateVsb(bundle, { tier: "audit", baseTextById }).raw, 238);
});

test("238: a lane_c_binding with a bad kind fails closed (re-signed)", () => {
  const { bundle, baseTextById } = buildBundle((c) => ({
    ...c,
    binding: { ...c.binding, lane_c_binding: { kind: "var_capture_1b" } },
  }));
  assert.equal(evaluateVsb(bundle, { tier: "audit", baseTextById }).raw, 238);
});

test("239: a throw past the signature gate is wrapped to fail-closed", () => {
  // slip_rates=null passes schema (key present) + signature, then checkSlipRates throws → 239.
  const { bundle, baseTextById } = buildBundle((c) => ({ ...c, slip_rates: null }));
  assert.equal(evaluateVsbSafe(bundle, { tier: "audit", baseTextById }).raw, 239);
});

test("contentOf strips only the signature", () => {
  const { bundle } = buildBundle();
  assert.equal(contentOf(bundle).signature, undefined);
  assert.equal(contentOf(bundle).schema, VSB_SCHEMAS.SLIP_LEDGER);
});
