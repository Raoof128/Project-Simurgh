// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — Lane B blind-severity ceremony (plan Task 12; F5). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGrid } from "../../../../tools/simurgh-attestation/stage5c/core/gridCore.mjs";
import { projectSlips } from "../../../../tools/simurgh-attestation/stage5c/core/slipLedger.mjs";
import { MR_IDS_5C } from "../../../../tools/simurgh-attestation/stage5c/core/mrRuleset.mjs";
import { FLAGGED_BASES } from "../../../../tools/simurgh-attestation/stage5c/core/corpus.mjs";
import { blindSeverity } from "../../../../tools/simurgh-attestation/stage5c/core/blindSeverity.mjs";
import { severityBindingDigest } from "../../../../tools/simurgh-attestation/stage5c/core/vsbCore.mjs";
import { runCeremony } from "../../../../tools/simurgh-attestation/stage5c/laneb/run-laneb-vsb-ceremony.mjs";

function slipInputs() {
  const { grid } = buildGrid(FLAGGED_BASES, MR_IDS_5C);
  return grid
    .filter((c) => c.cell_class === "slipped")
    .map((c) => ({
      mr_id: c.mr_id,
      base_id: c.base_id,
      mutated_text_digest: c.mutated_text_digest,
    }));
}

test("ceremony: child emits blind severities matching the pure function", () => {
  const slips = slipInputs();
  const r = runCeremony(slips);
  assert.ok(r.ok);
  assert.equal(r.rows.length, slips.length);
  for (const row of r.rows) assert.equal(row.severity, blindSeverity(row.mutated_text_digest));
});

test("the sealed severity_binding reconciles with the verifier's severityBindingDigest (238 path)", () => {
  const slips = slipInputs();
  const r = runCeremony(slips);
  // Build the slip_table the way vsbCore expects and confirm the binding matches.
  const slipTable = r.rows.map((row) => ({
    mr_id: row.mr_id,
    base_id: row.base_id,
    severity: row.severity,
    severity_basis: row.severity_basis,
  }));
  assert.equal(r.severity_binding, severityBindingDigest(slipTable));
});

test("blindness negative: child refuses an OPERATOR* env var (guards fire)", () => {
  const slips = slipInputs();
  const r = runCeremony(slips, { env: { PATH: process.env.PATH, OPERATOR_SECRET: "leak" } });
  assert.equal(r.ok, false);
  assert.equal(r.status, 3);
  assert.match(r.error, /operator_env_present/);
});

test("blindness negative: child refuses a .pem argv (guards fire)", () => {
  const slips = slipInputs();
  const r = runCeremony(slips, { argv: ["/tmp/secret-key.pem"] });
  assert.equal(r.ok, false);
  assert.equal(r.status, 3);
  assert.match(r.error, /pem_argv_present/);
});
