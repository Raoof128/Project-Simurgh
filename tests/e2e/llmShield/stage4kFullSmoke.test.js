// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { runEbaCore } from "../../../tools/simurgh-attestation/stage4k/verify-stage4k-eba.mjs";

const FIX = "tests/fixtures/llmShield/stage4k";
const PIN = `${FIX}/eba-signer.pub`;
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

test("full matrix: both committed bundles reproduce their expected verdicts", async () => {
  const matrix = readJson(`${FIX}/expected-results/exposure-matrix.json`);
  for (const [name, expected] of Object.entries(matrix)) {
    const r = await runEbaCore({ bundleDir: `${FIX}/bundles/${name}`, pinnedPubkeyPath: PIN });
    assert.equal(r.rawCode, expected.raw, name);
    assert.equal(r.typed, expected.typed, name);
  }
});

test("boundary consumer: weighted_total === budget passes and is recorded", () => {
  const att = readJson(`${FIX}/bundles/under-budget/extraction-attestation.json`);
  const boundary = att.per_consumer.find((c) => c.weighted_total === c.budget);
  assert.ok(boundary, "expected a boundary consumer in the under-budget bundle");
  assert.equal(boundary.under_budget, true);
});

test("cross-session is literal: entries aggregate more than one session digest", () => {
  const ledger = readJson(`${FIX}/bundles/under-budget/extraction-ledger.json`);
  const multi = ledger.entries.find((e) => e.session_ids.length >= 2);
  assert.ok(multi, "expected a consumer aggregated across >= 2 sessions");
});

test("CLI: under-budget exits 0 with a report; over-budget exits 1 with raw 30", (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "eba-cli-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const cli = "tools/simurgh-attestation/stage4k/verify-stage4k-eba.mjs";
  execFileSync("node", [
    cli,
    "--bundle",
    `${FIX}/bundles/under-budget`,
    "--pinned-pubkey",
    PIN,
    "--out",
    `${tmp}/ok.json`,
  ]);
  assert.equal(readJson(`${tmp}/ok.json`).ok, true);
  let code = 0;
  try {
    execFileSync("node", [
      cli,
      "--bundle",
      `${FIX}/bundles/over-budget`,
      "--pinned-pubkey",
      PIN,
      "--out",
      `${tmp}/over.json`,
    ]);
  } catch (err) {
    code = err.status;
  }
  assert.equal(code, 1);
  assert.equal(readJson(`${tmp}/over.json`).rawCode, 30);
});

test("temp regeneration: deterministic artifacts byte-match the committed fixtures", (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "eba-regen-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  execFileSync("node", ["tools/simurgh-attestation/stage4k/build-stage4k-fixtures.mjs"], {
    env: { ...process.env, STAGE4K_FIXTURE_OUT: tmp },
  });
  for (const f of [
    "bundles/under-budget/extraction-ledger.json",
    "bundles/under-budget/extraction-attestation.json",
    "bundles/over-budget/extraction-ledger.json",
    "bundles/over-budget/extraction-attestation.json",
    "expected-results/exposure-matrix.json",
  ]) {
    assert.equal(readFileSync(`${tmp}/${f}`, "utf8"), readFileSync(`${FIX}/${f}`, "utf8"), f);
  }
});

test("committed evidence agrees with observed verdicts (no narrative drift)", async () => {
  const summary = readJson("docs/research/llm-shield/evidence/stage-4k/extraction-summary.json");
  assert.equal(summary.conjunction.over_budget_double_raw_code, 30);
  assert.equal(summary.conjunction.clean_run_all_under_budget, true);
  const r = await runEbaCore({ bundleDir: `${FIX}/bundles/over-budget`, pinnedPubkeyPath: PIN });
  assert.equal(r.rawCode, summary.results["over-budget"].raw);
});
