// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { scenarios } from "../../../tools/assurance-lab/corpus.mjs";
import { runStudy, verifyReport } from "../../../tools/assurance-lab/study.mjs";

const expectedIds = [
  "benign-patch",
  "benign-report",
  "benign-workflow",
  "changed-content",
  "changed-resource",
  "changed-principal",
  "changed-tenant",
  "stale-policy",
  "late-approval",
  "duplicate-action",
  "omitted-middle",
  "truncated-tail",
  "fabricated-effect",
  "reordered-trace",
  "noop-mutation",
  "observer-unavailable",
  "sink-failure",
];
const report = await runStudy();
const rows = (mode) => report.cases.filter((row) => row.mode === mode);

test("complete fixture identities and control matrix are retained", () => {
  assert.deepEqual(
    scenarios().map((item) => item.id),
    expectedIds
  );
  assert.equal(report.cases.length, 51);
  for (const mode of ["bypass", "exact-policy", "deny-all"])
    assert.deepEqual(
      rows(mode).map((row) => row.id),
      expectedIds
    );
  assert.ok(Object.keys(report.sourceManifest).length >= 6);
});

test("every authorization attack is exploitable under bypass and blocked by exact policy", () => {
  for (const control of rows("bypass").filter((row) => row.kind === "authorization")) {
    assert.equal(control.attackApplied, true, control.id);
    assert.equal(control.verdict.forbiddenEffects, 1, control.id);
    const enforced = rows("exact-policy").find((row) => row.id === control.id);
    assert.equal(enforced.attackApplied, true, control.id);
    assert.equal(enforced.verdict.forbiddenEffects, 0, control.id);
  }
});

test("benign utility distinguishes policy from deny-all", () => {
  assert.equal(report.summary["exact-policy"].benignCompleted, 3);
  assert.equal(report.summary.bypass.benignCompleted, 3);
  assert.equal(report.summary["deny-all"].benignCompleted, 0);
});

test("checkpoint and full observation equally detect effective trace mutations", () => {
  const evidence = rows("exact-policy").filter((row) => row.kind === "evidence");
  assert.equal(evidence.length, 4);
  for (const row of evidence) {
    assert.equal(row.attackApplied, true, row.id);
    assert.equal(row.verdict.traceOnly, "consistent", row.id);
    assert.equal(row.verdict.checkpoint, "mismatch", row.id);
    assert.equal(row.verdict.reconciled, "mismatch", row.id);
    assert.equal(row.verdict.forbiddenEffects, 0, row.id);
  }
});

test("no-op and missing observations cannot be counted as successful containment", () => {
  for (const mode of ["bypass", "exact-policy", "deny-all"]) {
    const noop = rows(mode).find((row) => row.id === "noop-mutation");
    assert.equal(noop.attackApplied, false);
    assert.equal(report.summary[mode].invalidMutations >= 1, true);
    assert.equal(report.summary[mode].unknown, 2);
    for (const row of rows(mode).filter((row) => row.kind === "fault")) {
      assert.equal(row.verdict.forbiddenEffects, null);
      assert.equal(row.verdict.reconciled, "unknown");
      assert.equal(row.benignCompleted, false);
    }
  }
});

test("fresh execution reproduces the complete report", async () => {
  assert.equal(await verifyReport(report), true);
});

test("report verification rejects altered counts, missing cases, extra claims and wrong sources", async () => {
  for (const mutate of [
    (copy) => {
      copy.summary.bypass.forbiddenEffects = 0;
    },
    (copy) => {
      copy.cases.pop();
    },
    (copy) => {
      copy.productionReady = true;
    },
    (copy) => {
      copy.sourceManifest[Object.keys(copy.sourceManifest)[0]] = "0".repeat(64);
    },
  ]) {
    const copy = structuredClone(report);
    mutate(copy);
    await assert.rejects(verifyReport(copy), /report_mismatch/);
  }
});
